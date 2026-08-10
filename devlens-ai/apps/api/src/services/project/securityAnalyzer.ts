import { ScannedFile } from './projectScanner';

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  category: 'Security' | 'Code Quality' | 'Error Handling' | 'Performance';
  affectedFile: string;
  lineRange?: string;
  whyItMatters: string;
  suggestedFix: string;
  status: 'OPEN' | 'RESOLVED';
}

export class SecurityAnalyzer {
  static analyze(files: ScannedFile[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    for (const f of files) {
      if (f.isBinary || !f.content) continue;

      const lines = f.content.split('\n');

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;

        // 1. Secret / API key leakage check
        if (
          (line.includes('sk-') || line.includes('AIzaSy') || line.includes('secret') || line.includes('password =')) &&
          !f.name.endsWith('.env.example') && !f.name.endsWith('.md')
        ) {
          if (line.includes('process.env.') || line.includes('env(')) return; // Ignore env vars
          issues.push({
            id: `sec-${f.name}-${lineNum}`,
            title: 'Potential Hardcoded API Key or Secret',
            description: `Line ${lineNum} contains sensitive API credentials or secret token patterns.`,
            severity: 'CRITICAL',
            category: 'Security',
            affectedFile: f.path,
            lineRange: `Line ${lineNum}`,
            whyItMatters: 'Hardcoded secrets in source code can be leaked in source repositories and compromised by unauthorized parties.',
            suggestedFix: 'Move the secret value into process.env environment variables.',
            status: 'OPEN'
          });
        }

        // 2. Unhandled promise rejections / missing catch
        if (line.includes('axios.') || line.includes('fetch(')) {
          if (!f.content.includes('try {') && !f.content.includes('.catch(')) {
            issues.push({
              id: `err-${f.name}-${lineNum}`,
              title: 'Unhandled Asynchronous API Request',
              description: `API call on line ${lineNum} lacks explicit error boundary handling (try/catch or .catch).`,
              severity: 'WARNING',
              category: 'Error Handling',
              affectedFile: f.path,
              lineRange: `Line ${lineNum}`,
              whyItMatters: 'Unhandled network errors will result in uncaught promise rejections and silent UI freezes.',
              suggestedFix: 'Wrap the API call in a try/catch block or attach a .catch() handler.',
              status: 'OPEN'
            });
          }
        }

        // 3. Raw query concatenation (SQL Injection risk)
        if (line.includes('SELECT ') || line.includes('INSERT ') || line.includes('UPDATE ')) {
          if (line.includes('+') || line.includes('${')) {
            issues.push({
              id: `sql-${f.name}-${lineNum}`,
              title: 'SQL Query String Concatenation Detected',
              description: `Line ${lineNum} constructs SQL queries using unescaped string concatenation.`,
              severity: 'HIGH',
              category: 'Security',
              affectedFile: f.path,
              lineRange: `Line ${lineNum}`,
              whyItMatters: 'Concatenating raw variables into database queries allows unescaped SQL Injection attacks.',
              suggestedFix: 'Use parameterized queries or ORM abstractions like Prisma / Mongoose.',
              status: 'OPEN'
            });
          }
        }
      });
    }

    return issues;
  }
}
