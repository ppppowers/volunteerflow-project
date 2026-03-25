'use client';

import { useEffect, useState } from 'react';
import { ScrollText, Trash2, RefreshCw, Search, Download } from 'lucide-react';
import { getLogs, clearLogs, addLog, type LogEntry, type LogLevel } from '@/lib/devPortal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<LogLevel, { label: string; text: string; bg: string; dot: string }> = {
  success: { label: 'SUCCESS', text: 'text-emerald-400', bg: 'bg-emerald-400/10',  dot: 'bg-emerald-400' },
  info:    { label: 'INFO',    text: 'text-sky-400',     bg: 'bg-sky-400/10',      dot: 'bg-sky-400' },
  warn:    { label: 'WARN',    text: 'text-amber-400',   bg: 'bg-amber-400/10',    dot: 'bg-amber-400' },
  error:   { label: 'ERROR',   text: 'text-red-400',     bg: 'bg-red-400/10',      dot: 'bg-red-400' },
  debug:   { label: 'DEBUG',   text: 'text-violet-400',  bg: 'bg-violet-400/10',   dot: 'bg-violet-400' },
};

const LEVELS: (LogLevel | 'all')[] = ['all', 'error', 'warn', 'info', 'success', 'debug'];

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) +
    ' ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LogsSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);

  function load() { setLogs(getLogs()); }

  useEffect(() => { load(); }, []);

  function handleClear() {
    if (!pendingClear) { setPendingClear(true); return; }
    clearLogs();
    addLog('info', 'dev_portal', 'Logs cleared by admin');
    load();
    setPendingClear(false);
  }

  function exportLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vf-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sources = Array.from(new Set(logs.map((l) => l.source))).sort();

  const filtered = logs.filter((l) => {
    const q = query.toLowerCase();
    const matchQ = !q || l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q) || (l.detail ?? '').toLowerCase().includes(q);
    const matchL = levelFilter === 'all' || l.level === levelFilter;
    const matchS = sourceFilter === 'all' || l.source === sourceFilter;
    return matchQ && matchL && matchS;
  });

  const errorCount   = logs.filter((l) => l.level === 'error').length;
  const warnCount    = logs.filter((l) => l.level === 'warn').length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Logs & Debug</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {logs.length} entries · {errorCount} errors · {warnCount} warnings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {pendingClear ? (
            <>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm Clear
              </button>
              <button
                onClick={() => setPendingClear(false)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Level counts */}
      <div className="flex flex-wrap gap-2">
        {(['error', 'warn', 'info', 'success', 'debug'] as LogLevel[]).map((lv) => {
          const count = logs.filter((l) => l.level === lv).length;
          const { label, text, bg, dot } = LEVEL_CONFIG[lv];
          return (
            <button
              key={lv}
              onClick={() => setLevelFilter(levelFilter === lv ? 'all' : lv)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                levelFilter === lv ? `${bg} ${text} ring-1 ring-current/30` : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label} {count}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs…"
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-amber-500/50 outline-none placeholder-zinc-600"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="all">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Log entries */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 font-sans text-sm">No log entries match your filters.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((l) => {
              const { text, bg, dot } = LEVEL_CONFIG[l.level];
              const isOpen = expanded === l.id;
              return (
                <div key={l.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : l.id)}
                    className="w-full text-left flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors group"
                  >
                    {/* Dot */}
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    {/* Level badge */}
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${bg} ${text} w-16 text-center`}>
                      {LEVEL_CONFIG[l.level].label}
                    </span>
                    {/* Timestamp */}
                    <span className="flex-shrink-0 text-zinc-600 w-36">{formatTs(l.timestamp)}</span>
                    {/* Source */}
                    <span className="flex-shrink-0 text-amber-600/80 w-20 truncate">[{l.source}]</span>
                    {/* Message */}
                    <span className={`flex-1 ${text} truncate`}>{l.message}</span>
                    {l.detail && <span className="text-zinc-600 text-[10px] group-hover:text-zinc-500">▾ detail</span>}
                  </button>
                  {isOpen && l.detail && (
                    <div className="px-4 pb-3 pt-0 bg-zinc-800/30">
                      <p className="text-zinc-400 ml-[calc(1.5rem+4rem+9rem+5rem)] whitespace-pre-wrap break-all">{l.detail}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-600">Showing {filtered.length} of {logs.length} entries. Max 500 stored.</p>
    </div>
  );
}
