import { ScannedFile } from './projectScanner';

export interface ArchitectureAnalysis {
  entryPoints: string[];
  components: string[];
  pages: string[];
  apiRoutes: string[];
  models: string[];
  diagramNodes: { id: string; label: string; type: 'frontend' | 'backend' | 'database' | 'auth' | 'service'; files: string[] }[];
}

export class ArchitectureAnalyzer {
  static analyze(files: ScannedFile[]): ArchitectureAnalysis {
    const entryPoints: string[] = [];
    const components: string[] = [];
    const pages: string[] = [];
    const apiRoutes: string[] = [];
    const models: string[] = [];

    const frontendFiles: string[] = [];
    const backendFiles: string[] = [];
    const databaseFiles: string[] = [];
    const authFiles: string[] = [];

    for (const f of files) {
      const p = f.path.toLowerCase();

      // Entry points
      if (
        f.name === 'server.ts' || f.name === 'server.js' ||
        f.name === 'app.ts' || f.name === 'app.js' ||
        f.name === 'index.ts' || f.name === 'index.js' ||
        f.name === 'main.py' || f.name === 'main.go'
      ) {
        entryPoints.push(f.path);
      }

      // Components
      if (p.includes('/components/') || p.endsWith('.tsx') || p.endsWith('.jsx')) {
        components.push(f.name.replace(/\.[^/.]+$/, ''));
        frontendFiles.push(f.path);
      }

      // Pages & Routes
      if (p.includes('/pages/') || p.includes('/app/') || p.endsWith('page.tsx')) {
        pages.push(f.path);
        frontendFiles.push(f.path);
      }

      // API Routes
      if (p.includes('/routes/') || p.includes('/api/') || p.includes('controller') || p.includes('endpoint')) {
        apiRoutes.push(f.path);
        backendFiles.push(f.path);
      }

      // Database models / schemas
      if (p.includes('/models/') || p.includes('schema') || p.includes('entity') || f.name.endsWith('.prisma')) {
        models.push(f.name);
        databaseFiles.push(f.path);
      }

      // Auth files
      if (p.includes('auth') || p.includes('login') || p.includes('passport')) {
        authFiles.push(f.path);
      }
    }

    const diagramNodes: ArchitectureAnalysis['diagramNodes'] = [];

    if (frontendFiles.length > 0) {
      diagramNodes.push({
        id: 'frontend-node',
        label: 'Frontend UI (React / Next.js)',
        type: 'frontend',
        files: frontendFiles.slice(0, 10)
      });
    }

    if (backendFiles.length > 0 || entryPoints.length > 0) {
      diagramNodes.push({
        id: 'backend-node',
        label: 'Backend Server (Express / API)',
        type: 'backend',
        files: [...entryPoints, ...backendFiles].slice(0, 10)
      });
    }

    if (databaseFiles.length > 0) {
      diagramNodes.push({
        id: 'database-node',
        label: 'Database & Schema Layer',
        type: 'database',
        files: databaseFiles.slice(0, 10)
      });
    }

    if (authFiles.length > 0) {
      diagramNodes.push({
        id: 'auth-node',
        label: 'Authentication Handler',
        type: 'auth',
        files: authFiles.slice(0, 10)
      });
    }

    return {
      entryPoints,
      components: Array.from(new Set(components)),
      pages,
      apiRoutes,
      models: Array.from(new Set(models)),
      diagramNodes
    };
  }
}
