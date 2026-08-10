import path from 'path';

export interface ScannedFile {
  path: string;           // e.g. "src/components/Button.tsx"
  name: string;           // "Button.tsx"
  extension: string;      // ".tsx"
  language: string;       // "TypeScript"
  size: number;
  lineCount: number;
  content: string;
  isBinary: boolean;
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.turbo',
  '.idea',
  '.vscode',
  '__pycache__',
  '.output'
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.py': 'Python',
  '.java': 'Java',
  '.c': 'C',
  '.cpp': 'C++',
  '.cs': 'C#',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.env': 'Environment'
};

export class ProjectScanner {
  /**
   * Filters out ignored files/directories from an uploaded file list
   */
  static filterFiles(files: { path: string; name: string; size: number; content?: string }[]): ScannedFile[] {
    const scanned: ScannedFile[] = [];

    for (const f of files) {
      const normalizedPath = f.path.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');

      // Check if path contains an excluded directory
      const isExcluded = parts.some(part => EXCLUDED_DIRS.has(part));
      if (isExcluded) continue;

      const ext = path.extname(f.name).toLowerCase();
      const language = LANGUAGE_MAP[ext] || 'Text';
      const content = f.content || '';
      const lineCount = content ? content.split('\n').length : 0;
      const isBinary = f.size > 0 && !content && !['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.css', '.html'].includes(ext);

      scanned.push({
        path: normalizedPath,
        name: f.name,
        extension: ext,
        language,
        size: f.size,
        lineCount,
        content,
        isBinary
      });
    }

    return scanned;
  }
}
