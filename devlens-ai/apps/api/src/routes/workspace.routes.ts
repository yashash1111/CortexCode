import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ProjectBrainEngine, ProjectBrainData, ProjectTaskItem, ProjectMemoryItem } from '../services/project/projectBrain';
import { ProjectContextBuilder } from '../services/project/projectContextBuilder';
import { AIService } from '../services/ai/aiService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ---- In-Memory Workspace Store (with optional Prisma persistence) ----
const workspaceStore: Map<string, ProjectBrainData> = new Map();
const workspaceFiles: Map<string, { path: string; name: string; language: string; size: number; lineCount: number; content: string }[]> = new Map();

// ---- Helper: get userId from request headers ----
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'anonymous';
}

// ============================================================
// POST /api/workspaces — Create workspace & build Project Brain
// ============================================================
router.post('/', (upload as any).array('files', 200), async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Workspace name is required.' });

    const projectId = 'ws-' + Date.now();
    const rawFiles = ((req.files || []) as Express.Multer.File[]).map(f => ({
      path: (f as any).originalname || f.fieldname,
      name: f.originalname,
      size: f.size,
      content: f.buffer ? f.buffer.toString('utf-8') : ''
    }));

    // Build the Project Brain
    const brain = ProjectBrainEngine.analyzeProject(projectId, name, description || '', rawFiles);

    // Store full file content for context retrieval
    const enrichedFiles = brain.files.map(bf => {
      const rawMatch = rawFiles.find(rf => rf.name === bf.name || rf.path === bf.path);
      return { ...bf, content: rawMatch?.content || '' };
    });
    workspaceFiles.set(projectId, enrichedFiles);

    workspaceStore.set(projectId, brain);

    return res.status(201).json({ success: true, data: brain });
  } catch (err: any) {
    console.error('[WorkspaceRoutes] Create error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/workspaces — List workspaces for user
// ============================================================
router.get('/', (req: Request, res: Response) => {
  const all = Array.from(workspaceStore.values());
  return res.json({ success: true, data: all });
});

// ============================================================
// GET /api/workspaces/:id — Get workspace details
// ============================================================
router.get('/:id', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  return res.json({ success: true, data: brain });
});

// ============================================================
// POST /api/workspaces/:id/chat — Smart chat with project context
// ============================================================
router.post('/:id/chat', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    const { message, useProjectContext = true, history = [], modelName = 'CortexCode AI' } = req.body;

    if (!message) return res.status(400).json({ success: false, error: 'Message is required.' });

    let systemPrompt = 'You are CortexCode AI, an expert software engineering assistant.';
    let contextFiles: string[] = [];

    if (brain && useProjectContext) {
      const files = workspaceFiles.get(req.params.id) || [];
      const context = ProjectContextBuilder.buildContext(message, files);
      contextFiles = context.filesUsed;

      if (context.relevantFiles.length > 0) {
        const fileSnippets = context.relevantFiles
          .map(f => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
          .join('\n\n');

        systemPrompt = `You are CortexCode AI, an expert software engineering assistant analyzing the project "${brain.name}".

Project Summary: ${brain.summary.overview}
Tech Stack: ${[...brain.stack.frameworks, ...brain.stack.languages].join(', ')}
Auth: ${brain.stack.authProviders.join(', ') || 'N/A'}
Database: ${brain.stack.databases.join(', ') || 'N/A'}

Relevant Project Files:
${fileSnippets}

Answer the user's question with specific references to the actual code above.`;
      }
    }

    const response = await AIService.generateResponse(systemPrompt + '\n\nUser: ' + message, history, modelName);
    return res.json({ success: true, response, contextFiles });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/workspaces/:id/review — Deep code review
// ============================================================
router.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });

    const issues = brain.issues;
    const prompt = `You are an expert code reviewer. Here are ${issues.length} issues detected in the project "${brain.name}":

${issues.map((i, idx) => `${idx + 1}. [${i.severity}] ${i.title} in ${i.affectedFile}: ${i.description}`).join('\n')}

Tech Stack: ${brain.stack.frameworks.join(', ')}

Please provide:
1. A priority-ordered fix plan
2. Which issues are most critical to address first
3. Any patterns you see that suggest deeper architectural problems`;

    const aiSummary = await AIService.generateResponse(prompt, [], 'CortexCode AI');
    return res.json({ success: true, issues, aiSummary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/workspaces/:id/debug — Debug diagnosis
// ============================================================
router.post('/:id/debug', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    const { problem } = req.body;
    if (!problem) return res.status(400).json({ success: false, error: 'Problem description is required.' });
    if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });

    const files = workspaceFiles.get(req.params.id) || [];
    const context = ProjectContextBuilder.buildContext(problem, files);

    const prompt = `You are a senior debugging engineer analyzing the project "${brain.name}".

Problem reported: "${problem}"

Tech Stack: ${[...brain.stack.frameworks, ...brain.stack.databases, ...brain.stack.authProviders].join(', ')}

${context.relevantFiles.length > 0 ? `Potentially affected files:\n${context.relevantFiles.map(f => `- ${f.path}\n\`\`\`\n${f.content.slice(0, 800)}\n\`\`\``).join('\n\n')}` : ''}

Please respond with:
1. **Root Cause Analysis**: What is likely causing this problem
2. **Affected Files**: Which files are most likely involved (confidence %)
3. **Step-by-Step Fix**: Exact steps to resolve this issue
4. **Prevention**: How to prevent this class of bug in the future`;

    const diagnosis = await AIService.generateResponse(prompt, [], 'CortexCode AI');
    return res.json({ success: true, diagnosis, candidateFiles: context.filesUsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/workspaces/:id/build/plan — Build With Me plan
// ============================================================
router.post('/:id/build/plan', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    const { feature } = req.body;
    if (!feature) return res.status(400).json({ success: false, error: 'Feature description is required.' });
    if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });

    const prompt = `You are a senior software architect helping build features in the project "${brain.name}".

Project Stack: ${[...brain.stack.frameworks, ...brain.stack.databases].join(', ')}
Existing Components: ${brain.architecture.components.slice(0, 10).join(', ')}
API Routes: ${brain.architecture.apiRoutes.slice(0, 8).join(', ')}

Feature to build: "${feature}"

Provide a detailed implementation plan with:
1. **Step-by-step implementation order** (numbered, specific to this codebase)
2. **Files to create or modify** (use existing file paths where possible)
3. **Code snippets** for each key change
4. **Testing approach** for this feature
5. **Potential risks or blockers** to watch for`;

    const plan = await AIService.generateResponse(prompt, [], 'CortexCode AI');
    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/workspaces/:id/tasks — Get tasks
// ============================================================
router.get('/:id/tasks', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  return res.json({ success: true, data: brain.tasks });
});

// ============================================================
// POST /api/workspaces/:id/tasks — Add user task
// ============================================================
router.post('/:id/tasks', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  const { title, description, priority } = req.body;
  const task: ProjectTaskItem = {
    id: 'task-user-' + Date.now(),
    title: title || 'New Task',
    description: description || '',
    priority: priority || 'MEDIUM',
    status: 'PENDING',
    source: 'USER',
    createdAt: new Date().toISOString()
  };
  brain.tasks.push(task);
  return res.status(201).json({ success: true, data: task });
});

// ============================================================
// PATCH /api/workspaces/:id/tasks/:taskId — Update task status
// ============================================================
router.patch('/:id/tasks/:taskId', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  const task = brain.tasks.find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found.' });
  if (req.body.status) task.status = req.body.status;
  return res.json({ success: true, data: task });
});

