import { ScannedFile } from './projectScanner';

export interface ContextResult {
  relevantFiles: { path: string; name: string; content: string; relevanceScore: number }[];
  contextSummary: string;
  filesUsed: string[];
}

export class ProjectContextBuilder {
  static buildContext(query: string, files: { path: string; name: string; language: string; size: number; lineCount: number; content?: string }[]): ContextResult {
    if (!query || files.length === 0) {
      return { relevantFiles: [], contextSummary: 'No project context available.', filesUsed: [] };
    }

    const queryLower = query.toLowerCase();
    const queryTokens = queryLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t));

    const scored: { path: string; name: string; content: string; relevanceScore: number }[] = [];

    for (const f of files) {
      if (!f.content) continue;
      let score = 0;
      const nameLower = f.name.toLowerCase();
      const pathLower = f.path.toLowerCase();
      const contentLower = f.content.toLowerCase();

      // Score by filename match
      for (const token of queryTokens) {
        if (nameLower.includes(token)) score += 20;
        if (pathLower.includes(token)) score += 10;
        const occurrencesInContent = (contentLower.split(token).length - 1);
        score += Math.min(occurrencesInContent * 3, 30);
      }

      // Boost auth/security related files for auth queries
      if ((queryLower.includes('auth') || queryLower.includes('login') || queryLower.includes('signin')) &&
          (pathLower.includes('auth') || nameLower.includes('login'))) {
        score += 30;
      }

      // Boost DB files for data/database queries
      if ((queryLower.includes('data') || queryLower.includes('database') || queryLower.includes('model')) &&
          (pathLower.includes('model') || pathLower.includes('schema') || nameLower.includes('prisma'))) {
        score += 30;
      }

      // Boost API route files for endpoint queries
      if ((queryLower.includes('api') || queryLower.includes('route') || queryLower.includes('endpoint')) &&
          (pathLower.includes('route') || pathLower.includes('api') || pathLower.includes('controller'))) {
        score += 25;
      }

      if (score > 0) {
        scored.push({ path: f.path, name: f.name, content: f.content.slice(0, 1500), relevanceScore: score });
      }
    }

    // Sort by score, take top 6 files
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const top = scored.slice(0, 6);

    return {
      relevantFiles: top,
      contextSummary: top.length > 0
        ? `Relevant project files: ${top.map(f => f.name).join(', ')}`
        : 'No strongly relevant files found for this query.',
      filesUsed: top.map(f => f.name)
    };
  }
}

const STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but',
  'with', 'this', 'that', 'how', 'why', 'what', 'when', 'where', 'who', 'can', 'will', 'does',
  'did', 'should', 'would', 'could', 'from', 'not', 'my', 'our', 'your', 'its', 'have', 'has'
]);
