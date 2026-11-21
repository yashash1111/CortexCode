export interface DocJobInfo {
  id: string;
  status: string;
  progress: number;
  total?: number;
  processed?: number;
  error?: string | null;
  metadata?: { stage?: string } | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface DocItem {
  id: string;
  workspaceId: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  chunkCount: number;
  lastIndexedAt?: string | null;
  createdAt: string;
  metadata?: { pageCount?: number; format?: string } | null;
  latestJob?: DocJobInfo | null;
}

export interface CitationSource {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  citationLabel: string;
  content: string;
  score: number;
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CitationSource[];
  usage?: {
    model?: string;
    provider?: string;
    latencyMs?: number;
    totalTokens?: number;
    estimatedCost?: number;
  } | null;
}

export interface EvalCaseItem {
  id: string;
  question: string;
  expectedSource: string;
  groundTruth: string;
  actualAnswer: string;
  retrievedSources: Array<{
    documentName: string;
    pageNumber?: number | null;
    sectionHeading?: string | null;
    score?: number;
  }>;
  hitRate: number;
  reciprocalRank: number;
  contextRelevance: number;
  answerFaithfulness: number;
  citationPrecision: number;
  latencyMs: number;
  reasoning?: string | null;
}

export interface EvalRunItem {
  id: string;
  name: string;
  status: string;
  datasetSize: number;
  passedCount: number;
  metrics?: {
    retrievalHitRate: number;
    meanReciprocalRank: number;
    contextRelevance: number;
    answerFaithfulness: number;
    citationPrecision: number;
    avgLatencyMs: number;
  } | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  cases?: EvalCaseItem[];
}
