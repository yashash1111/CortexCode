'use client';

import React, { useState } from 'react';
import { Sparkles, Play, Loader2 } from 'lucide-react';
import type { CreateInterviewPayload } from './interview.types';

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Software Engineer',
  'Java Developer',
  'Python Developer',
  'Data Analyst',
  'AI/ML Engineer',
  'DevOps Engineer',
  'Custom',
];

const EXPERIENCE_LEVELS = ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5+ years'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const INTERVIEW_TYPES = [
  'Technical',
  'DSA and Problem Solving',
  'Core Computer Science',
  'System Design',
  'Frontend',
  'Backend',
  'Full Stack',
  'HR and Behavioral',
  'Project Discussion',
  'Mixed Interview',
];

export function InterviewSetup({
  onStartInterview,
  isSubmitting,
  initialPreset,
}: {
  onStartInterview: (payload: CreateInterviewPayload) => Promise<void>;
  isSubmitting: boolean;
  initialPreset?: { role?: string; interviewType?: string; difficulty?: string };
}) {
  const [selectedRole, setSelectedRole] = useState(
    initialPreset?.role && ROLES.includes(initialPreset.role) ? initialPreset.role : 'Full Stack Developer'
  );
  const [customRole, setCustomRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('1-3 years');
  const [difficulty, setDifficulty] = useState(initialPreset?.difficulty || 'Intermediate');
  const [interviewType, setInterviewType] = useState(initialPreset?.interviewType || 'Technical');
  const [durationChoice, setDurationChoice] = useState<'10' | '20' | '30' | '45' | '60' | 'custom'>('30');
  const [customDuration, setCustomDuration] = useState('25');
  const [questionChoice, setQuestionChoice] = useState<'5' | '10' | '15' | 'custom'>('5');
  const [customQuestions, setCustomQuestions] = useState('8');

  const [skillsText, setSkillsText] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('TypeScript');
  const [topicsText, setTopicsText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [projectInfo, setProjectInfo] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const role = selectedRole === 'Custom' ? customRole.trim() : selectedRole;
    if (!role || role.length < 2) {
      setError('Please enter a valid job role.');
      return;
    }

    const durationMinutes =
      durationChoice === 'custom' ? Number(customDuration) : Number(durationChoice);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
      setError('Duration must be between 5 and 180 minutes.');
      return;
    }

    const questionLimit =
      questionChoice === 'custom' ? Number(customQuestions) : Number(questionChoice);
    if (!Number.isFinite(questionLimit) || questionLimit < 1 || questionLimit > 30) {
      setError('Question count must be between 1 and 30.');
      return;
    }

    await onStartInterview({
      role,
      experienceLevel,
      difficulty,
      interviewType,
      preferredLanguage: preferredLanguage.trim() || undefined,
      durationMinutes,
      questionLimit,
      skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
      topics: topicsText.split(',').map((t) => t.trim()).filter(Boolean),
      jobDescription: jobDescription.trim() || undefined,
      projectInfo: projectInfo.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-lg space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Configure Your AI Mock Interview</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Adaptive AI interviewer powered by CortexCode&apos;s centralized AI gateway
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-xs text-[var(--status-error)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Job Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {selectedRole === 'Custom' && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Enter custom role (e.g. Staff Security Engineer)"
                className="mt-2 w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Interview Type</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Experience Level</label>
            <div className="flex flex-wrap gap-1.5">
              {EXPERIENCE_LEVELS.map((exp) => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => setExperienceLevel(exp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    experienceLevel === exp
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Difficulty</label>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    difficulty === diff
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Duration (minutes)</label>
            <div className="flex flex-wrap gap-1.5">
              {(['10', '20', '30', '45', '60', 'custom'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationChoice(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    durationChoice === d
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  {d === 'custom' ? 'Custom' : `${d}m`}
                </button>
              ))}
            </div>
            {durationChoice === 'custom' && (
              <input
                type="number"
                min={5}
                max={180}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="mt-2 w-32 px-3 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Question Count</label>
            <div className="flex flex-wrap gap-1.5">
              {(['5', '10', '15', 'custom'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestionChoice(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    questionChoice === q
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-primary)] font-semibold'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  {q === 'custom' ? 'Custom' : `${q} Qs`}
                </button>
              ))}
            </div>
            {questionChoice === 'custom' && (
              <input
                type="number"
                min={1}
                max={30}
                value={customQuestions}
                onChange={(e) => setCustomQuestions(e.target.value)}
                className="mt-2 w-32 px-3 py-1.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none"
              />
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--border-default)] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Preferred Programming Language (optional)
            </label>
            <input
              type="text"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              placeholder="TypeScript, Java, Python, Go..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Skills to Focus On (comma-separated, optional)
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="React, Node.js, PostgreSQL, Redis, System Design"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Topics to Practice (comma-separated, optional)
            </label>
            <input
              type="text"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="Concurrency, Caching, Dynamic Programming"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Project Info / Resume Highlights (optional)
            </label>
            <input
              type="text"
              value={projectInfo}
              onChange={(e) => setProjectInfo(e.target.value)}
              placeholder="Briefly describe a project you want to discuss"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Job Description (optional)
            </label>
            <textarea
              rows={2}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste a target job description to tailor questions..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{isSubmitting ? 'Starting Interview...' : 'Start AI Mock Interview'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
