import { AIGateway } from '../../ai/services/aiGateway';
import {
  AnswerEvaluationResult,
  FinalReportPayload,
} from '../types/mockInterview.types';

function clampScore(val: unknown): number {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error('Invalid AI evaluation score: non-numeric value received.');
  }
  return Math.max(0, Math.min(100, Math.round(num * 10) / 10));
}

function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((v) => String(v).trim()).filter(Boolean);
}

export class MockInterviewEvaluationService {
  static async evaluateAnswer(params: {
    userId: string;
    role: string;
    interviewType: string;
    difficulty: string;
    question: string;
    answer: string;
    code?: string;
    codeExecutionSummary?: string;
  }): Promise<AnswerEvaluationResult> {
    const prompt = `Evaluate this mock interview answer strictly and objectively. Return ONLY valid JSON matching the schema below.

Role: ${params.role}
Interview Type: ${params.interviewType}
Difficulty: ${params.difficulty}
Question asked: ${params.question}
Candidate Answer: ${params.answer}
${params.code ? `Candidate Code:\n${params.code.slice(0, 3000)}` : ''}
${params.codeExecutionSummary ? `Automated Syntax/Execution Check: ${params.codeExecutionSummary}` : ''}

Required JSON schema:
{
  "correctnessScore": <0-100>,
  "communicationScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "completenessScore": <0-100>,
  "difficultyAdjustment": "increase" | "maintain" | "decrease",
  "needsFollowUp": <boolean>,
  "topic": "<short topic name>",
  "feedback": "<concise constructive evaluation>",
  "strengths": ["<point 1>"],
  "weaknesses": ["<point 1>"]
}`;

    const res = await AIGateway.generate({
      messages: [
        {
          role: 'system',
          content:
            'You are a strict technical interview evaluator. Output valid JSON only. Never invent code execution results not provided in the prompt.',
        },
        { role: 'user', content: prompt },
      ],
      userId: params.userId,
      requestType: 'mock_interview_evaluation',
      responseFormat: 'json',
      temperature: 0.2,
    });

    const parsed = (res.json && typeof res.json === 'object' ? res.json : JSON.parse(res.content)) as Record<
      string,
      unknown
    >;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid AI evaluation output: expected JSON object.');
    }

    const adj =
      parsed.difficultyAdjustment === 'increase' || parsed.difficultyAdjustment === 'decrease'
        ? parsed.difficultyAdjustment
        : 'maintain';

