import prisma from '../../../config/prisma';
import { GatewayMessage } from '../../ai/services/aiGateway';
import { executeCandidateCode } from '../../assessments/services/codeExecutionService';
import {
  CreateMockInterviewInput,
  SubmitAnswerInput,
} from '../types/mockInterview.types';
import { MockInterviewAIService, InterviewContext } from './mockInterviewAI.service';
import { MockInterviewEvaluationService } from './mockInterviewEvaluation.service';
import { ProfileService } from '../../profile/services/profile.service';

const DIFFICULTY_LADDER = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export function nextAdaptiveDifficulty(
  current: string,
  adjustment: 'increase' | 'maintain' | 'decrease'
): string {
  const idx = DIFFICULTY_LADDER.findIndex((d) => d.toLowerCase() === (current || 'Intermediate').toLowerCase());
  const safeIdx = idx === -1 ? 1 : idx;
  if (adjustment === 'increase') return DIFFICULTY_LADDER[Math.min(DIFFICULTY_LADDER.length - 1, safeIdx + 1)];
  if (adjustment === 'decrease') return DIFFICULTY_LADDER[Math.max(0, safeIdx - 1)];
  return DIFFICULTY_LADDER[safeIdx];
}

function toContext(session: {
  id: string;
  userId: string;
  role: string;
  experienceLevel: string;
  difficulty: string;
  currentDifficulty: string | null;
  interviewType: string;
  preferredLanguage: string | null;
  durationMinutes: number;
  questionLimit: number;
  questionsAsked: number;
  skills: unknown;
  jobDescription: string | null;
  projectInfo: string | null;
  topics: unknown;
}): InterviewContext {
  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.role,
    experienceLevel: session.experienceLevel,
    difficulty: session.difficulty,
    currentDifficulty: session.currentDifficulty || session.difficulty,
    interviewType: session.interviewType,
    preferredLanguage: session.preferredLanguage,
    durationMinutes: session.durationMinutes,
    questionLimit: session.questionLimit,
    questionsAsked: session.questionsAsked,
    skills: Array.isArray(session.skills) ? session.skills.map(String) : [],
    jobDescription: session.jobDescription,
    projectInfo: session.projectInfo,
    topics: Array.isArray(session.topics) ? session.topics.map(String) : [],
  };
}

export class MockInterviewService {
  static async createSession(userId: string, input: CreateMockInterviewInput) {
    return prisma.mockInterviewSession.create({
      data: {
        userId,
        title: input.title,
        role: input.role,
        experienceLevel: input.experienceLevel,
        difficulty: input.difficulty,
        currentDifficulty: input.difficulty,
        interviewType: input.interviewType,
        preferredLanguage: input.preferredLanguage,
        durationMinutes: input.durationMinutes ?? 30,
        questionLimit: input.questionLimit ?? 10,
        questionsAsked: 0,
        skills: input.skills ?? [],
        jobDescription: input.jobDescription,
        projectInfo: input.projectInfo,
        topics: input.topics ?? [],
        status: 'created',
      },
    });
  }

  static async listSessions(userId: string) {
    return prisma.mockInterviewSession.findMany({
      where: { userId },
      include: {
        report: {
          select: { id: true, overallScore: true, createdAt: true },
        },
        _count: {
          select: { messages: true, evaluations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getSession(userId: string, sessionId: string) {
    return prisma.mockInterviewSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        evaluations: { orderBy: { createdAt: 'asc' } },
        report: true,
      },
    });
  }

  static async startSession(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }
    if (session.status === 'completed') {
      throw Object.assign(new Error('This interview session is already completed'), { status: 400 });
    }
    if (session.messages.length > 0) {
      // Idempotent start if already started
      return session;
    }

    const ctx = toContext(session);
    const opening = await MockInterviewAIService.generateOpeningQuestion(ctx);

    return prisma.$transaction(async (tx) => {
      await tx.mockInterviewMessage.create({
        data: {
          sessionId: session.id,
          role: 'interviewer',
          content: opening.content,
          questionNumber: 1,
          topic: opening.topic,
          metadata: { provider: opening.provider, model: opening.model },
        },
      });

      return tx.mockInterviewSession.update({
        where: { id: session.id },
        data: {
          status: 'in_progress',
          startedAt: session.startedAt ?? new Date(),
          questionsAsked: 1,
          currentTopic: opening.topic,
        },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          evaluations: { orderBy: { createdAt: 'asc' } },
          report: true,
        },
      });
    });
  }

  static async resumeSession(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }
    if (session.status === 'completed') {
      throw Object.assign(new Error('Completed sessions cannot be resumed'), { status: 400 });
    }

    if (session.status === 'created' && session.messages.length === 0) {
      return this.startSession(userId, sessionId);
    }

    return prisma.mockInterviewSession.update({
      where: { id: session.id },
      data: { status: 'in_progress' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        evaluations: { orderBy: { createdAt: 'asc' } },
        report: true,
      },
    });
  }

