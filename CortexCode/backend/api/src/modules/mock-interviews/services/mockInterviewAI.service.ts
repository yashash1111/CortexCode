import { AIGateway, GatewayMessage } from '../../ai/services/aiGateway';

export interface InterviewContext {
  sessionId: string;
  userId: string;
  role: string;
  experienceLevel: string;
  difficulty: string;
  currentDifficulty: string;
  interviewType: string;
  preferredLanguage?: string | null;
  durationMinutes: number;
  questionLimit: number;
  questionsAsked: number;
  skills?: string[];
  jobDescription?: string | null;
  projectInfo?: string | null;
  topics?: string[];
}

function getInterviewerPersona(interviewType: string): string {
  const t = interviewType.toLowerCase();
  if (t.includes('dsa') || t.includes('problem solving')) {
    return `You are a Senior Algorithms & Data Structures Interviewer.
Focus on: algorithmic thinking, data structures, edge cases, dry runs, and time/space complexity.
Ask one focused coding or problem-solving question at a time. When evaluating, probe complexity and edge cases.`;
  }
  if (t.includes('system design')) {
    return `You are a Principal System Design Interviewer.
Focus on: requirements clarification, scale estimation, API/data modeling, caching, partitioning, bottlenecks, and trade-offs.
Guide the candidate step by step without giving away the architecture.`;
  }
  if (t.includes('hr')) {
    return `You are an experienced HR & Talent Partner Interviewer.
Focus on: career motivation, teamwork, conflict resolution, ownership, adaptability, and culture fit.`;
  }
  if (t.includes('behavioral')) {
    return `You are a Behavioral Engineering Interviewer using the STAR (Situation, Task, Action, Result) framework.
Probe for concrete personal examples, measurable outcomes, and lessons learned.`;
  }
  if (t.includes('project')) {
    return `You are a Staff Engineer conducting a Project Deep-Dive Interview.
Focus on: architecture choices, trade-offs, debugging stories, testing, deployment, and the candidate's individual contributions.`;
  }
  return `You are a Senior Technical Interviewer conducting a realistic ${interviewType} interview.
Focus on: core fundamentals, practical engineering judgment, debugging, architecture, and clear communication.`;
}

export function buildInterviewerSystemPrompt(ctx: InterviewContext): string {
  const persona = getInterviewerPersona(ctx.interviewType);
  const skillsStr = ctx.skills?.length ? ctx.skills.join(', ') : 'General software engineering';
  const topicsStr = ctx.topics?.length ? ctx.topics.join(', ') : 'Role-appropriate core topics';

  return `${persona}

CANDIDATE & SESSION CONTEXT:
- Target Role: ${ctx.role}
- Experience Level: ${ctx.experienceLevel}
- Current Difficulty: ${ctx.currentDifficulty || ctx.difficulty}
- Interview Type: ${ctx.interviewType}
- Preferred Language: ${ctx.preferredLanguage || 'Any'}
- Question Progress: ${ctx.questionsAsked} of ${ctx.questionLimit} (Duration: ${ctx.durationMinutes} min)
- Focus Skills: ${skillsStr}
- Focus Topics: ${topicsStr}
${ctx.jobDescription ? `- Job Description Summary: ${ctx.jobDescription.slice(0, 800)}` : ''}
${ctx.projectInfo ? `- Candidate Project Info: ${ctx.projectInfo.slice(0, 800)}` : ''}

STRICT INTERVIEWER RULES:
1. Ask ONLY ONE question or focused follow-up per turn.
2. Never reveal internal answer keys, rubrics, or numerical scores during the live interview.
3. Briefly acknowledge the candidate's previous answer naturally before asking the follow-up or next question.
4. If the candidate's answer is incomplete or vague, ask a targeted clarifying follow-up before moving on.
5. Do not output JSON unless explicitly asked for evaluation/report.`;
}

export class MockInterviewAIService {
  static async generateOpeningQuestion(ctx: InterviewContext): Promise<{
    content: string;
    topic: string;
    provider: string;
    model: string;
  }> {
    const systemPrompt = buildInterviewerSystemPrompt(ctx);
    const messages: GatewayMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Start the mock interview now. Briefly introduce yourself (1–2 sentences), welcome the candidate for the ${ctx.role} (${ctx.interviewType}, ${ctx.difficulty}) interview, and ask Question 1 clearly.`,
      },
    ];

    const res = await AIGateway.generate({
      messages,
      userId: ctx.userId,
      requestType: 'mock_interview_question',
      temperature: 0.7,
    });

    return {
      content: res.content,
      topic: ctx.topics?.[0] || ctx.interviewType,
      provider: res.provider,
      model: res.model,
    };
  }

  static streamNextTurn(params: {
    ctx: InterviewContext;
    history: GatewayMessage[];
    candidateInput: string;
    action: 'answer' | 'clarification';
    isFinalQuestionReached: boolean;
    codeExecutionSummary?: string;
  }) {
    const systemPrompt = buildInterviewerSystemPrompt(params.ctx);

    let instruction = '';
    if (params.action === 'clarification') {
      instruction = `The candidate is asking for clarification on the current question: "${params.candidateInput}". Clarify without giving away the solution.`;
    } else if (params.isFinalQuestionReached) {
      instruction = `The candidate answered: "${params.candidateInput}".${
        params.codeExecutionSummary ? `\nCode check summary: ${params.codeExecutionSummary}` : ''
      }\nThis was the final question (${params.ctx.questionLimit}/${params.ctx.questionLimit}). Give a brief, encouraging closing remark thanking them for completing the interview and let them know they can view their detailed evaluation report now.`;
    } else {
      instruction = `The candidate answered: "${params.candidateInput}".${
        params.codeExecutionSummary ? `\nCode check summary: ${params.codeExecutionSummary}` : ''
      }\nRespond as the interviewer: give brief natural feedback (without scores or answer keys), and ask Question ${
        params.ctx.questionsAsked + 1
      } (or a targeted follow-up if their answer was incomplete) calibrated to ${params.ctx.currentDifficulty} difficulty.`;
    }

    const messages: GatewayMessage[] = [
      { role: 'system', content: systemPrompt },
      ...params.history.slice(-14),
      { role: 'user', content: instruction },
    ];

    return AIGateway.stream({
      messages,
      userId: params.ctx.userId,
      requestType: params.action === 'clarification' ? 'mock_interview_followup' : 'mock_interview_question',
      temperature: 0.7,
    });
  }
}
