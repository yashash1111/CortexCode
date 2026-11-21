export type InterviewDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type ExperienceLevel = 'Fresher' | '0-1 years' | '1-3 years' | '3-5 years' | '5+ years';

export type InterviewType =
  | 'Technical'
  | 'DSA and Problem Solving'
  | 'Core Computer Science'
  | 'System Design'
  | 'Frontend'
  | 'Backend'
  | 'Full Stack'
  | 'HR and Behavioral'
  | 'Project Discussion'
  | 'Mixed Interview';

export interface CreateMockInterviewInput {
  title?: string;
  role: string;
  experienceLevel: ExperienceLevel | string;
  difficulty: InterviewDifficulty | string;
  interviewType: InterviewType | string;
  preferredLanguage?: string;
  durationMinutes?: number;
  questionLimit?: number;
  skills?: string[];
  jobDescription?: string;
  projectInfo?: string;
  topics?: string[];
}

export interface SubmitAnswerInput {
  answer: string;
  code?: string;
  language?: string;
  action?: 'answer' | 'clarification';
}

export interface AnswerEvaluationResult {
  correctnessScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  completenessScore: number;
  difficultyAdjustment: 'increase' | 'maintain' | 'decrease';
  needsFollowUp: boolean;
  topic: string;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface FinalReportPayload {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  summary: string;
  strongAreas: string[];
  weakAreas: string[];
  incompleteOrIncorrectAnswers: Array<{
    questionNumber: number;
    topic: string;
    issue: string;
    suggestedAnswer: string;
  }>;
  topicsToRevise: string[];
  learningRoadmap: Array<{
    phase: string;
    focus: string;
    actionItems: string[];
  }>;
  recommendedNextInterview: {
    role: string;
    interviewType: string;
    difficulty: string;
    reason: string;
  };
  disclaimer: string;
}