// ============================================================
// POST /api/workspaces/:id/interview/answer — Evaluate interview answer
// ============================================================
router.post('/:id/interview/answer', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    const { question, answer, mode = 'Technical' } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, error: 'Question and answer are required.' });

    const projectContext = brain
      ? `Project: "${brain.name}" | Stack: ${[...brain.stack.frameworks, ...brain.stack.databases].join(', ')}`
      : '';

    const prompt = `You are an expert ${mode} interviewer evaluating a candidate's answer.
${projectContext}

Question: "${question}"
Candidate's Answer: "${answer}"

Evaluate the answer and respond with:
1. **Score** (0-10) — Be fair but rigorous
2. **Strengths** — What the candidate got right
3. **Gaps** — What was missing or incorrect
4. **Model Answer** — What an ideal answer would include
5. **Follow-up Question** — One deeper follow-up question`;

    const evaluation = await AIService.generateResponse(prompt, [], 'CortexCode AI');
    return res.json({ success: true, evaluation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/workspaces/:id/learn — Learn Mode
// ============================================================
router.post('/:id/learn', async (req: Request, res: Response) => {
  try {
    const brain = workspaceStore.get(req.params.id);
    const { concept, difficulty = 'Intermediate' } = req.body;
    if (!concept) return res.status(400).json({ success: false, error: 'Concept is required.' });

    const files = workspaceFiles.get(req.params.id) || [];
    const context = ProjectContextBuilder.buildContext(concept, files);

    const prompt = `You are a ${difficulty}-level coding tutor teaching "${concept}".
${brain ? `The student's project is "${brain.name}" using ${brain.stack.frameworks.join(', ')}.` : ''}
${context.relevantFiles.length > 0 ? `
Relevant code from their project:
${context.relevantFiles.slice(0, 2).map(f => `\`\`\`\n${f.content.slice(0, 600)}\n\`\`\``).join('\n')}` : ''}

Teach "${concept}" at the ${difficulty} level. Include:
1. **Core Concept** — Clear definition and why it matters
2. **In Your Project** — How this concept applies to the code above (if available)
3. **Simple Example** — Minimal working code example
4. **Common Mistakes** — Pitfalls to avoid
5. **Practice Challenge** — One hands-on task to test understanding`;

    const lesson = await AIService.generateResponse(prompt, [], 'CortexCode AI');
    return res.json({ success: true, lesson, contextFiles: context.filesUsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// GET /api/workspaces/:id/memory — Get memories
// ============================================================
router.get('/:id/memory', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  return res.json({ success: true, data: brain.memories });
});

// ============================================================
// POST /api/workspaces/:id/memory — Add memory
// ============================================================
router.post('/:id/memory', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  const { type, content } = req.body;
  const mem: ProjectMemoryItem = {
    id: 'mem-' + Date.now(),
    type: type || 'NOTE',
    content: content || '',
    source: 'User',
    createdAt: new Date().toISOString()
  };
  brain.memories.push(mem);
  return res.status(201).json({ success: true, data: mem });
});

// ============================================================
// DELETE /api/workspaces/:id/memory/:memId — Remove memory
// ============================================================
router.delete('/:id/memory/:memId', (req: Request, res: Response) => {
  const brain = workspaceStore.get(req.params.id);
  if (!brain) return res.status(404).json({ success: false, error: 'Workspace not found.' });
  brain.memories = brain.memories.filter(m => m.id !== req.params.memId);
  return res.json({ success: true });
});

export default router;
