'use client';

import { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Check, BookOpen, Layers,
  Code2, HelpCircle, FileText, ArrowRight, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '@/lib/apiConfig';

interface Props {
  onInsertQuestion?: (question: any) => void;
  isSelectMode?: boolean;
}

const ALL_SUBJECTS = [
  'ALL',
  'Data Structures',
  'Algorithms',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'Java',
  'Python',
  'JavaScript',
  'Software Engineering'
];

export default function QuestionBankView({ onInsertQuestion, isSelectMode = false }: Props) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject !== 'ALL') params.append('subject', selectedSubject);
      if (selectedDifficulty !== 'ALL') params.append('difficulty', selectedDifficulty);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (searchQuery) params.append('search', searchQuery);

      const res = await axios.get(`${getApiUrl()}/api/assessments/bank/questions?${params.toString()}`, {
        withCredentials: true
      });
      if (res.data?.data?.questions) {
        setQuestions(res.data.data.questions);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedDifficulty, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleCopyQuestion = (q: any) => {
    if (onInsertQuestion) {
      onInsertQuestion(q);
      setCopiedId(q.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'MCQ': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'CODING': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'SUBJECTIVE': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'COMPREHENSION': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter Controls */}
      <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen size={16} className="text-blue-400" />
              Reusable Question Repository
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Browse, search, and reuse pre-verified technical questions across your assessments.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 w-full sm:w-72">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search topics, questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#171717] border border-[#262626] rounded text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-700"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] rounded text-xs font-semibold text-neutral-300 transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626] text-xs">
          <div className="flex items-center gap-1 text-neutral-400 font-mono text-[11px] mr-1">
            <Filter size={12} />
            <span>Filters:</span>
          </div>

          {/* Subject selector */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-2.5 py-1 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
          >
            {ALL_SUBJECTS.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Subjects' : s}</option>
            ))}
          </select>

          {/* Difficulty selector */}
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Type selector */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-2.5 py-1 bg-[#171717] border border-[#262626] rounded text-xs text-white outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="CODING">Coding Problem</option>
            <option value="SUBJECTIVE">Subjective</option>
            <option value="COMPREHENSION">Comprehension</option>
          </select>

          <span className="text-[11px] font-mono text-neutral-500 ml-auto">
            {questions.length} questions available
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 && !loading && (
          <div className="p-8 bg-[#121212] border border-[#262626] rounded-lg text-center text-neutral-400 text-xs">
            No questions found matching your filter criteria.
          </div>
        )}

        {questions.map((q) => {
          const isCopied = copiedId === q.id;
          return (
            <div
              key={q.id}
              className="bg-[#121212] border border-[#262626] hover:border-neutral-700 rounded-lg p-4 space-y-3 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 border rounded text-[10px] font-mono font-bold uppercase ${getTypeBadgeColor(q.type)}`}>
                    {q.type}
                  </span>
                  <span className="px-2 py-0.5 bg-[#171717] border border-[#262626] rounded text-[10px] font-mono text-neutral-300">
                    {q.subject}
                  </span>
                  {q.topic && (
                    <span className="text-[11px] text-neutral-400 font-mono">
                      · {q.topic}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-500">
                    ({q.difficulty} · {q.points || 10} marks)
                  </span>
                </div>

                {onInsertQuestion && (
                  <button
                    onClick={() => handleCopyQuestion(q)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isCopied ? <Check size={12} /> : <Plus size={12} />}
                    <span>{isCopied ? 'Added' : 'Add to Assessment'}</span>
                  </button>
                )}
              </div>

              {/* Prompt */}
              <div className="text-xs text-neutral-200 font-medium leading-relaxed whitespace-pre-wrap">
                {q.prompt}
              </div>

              {/* MCQ Options Display */}
              {q.type === 'MCQ' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs font-mono">
                  {q.options.map((opt: any) => {
                    const isCorrect = Array.isArray(q.correctAnswer)
                      ? q.correctAnswer.includes(opt.id)
                      : q.correctAnswer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-2 rounded border flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#171717] border-[#262626] text-neutral-400'
                        }`}
                      >
                        <span className="font-bold">{opt.id}.</span>
                        <span className="font-sans text-[11px]">{opt.text}</span>
                        {isCorrect && <Check size={12} className="ml-auto text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation / Rubric info */}
              {q.explanation && (
                <div className="text-[11px] font-mono text-neutral-400 bg-[#0d0d0d] border border-[#262626] p-2 rounded">
                  <strong className="text-neutral-300">Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
