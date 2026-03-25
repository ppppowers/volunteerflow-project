'use client';

import { useState } from 'react';
import { Terminal, Play, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { API_ROUTES, addLog, type ApiRoute, type HttpMethod } from '@/lib/devPortal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    'bg-sky-500/20 text-sky-300',
  POST:   'bg-emerald-500/20 text-emerald-300',
  PUT:    'bg-amber-500/20 text-amber-300',
  DELETE: 'bg-red-500/20 text-red-300',
  PATCH:  'bg-violet-500/20 text-violet-300',
};

const STATUS_COLORS: Record<number, string> = {};
function statusColor(code: number): string {
  if (code >= 500) return 'text-red-400';
  if (code >= 400) return 'text-amber-400';
  if (code >= 300) return 'text-sky-400';
  if (code >= 200) return 'text-emerald-400';
  return 'text-zinc-400';
}

interface TestResult {
  status: number;
  ok: boolean;
  body: string;
  ms: number;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function RouteRow({ route, base }: { route: ApiRoute; base: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [customPath, setCustomPath] = useState(route.path);

  // Only allow testing GET routes that don't have :params (without substitution)
  const canTest = route.method === 'GET' && !customPath.includes(':');

  async function test() {
    const url = base.replace(/\/api$/, '') + customPath;
    setLoading(true);
    setResult(null);
    const t0 = Date.now();
    try {
      const res = await fetch(url);
      const ms  = Date.now() - t0;
      let body = '';
      try { body = JSON.stringify(await res.json(), null, 2); } catch { body = await res.text(); }
      setResult({ status: res.status, ok: res.ok, body, ms });
      addLog(res.ok ? 'success' : 'warn', 'api_inspector', `${route.method} ${customPath} → ${res.status}`, `${ms}ms`);
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ status: 0, ok: false, body: msg, ms });
      addLog('error', 'api_inspector', `${route.method} ${customPath} failed`, msg);
    }
    setLoading(false);
  }

  return (
    <div className="border-b border-zinc-700/50 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-700/20 cursor-pointer transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold w-16 text-center ${METHOD_COLORS[route.method]}`}>
          {route.method}
        </span>
        <span className="flex-1 font-mono text-sm text-zinc-300 truncate">{route.path}</span>
        <span className="hidden sm:block text-xs text-zinc-600 flex-1 truncate">{route.description}</span>
        <span className="text-xs text-zinc-600 px-2 py-0.5 bg-zinc-700/50 rounded">{route.category}</span>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-600 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 bg-zinc-900/40 space-y-3">
          {/* URL override */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">URL (edit to replace :params)</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 py-2 bg-zinc-900 border border-r-0 border-zinc-700 rounded-l-lg text-xs text-zinc-600 font-mono whitespace-nowrap">
                {base.replace(/\/api$/, '')}
              </span>
              <input
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-r-lg focus:ring-1 focus:ring-amber-500/50 outline-none"
              />
            </div>
          </div>
          {/* Test button */}
          <div className="flex items-center gap-3">
            <button
              onClick={test}
              disabled={!canTest || loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-bold rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Sending…' : 'Send Request'}
            </button>
            {!canTest && route.method !== 'GET' && (
              <span className="text-xs text-zinc-600">Only GET requests can be tested here.</span>
            )}
            {!canTest && route.method === 'GET' && customPath.includes(':') && (
              <span className="text-xs text-zinc-600">Replace <code className="text-amber-500">:param</code> in the URL first.</span>
            )}
          </div>
          {/* Result */}
          {result && (
            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800">
                <span className={`text-sm font-bold ${statusColor(result.status)}`}>
                  {result.status || 'ERR'}
                </span>
                <span className="text-xs text-zinc-600">{result.ms}ms</span>
                {result.ok && <span className="text-xs text-emerald-400 font-medium">OK</span>}
                {!result.ok && <span className="text-xs text-red-400 font-medium">FAILED</span>}
              </div>
              <pre className="px-4 py-3 text-xs text-zinc-300 overflow-x-auto max-h-60 whitespace-pre-wrap break-all leading-relaxed">
                {result.body}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiInspectorSection() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

  const categories = Array.from(new Set(API_ROUTES.map((r) => r.category)));
  const filtered = categoryFilter === 'all'
    ? API_ROUTES
    : API_ROUTES.filter((r) => r.category === categoryFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">API Inspector</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Browse and test backend API endpoints. Base URL:{' '}
            <code className="text-amber-400 text-xs">{base.replace(/\/api$/, '')}</code>
          </p>
        </div>
        <a
          href={base.replace(/\/api$/, '') + '/health'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Health check
        </a>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...categories]).map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              categoryFilter === c
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Route list */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-700 flex items-center gap-3">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            {filtered.length} Route{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        {filtered.map((route) => (
          <RouteRow key={`${route.method}-${route.path}`} route={route} base={base} />
        ))}
      </div>
    </div>
  );
}
