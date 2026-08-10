import { ProjectScanner, ScannedFile } from './projectScanner';
import { DependencyAnalyzer, TechStackAnalysis } from './dependencyAnalyzer';
import { ArchitectureAnalyzer, ArchitectureAnalysis } from './architectureAnalyzer';
import { SecurityAnalyzer, SecurityIssue } from './securityAnalyzer';
import { CodeQualityAnalyzer, HealthBreakdown } from './codeQualityAnalyzer';

export interface ProjectTaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  source: 'AI_AUDIT' | 'USER';
  createdAt: string;
}

export interface ProjectMemoryItem {
  id: string;
  type: 'GOAL' | 'STACK_DECISION' | 'ARCHITECTURE' | 'NOTE';
  content: string;
  source: string;
  createdAt: string;
}

export interface ProjectBrainData {
  id: string;
  name: string;
  description: string;
  purpose: string;
  status: 'BUILDING' | 'READY' | 'ERROR';
  totalFiles: number;
  totalLines: number;
  health: HealthBreakdown;
  stack: TechStackAnalysis;
  architecture: ArchitectureAnalysis;
  issues: SecurityIssue[];
  tasks: ProjectTaskItem[];
  memories: ProjectMemoryItem[];
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

export class ProjectBrainEngine {
  static analyzeProject(
    projectId: string,
    name: string,
    description: string,
    rawFiles: { path: string; name: string; size: number; content?: string }[]
  ): ProjectBrainData {
    // 1. Scan and filter files
    const scannedFiles = ProjectScanner.filterFiles(rawFiles);
    const totalLines = scannedFiles.reduce((sum, f) => sum + f.lineCount, 0);

    // 2. Run analysis services
    const stack = DependencyAnalyzer.analyze(scannedFiles);
    const architecture = ArchitectureAnalyzer.analyze(scannedFiles);
    const issues = SecurityAnalyzer.analyze(scannedFiles);
    const health = CodeQualityAnalyzer.calculateHealth(scannedFiles, issues, stack, architecture);

    // 3. Generate automatic project tasks from security/quality issues
    const tasks: ProjectTaskItem[] = issues.slice(0, 5).map((iss, idx) => ({
      id: `task-auto-${idx}`,
      title: `Fix ${iss.title}`,
      description: `Resolve issue in ${iss.affectedFile}: ${iss.suggestedFix}`,
      priority: iss.severity === 'CRITICAL' ? 'HIGH' : iss.severity === 'HIGH' ? 'MEDIUM' : 'LOW',
      status: 'PENDING',
      source: 'AI_AUDIT',
      createdAt: new Date().toISOString()
    }));

    // Add general quality tasks if needed
    if (tasks.length === 0) {
      tasks.push({
        id: 'task-auto-init',
        title: 'Add Integration Test Suite',
        description: 'Set up automated API integration tests to increase test coverage.',
        priority: 'MEDIUM',
        status: 'PENDING',
        source: 'AI_AUDIT',
        createdAt: new Date().toISOString()
      });
    }

    // 4. Generate Project Summary & Flows
    const purpose = description || `A ${stack.frameworks.join('/') || 'software'} project designed for scalable application deployment.`;
    const authFlow = stack.authProviders.length > 0
      ? `Authentication is powered by ${stack.authProviders.join(', ')}.`
      : 'No centralized authentication provider detected. Verify session handling in API routes.';

    const databaseFlow = stack.databases.length > 0
      ? `Data persistence is managed via ${stack.databases.join(', ')}.`
      : 'File-based or external service data storage model.';

    const keyFeatures = [
      architecture.components.length > 0 ? `${architecture.components.length} UI Components` : 'Modular Codebase',
      architecture.apiRoutes.length > 0 ? `${architecture.apiRoutes.length} API Endpoints` : 'Service Handlers',
      stack.frameworks.length > 0 ? `${stack.frameworks.join(', ')} Stack` : 'Clean Structure',
      `${scannedFiles.length} Analyzed Source Files`
    ];

    const potentialInterviewQuestions = [
      `Explain how ${stack.frameworks[0] || 'the frontend'} communicates with your backend APIs.`,
      `How do you handle security and error boundary protection in ${scannedFiles[0]?.name || 'key components'}?`,
      stack.databases[0] ? `Why did you select ${stack.databases[0]} for data persistence?` : 'How is application state managed across user sessions?',
      `If you needed to scale this project 10x, what architectural bottlenecks would you optimize first?`
    ];

    // 5. Initial Memories
    const memories: ProjectMemoryItem[] = [
      {
        id: `mem-init-1`,
        type: 'GOAL',
        content: `Project Goal: ${purpose}`,
        source: 'Project Creation',
        createdAt: new Date().toISOString()
      },
      {
        id: `mem-init-2`,
        type: 'STACK_DECISION',
        content: `Tech Stack Chosen: ${[...stack.frameworks, ...stack.languages, ...stack.databases].join(', ')}`,
        source: 'Automated Stack Analysis',
        createdAt: new Date().toISOString()
      }
    ];

    return {
      id: projectId,
      name,
      description,
      purpose,
      status: 'READY',
      totalFiles: scannedFiles.length,
      totalLines,
      health,
      stack,
      architecture,
      issues,
      tasks,
      memories,
      files: scannedFiles.map(f => ({
        path: f.path,
        name: f.name,
        language: f.language,
        size: f.size,
        lineCount: f.lineCount
      })),
      summary: {
        overview: purpose,
        authFlow,
        databaseFlow,
        keyFeatures,
        potentialInterviewQuestions
      },
      lastAnalyzedAt: new Date().toISOString()
    };
  }
}
