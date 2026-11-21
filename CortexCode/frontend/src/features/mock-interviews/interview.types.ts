export type InterviewStatus = 'created' | 'in_progress' | 'paused' | 'completed';

export interface MockInterviewMessage {
  id: string;
  sessionId: string;
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
  questionNumber?: number | null;
  topic?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MockInterviewEvaluation {
  id: string;
  sessionId: string;
  messageId?: string | null;
  questionNumber?: number | null;
  correctnessScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  completenessScore: number;
  feedback: string;
  strengths?: string[];
  weaknesses?: string[];
  createdAt: string;
}

export interface MockInterviewReportData {
  id: string;
  sessionId: string;
  overallScore: number;
  technicalScore?: number | null;
  communicationScore?: number | null;
  problemSolvingScore?: number | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  learningRoadmap: Array<{
    phase: string;
    focus: string;
    actionItems: string[];
  }>;
  detailedResults: {
    incompleteOrIncorrectAnswers?: Array<{
      questionNumber: number;
      topic: string;
      issue: string;
      suggestedAnswer: string;
    }>;
    recommendedNextInterview?: {
      role: string;
      interviewType: string;
      difficulty: string;
      reason: string;
    };
    disclaimer?: string;
    perQuestionEvaluations?: MockInterviewEvaluation[];
  };
  createdAt: string;
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  title?: string | null;
  role: string;
  experienceLevel: string;
  difficulty: string;
  currentDifficulty?: string | null;
  interviewType: string;
  preferredLanguage?: string | null;
  durationMinutes: number;
  questionLimit: number;
  questionsAsked: number;
  currentTopic?: string | null;
  skills?: string[];
  jobDescription?: string | null;
  projectInfo?: string | null;
  topics?: string[];
  status: InterviewStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: MockInterviewMessage[];
  evaluations?: MockInterviewEvaluation[];
  report?: MockInterviewReportData | null;
  _count?: {
    messages: number;
    evaluations: number;
  };
}

export interface CreateInterviewPayload {
  title?: string;
  role: string;
  experienceLevel: string;
  difficulty: string;
  interviewType: string;
  preferredLanguage?: string;
  durationMinutes: number;
  questionLimit: number;
  skills: string[];
  jobDescription?: string;
  projectInfo?: string;
  topics: string[];
}