  static async prepareAnswerTurn(userId: string, sessionId: string, input: SubmitAnswerInput) {
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }
    if (session.status === 'completed') {
      throw Object.assign(new Error('Interview session is already completed'), { status: 400 });
    }

    let codeExecutionSummary: string | undefined;
    let codeExecutionResult: unknown;
    if (input.code && input.code.trim()) {
      const exec = await executeCandidateCode(
        input.code,
        input.language || session.preferredLanguage || 'javascript',
        []
      );
      codeExecutionResult = exec;
      codeExecutionSummary = exec.success
        ? `Syntax check passed (${exec.runtimeMs}ms).`
        : `Syntax check flagged an issue: ${exec.error || exec.output}`;
    }

    const candidateText = input.code?.trim()
      ? `${input.answer}\n\n\`\`\`${(input.language || session.preferredLanguage || 'code').toLowerCase()}\n${input.code}\n\`\`\``
      : input.answer;

    const lastInterviewerMsg = [...session.messages].reverse().find((m) => m.role === 'interviewer');

    const candidateMsg = await prisma.mockInterviewMessage.create({
      data: {
        sessionId: session.id,
        role: 'candidate',
        content: candidateText,
        questionNumber: session.questionsAsked || 1,
        topic: session.currentTopic || session.interviewType,
        metadata: {
          action: input.action || 'answer',
          ...(codeExecutionResult ? { codeExecution: codeExecutionResult } : {}),
        } as any,
      },
    });

    const history: GatewayMessage[] = session.messages.map((m) => ({
      role: m.role === 'interviewer' ? 'assistant' : 'user',
      content: m.content,
    }));

    let nextDiff = session.currentDifficulty || session.difficulty;
    let evaluationRecord: unknown = null;

    if (input.action !== 'clarification' && lastInterviewerMsg) {
      try {
        const evalRes = await MockInterviewEvaluationService.evaluateAnswer({
          userId,
          role: session.role,
          interviewType: session.interviewType,
          difficulty: nextDiff,
          question: lastInterviewerMsg.content,
          answer: input.answer,
          code: input.code,
          codeExecutionSummary,
        });

        nextDiff = nextAdaptiveDifficulty(nextDiff, evalRes.difficultyAdjustment);

        evaluationRecord = await prisma.mockInterviewEvaluation.create({
          data: {
            sessionId: session.id,
            messageId: candidateMsg.id,
            questionNumber: session.questionsAsked || 1,
            correctnessScore: evalRes.correctnessScore,
            communicationScore: evalRes.communicationScore,
            problemSolvingScore: evalRes.problemSolvingScore,
            completenessScore: evalRes.completenessScore,
            feedback: evalRes.feedback,
            strengths: evalRes.strengths,
            weaknesses: evalRes.weaknesses,
          },
        });

        await prisma.mockInterviewSession.update({
          where: { id: session.id },
          data: {
            currentDifficulty: nextDiff,
            currentTopic: evalRes.topic || session.currentTopic,
          },
        });
      } catch (err) {
        // Non-fatal if per-turn evaluation JSON fails; interview continues cleanly
        console.warn('[MockInterview] Per-turn evaluation skipped:', (err as Error).message);
      }
    }

    const isClarification = input.action === 'clarification';
    const isFinalQuestionReached = !isClarification && session.questionsAsked >= session.questionLimit;

    const updatedCtx = toContext({
      ...session,
      currentDifficulty: nextDiff,
    });

