'use client';

import { useState } from 'react';
import {
  Clock, HelpCircle, BookOpen, AlertCircle, ArrowLeft, Play,
  Check, Layers, Award, Shield
} from 'lucide-react';

interface Props {
  assessment: {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    difficulty: string;
    subjects: string[];
    questionTypes: string[];
    sections?: any[];
    totalPoints?: number;
    questions?: any[];
  };
  onStartTest: () => void;
  onBack: () => void;
}

export default function TestInformationView({ assessment, onStartTest, onBack }: Props) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const totalPoints = assessment.totalPoints || (assessment.questions?.reduce((acc, q) => acc + (q.points || 10), 0) || 100);
  const questionCount = assessment.questions?.length || 5;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-white font-sans overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-3xl mx-auto w-full space-y-6">

        {/* Back navigation */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Available Tests</span>
        </button>

        {/* Formal Test Header */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[11px] font-mono text-blue-400 uppercase font-semibold">
              Formal Technical Assessment
            </span>
            <span className="text-xs font-mono text-neutral-400">
              Difficulty: <strong className="text-white">{assessment.difficulty || 'Intermediate'}</strong>
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">{assessment.title}</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">{assessment.description}</p>
        </div>

        {/* Test Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
              <Clock size={13} className="text-blue-400" />
              <span>Duration</span>
            </div>
            <div className="text-base font-bold text-white font-mono">{assessment.durationMinutes} mins</div>
          </div>

          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
              <HelpCircle size={13} className="text-blue-400" />
              <span>Questions</span>
            </div>
            <div className="text-base font-bold text-white font-mono">{questionCount} Qs</div>
          </div>

          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
              <Award size={13} className="text-blue-400" />
              <span>Total Marks</span>
            </div>
            <div className="text-base font-bold text-white font-mono">{totalPoints} pts</div>
          </div>

          <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
              <BookOpen size={13} className="text-blue-400" />
              <span>Question Types</span>
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {assessment.questionTypes?.join(', ') || 'MCQ, Coding, Subjective'}
            </div>
          </div>
        </div>

        {/* Section Breakdown (if configured) */}
        {assessment.sections && assessment.sections.length > 0 && (
          <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
              <Layers size={14} className="text-blue-400" />
              Assessment Structure ({assessment.sections.length} Sections)
            </h3>
            <div className="space-y-2">
              {assessment.sections.map((sec, idx) => (
                <div key={sec.id || idx} className="p-3 bg-[#171717] border border-[#262626] rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-mono text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-white">{sec.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Section {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjects Evaluated */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3">
          <h3 className="text-xs font-mono uppercase text-neutral-300">Technical Subjects Covered</h3>
          <div className="flex flex-wrap gap-2">
            {assessment.subjects?.map(s => (
              <span key={s} className="px-2.5 py-1 bg-[#171717] border border-[#262626] rounded text-xs font-mono text-neutral-300">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Candidate Instructions */}
        <div className="bg-[#121212] border border-[#262626] rounded-lg p-5 space-y-3 text-xs text-neutral-300 leading-relaxed">
          <h3 className="text-xs font-mono uppercase text-neutral-300 flex items-center gap-2">
            <AlertCircle size={14} className="text-blue-400" />
            General Candidate Examination Instructions
          </h3>

          <ul className="space-y-2 list-disc list-inside text-neutral-400">
            <li><strong>Auto-Save</strong>: All MCQ selections, coding drafts, and subjective answers are continuously saved to the server.</li>
            <li><strong>Navigation</strong>: You can navigate between questions and return to review marked questions using the Question Navigator.</li>
            <li><strong>Timer</strong>: The timer is server-synchronized and starts immediately upon confirming. When the timer reaches <strong>00:00</strong>, your test will be submitted automatically.</li>
            <li><strong>Coding Sandbox</strong>: For programming challenges, you can compile and execute your code against public test cases prior to submission.</li>
            <li><strong>Finality</strong>: Once submitted, the assessment is processed for formal evaluation and cannot be restarted.</li>
          </ul>
        </div>

        {/* Start Action */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#171717] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-neutral-300 transition"
          >
            Go Back
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Play size={14} className="fill-white" />
            <span>Start Assessment</span>
          </button>
        </div>

      </div>

      {/* PRE-TEST CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight">Ready to begin?</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              The assessment timer begins immediately after you continue. Please ensure you have a reliable connection and sufficient uninterrupted time.
            </p>

            <div className="p-3.5 bg-[#171717] border border-[#262626] rounded text-xs font-mono text-neutral-300 space-y-1.5">
              <div>Assessment: <strong className="text-white">{assessment.title}</strong></div>
              <div>Duration: <strong className="text-white">{assessment.durationMinutes} minutes</strong></div>
              <div>Questions: <strong className="text-white">{questionCount} ({totalPoints} marks)</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-[#171717] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-neutral-400 hover:text-white transition"
              >
                Go Back
              </button>

              <button
                onClick={onStartTest}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition"
              >
                Start Test Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
