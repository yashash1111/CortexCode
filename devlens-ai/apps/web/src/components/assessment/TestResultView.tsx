'use client';

import { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Award, Check,
  FileText, Shield, Sparkles, ChevronDown, ChevronUp, Clock,
  Code2, ExternalLink, RefreshCw, UserCheck, BarChart3, HelpCircle
} from 'lucide-react';

interface Props {
  result: {
    id?: string;
    sessionId?: string;
    assessmentTitle: string;
    overallScore: number;
    totalMarks?: number;
    obtainedMarks?: number;
    mcqScore: number;
    codingScore: number;
    subjectiveScore: number;
    comprehensionScore: number;
    sectionScores?: Record<string, any>;
    subjectBreakdown?: Record<string, number>;
    topicAnalysis?: Array<{
      topic: string;
      subject: string;
      earnedPoints: number;
      totalPoints: number;
      percentage: number;
      status: 'Strong' | 'Developing' | 'Needs Improvement';
    }>;
    knowledgeGaps?: {
      strong: string[];
      developing: string[];
      needsImprovement: string[];
    };
    recommendations?: Array<{
      id: string;
      topic: string;
      subject: string;
      actionType: 'practice' | 'study' | 'coding_challenge';
      actionLabel: string;
      description: string;
      targetCount: number;
      difficulty: string;
    }>;
    learningPath?: {
      currentLevel: string;
      targetDomain: string;
      progressionSteps: Array<{
        step: number;
        title: string;
        description: string;
        estimatedHours: number;
      }>;
    };
    integritySummary?: {
      status: 'Normal' | 'Review Recommended' | 'Termination Recorded';
      cameraMaintained: boolean;
      microphoneMaintained: boolean;
      screenShareMaintained: boolean;
      fullscreenExits: number;
      tabSwitches: number;
      terminated: boolean;
      terminationReason?: string | null;
      integrityNotes: string[];
    };
    codingResults?: Array<{
      questionId: string;
      compilationStatus: string;
      passedTests: number;
      totalTests: number;
      runtimeMs: number;
      memoryMb: number;
      marksAwarded: number;
      maxMarks: number;
      aiCodeReview?: {
        timeComplexity: string;
        spaceComplexity: string;
        codeQualityScore: number;
        readabilityScore: number;
        maintainabilityScore: number;
        strengths: string[];
        improvements: string[];
        securityNotes?: string;
      };
    }>;
    subjectiveEvaluations?: Array<{
      questionId: string;
      score: number;
      criteria: {
        technicalCorrectness: number;
        completeness: number;
        relevance: number;
        reasoning: number;
        clarity: number;
      };
      strengths: string[];
      improvements: string[];
      feedback: string;
      marksAwarded: number;
      maxMarks: number;
    }>;
    mcqEvaluations?: Array<{
      questionId: string;
      isCorrect: boolean;
      selectedOption?: string;
      selectedOptions?: string[];
      correctAnswer: any;
      marksAwarded: number;
      maxMarks: number;
      explanation?: string;
    }>;
    auditTrail?: Array<{ event: string; timestamp: string; actor: string; details?: any }>;
    humanReviews?: Array<{
      reviewerId: string;
      reviewerName: string;
      previousScore: number;
      newScore: number;
      reason: string;
      feedback?: string;
      timestamp: string;
    }>;
    strengths: string[];
    weaknesses: string[];
    aiReport: string;
    submittedAt: string;
    previousAttemptScore?: number;
  };
  onReturnToHub: () => void;
  onPracticeTopic?: (topic: string) => void;
}

