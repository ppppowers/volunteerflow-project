'use client';

import { useEffect, useState } from 'react';
import { Flag, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { getFeatureFlags, saveFeatureFlags, addLog, type FeatureFlag, type FlagCategory } from '@/lib/devPortal';

const CAT_COLORS: Record<FlagCategory, string> = {
  core:         'bg-sky-500/15 text-sky-400 border border-sky-500/25',
  beta:         'bg-violet-500/15 text-violet-400 border border-violet-500/25',
  experimental: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  deprecated:   'bg-red-500/15 text-red-400 border border-red-500/25',
};

const CATS: (FlagCategory | 'all')[] = ['all', 'core', 'beta', 'experimental', 'deprecated'];

export default function FeatureFlagsSection() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<FlagCategory | 'all'>('all');

  useEffect(() => { setFlags(getFeatureFlags()); }, []);

  function toggle(id: string) {
    const next = flags.map((f) =>
      f.id === id ? { ...f, enabled: !f.enabled } : f,
    );
    setFlags(next);
    saveFeatureFlags(next);
    const flag = next.find((f) => f.id === id);
    if (flag) {
      addLog(
        flag.enabled ? 'success' : 'warn',
        'feature_flags',
        `Flag "${flag.name}" ${flag.enabled ? 'enabled' : 'disabled'}`,
      );
    }
  }

  function toggleAll(on: boolean) {
    const next = flags.map((f) => ({ ...f, enabled: on }));
    setFlags(next);
    saveFeatureFlags(next);
    addLog('info', 'feature_flags', `All flags ${on ? 'enabled' : 'disabled'} by admin`);
  }

  const filtered = flags.filter((f) => {
    const q = query.toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    const matchC = cat === 'all' || f.category === cat;
    return matchQ && matchC;
  });

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Feature Flags</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {enabledCount} of {flags.length} features enabled. Changes take effect immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            Enable all
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Disable all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search flags…"
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none placeholder-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                cat === c
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Flags grid */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((flag) => (
          <div
            key={flag.id}
            className={`flex items-center justify-between px-5 py-4 bg-zinc-800 border rounded-xl transition-colors ${
              flag.enabled ? 'border-zinc-700' : 'border-zinc-700/40 opacity-60'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <Flag className={`w-4 h-4 flex-shrink-0 ${flag.enabled ? 'text-amber-400' : 'text-zinc-600'}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-zinc-200">{flag.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${CAT_COLORS[flag.category]}`}>
                    {flag.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{flag.description}</p>
                <p className="text-[10px] text-zinc-700 font-mono mt-1">{flag.id}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(flag.id)}
              className="ml-4 flex-shrink-0"
              aria-label={flag.enabled ? 'Disable' : 'Enable'}
            >
              {flag.enabled
                ? <ToggleRight className="w-8 h-8 text-emerald-400 hover:text-emerald-300 transition-colors" />
                : <ToggleLeft  className="w-8 h-8 text-zinc-600 hover:text-zinc-400 transition-colors" />}
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-zinc-600">No flags match your search.</div>
        )}
      </div>
    </div>
  );
}
