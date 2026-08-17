'use client';

import { useState } from 'react';
import { BookOpen, Upload, CheckCircle2, Check, Award } from 'lucide-react';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  mastered: boolean;
}

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const DEFAULT_FLASHCARDS: Flashcard[] = [
  { id: 'fc1', question: 'What is Deadlock in Operating Systems?', answer: 'A state where two or more processes are blocked forever because each is holding a resource that another needs.', mastered: true },
  { id: 'fc2', question: 'What are the 4 conditions required for Deadlock?', answer: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait', mastered: false },
  { id: 'fc3', question: 'What is the difference between Process and Thread?', answer: 'A process is an independent program execution context with separate memory space. A thread is a lightweight execution path sharing process memory.', mastered: true },
];

const DEFAULT_MCQS: MCQ[] = [
  {
    id: 'm1',
    question: 'Which CPU scheduling algorithm gives minimal average waiting time for a set of processes?',
    options: ['First-Come First-Served (FCFS)', 'Shortest Job First (SJF)', 'Round Robin (RR)', 'Priority Scheduling'],
    correctIndex: 1,
    explanation: 'SJF is mathematically optimal for minimizing average waiting time for a given set of processes.'
  },
  {
    id: 'm2',
    question: 'What mechanism prevents race conditions in concurrent multithreaded code?',
    options: ['Virtual Memory', 'Semaphores & Mutex Locks', 'Interrupt Handlers', 'Page Tables'],
    correctIndex: 1,
    explanation: 'Mutexes and Semaphores enforce mutual exclusion around critical sections.'
  }
];

export default function StudyMode() {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz' | 'plan'>('flashcards');
  const [flashcards, setFlashcards] = useState<Flashcard[]>(DEFAULT_FLASHCARDS);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [uploadedMaterial, setUploadedMaterial] = useState<string>('Operating Systems & Concurrency.md');

  const masteredCount = flashcards.filter(f => f.mastered).length;
  const progressPercentage = Math.round((masteredCount / flashcards.length) * 100);

  const toggleMastered = (id: string) => {
    setFlashcards(prev => prev.map(f => f.id === id ? { ...f, mastered: !f.mastered } : f));
  };

  const handleSelectMCQ = (mcqId: string, optionIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [mcqId]: optionIdx }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedMaterial(file.name);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-[#262626] bg-[#121212] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white tracking-tight">AI Study & Tutor Mode</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 border border-blue-500/30 text-blue-400">
              Active Course
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Material: <strong className="text-white font-mono">{uploadedMaterial}</strong>
          </p>
        </div>

        <label className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-white rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition">
          <Upload size={14} />
          <span>Upload Notes / PDF</span>
          <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.md,.pdf,.docx" />
        </label>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-[#0d0d0d] border-b border-[#262626] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-xs font-semibold text-neutral-400">Mastery:</span>
          <div className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-xs font-mono font-semibold text-blue-400">{progressPercentage}%</span>
        </div>

        <div className="text-xs text-neutral-400">
          {masteredCount} of {flashcards.length} mastered
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-6 bg-[#0a0a0a] border-b border-[#262626] gap-1 shrink-0">
        {[
          { id: 'flashcards', label: 'Flashcards', count: flashcards.length },
          { id: 'quiz', label: 'Practice Quiz', count: DEFAULT_MCQS.length },
          { id: 'plan', label: 'Chapter Breakdown', count: 5 }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as unknown)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition ${
                isActive
                  ? 'border-blue-500 text-white bg-[#121212]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded bg-[#1c1c1c] text-[10px] text-neutral-400 font-mono">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

        {/* FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <div className="max-w-xl mx-auto py-6 space-y-4">
            <div
              onClick={() => setShowAnswer(!showAnswer)}
              className="bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg p-6 min-h-[180px] flex flex-col justify-between cursor-pointer transition shadow-sm text-center"
            >
              <div className="text-[10px] font-mono text-neutral-500 uppercase">
                Card {currentCardIndex + 1} of {flashcards.length} · {showAnswer ? 'ANSWER' : 'QUESTION'}
              </div>

              <div className="my-auto py-4 text-sm font-semibold text-white leading-relaxed">
                {showAnswer ? flashcards[currentCardIndex].answer : flashcards[currentCardIndex].question}
              </div>

              <div className="text-[11px] text-blue-400 font-medium">
                {showAnswer ? 'Click to view question' : 'Click to reveal answer'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentCardIndex(prev => (prev > 0 ? prev - 1 : flashcards.length - 1));
                }}
                className="px-3.5 py-1.5 bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-white rounded text-xs font-medium"
              >
                ← Previous
              </button>

              <button
                onClick={() => toggleMastered(flashcards[currentCardIndex].id)}
                className={`px-3.5 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 border ${
                  flashcards[currentCardIndex].mastered
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-[#121212] border-[#262626] text-neutral-300 hover:text-white'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>{flashcards[currentCardIndex].mastered ? 'Mastered' : 'Mark Mastered'}</span>
              </button>

              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentCardIndex(prev => (prev < flashcards.length - 1 ? prev + 1 : 0));
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
              >
                Next Card →
              </button>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {activeTab === 'quiz' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {DEFAULT_MCQS.map((mcq, qIdx) => (
              <div key={mcq.id} className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-3">
                <div className="text-xs font-semibold text-white flex items-start gap-2">
                  <span className="text-blue-400 font-mono">Q{qIdx + 1}.</span>
                  <span>{mcq.question}</span>
                </div>

                <div className="space-y-1.5 pl-4">
                  {mcq.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[mcq.id] === optIdx;
                    const isCorrect = mcq.correctIndex === optIdx;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectMCQ(mcq.id, optIdx)}
                        className={`w-full text-left p-2.5 rounded text-xs transition border flex items-center justify-between ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                              : 'bg-red-950/30 border-red-500/40 text-red-300'
                            : 'bg-[#171717] border-[#262626] hover:bg-[#1f1f1f] text-neutral-300'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && (isCorrect ? <Check size={13} className="text-emerald-400" /> : <span>✕</span>)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PLAN */}
        {activeTab === 'plan' && (
          <div className="max-w-2xl mx-auto space-y-2">
            {[
              { title: '1. Processes & Execution Context', status: 'Completed', progress: 100 },
              { title: '2. Threads & Multithreading Race Conditions', status: 'Completed', progress: 100 },
              { title: '3. CPU Scheduling Algorithms (SJF, FCFS, RR)', status: 'Completed', progress: 100 },
              { title: '4. Deadlocks & Banker Algorithm', status: 'In Progress', progress: 65 },
              { title: '5. Virtual Memory & Page Replacement', status: 'Upcoming', progress: 0 },
            ].map((ch, idx) => (
              <div key={idx} className="p-3 bg-[#121212] border border-[#262626] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${ch.progress === 100 ? 'bg-blue-400' : ch.progress > 0 ? 'bg-amber-400' : 'bg-neutral-700'}`} />
                  <span className="text-xs font-semibold text-white">{ch.title}</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">{ch.status} ({ch.progress}%)</span>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