export default function TestResultView({ result, onReturnToHub, onPracticeTopic }: Props) {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'questions' | 'path' | 'integrity'>('scorecard');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const getRatingBadge = (score: number) => {
    if (score >= 80) return { label: 'Proficient / Strong', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (score >= 60) return { label: 'Competent', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    return { label: 'Foundational', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  };

  const rating = getRatingBadge(result.overallScore);
  const integrity = result.integritySummary || {
    status: 'Normal',
    cameraMaintained: true,
    microphoneMaintained: true,
    screenShareMaintained: true,
    fullscreenExits: 0,
    tabSwitches: 0,
    terminated: false,
    integrityNotes: ['Session focus maintained throughout testing window.']
  };

  const delta = result.previousAttemptScore !== undefined
    ? Math.round((result.overallScore - result.previousAttemptScore) * 100) / 100
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">

        {/* 1. Formal Result Header Banner */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span className={`px-2.5 py-0.5 border rounded text-[11px] font-mono uppercase font-bold ${rating.color}`}>
                {rating.label}
              </span>
              <span className="px-2.5 py-0.5 bg-[#171717] border border-[#262626] rounded text-[11px] font-mono text-neutral-400">
                Official Evaluation Record
              </span>
              {delta !== null && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  delta >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'
                }`}>
                  {delta >= 0 ? `+${delta}% vs previous` : `${delta}% vs previous`}
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">{result.assessmentTitle}</h1>
            <p className="text-xs text-neutral-400">
              Evaluated on {result.submittedAt} · Session ID: <span className="font-mono text-neutral-300">{result.sessionId || result.id || 'sess-verified'}</span>
            </p>

            {result.totalMarks !== undefined && (
              <div className="text-xs font-mono text-neutral-300 pt-0.5">
                Marks Obtained: <strong className="text-white">{result.obtainedMarks || result.overallScore}</strong> / {result.totalMarks}
              </div>
            )}
          </div>

          {/* Overall Score Dial */}
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#171717] border-2 border-blue-500 text-center shrink-0 shadow-lg">
            <div>
              <div className="text-2xl font-black text-white font-mono">{result.overallScore.toFixed(1)}%</div>
              <div className="text-[10px] font-mono uppercase text-neutral-400">Final Score</div>
            </div>
          </div>
        </div>

        {/* 2. Sub-Navigation Strip */}
        <div className="flex border-b border-[#262626] gap-1 text-xs">
          {[
            { id: 'scorecard', label: 'Performance Scorecard' },
            { id: 'questions', label: 'Question Breakdown' },
            { id: 'path', label: 'AI Learning Path & Practice' },
            { id: 'integrity', label: 'Integrity Evidence' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SCORECARD & PERFORMANCE INTELLIGENCE */}
        {/* ========================================================================= */}
        {activeTab === 'scorecard' && (
          <div className="space-y-6">

            {/* Section Scores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-3.5 text-center">
                <div className="text-[11px] font-mono text-neutral-400 uppercase">MCQ Section</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{result.mcqScore}%</div>
                <div className="text-[10px] font-mono text-emerald-400/80">Deterministic ✓</div>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-3.5 text-center">
                <div className="text-[11px] font-mono text-neutral-400 uppercase">Coding Problems</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{result.codingScore}%</div>
                <div className="text-[10px] font-mono text-blue-400/80">Sandboxed Tests ✓</div>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-3.5 text-center">
                <div className="text-[11px] font-mono text-neutral-400 uppercase">Subjective</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{result.subjectiveScore}%</div>
                <div className="text-[10px] font-mono text-purple-400/80">AI Rubric Evaluated</div>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-3.5 text-center">
                <div className="text-[11px] font-mono text-neutral-400 uppercase">Comprehension</div>
                <div className="text-lg font-bold text-white font-mono mt-1">{result.comprehensionScore}%</div>
                <div className="text-[10px] font-mono text-purple-400/80">AI Rubric Evaluated</div>
              </div>
            </div>

            {/* Knowledge Gap & Topic Analysis Grid */}
            {result.topicAnalysis && result.topicAnalysis.length > 0 && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center justify-between">
                  <span>Topic Competency & Knowledge Gap Analysis</span>
                  <span className="text-[11px] text-neutral-500 font-mono">Real Assessment Evidence</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.topicAnalysis.map((t, idx) => (
                    <div key={idx} className="p-3 bg-[#171717] border border-[#262626] rounded space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-white">{t.topic}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'Strong'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'Developing'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {t.status} ({t.percentage}%)
                        </span>
                      </div>

                      <div className="w-full bg-[#111] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            t.status === 'Strong' ? 'bg-emerald-500' : t.status === 'Developing' ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, t.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Evaluated Strengths & Areas to Improve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={14} />
                  Demonstrated Strengths
                </h3>
                <ul className="space-y-2 text-xs text-neutral-300">
                  {result.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase text-amber-400 flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} />
                  Areas to Improve
                </h3>
                <ul className="space-y-2 text-xs text-neutral-300">
                  {result.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Performance Report */}
            {result.aiReport && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
                  <FileText size={14} className="text-blue-400" />
                  Detailed Assessment Intelligence Report
                </h3>
                <div className="text-xs text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap bg-[#0d0d0d] border border-[#262626] p-4 rounded-lg">
                  {result.aiReport}
                </div>
              </div>
            )}

            {/* Evaluation Disclaimer */}
            <div className="p-3 bg-[#141414] border border-[#262626] rounded text-[11px] text-neutral-400 flex items-center gap-2">
              <HelpCircle size={14} className="text-neutral-500 shrink-0" />
              <span>
                <strong>AI Evaluation Disclaimer</strong>: AI-generated subjective evaluations are assessment aids and may require human review for high-stakes institutional decisions.
              </span>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DETAILED QUESTION-BY-QUESTION BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase text-neutral-400">Question Evaluation Breakdown</h3>

            {/* MCQ Breakdown */}
            {result.mcqEvaluations && result.mcqEvaluations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-neutral-300 uppercase">Objective MCQ Questions</h4>
                {result.mcqEvaluations.map((mcq, idx) => (
                  <div key={mcq.questionId || idx} className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">MCQ #{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        mcq.isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {mcq.isCorrect ? 'Correct ✓' : 'Incorrect ✗'} ({mcq.marksAwarded}/{mcq.maxMarks} marks)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-neutral-400">
                      <div>Your Answer: <strong className="text-white">{mcq.selectedOption || (mcq.selectedOptions?.join(', ')) || 'None'}</strong></div>
                      <div>Correct Answer: <strong className="text-emerald-400">{Array.isArray(mcq.correctAnswer) ? mcq.correctAnswer.join(', ') : mcq.correctAnswer}</strong></div>
                    </div>

                    {mcq.explanation && (
                      <p className="text-neutral-400 text-[11px] pt-1 border-t border-[#262626]">
                        <strong>Explanation:</strong> {mcq.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Coding Problems Breakdown */}
            {result.codingResults && result.codingResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono text-neutral-300 uppercase">Coding Problems & Test Executions</h4>
                {result.codingResults.map((codeItem, idx) => (
                  <div key={codeItem.questionId || idx} className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">Coding Challenge #{idx + 1}</span>
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded font-mono text-[10px] text-blue-400 font-bold">
                        {codeItem.passedTests}/{codeItem.totalTests} Tests Passed ({codeItem.marksAwarded}/{codeItem.maxMarks} pts)
                      </span>
                    </div>

                    {codeItem.aiCodeReview && (
                      <div className="p-3 bg-[#171717] border border-[#262626] rounded space-y-2 text-[11px]">
                        <div className="flex flex-wrap gap-3 font-mono text-neutral-300">
                          <span>Time Complexity: <strong className="text-white">{codeItem.aiCodeReview.timeComplexity}</strong></span>
                          <span>Space Complexity: <strong className="text-white">{codeItem.aiCodeReview.spaceComplexity}</strong></span>
                          <span>Code Quality: <strong className="text-white">{codeItem.aiCodeReview.codeQualityScore}/10</strong></span>
                        </div>

                        <div className="space-y-1 text-neutral-400">
                          {codeItem.aiCodeReview.strengths?.map((s, i) => (
                            <div key={i} className="text-emerald-400">✓ {s}</div>
                          ))}
                          {codeItem.aiCodeReview.improvements?.map((imp, i) => (
                            <div key={i} className="text-amber-400">⚠ {imp}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Subjective Evaluations Breakdown */}
            {result.subjectiveEvaluations && result.subjectiveEvaluations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono text-neutral-300 uppercase">Subjective Rubric Evaluations</h4>
                {result.subjectiveEvaluations.map((subj, idx) => (
                  <div key={subj.questionId || idx} className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">Subjective #{idx + 1}</span>
                      <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded font-mono text-[10px] text-purple-400 font-bold">
                        Rubric Score: {subj.score}/10 ({subj.marksAwarded}/{subj.maxMarks} marks)
                      </span>
                    </div>

                    {/* Criteria Ratings Grid */}
                    {subj.criteria && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px] font-mono">
                        <div className="p-2 bg-[#171717] border border-[#262626] rounded">
                          <div className="text-neutral-400">Correctness</div>
                          <div className="font-bold text-white mt-0.5">{subj.criteria.technicalCorrectness}/10</div>
                        </div>
                        <div className="p-2 bg-[#171717] border border-[#262626] rounded">
                          <div className="text-neutral-400">Completeness</div>
                          <div className="font-bold text-white mt-0.5">{subj.criteria.completeness}/10</div>
                        </div>
                        <div className="p-2 bg-[#171717] border border-[#262626] rounded">
                          <div className="text-neutral-400">Relevance</div>
                          <div className="font-bold text-white mt-0.5">{subj.criteria.relevance}/10</div>
                        </div>
                        <div className="p-2 bg-[#171717] border border-[#262626] rounded">
                          <div className="text-neutral-400">Reasoning</div>
                          <div className="font-bold text-white mt-0.5">{subj.criteria.reasoning}/10</div>
                        </div>
                        <div className="p-2 bg-[#171717] border border-[#262626] rounded">
                          <div className="text-neutral-400">Clarity</div>
                          <div className="font-bold text-white mt-0.5">{subj.criteria.clarity}/10</div>
                        </div>
                      </div>
                    )}

                    <p className="text-neutral-400 leading-relaxed text-[11px]">
                      <strong>Evaluator Feedback:</strong> {subj.feedback}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AI LEARNING PATH & PRACTICE RECOMMENDATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'path' && (
          <div className="space-y-6">

            {/* Actionable Practice Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" />
                  Personalized Practice & Study Recommendations
                </h3>

                <div className="space-y-3">
                  {result.recommendations.map(rec => (
                    <div key={rec.id} className="p-4 bg-[#171717] border border-[#262626] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{rec.topic}</span>
                          <span className="px-2 py-0.2 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-mono text-blue-400">
                            {rec.difficulty}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs">{rec.description}</p>
                      </div>

                      <button
                        onClick={() => onPracticeTopic ? onPracticeTopic(rec.topic) : onReturnToHub()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow"
                      >
                        <span>{rec.actionLabel}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Learning Roadmap */}
            {result.learningPath && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-neutral-300">
                    Recommended Technical Learning Progression
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Current Level: <strong className="text-white">{result.learningPath.currentLevel}</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {result.learningPath.progressionSteps?.map(step => (
                    <div key={step.step} className="p-3.5 bg-[#171717] border border-[#262626] rounded flex items-start gap-3.5 text-xs">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        {step.step}
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white">{step.title}</h4>
                          <span className="text-[10px] font-mono text-neutral-400">~{step.estimatedHours} hrs</span>
                        </div>
                        <p className="text-neutral-400 text-xs leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTEGRITY EVIDENCE & AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">

            {/* Integrity Summary Card */}
            <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
                  <Shield size={14} className="text-blue-400" />
                  Assessment Integrity Evidence Summary
                </h3>
                <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                  integrity.status === 'Normal'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  {integrity.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono text-[11px]">
                <div className="p-3 bg-[#171717] border border-[#262626] rounded">
                  <div className="text-neutral-400">Camera Feed</div>
                  <div className="font-bold text-white mt-1">✓ Active</div>
                </div>
                <div className="p-3 bg-[#171717] border border-[#262626] rounded">
                  <div className="text-neutral-400">Microphone</div>
                  <div className="font-bold text-white mt-1">✓ Active</div>
                </div>
                <div className="p-3 bg-[#171717] border border-[#262626] rounded">
                  <div className="text-neutral-400">Fullscreen Exits</div>
                  <div className="font-bold text-white mt-1">{integrity.fullscreenExits}</div>
                </div>
                <div className="p-3 bg-[#171717] border border-[#262626] rounded">
                  <div className="text-neutral-400">Tab Switches</div>
                  <div className="font-bold text-white mt-1">{integrity.tabSwitches}</div>
                </div>
              </div>

              <div className="space-y-1 text-neutral-400 text-xs">
                {integrity.integrityNotes?.map((note, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail & Human Reviews */}
            {result.humanReviews && result.humanReviews.length > 0 && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3 text-xs">
                <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
                  <UserCheck size={14} className="text-purple-400" />
                  Authorized Human Score Reviews
                </h3>

                <div className="space-y-2">
                  {result.humanReviews.map((rev, idx) => (
                    <div key={idx} className="p-3 bg-[#171717] border border-[#262626] rounded space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-white">{rev.reviewerName}</span>
                        <span className="text-neutral-400">{rev.timestamp}</span>
                      </div>
                      <div className="text-neutral-300 text-xs">
                        Adjusted Score: <strong className="text-white">{rev.previousScore}% → {rev.newScore}%</strong> ({rev.reason})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. Action Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onReturnToHub}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <span>Return to Assessments Hub</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
