import { apiClient } from '@/lib/apiClient';
import { getApiUrl } from '@/lib/apiConfig';
import type {
  CreateInterviewPayload,
  MockInterviewMessage,
  MockInterviewReportData,
  MockInterviewSession,
} from './interview.types';

export async function createInterviewSession(payload: CreateInterviewPayload): Promise<MockInterviewSession> {
  const res = await apiClient.post('/api/mock-interviews/sessions', payload);
  return res.data.data;
}

export async function listInterviewSessions(): Promise<MockInterviewSession[]> {
  const res = await apiClient.get('/api/mock-interviews/sessions');
  return res.data.data;
}

export async function getInterviewSession(id: string): Promise<MockInterviewSession> {
  const res = await apiClient.get(`/api/mock-interviews/sessions/${id}`);
  return res.data.data;
}

export async function startInterviewSession(id: string): Promise<MockInterviewSession> {
  const res = await apiClient.post(`/api/mock-interviews/sessions/${id}/start`);
  return res.data.data;
}

export async function resumeInterviewSession(id: string): Promise<MockInterviewSession> {
  const res = await apiClient.post(`/api/mock-interviews/sessions/${id}/resume`);
  return res.data.data;
}

export async function skipInterviewQuestion(id: string) {
  const res = await apiClient.post(`/api/mock-interviews/sessions/${id}/skip`);
  return res.data.data;
}

export async function finishInterviewSession(id: string): Promise<{
  session: MockInterviewSession;
  report: MockInterviewReportData;
}> {
  const res = await apiClient.post(`/api/mock-interviews/sessions/${id}/finish`);
  return res.data.data;
}

export async function getInterviewReport(id: string): Promise<{
  session: MockInterviewSession;
  report: MockInterviewReportData;
}> {
  const res = await apiClient.get(`/api/mock-interviews/sessions/${id}/report`);
  return res.data.data;
}

export interface StreamAnswerCallbacks {
  onActivity?: (data: { stage: string; detail: string }) => void;
  onStart?: (data: { sessionId: string; currentDifficulty?: string; questionsAsked?: number }) => void;
  onToken: (token: string) => void;
  onComplete: (data: {
    session: MockInterviewSession;
    message: MockInterviewMessage;
    candidateMessage: MockInterviewMessage;
  }) => void;
  onError: (message: string) => void;
}

export async function streamInterviewAnswer(
  sessionId: string,
  payload: { answer: string; code?: string; language?: string; action?: 'answer' | 'clarification' },
  callbacks: StreamAnswerCallbacks,
  signal?: AbortSignal
) {
  const resp = await fetch(`${getApiUrl()}/api/mock-interviews/sessions/${sessionId}/answer/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const errJson = await resp.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let eventName = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        if (eventName === 'activity') callbacks.onActivity?.(parsed);
        else if (eventName === 'message_start') callbacks.onStart?.(parsed);
        else if (eventName === 'token' && parsed.content) callbacks.onToken(parsed.content);
        else if (eventName === 'message_complete') callbacks.onComplete(parsed);
        else if (eventName === 'error') callbacks.onError(parsed.message || 'Streaming error');
      } catch {
        // skip malformed chunk
      }
    }
  }
}
