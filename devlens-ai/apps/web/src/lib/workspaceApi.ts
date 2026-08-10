const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface WorkspaceIssue {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  category: string;
  affectedFile: string;
  lineRange?: string;
  whyItMatters: string;
  suggestedFix: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  source: string;
  createdAt: string;
}

export interface WorkspaceMemory {
  id: string;
  type: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface WorkspaceBrainData {
  id: string;
  name: string;
  description: string;
  purpose: string;
  status: string;
  totalFiles: number;
  totalLines: number;
  health: {
    overallScore: number;
    categories: { name: string; score: number; explanation: string; recommendation: string }[];
  };
  stack: {
    frameworks: string[];
    languages: string[];
    databases: string[];
    authProviders: string[];
    externalServices: string[];
    dependencies: { name: string; version: string; type: string }[];
  };
  architecture: {
    entryPoints: string[];
    components: string[];
    pages: string[];
    apiRoutes: string[];
    models: string[];
    diagramNodes: { id: string; label: string; type: string; files: string[] }[];
  };
  issues: WorkspaceIssue[];
  tasks: WorkspaceTask[];
  memories: WorkspaceMemory[];
  files: { path: string; name: string; language: string; size: number; lineCount: number }[];
  summary: {
    overview: string;
    authFlow: string;
    databaseFlow: string;
    keyFeatures: string[];
    potentialInterviewQuestions: string[];
  };
  lastAnalyzedAt: string;
}

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json ?? null;
  } catch {
    return null;
  }
}

export async function createWorkspace(name: string, description: string, files: File[]): Promise<WorkspaceBrainData | null> {
  try {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    files.forEach(f => fd.append('files', f));
    const res = await fetch(`${API_BASE}/api/workspaces`, { method: 'POST', body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
}

export async function listWorkspaces(): Promise<WorkspaceBrainData[]> {
  const result = await safeFetch<WorkspaceBrainData[]>(`${API_BASE}/api/workspaces`);
  return Array.isArray(result) ? result : [];
}

export async function getWorkspace(id: string): Promise<WorkspaceBrainData | null> {
  return safeFetch<WorkspaceBrainData>(`${API_BASE}/api/workspaces/${id}`);
}

export async function chatWithWorkspace(id: string, message: string, useProjectContext: boolean, history: unknown[]): Promise<{ response: string; contextFiles: string[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, useProjectContext, history })
    });
    const json = await res.json();
    return { response: json.response || '', contextFiles: json.contextFiles || [] };
  } catch { return { response: 'Error connecting to AI service.', contextFiles: [] }; }
}

export async function runCodeReview(id: string): Promise<{ issues: WorkspaceIssue[]; aiSummary: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    return { issues: json.issues || [], aiSummary: json.aiSummary || '' };
  } catch { return { issues: [], aiSummary: '' }; }
}

export async function runDebug(id: string, problem: string): Promise<{ diagnosis: string; candidateFiles: string[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem })
    });
    const json = await res.json();
    return { diagnosis: json.diagnosis || '', candidateFiles: json.candidateFiles || [] };
  } catch { return { diagnosis: 'Error running diagnosis.', candidateFiles: [] }; }
}

export async function getBuildPlan(id: string, feature: string): Promise<{ plan: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/build/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature })
    });
    const json = await res.json();
    return { plan: json.plan || '' };
  } catch { return { plan: 'Error generating plan.' }; }
}

export async function getTasks(id: string): Promise<WorkspaceTask[]> {
  const result = await safeFetch<WorkspaceTask[]>(`${API_BASE}/api/workspaces/${id}/tasks`);
  return Array.isArray(result) ? result : [];
}

export async function addTask(id: string, task: Partial<WorkspaceTask>): Promise<WorkspaceTask | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
}

export async function updateTaskStatus(id: string, taskId: string, status: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/workspaces/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch { }
}

export async function evaluateInterviewAnswer(id: string, question: string, answer: string, mode: string): Promise<{ evaluation: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, mode })
    });
    const json = await res.json();
    return { evaluation: json.evaluation || '' };
  } catch { return { evaluation: 'Error evaluating answer.' }; }
}

export async function learnConcept(id: string, concept: string, difficulty: string): Promise<{ lesson: string; contextFiles: string[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, difficulty })
    });
    const json = await res.json();
    return { lesson: json.lesson || '', contextFiles: json.contextFiles || [] };
  } catch { return { lesson: 'Error generating lesson.', contextFiles: [] }; }
}

export async function getMemories(id: string): Promise<WorkspaceMemory[]> {
  const result = await safeFetch<WorkspaceMemory[]>(`${API_BASE}/api/workspaces/${id}/memory`);
  return Array.isArray(result) ? result : [];
}

export async function addMemory(id: string, type: string, content: string): Promise<WorkspaceMemory | null> {
  try {
    const res = await fetch(`${API_BASE}/api/workspaces/${id}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content })
    });
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
}

export async function deleteMemory(id: string, memId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/workspaces/${id}/memory/${memId}`, { method: 'DELETE' });
  } catch { }
}
