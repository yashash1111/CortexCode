'use client';

import { useState } from 'react';
import { getBuildPlan } from '@/lib/workspaceApi';

interface Props { workspaceId: string; }

interface PlanItem { feature: string; plan: string; createdAt: string; }

export default function BuildWithMeView({ workspaceId }: Props) {
  const [feature, setFeature] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!feature.trim()) return;
    setLoading(true);
    const { plan } = await getBuildPlan(workspaceId, feature.trim());
    const item: PlanItem = { feature: feature.trim(), plan, createdAt: new Date().toISOString() };
    setPlans(prev => [item, ...prev.slice(0, 2)]);
    setExpanded(item.createdAt);
    setFeature('');
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Build With Me</h2>
        <p className="text-zinc-500 text-sm">Describe a feature and get a step-by-step implementation plan tailored to your codebase.</p>
      </div>

      <div className="bg-zinc-900/50 border border-white/8 rounded-2xl p-5 space-y-4">
        <label className="block text-sm font-medium text-zinc-300">What do you want to build?</label>
        <input
          value={feature}
          onChange={e => setFeature(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
          placeholder="e.g. Add user profile settings with avatar upload"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 text-sm"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !feature.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all"
        >
          {loading ? <><span className="animate-spin">⟳</span> Generating Plan...</> : '🛠 Generate Build Plan'}
        </button>
      </div>

      {plans.map((item, idx) => (
        <div key={item.createdAt} className="bg-zinc-900/50 border border-white/8 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === item.createdAt ? null : item.createdAt)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
          >
            <div>
              <h4 className="text-sm font-semibold text-white">{item.feature}</h4>
              <p className="text-xs text-zinc-600 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="text-zinc-500">{expanded === item.createdAt ? '▲' : '▼'}</span>
          </button>
          {expanded === item.createdAt && (
            <div className="px-5 pb-5">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans bg-zinc-950/50 rounded-xl p-4">{item.plan}</pre>
            </div>
          )}
        </div>
      ))}

      {plans.length === 0 && !loading && (
        <div className="text-center py-12 text-zinc-600">
          <div className="text-4xl mb-3">🛠</div>
          <p>Enter a feature above to generate your first build plan.</p>
        </div>
      )}
    </div>
  );
}
