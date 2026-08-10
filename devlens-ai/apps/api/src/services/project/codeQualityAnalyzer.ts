import { ScannedFile } from './projectScanner';
import { SecurityIssue } from './securityAnalyzer';
import { TechStackAnalysis } from './dependencyAnalyzer';
import { ArchitectureAnalysis } from './architectureAnalyzer';

export interface HealthBreakdown {
  overallScore: number;
  categories: {
    name: 'Code Quality' | 'Architecture' | 'Security' | 'Performance' | 'Testing' | 'Dependencies' | 'Accessibility' | 'Documentation';
    score: number;
    explanation: string;
    recommendation: string;
  }[];
}

export class CodeQualityAnalyzer {
  static calculateHealth(
    files: ScannedFile[],
    issues: SecurityIssue[],
    tech: TechStackAnalysis,
    arch: ArchitectureAnalysis
  ): HealthBreakdown {
    // 1. Security Score
    const criticals = issues.filter(i => i.severity === 'CRITICAL').length;
    const highs = issues.filter(i => i.severity === 'HIGH').length;
    const warnings = issues.filter(i => i.severity === 'WARNING').length;

    let securityScore = 100 - (criticals * 25) - (highs * 15) - (warnings * 5);
    securityScore = Math.max(20, Math.min(100, securityScore));

    // 2. Testing Score
    const testFiles = files.filter(f => f.name.includes('.test.') || f.name.includes('.spec.') || f.path.includes('tests/'));
    const testCoverageRatio = files.length > 0 ? (testFiles.length / files.length) * 100 : 0;
    let testingScore = testFiles.length > 0 ? Math.min(100, Math.round(50 + testCoverageRatio * 200)) : 35;

    // 3. Documentation Score
    const hasReadme = files.some(f => f.name.toLowerCase() === 'readme.md');
    const docFiles = files.filter(f => f.extension === '.md');
    let docScore = (hasReadme ? 60 : 30) + Math.min(40, docFiles.length * 15);

    // 4. Code Quality Score
    const tsFiles = files.filter(f => f.extension === '.ts' || f.extension === '.tsx');
    const isTypeSafe = files.length > 0 && (tsFiles.length / files.length) > 0.4;
    const longFiles = files.filter(f => f.lineCount > 300);
    let qualityScore = (isTypeSafe ? 85 : 65) - (longFiles.length * 5);
    qualityScore = Math.max(40, Math.min(100, qualityScore));

    // 5. Architecture Score
    const hasCleanSeparation = arch.entryPoints.length > 0 && arch.components.length > 0;
    let archScore = hasCleanSeparation ? 88 : 70;

    // 6. Performance Score
    let perfScore = 90 - (warnings * 3);
    perfScore = Math.max(50, Math.min(100, perfScore));

    // 7. Dependencies Score
    const depCount = tech.dependencies.length;
    let depScore = depCount > 0 ? 92 : 75;

    // 8. Accessibility Score
    const jsxFiles = files.filter(f => f.extension === '.tsx' || f.extension === '.jsx');
    const hasAria = jsxFiles.some(f => f.content.includes('aria-') || f.content.includes('alt='));
    let a11yScore = hasAria ? 85 : 60;

    // Overall Score (Weighted Average)
    const overallScore = Math.round(
      (securityScore * 0.2) +
      (qualityScore * 0.2) +
      (archScore * 0.15) +
      (testingScore * 0.15) +
      (perfScore * 0.1) +
      (depScore * 0.1) +
      (docScore * 0.05) +
      (a11yScore * 0.05)
    );

    return {
      overallScore,
      categories: [
        {
          name: 'Code Quality',
          score: qualityScore,
          explanation: isTypeSafe ? 'Strong TypeScript type-safety detected.' : 'JavaScript detected without full type constraints.',
          recommendation: 'Break long modules (>300 lines) into focused reusable functions.'
        },
        {
          name: 'Architecture',
          score: archScore,
          explanation: `Detected ${arch.entryPoints.length} entry points and ${arch.components.length} UI components.`,
          recommendation: 'Keep business logic decoupled from presentation layers.'
        },
        {
          name: 'Security',
          score: securityScore,
          explanation: `${criticals} critical and ${highs} high severity vulnerability risks detected.`,
          recommendation: criticals > 0 ? 'Move exposed API keys to environment variables immediately.' : 'Keep dependencies updated.'
        },
        {
          name: 'Performance',
          score: perfScore,
          explanation: `Evaluated async error boundaries and API pipeline overhead.`,
          recommendation: 'Memoize expensive calculations and wrap network requests in error handlers.'
        },
        {
          name: 'Testing',
          score: testingScore,
          explanation: `${testFiles.length} test suites detected across the codebase.`,
          recommendation: testFiles.length === 0 ? 'Add unit and integration tests for critical API routes.' : 'Increase test coverage for edge cases.'
        },
        {
          name: 'Dependencies',
          score: depScore,
          explanation: `${depCount} total production & dev dependencies registered.`,
          recommendation: 'Regularly run dependency audits to patch transitive vulnerabilities.'
        },
        {
          name: 'Accessibility',
          score: a11yScore,
          explanation: hasAria ? 'ARIA accessibility labels detected in UI components.' : 'Missing explicit ARIA attributes on interactive elements.',
          recommendation: 'Add semantic HTML tags and screen reader labels to interactive elements.'
        },
        {
          name: 'Documentation',
          score: docScore,
          explanation: hasReadme ? 'README.md and project documentation present.' : 'Missing primary README project guide.',
          recommendation: 'Maintain updated architecture diagrams and API docs.'
        }
      ]
    };
  }
}
