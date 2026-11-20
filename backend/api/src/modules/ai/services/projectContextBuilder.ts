export interface ProjectFile {
  path: string;
  content: string;
}

export class ProjectContextBuilder {
  /**
   * Determine if project context is needed based on prompt content and active mode.
   */
  static isProjectContextNeeded(prompt: string, mode: string = 'chat', hasWorkspace: boolean = false): boolean {
    if (!hasWorkspace) return false;

    const lower = prompt.toLowerCase();
    
    // Explicit project modes
    if (['debug', 'review', 'build', 'learn', 'interview'].includes(mode)) {
      return true;
    }

    // Direct project reference phrases
    const projectKeywords = [
      'my project', 'this project', 'workspace', 'repository', 'codebase',
      'this app', 'my app', 'file', 'component', 'function', 'class',
      'bug', 'error', 'fix', 'debug', 'refactor', 'review', 'build', 'auth'
    ];

    return projectKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Selectively retrieve relevant project files matching the user's intent.
   */
  static selectRelevantFiles(prompt: string, files: ProjectFile[], maxFiles: number = 5): ProjectFile[] {
    if (!files || files.length === 0) return [];
    const lower = prompt.toLowerCase();

    // Priority matching based on keywords in file path or prompt
    const scored = files.map(file => {
      let score = 0;
      const pathLower = file.path.toLowerCase();

      // Auth / Login matching
      if ((lower.includes('auth') || lower.includes('login') || lower.includes('jwt')) && 
          (pathLower.includes('auth') || pathLower.includes('login') || pathLower.includes('token') || pathLower.includes('session'))) {
        score += 10;
      }

      // Database / Connection matching
      if ((lower.includes('db') || lower.includes('database') || lower.includes('prisma') || lower.includes('mongo') || lower.includes('sql')) && 
          (pathLower.includes('db') || pathLower.includes('schema') || pathLower.includes('prisma') || pathLower.includes('model'))) {
        score += 10;
      }

      // Routing / UI matching
      if ((lower.includes('nav') || lower.includes('route') || lower.includes('page') || lower.includes('ui')) && 
          (pathLower.includes('route') || pathLower.includes('page') || pathLower.includes('component') || pathLower.includes('app'))) {
        score += 10;
      }

      // Exact word matches in file content/path
      const words = lower.split(/\s+/).filter(w => w.length > 3);
      for (const word of words) {
        if (pathLower.includes(word)) score += 3;
        if (file.content.toLowerCase().includes(word)) score += 1;
      }

      return { file, score };
    });

    // Sort by highest score first
    scored.sort((a, b) => b.score - a.score);

    // Filter files with score > 0 or return fallback top files if mode requires context
    const selected = scored.filter(s => s.score > 0).slice(0, maxFiles).map(s => s.file);
    return selected.length > 0 ? selected : files.slice(0, maxFiles);
  }

  /**
   * Build formatted prompt context string from selected files.
   */
  static buildContextPrompt(prompt: string, files: ProjectFile[]): string {
    if (!files || files.length === 0) return prompt;

    const fileBlocks = files.map(f => `--- File: ${f.path} ---\n${f.content.slice(0, 2500)}`).join('\n\n');
    return `[Project Context Files Available]\n${fileBlocks}\n\n[User Request]\n${prompt}`;
  }
}