    return {
      session,
      candidateMsg,
      evaluationRecord,
      codeExecutionSummary,
      isClarification,
      isFinalQuestionReached,
      history,
      ctx: updatedCtx,
    };
  }

  static async commitInterviewerTurn(params: {
    sessionId: string;
    content: string;
    questionNumber: number;
    topic?: string | null;
    provider?: string;
    model?: string;
    incrementQuestionCount: boolean;
    markCompleted: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const msg = await tx.mockInterviewMessage.create({
        data: {
          sessionId: params.sessionId,
          role: 'interviewer',
          content: params.content,
          questionNumber: params.questionNumber,
          topic: params.topic,
          metadata: { provider: params.provider, model: params.model },
        },
      });

      const updatedSession = await tx.mockInterviewSession.update({
        where: { id: params.sessionId },
        data: {
          ...(params.incrementQuestionCount ? { questionsAsked: { increment: 1 } } : {}),
          ...(params.markCompleted ? { status: 'completed', endedAt: new Date() } : { status: 'in_progress' }),
        },
      });

      return { message: msg, session: updatedSession };
    });
  }

  static async submitAnswerSync(userId: string, sessionId: string, input: SubmitAnswerInput) {
    const prep = await this.prepareAnswerTurn(userId, sessionId, input);
    const gen = MockInterviewAIService.streamNextTurn({
      ctx: prep.ctx,
      history: prep.history,
      candidateInput: input.answer,
      action: prep.isClarification ? 'clarification' : 'answer',
      isFinalQuestionReached: prep.isFinalQuestionReached,
      codeExecutionSummary: prep.codeExecutionSummary,
    });

    let fullText = '';
    let meta: { provider?: string; model?: string } = {};
    while (true) {
      const next = await gen.next();
      if (next.done) {
        if (next.value) meta = next.value;
        break;
      }
      if (next.value) fullText += next.value;
    }

    const nextQNum = prep.isClarification || prep.isFinalQuestionReached
      ? prep.session.questionsAsked
      : prep.session.questionsAsked + 1;

    const committed = await this.commitInterviewerTurn({
      sessionId: prep.session.id,
      content: fullText,
      questionNumber: nextQNum,
      topic: prep.session.currentTopic,
      provider: meta.provider,
      model: meta.model,
      incrementQuestionCount: !prep.isClarification && !prep.isFinalQuestionReached,
      markCompleted: prep.isFinalQuestionReached,
    });

    return {
      candidateMessage: prep.candidateMsg,
      interviewerMessage: committed.message,
      session: committed.session,
      evaluation: prep.evaluationRecord,
    };
  }

  static async skipQuestion(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }
    if (session.status === 'completed') {
      throw Object.assign(new Error('Interview session is already completed'), { status: 400 });
    }

    const isFinal = session.questionsAsked >= session.questionLimit;
    const history: GatewayMessage[] = session.messages.map((m) => ({
      role: m.role === 'interviewer' ? 'assistant' : 'user',
      content: m.content,
    }));

    const ctx = toContext(session);
    const gen = MockInterviewAIService.streamNextTurn({
      ctx,
      history,
      candidateInput: '[Candidate chose to skip this question]',
      action: 'answer',
      isFinalQuestionReached: isFinal,
    });

    let fullText = '';
    let meta: { provider?: string; model?: string } = {};
    while (true) {
      const next = await gen.next();
      if (next.done) {
        if (next.value) meta = next.value;
        break;
      }
      if (next.value) fullText += next.value;
    }

    return prisma.$transaction(async (tx) => {
      const skipMsg = await tx.mockInterviewMessage.create({
        data: {
          sessionId: session.id,
          role: 'candidate',
          content: '[Skipped question]',
          questionNumber: session.questionsAsked,
          topic: session.currentTopic,
          metadata: { skipped: true },
        },
      });

      const nextQNum = isFinal ? session.questionsAsked : session.questionsAsked + 1;
      const aiMsg = await tx.mockInterviewMessage.create({
        data: {
          sessionId: session.id,
          role: 'interviewer',
          content: fullText,
          questionNumber: nextQNum,
          topic: session.currentTopic,
          metadata: { provider: meta.provider, model: meta.model },
        },
      });

      const updated = await tx.mockInterviewSession.update({
        where: { id: session.id },
        data: {
          ...(isFinal ? { status: 'completed', endedAt: new Date() } : { questionsAsked: { increment: 1 } }),
        },
      });

      return { skipMessage: skipMsg, interviewerMessage: aiMsg, session: updated };
    });
  }

  static async finishSessionAndGenerateReport(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId);
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }

    if (session.report) {
      return { session, report: session.report };
    }

    const reportData = await MockInterviewEvaluationService.generateFinalReport({
      userId,
      role: session.role,
      experienceLevel: session.experienceLevel,
      difficulty: session.difficulty,
      interviewType: session.interviewType,
      transcript: session.messages,
      evaluations: session.evaluations,
    });

    return prisma.$transaction(async (tx) => {
      const report = await tx.mockInterviewReport.create({
        data: {
          sessionId: session.id,
          overallScore: reportData.overallScore,
          technicalScore: reportData.technicalScore,
          communicationScore: reportData.communicationScore,
          problemSolvingScore: reportData.problemSolvingScore,
          summary: reportData.summary,
          strengths: reportData.strongAreas,
          weaknesses: reportData.weakAreas,
          recommendations: reportData.topicsToRevise,
          learningRoadmap: reportData.learningRoadmap as any,
          detailedResults: {
            incompleteOrIncorrectAnswers: reportData.incompleteOrIncorrectAnswers,
            recommendedNextInterview: reportData.recommendedNextInterview,
            disclaimer: reportData.disclaimer,
            perQuestionEvaluations: session.evaluations,
          } as any,
        },
      });

      const updatedSession = await tx.mockInterviewSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          endedAt: session.endedAt ?? new Date(),
        },
      });

      return { session: updatedSession, report };
    }).then(async (res) => {
      await ProfileService.recordActivity(userId, 'mock_interview_completed', {
        sessionId: session.id,
        role: session.role,
        overallScore: res.report.overallScore,
      });
      return res;
    });
  }

  static async getReport(userId: string, sessionId: string) {
    const session = await prisma.mockInterviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { report: true, evaluations: true },
    });
    if (!session) {
      throw Object.assign(new Error('Mock interview session not found'), { status: 404 });
    }
    if (!session.report) {
      throw Object.assign(new Error('Report has not been generated yet. Finish the interview first.'), {
        status: 404,
      });
    }
    return { session, report: session.report, evaluations: session.evaluations };
  }
}