    return {
      correctnessScore: clampScore(parsed.correctnessScore),
      communicationScore: clampScore(parsed.communicationScore),
      problemSolvingScore: clampScore(parsed.problemSolvingScore),
      completenessScore: clampScore(parsed.completenessScore),
      difficultyAdjustment: adj,
      needsFollowUp: Boolean(parsed.needsFollowUp),
      topic: typeof parsed.topic === 'string' && parsed.topic.trim() ? parsed.topic.trim() : params.interviewType,
      feedback:
        typeof parsed.feedback === 'string' && parsed.feedback.trim()
          ? parsed.feedback.trim()
          : 'Evaluation completed.',
      strengths: normalizeStringArray(parsed.strengths),
      weaknesses: normalizeStringArray(parsed.weaknesses),
    };
  }

  static async generateFinalReport(params: {
    userId: string;
    role: string;
    experienceLevel: string;
    difficulty: string;
    interviewType: string;
    transcript: Array<{ role: string; content: string; questionNumber?: number | null; topic?: string | null }>;
    evaluations: Array<{
      questionNumber?: number | null;
      correctnessScore: number;
      communicationScore: number;
      problemSolvingScore: number;
      completenessScore: number;
      feedback: string;
      strengths: unknown;
      weaknesses: unknown;
    }>;
  }): Promise<FinalReportPayload> {
    const transcriptText = params.transcript
      .map((m) => `[${m.role.toUpperCase()}${m.questionNumber ? ` Q${m.questionNumber}` : ''}]: ${m.content}`)
      .join('\n\n')
      .slice(0, 12000);

    const evalSummary = params.evaluations
      .map(
        (e, i) =>
          `Q${e.questionNumber ?? i + 1}: correctness=${e.correctnessScore}, comm=${e.communicationScore}, problemSolving=${e.problemSolvingScore}, completeness=${e.completenessScore} | ${e.feedback}`
      )
      .join('\n');

    const prompt = `Generate a comprehensive 12-part Mock Interview Final Report as valid JSON only.

Candidate Target Role: ${params.role}
Experience Level: ${params.experienceLevel}
Difficulty: ${params.difficulty}
Interview Type: ${params.interviewType}

Per-Question Evaluations:
${evalSummary || 'No scored answers recorded yet (short/early ended session).'}

Transcript:
${transcriptText}

Required JSON schema:
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "summary": "<executive performance summary>",
  "strongAreas": ["<area>"],
  "weakAreas": ["<area>"],
  "incompleteOrIncorrectAnswers": [
    {
      "questionNumber": <number>,
      "topic": "<topic>",
      "issue": "<what was missing or incorrect>",
      "suggestedAnswer": "<ideal concise answer>"
    }
  ],
  "topicsToRevise": ["<topic>"],
  "learningRoadmap": [
    {
      "phase": "Week 1",
      "focus": "<focus area>",
      "actionItems": ["<action>"]
    }
  ],
  "recommendedNextInterview": {
    "role": "${params.role}",
    "interviewType": "<recommended type>",
    "difficulty": "<Beginner|Intermediate|Advanced|Expert>",
    "reason": "<why this next session helps>"
  }
}`;

    const res = await AIGateway.generate({
      messages: [
        {
          role: 'system',
          content:
            'You are a senior hiring committee debrief assistant. Produce accurate, constructive JSON reports based strictly on the transcript and evaluations.',
        },
        { role: 'user', content: prompt },
      ],
      userId: params.userId,
      requestType: 'mock_interview_report',
      responseFormat: 'json',
      temperature: 0.3,
      maxTokens: 2500,
    });

    const parsed = (res.json && typeof res.json === 'object' ? res.json : JSON.parse(res.content)) as Record<
      string,
      unknown
    >;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid AI report output: expected JSON object.');
    }

    const incompleteArr = Array.isArray(parsed.incompleteOrIncorrectAnswers)
      ? parsed.incompleteOrIncorrectAnswers.map((item: any) => ({
          questionNumber: Number(item?.questionNumber || 1),
          topic: String(item?.topic || params.interviewType),
          issue: String(item?.issue || 'Incomplete explanation'),
          suggestedAnswer: String(item?.suggestedAnswer || ''),
        }))
      : [];

    const roadmapArr = Array.isArray(parsed.learningRoadmap)
      ? parsed.learningRoadmap.map((step: any, idx: number) => ({
          phase: String(step?.phase || `Phase ${idx + 1}`),
          focus: String(step?.focus || 'Core concepts'),
          actionItems: normalizeStringArray(step?.actionItems),
        }))
      : [];

    const nextRec = (parsed.recommendedNextInterview || {}) as Record<string, unknown>;

    return {
      overallScore: clampScore(parsed.overallScore),
      technicalScore: clampScore(parsed.technicalScore ?? parsed.overallScore),
      communicationScore: clampScore(parsed.communicationScore ?? parsed.overallScore),
      problemSolvingScore: clampScore(parsed.problemSolvingScore ?? parsed.overallScore),
      summary:
        typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : 'Interview evaluation report generated.',
      strongAreas: normalizeStringArray(parsed.strongAreas),
      weakAreas: normalizeStringArray(parsed.weakAreas),
      incompleteOrIncorrectAnswers: incompleteArr,
      topicsToRevise: normalizeStringArray(parsed.topicsToRevise),
      learningRoadmap: roadmapArr,
      recommendedNextInterview: {
        role: String(nextRec.role || params.role),
        interviewType: String(nextRec.interviewType || params.interviewType),
        difficulty: String(nextRec.difficulty || params.difficulty),
        reason: String(nextRec.reason || 'Continue practicing targeted areas identified in this debrief.'),
      },
      disclaimer:
        'AI-generated evaluation based on your responses. Automated code syntax/execution checks (when code is submitted) are reported separately from subjective AI scores.',
    };
  }
}
