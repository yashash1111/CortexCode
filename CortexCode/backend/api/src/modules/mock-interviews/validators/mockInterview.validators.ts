import { CreateMockInterviewInput, SubmitAnswerInput } from '../types/mockInterview.types';

export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCreateSessionInput(body: any): CreateMockInterviewInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required.');
  }

  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!role || role.length < 2 || role.length > 100) {
    throw new ValidationError('A valid job role (2–100 characters) is required.');
  }

  const experienceLevel = typeof body.experienceLevel === 'string' ? body.experienceLevel.trim() : '';
  if (!experienceLevel) {
    throw new ValidationError('Experience level is required.');
  }

  const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';
  if (!difficulty) {
    throw new ValidationError('Difficulty level is required.');
  }

  const interviewType = typeof body.interviewType === 'string' ? body.interviewType.trim() : '';
  if (!interviewType) {
    throw new ValidationError('Interview type is required.');
  }

  const durationMinutes = Number(body.durationMinutes ?? 30);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    throw new ValidationError('Duration must be between 5 and 180 minutes.');
  }

  const questionLimit = Number(body.questionLimit ?? 10);
  if (!Number.isFinite(questionLimit) || questionLimit < 1 || questionLimit > 30) {
    throw new ValidationError('Question count must be between 1 and 30.');
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 25)
    : typeof body.skills === 'string'
    ? body.skills.split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 25)
    : [];

  const topics = Array.isArray(body.topics)
    ? body.topics.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 20)
    : typeof body.topics === 'string'
    ? body.topics.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 20)
    : [];

  return {
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 140) : `${role} — ${interviewType}`,
    role,
    experienceLevel,
    difficulty,
    interviewType,
    preferredLanguage: typeof body.preferredLanguage === 'string' ? body.preferredLanguage.trim().slice(0, 50) : undefined,
    durationMinutes: Math.round(durationMinutes),
    questionLimit: Math.round(questionLimit),
    skills,
    jobDescription: typeof body.jobDescription === 'string' ? body.jobDescription.trim().slice(0, 4000) : undefined,
    projectInfo: typeof body.projectInfo === 'string' ? body.projectInfo.trim().slice(0, 4000) : undefined,
    topics,
  };
}

export function validateSubmitAnswerInput(body: any): SubmitAnswerInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body is required.');
  }
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
  const code = typeof body.code === 'string' ? body.code : undefined;

  if (!answer && (!code || !code.trim())) {
    throw new ValidationError('Answer or code submission is required.');
  }

  return {
    answer: answer || '[Code submission]',
    code,
    language: typeof body.language === 'string' ? body.language.trim() : undefined,
    action: body.action === 'clarification' ? 'clarification' : 'answer',
  };
}
