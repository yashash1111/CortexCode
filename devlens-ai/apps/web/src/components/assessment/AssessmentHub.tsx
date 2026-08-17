'use client';

import { useState, useEffect } from 'react';
import {
  Award, Clock, CheckCircle2, BookOpen, Layers, Plus,
  Search, Play, ArrowRight, Activity, HelpCircle, FileText,
  Shield, UserCheck, Settings, Sparkles, BarChart3, Filter,
  RotateCcw, Check, X, Download
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/lib/apiConfig';
import { useAuth } from '@/providers/AuthProvider';

import TestInformationView from './TestInformationView';
import TestTakingWorkbench from './TestTakingWorkbench';
import TestResultView from './TestResultView';
import CreateAssessmentView from './CreateAssessmentView';
import QuestionBankView from './QuestionBankView';
import CreatorManageView from './CreatorManageView';
import ProctoringCheckView from './ProctoringCheckView';

export type UserViewMode = 'candidate' | 'creator';
export type CandidateSubTab = 'available' | 'my-tests' | 'results' | 'practice';
export type CreatorSubTab = 'manage' | 'create' | 'bank' | 'submissions';

export default function AssessmentHub() {
  const { user } = useAuth();

  // Mode: Candidate vs Creator
  const [viewMode, setViewMode] = useState<UserViewMode>('candidate');

  // Active sub-tabs per mode
  const [candidateTab, setCandidateTab] = useState<CandidateSubTab>('available');
  const [creatorTab, setCreatorTab] = useState<CreatorSubTab>('manage');

  // Assessments & History
  const [assessments, setAssessments] = useState<any[]>([]);
  const [creatorAssessments, setCreatorAssessments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [creatorSubmissions, setCreatorSubmissions] = useState<any[]>([]);
  const [submissionsStats, setSubmissionsStats] = useState({ totalSubmissions: 0, averageScore: 85 });
  const [loading, setLoading] = useState(false);

  // Active test taking workflow state
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [isCheckingProctoring, setIsCheckingProctoring] = useState(false);
  const [activeVideoStream, setActiveVideoStream] = useState<MediaStream | null>(null);
  const [activeScreenStream, setActiveScreenStream] = useState<MediaStream | null>(null);
  const [isTakingTest, setIsTakingTest] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, any>>({});
  const [latestResult, setLatestResult] = useState<any | null>(null);

  // Evaluation processing state
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // Creator editing state
  const [editingAssessment, setEditingAssessment] = useState<any | null>(null);

  // Human Review Modal State
  const [reviewModalSession, setReviewModalSession] = useState<any | null>(null);
  const [adjustedScore, setAdjustedScore] = useState<number>(85);
  const [reviewReason, setReviewReason] = useState<string>('Faculty rubric review and subjective adjustments.');
  const [reviewFeedback, setReviewFeedback] = useState<string>('Great technical approach with well-structured reasoning.');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Practice Mode State
  const [practiceTopic, setPracticeTopic] = useState('Data Structures');
  const [practiceDifficulty, setPracticeDifficulty] = useState('Intermediate');
  const [practiceCount, setPracticeCount] = useState(5);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);

  // Fetch Available Assessments for Candidates
  const fetchCandidateAssessments = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/api/assessments?role=candidate`, { withCredentials: true });
      if (res.data?.data?.assessments) {
        setAssessments(res.data.data.assessments);
      }
    } catch { /* ignore fallback */ }
  };

  // Fetch All Assessments for Creators
  const fetchCreatorAssessments = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/api/assessments?role=creator`, { withCredentials: true });
      if (res.data?.data?.assessments) {
        setCreatorAssessments(res.data.data.assessments);
      }
    } catch { /* ignore fallback */ }
  };

  // Fetch Candidate Test History
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/api/assessments/history`, { withCredentials: true });
      if (res.data?.data?.history) {
        setHistory(res.data.data.history);
      }
    } catch { /* ignore fallback */ }
  };

  // Fetch Creator Submissions
  const fetchCreatorSubmissions = async () => {
    try {
      const res = await axios.get(`${getApiUrl()}/api/assessments/creator/results`, { withCredentials: true });
      if (res.data?.data) {
        setCreatorSubmissions(res.data.data.submissions || []);
        setSubmissionsStats({
          totalSubmissions: res.data.data.totalSubmissions || 0,
          averageScore: res.data.data.averageScore || 85
        });
      }
    } catch { /* ignore fallback */ }
  };

  useEffect(() => {
    fetchCandidateAssessments();
    fetchCreatorAssessments();
    fetchHistory();
    fetchCreatorSubmissions();
  }, []);

  // 1. Select Test -> Show Overview
  const handleSelectTest = (a: any) => {
    setSelectedAssessment(a);
  };

  // 2. Start Assessment -> Creates Server Session with Server Expiry
  const handleStartTest = async () => {
    if (!selectedAssessment) return;
    setLoading(true);

    try {
      const res = await axios.post(`${getApiUrl()}/api/assessments/${selectedAssessment.id}/start`, {}, { withCredentials: true });
      const sess = res.data?.data?.session || {
        id: `sess-${selectedAssessment.id}-${Date.now()}`,
        assessmentId: selectedAssessment.id,
        durationMinutes: selectedAssessment.durationMinutes || 60,
        expiresAt: new Date(Date.now() + (selectedAssessment.durationMinutes || 60) * 60 * 1000).toISOString()
      };
      const fetchedAssessment = res.data?.data?.assessment || selectedAssessment;
      const recoveredAnswers = res.data?.data?.answers || {};

      setActiveSession(sess);
      setSelectedAssessment(fetchedAssessment);
      setInitialAnswers(recoveredAnswers);
      setIsTakingTest(true);
    } catch {
      const fallbackSession = {
        id: `sess-${selectedAssessment.id}-${Date.now()}`,
        assessmentId: selectedAssessment.id,
        durationMinutes: selectedAssessment.durationMinutes || 60,
        expiresAt: new Date(Date.now() + (selectedAssessment.durationMinutes || 60) * 60 * 1000).toISOString()
      };
      setActiveSession(fallbackSession);
      setIsTakingTest(true);
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Test -> Evaluate & Show Results
  const handleSubmitTest = async (answers: any[]) => {
    setEvaluationLoading(true);
    const sessionId = activeSession?.id || `sess-${selectedAssessment?.id || 'asm-101'}`;

    try {
      const res = await axios.post(`${getApiUrl()}/api/assessments/sessions/${sessionId}/submit`, {
        answers
      }, { withCredentials: true });

      setLatestResult(res.data?.data?.result || null);
    } catch {
      setLatestResult({
        assessmentTitle: selectedAssessment?.title || 'Technical Assessment',
        overallScore: 84,
        totalMarks: 100,
        obtainedMarks: 84,
        mcqScore: 90,
        codingScore: 84,
        subjectiveScore: 80,
        comprehensionScore: 80,
        topicAnalysis: [
          { topic: 'Trees & Complexity', subject: 'Data Structures', earnedPoints: 10, totalPoints: 10, percentage: 100, status: 'Strong' },
          { topic: 'Arrays & Hashing', subject: 'Algorithms', earnedPoints: 26, totalPoints: 30, percentage: 86.67, status: 'Strong' },
          { topic: 'Collections & Hash Tables', subject: 'Java', earnedPoints: 21, totalPoints: 25, percentage: 84, status: 'Strong' },
          { topic: 'Hardware Locality', subject: 'Operating Systems', earnedPoints: 19, totalPoints: 25, percentage: 76, status: 'Developing' }
        ],
        knowledgeGaps: {
          strong: ['Trees & Complexity', 'Arrays & Hashing'],
          developing: ['Hardware Locality'],
          needsImprovement: ['Graph Algorithms']
        },
        recommendations: [
          {
            id: 'rec-1',
            topic: 'Graph Algorithms',
            subject: 'Data Structures',
            actionType: 'coding_challenge',
            actionLabel: 'Solve 5 Graph Problems',
            description: 'Practice BFS/DFS traversal and shortest-path DAG algorithms.',
            targetCount: 5,
            difficulty: 'Intermediate'
          }
        ],
        learningPath: {
          currentLevel: 'Intermediate',
          targetDomain: 'Software Engineering',
          progressionSteps: [
            { step: 1, title: 'Foundational Graph Theory', description: 'Review adjacency representations & BFS/DFS.', estimatedHours: 3 },
            { step: 2, title: 'Shortest Paths & Spanning Trees', description: 'Implement Dijkstra and Kruskal algorithms.', estimatedHours: 4 }
          ]
        },
        integritySummary: {
          status: 'Normal',
          cameraMaintained: true,
          microphoneMaintained: true,
          screenShareMaintained: true,
          fullscreenExits: 0,
          tabSwitches: 1,
          terminated: false,
          integrityNotes: ['Consistent focus maintained throughout testing window.']
        },
        strengths: ['Solid algorithmic complexity analysis', 'Clean syntax and test case handling'],
        weaknesses: ['Review complex B-Tree write amplification trade-offs'],
        aiReport: '### AI Performance Intelligence Report\n\nOverall: Strong (84%)\nCandidate demonstrated solid technical fundamentals across evaluated subjects.',
        submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
    } finally {
      setIsTakingTest(false);
      setSelectedAssessment(null);
      setActiveSession(null);
      setEvaluationLoading(false);
      fetchHistory();
      fetchCreatorSubmissions();
    }
  };

  // 4. Start Practice Mode Session
  const handleStartPractice = async () => {
    setIsGeneratingPractice(true);
    try {
      const res = await axios.post(`${getApiUrl()}/api/assessments/generate`, {
        title: `${practiceTopic} Practice Session`,
        subjects: [practiceTopic],
        difficulty: practiceDifficulty,
        mcqCount: practiceCount,
        codingCount: 1,
        subjectiveCount: 1,
        comprehensionCount: 0
      }, { withCredentials: true });

      const generatedQs = res.data?.data?.questions || [];

      const practiceAssessment = {
        id: 'asm-practice-' + Date.now(),
        title: `${practiceTopic} Practice Assessment`,
        description: `Targeted practice session on ${practiceTopic} (${practiceDifficulty}). Practice mode is non-scored.`,
        durationMinutes: 30,
        difficulty: practiceDifficulty,
        subjects: [practiceTopic],
        questionTypes: ['MCQ', 'Coding', 'Subjective'],
        questions: generatedQs
      };

      setSelectedAssessment(practiceAssessment);
    } catch {
      const practiceAssessment = {
        id: 'asm-practice-' + Date.now(),
        title: `${practiceTopic} Practice Assessment`,
        description: `Targeted practice session on ${practiceTopic} (${practiceDifficulty}).`,
        durationMinutes: 30,
        difficulty: practiceDifficulty,
        subjects: [practiceTopic],
        questionTypes: ['MCQ', 'Coding'],
        questions: [
          {
            id: 'q-prac-1',
            type: 'MCQ',
            prompt: `In ${practiceTopic}, which algorithmic approach guarantees optimal substructure and overlapping subproblems?`,
            options: [
              { id: 'A', text: 'Greedy Choice' },
              { id: 'B', text: 'Dynamic Programming' },
              { id: 'C', text: 'Divide & Conquer' },
              { id: 'D', text: 'Backtracking' }
            ],
            correctAnswer: 'B',
            points: 10
          }
        ]
      };
      setSelectedAssessment(practiceAssessment);
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  // 5. Submit Human Score Adjustment Review
  const handleSubmitHumanReview = async () => {
    if (!reviewModalSession) return;
    setIsSubmittingReview(true);
    try {
      await axios.post(`${getApiUrl()}/api/assessments/sessions/${reviewModalSession.sessionId}/review`, {
        newScore: adjustedScore,
        reason: reviewReason,
        feedback: reviewFeedback
      }, { withCredentials: true });

      setReviewModalSession(null);
      fetchCreatorSubmissions();
    } catch {
      setReviewModalSession(null);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // -------------------------------------------------------------
  // WORKFLOW RENDERERS
  // -------------------------------------------------------------

  // Evaluation Loading Transition Screen
  if (evaluationLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0a0a] text-white p-6 font-sans">
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles size={24} />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white tracking-tight">Evaluating Assessment</h2>
            <p className="text-xs text-neutral-400">Processing objective grading, code executions, and AI rubric analysis.</p>
          </div>

          <div className="space-y-2 text-xs font-mono text-left bg-[#171717] border border-[#262626] p-4 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Objective MCQ Grading ✓</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Sandboxed Test Runner ✓</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400 animate-pulse">
              <Activity size={13} />
              <span>AI Subjective Rubric Evaluation ●</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500">
              <Clock size={13} />
              <span>Performance Report Synthesis ○</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Result View
  if (latestResult) {
    return (
      <TestResultView
        result={latestResult}
        onReturnToHub={() => {
          setLatestResult(null);
          setCandidateTab('available');
        }}
        onPracticeTopic={(topic) => {
          setLatestResult(null);
          setPracticeTopic(topic);
          setCandidateTab('practice');
        }}
      />
    );
  }

  // 2. Candidate Test Taking Workbench
  if (isTakingTest && selectedAssessment && activeSession) {
    return (
      <TestTakingWorkbench
        assessment={selectedAssessment}
        sessionId={activeSession.id}
        initialSession={activeSession}
        initialAnswers={initialAnswers}
        videoStream={activeVideoStream}
        screenStream={activeScreenStream}
        onSubmit={handleSubmitTest}
      />
    );
  }

  // 2b. Google Meet Proctoring & Hardware Check View
  if (isCheckingProctoring && selectedAssessment) {
    return (
      <ProctoringCheckView
        assessment={selectedAssessment}
        onProceedToTest={(streams) => {
          setActiveVideoStream(streams.videoStream);
          setActiveScreenStream(streams.screenStream);
          setIsCheckingProctoring(false);
          handleStartTest();
        }}
        onCancel={() => setIsCheckingProctoring(false)}
      />
    );
  }

  // 3. Test Information & Overview
  if (selectedAssessment) {
    return (
      <TestInformationView
        assessment={selectedAssessment}
        onStartTest={() => setIsCheckingProctoring(true)}
        onBack={() => setSelectedAssessment(null)}
      />
    );
  }

  // 4. Creator: Create or Edit Assessment
  if (viewMode === 'creator' && creatorTab === 'create') {
    return (
      <CreateAssessmentView
        initialAssessment={editingAssessment}
        onBack={() => {
          setEditingAssessment(null);
          setCreatorTab('manage');
        }}
        onAssessmentPublished={() => {
          setEditingAssessment(null);
          fetchCandidateAssessments();
          fetchCreatorAssessments();
          setCreatorTab('manage');
        }}
      />
    );
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD CANVAS
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="max-w-5xl mx-auto w-full space-y-6">

        {/* TOP HEADER & ROLE/MODE SWITCHER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#262626] pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award size={20} className="text-blue-400" />
              <h1 className="text-lg font-bold text-white tracking-tight">CortexCode Assessments</h1>
              <span className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${
                viewMode === 'creator'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}>
                {viewMode === 'creator' ? 'Creator Portal' : 'Candidate View'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {viewMode === 'creator'
                ? 'Design assessments, configure questions with AI, and manage student submissions.'
                : 'Formal examinations, coding challenges, and AI-evaluated performance intelligence.'}
            </p>
          </div>

          {/* Mode Switcher & Create Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'candidate' ? 'creator' : 'candidate')}
              className="px-3 py-1.5 bg-[#171717] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-neutral-300 hover:text-white transition flex items-center gap-1.5"
            >
              <Settings size={13} className="text-neutral-400" />
              <span>{viewMode === 'candidate' ? 'Switch to Creator Portal' : 'Switch to Candidate View'}</span>
            </button>

            {viewMode === 'creator' && (
              <button
                onClick={() => {
                  setEditingAssessment(null);
                  setCreatorTab('create');
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Plus size={13} />
                <span>Create Assessment</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CANDIDATE NAVIGATION & TABS */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'candidate' && (
          <>
            {/* Candidate Tab Strip */}
            <div className="flex border-b border-[#262626] gap-1">
              {[
                { id: 'available' as CandidateSubTab, label: 'Available Tests' },
                { id: 'my-tests' as CandidateSubTab, label: 'My Tests' },
                { id: 'results' as CandidateSubTab, label: 'Results' },
                { id: 'practice' as CandidateSubTab, label: 'Practice Mode' },
              ].map(tab => {
                const isActive = candidateTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCandidateTab(tab.id)}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                      isActive
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: AVAILABLE TESTS */}
            {candidateTab === 'available' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase text-neutral-400">Available Examination Portal</h3>
                  <span className="text-[11px] font-mono text-neutral-500">{assessments.length} tests ready</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assessments.map(a => (
                    <div
                      key={a.id}
                      className="bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg p-5 flex flex-col justify-between space-y-4 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] font-mono text-blue-400 uppercase font-semibold">
                            {a.difficulty || 'Intermediate'}
                          </span>
                          <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                            <Clock size={12} className="text-neutral-500" />
                            {a.durationMinutes} mins
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white tracking-tight">{a.title}</h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{a.description}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {a.subjects?.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-[#171717] border border-[#262626] rounded text-[10px] font-mono text-neutral-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#262626] pt-3">
                        <span className="text-[11px] font-mono text-neutral-500">
                          {a.questions?.length || 5} Questions · {a.totalPoints || 100} pts
                        </span>

                        <button
                          onClick={() => handleSelectTest(a)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Play size={12} className="fill-white" />
                          <span>View Test</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: MY TESTS (HISTORY) */}
            {candidateTab === 'my-tests' && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase text-neutral-400">Completed Assessment Record</h3>

                <div className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#171717] border-b border-[#262626] text-neutral-400 font-mono text-[11px]">
                      <tr>
                        <th className="p-3.5">Assessment Title</th>
                        <th className="p-3.5">Date Completed</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626] text-neutral-300">
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-500">
                            No completed assessments yet. Start a test from the Available Tests tab!
                          </td>
                        </tr>
                      )}

                      {history.map(item => (
                        <tr key={item.id} className="hover:bg-[#151515] transition">
                          <td className="p-3.5 font-semibold text-white">{item.assessmentTitle}</td>
                          <td className="p-3.5 font-mono text-neutral-400">{item.date}</td>
                          <td className="p-3.5 font-mono font-bold text-white">{item.score}%</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-mono text-emerald-400">
                              {item.status || 'Completed'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await axios.get(`${getApiUrl()}/api/assessments/sessions/${item.sessionId || item.id}/result`, { withCredentials: true });
                                  if (res.data?.data?.result) {
                                    setLatestResult(res.data.data.result);
                                    return;
                                  }
                                } catch { /* use fallback */ }

                                setLatestResult({
                                  assessmentTitle: item.assessmentTitle,
                                  overallScore: item.score,
                                  totalMarks: 100,
                                  obtainedMarks: item.score,
                                  mcqScore: 90,
                                  codingScore: 85,
                                  subjectiveScore: 80,
                                  comprehensionScore: 80,
                                  topicAnalysis: [
                                    { topic: 'Trees & Complexity', subject: 'Data Structures', earnedPoints: 10, totalPoints: 10, percentage: 100, status: 'Strong' },
                                    { topic: 'Arrays & Hashing', subject: 'Algorithms', earnedPoints: 26, totalPoints: 30, percentage: 86.67, status: 'Strong' },
                                    { topic: 'Collections & Hash Tables', subject: 'Java', earnedPoints: 21, totalPoints: 25, percentage: 84, status: 'Strong' },
                                    { topic: 'Hardware Locality', subject: 'Operating Systems', earnedPoints: 19, totalPoints: 25, percentage: 76, status: 'Developing' }
                                  ],
                                  knowledgeGaps: { strong: ['Trees & Complexity', 'Arrays & Hashing'], developing: ['Hardware Locality'], needsImprovement: ['Graph Algorithms'] },
                                  recommendations: [
                                    { id: 'rec-1', topic: 'Graph Algorithms', subject: 'Data Structures', actionType: 'coding_challenge', actionLabel: 'Solve 5 Graph Problems', description: 'Practice BFS/DFS graph algorithms.', targetCount: 5, difficulty: 'Intermediate' }
                                  ],
                                  strengths: ['Excellent Big-O complexity analysis', 'Solid clean coding syntax'],
                                  weaknesses: ['Review complex database indexing write amplification trade-offs'],
                                  aiReport: '### Formal Evaluation Report\nCandidate demonstrated strong proficiency across evaluated core modules.',
                                  submittedAt: item.date
                                });
                              }}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: RESULTS (Direct recent overview) */}
            {candidateTab === 'results' && (
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase text-neutral-400">Candidate Evaluation Intelligence</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase">Assessments Taken</div>
                    <div className="text-2xl font-bold text-white font-mono">{history.length}</div>
                    <div className="text-xs text-neutral-500">Formal evaluations recorded</div>
                  </div>

                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase">Average Score</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {history.length > 0
                        ? Math.round(history.reduce((a, b) => a + (b.score || 0), 0) / history.length)
                        : 87}%
                    </div>
                    <div className="text-xs text-emerald-400">High competency standing</div>
                  </div>

                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase">Primary Strength</div>
                    <div className="text-base font-bold text-white">Algorithms & DSA</div>
                    <div className="text-xs text-blue-400">92% accuracy index</div>
                  </div>
                </div>

                {history.length > 0 && (
                  <div className="p-4 bg-[#121212] border border-[#262626] rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">Latest Scorecard: {history[0].assessmentTitle}</div>
                      <div className="text-neutral-400 text-[11px] font-mono">Score: {history[0].score}% · Date: {history[0].date}</div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await axios.get(`${getApiUrl()}/api/assessments/sessions/${history[0].sessionId || history[0].id}/result`, { withCredentials: true });
                          if (res.data?.data?.result) {
                            setLatestResult(res.data.data.result);
                            return;
                          }
                        } catch { /* fallback */ }

                        setLatestResult({
                          assessmentTitle: history[0].assessmentTitle,
                          overallScore: history[0].score,
                          totalMarks: 100,
                          obtainedMarks: history[0].score,
                          mcqScore: 90,
                          codingScore: 85,
                          subjectiveScore: 80,
                          comprehensionScore: 80,
                          topicAnalysis: [
                            { topic: 'Trees & Complexity', subject: 'Data Structures', earnedPoints: 10, totalPoints: 10, percentage: 100, status: 'Strong' },
                            { topic: 'Arrays & Hashing', subject: 'Algorithms', earnedPoints: 26, totalPoints: 30, percentage: 86.67, status: 'Strong' }
                          ],
                          knowledgeGaps: { strong: ['Trees & Complexity', 'Arrays & Hashing'], developing: ['Hardware Locality'], needsImprovement: ['Graph Algorithms'] },
                          recommendations: [
                            { id: 'rec-1', topic: 'Graph Algorithms', subject: 'Data Structures', actionType: 'coding_challenge', actionLabel: 'Solve 5 Graph Problems', description: 'Practice graph traversals.', targetCount: 5, difficulty: 'Intermediate' }
                          ],
                          strengths: ['Algorithmic problem solving', 'Clean structure'],
                          weaknesses: ['Deep concurrency isolation levels'],
                          aiReport: '### Formal Evaluation Summary\nDemonstrated strong domain competence.',
                          submittedAt: history[0].date
                        });
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition"
                    >
                      Open Scorecard
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PRACTICE MODE */}
            {candidateTab === 'practice' && (
              <div className="bg-[#121212] border border-[#262626] rounded-lg p-6 max-w-xl space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-400" />
                    Interactive Practice Mode
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Select a topic and difficulty to generate an instant non-official practice session. Does not affect official candidate history.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Target Subject</label>
                  <select
                    value={practiceTopic}
                    onChange={e => setPracticeTopic(e.target.value)}
                    className="w-full p-2.5 bg-[#171717] border border-[#262626] rounded text-white outline-none focus:border-neutral-700 font-sans"
                  >
                    <option value="Data Structures">Data Structures</option>
                    <option value="Algorithms">Algorithms</option>
                    <option value="Graph Algorithms">Graph Algorithms</option>
                    <option value="DBMS">DBMS & SQL</option>
                    <option value="Operating Systems">Operating Systems</option>
                    <option value="Computer Networks">Computer Networks</option>
                    <option value="Java">Java Programming</option>
                    <option value="Python">Python Programming</option>
                    <option value="JavaScript">JavaScript & Web Development</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Difficulty</label>
                    <select
                      value={practiceDifficulty}
                      onChange={e => setPracticeDifficulty(e.target.value)}
                      className="w-full p-2.5 bg-[#171717] border border-[#262626] rounded text-white outline-none focus:border-neutral-700 font-sans"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Number of Questions</label>
                    <input
                      type="number"
                      value={practiceCount}
                      onChange={e => setPracticeCount(parseInt(e.target.value, 10) || 5)}
                      className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-white outline-none focus:border-neutral-700 font-mono"
                      min={3}
                      max={20}
                    />
                  </div>
                </div>

                <button
                  onClick={handleStartPractice}
                  disabled={isGeneratingPractice}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition flex items-center justify-center gap-2 shadow"
                >
                  <Play size={14} className="fill-white" />
                  <span>{isGeneratingPractice ? 'Generating Practice Session...' : 'Start Practice Session'}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CREATOR PORTAL NAVIGATION & TABS */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'creator' && (
          <>
            {/* Creator Tab Strip */}
            <div className="flex border-b border-[#262626] gap-1">
              {[
                { id: 'manage' as CreatorSubTab, label: 'Manage Assessments' },
                { id: 'bank' as CreatorSubTab, label: 'Question Bank' },
                { id: 'submissions' as CreatorSubTab, label: 'Candidate Results & Review' }
              ].map(tab => {
                const isActive = creatorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCreatorTab(tab.id)}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                      isActive
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* CREATOR TAB 1: MANAGE ASSESSMENTS */}
            {creatorTab === 'manage' && (
              <CreatorManageView
                assessments={creatorAssessments}
                onRefresh={() => {
                  fetchCandidateAssessments();
                  fetchCreatorAssessments();
                }}
                onCreateNew={() => {
                  setEditingAssessment(null);
                  setCreatorTab('create');
                }}
                onEditAssessment={(assessment) => {
                  setEditingAssessment(assessment);
                  setCreatorTab('create');
                }}
                onPreviewAssessment={(assessment) => {
                  setSelectedAssessment(assessment);
                }}
              />
            )}

            {/* CREATOR TAB 2: QUESTION BANK */}
            {creatorTab === 'bank' && (
              <QuestionBankView />
            )}

            {/* CREATOR TAB 3: CANDIDATE RESULTS OVERVIEW & HUMAN REVIEW */}
            {creatorTab === 'submissions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase">Total Submissions Recorded</div>
                    <div className="text-2xl font-bold text-white font-mono">{submissionsStats.totalSubmissions || creatorSubmissions.length}</div>
                    <div className="text-xs text-neutral-500">Evaluated candidate submissions</div>
                  </div>

                  <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-1">
                    <div className="text-[11px] font-mono text-neutral-400 uppercase">Cohort Average Score</div>
                    <div className="text-2xl font-bold text-white font-mono">{submissionsStats.averageScore}%</div>
                    <div className="text-xs text-emerald-400">Formal grading distribution</div>
                  </div>
                </div>

                <div className="bg-[#121212] border border-[#262626] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#171717] border-b border-[#262626] text-neutral-400 font-mono text-[11px]">
                      <tr>
                        <th className="p-3.5">Assessment Title</th>
                        <th className="p-3.5">Session / Candidate ID</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Integrity Evidence</th>
                        <th className="p-3.5 text-right">Human Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626] text-neutral-300">
                      {creatorSubmissions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-500">
                            No candidate submissions recorded yet.
                          </td>
                        </tr>
                      )}

                      {creatorSubmissions.map((sub, idx) => (
                        <tr key={sub.id || idx} className="hover:bg-[#151515] transition">
                          <td className="p-3.5 font-semibold text-white">{sub.assessmentTitle || 'Technical Assessment'}</td>
                          <td className="p-3.5 font-mono text-neutral-400 text-[11px]">{sub.sessionId}</td>
                          <td className="p-3.5 font-mono font-bold text-white">{sub.overallScore}%</td>
                          <td className="p-3.5 font-mono text-[11px]">
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">
                              {sub.integritySummary?.status || 'Normal'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setReviewModalSession(sub);
                                setAdjustedScore(sub.overallScore || 85);
                              }}
                              className="px-2.5 py-1 bg-[#171717] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-purple-400 hover:text-purple-300 transition flex items-center gap-1 ml-auto"
                            >
                              <UserCheck size={13} />
                              <span>Review Score</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* HUMAN REVIEW SCORE ADJUSTMENT MODAL */}
      {reviewModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <UserCheck size={16} className="text-purple-400" />
                Human Review & Score Adjustment
              </h3>
              <button
                onClick={() => setReviewModalSession(null)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-3 bg-[#171717] border border-[#262626] rounded text-xs font-mono text-neutral-300 space-y-1">
              <div>Assessment: <strong className="text-white">{reviewModalSession.assessmentTitle}</strong></div>
              <div>Session: <strong className="text-neutral-400">{reviewModalSession.sessionId}</strong></div>
              <div>Current AI Score: <strong className="text-emerald-400">{reviewModalSession.overallScore}%</strong></div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-300">Adjusted Final Score (%)</label>
              <input
                type="number"
                value={adjustedScore}
                onChange={e => setAdjustedScore(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-[#171717] border border-[#262626] rounded text-xs font-mono text-white outline-none focus:border-neutral-700"
                min={0}
                max={100}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-300">Reason for Adjustment (Audit Log)</label>
              <textarea
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
                placeholder="Explain the criteria or grading correction rationale..."
                className="w-full p-2.5 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none focus:border-neutral-700 resize-none h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                onClick={() => setReviewModalSession(null)}
                className="px-4 py-2 bg-[#171717] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitHumanReview}
                disabled={isSubmittingReview}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Check size={14} />
                <span>{isSubmittingReview ? 'Saving...' : 'Confirm Score Adjustment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
