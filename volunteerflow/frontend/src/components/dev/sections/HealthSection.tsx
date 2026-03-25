'use client';

import { useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { getModules, getDevConfig, getLogs } from '@/lib/devPortal';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthStatus = 'ok' | 'warn' | 'error' | 'loading';

interface HealthCheck {
  id: string;
  label: string;
  description: string;
  status: HealthStatus;
  message: string;
  latencyMs?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<HealthStatus, { Icon: React.ElementType; color: string; label: string }> = {
  ok:      { Icon: CheckCircle,  color: 'text-emerald-400', label: 'Healthy' },
  warn:    { Icon: AlertCircle,  color: 'text-amber-400',   label: 'Warning' },
  error:   { Icon: XCircle,      color: 'text-red-400',     label: 'Error' },
  loading: { Icon: Clock,        color: 'text-zinc-500',    label: 'Checking…' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HealthSection() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);

    // Seed with loading states
    const initial: HealthCheck[] = [
      { id: 'api',        label: 'Backend API',       description: 'Express.js server at localhost:3001',       status: 'loading', message: 'Checking…' },
      { id: 'storage',    label: 'Local Storage',     description: 'Browser storage for app state',             status: 'loading', message: 'Checking…' },
      { id: 'modules',    label: 'System Modules',    description: 'All modules enabled and active',            status: 'loading', message: 'Checking…' },
      { id: 'flags',      label: 'Feature Flags',     description: 'Feature flag config accessible',            status: 'loading', message: 'Checking…' },
      { id: 'maintenance',label: 'Maintenance Mode',  description: 'App should be accessible to all users',     status: 'loading', message: 'Checking…' },
      { id: 'signup',     label: 'Signup System',     description: 'Signup registrations are open',             status: 'loading', message: 'Checking…' },
      { id: 'logs',       label: 'Log System',        description: 'Log storage operational',                   status: 'loading', message: 'Checking…' },
    ];
    setChecks(initial);

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/api$/, '');

    // Run all checks concurrently-ish
    const results: HealthCheck[] = [...initial];

    // 1. Backend API
    const t0 = Date.now();
    try {
      const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(5000) });
      const ms = Date.now() - t0;
      results[0] = { ...results[0], status: res.ok ? 'ok' : 'warn', message: res.ok ? `Responded in ${ms}ms` : `HTTP ${res.status}`, latencyMs: ms };
    } catch {
      results[0] = { ...results[0], status: 'error', message: 'Connection refused — backend may be offline' };
    }
    setChecks([...results]);

    // 2. Local storage
    try {
      const key = '_vf_health_test';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      results[1] = { ...results[1], status: 'ok', message: 'Read/write access confirmed' };
    } catch {
      results[1] = { ...results[1], status: 'error', message: 'localStorage not accessible' };
    }
    setChecks([...results]);

    // 3. Modules
    const modules = getModules();
    const errorMods = modules.filter((m) => m.status === 'error');
    const warnMods  = modules.filter((m) => m.status === 'warning');
    const disabledMods = modules.filter((m) => !m.enabled);
    if (errorMods.length > 0) {
      results[2] = { ...results[2], status: 'error', message: `${errorMods.length} module(s) in error state: ${errorMods.map(m => m.name).join(', ')}` };
    } else if (warnMods.length > 0) {
      results[2] = { ...results[2], status: 'warn', message: `${warnMods.length} warning(s) · ${disabledMods.length} disabled` };
    } else {
      results[2] = { ...results[2], status: 'ok', message: `${modules.filter(m => m.enabled).length}/${modules.length} modules active` };
    }
    setChecks([...results]);

    // 4. Feature flags
    try {
      const flags = JSON.parse(localStorage.getItem('vf_feature_flags') ?? 'null');
      results[3] = { ...results[3], status: 'ok', message: flags ? `${flags.length} flags loaded from storage` : 'Using defaults' };
    } catch {
      results[3] = { ...results[3], status: 'warn', message: 'Could not parse flag config' };
    }
    setChecks([...results]);

    // 5. Maintenance mode
    const cfg = getDevConfig();
    results[4] = {
      ...results[4],
      status: cfg.maintenanceMode ? 'warn' : 'ok',
      message: cfg.maintenanceMode ? 'MAINTENANCE MODE IS ON — users are blocked' : 'App is accessible to all users',
    };
    setChecks([...results]);

    // 6. Signup system
    results[5] = {
      ...results[5],
      status: cfg.signupEnabled ? 'ok' : 'warn',
      message: cfg.signupEnabled ? 'New registrations are open' : 'Signups are currently disabled',
    };
    setChecks([...results]);

    // 7. Logs
    const logs = getLogs();
    const recentErrors = logs.filter(
      (l) => l.level === 'error' && Date.now() - new Date(l.timestamp).getTime() < 3600000,
    );
    results[6] = {
      ...results[6],
      status: recentErrors.length > 3 ? 'warn' : 'ok',
      message: `${logs.length} entries · ${recentErrors.length} errors in last hour`,
    };
    setChecks([...results]);

    setLastRun(new Date());
    setRunning(false);
  }

  useEffect(() => { runChecks(); }, []);

  const okCount    = checks.filter((c) => c.status === 'ok').length;
  const warnCount  = checks.filter((c) => c.status === 'warn').length;
  const errorCount = checks.filter((c) => c.status === 'error').length;

  const overallStatus: HealthStatus = errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : running ? 'loading' : 'ok';
  const { Icon: OverallIcon, color: overallColor } = STATUS_CONFIG[overallStatus];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">System Health</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {lastRun ? `Last checked ${lastRun.toLocaleTimeString()}` : 'Running checks…'}
          </p>
        </div>
        <button
          onClick={runChecks}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          Re-run checks
        </button>
      </div>

      {/* Overall banner */}
      <div className={`flex items-center gap-4 p-5 rounded-xl border ${
        overallStatus === 'ok'      ? 'bg-emerald-500/5 border-emerald-500/30' :
        overallStatus === 'warn'    ? 'bg-amber-500/5 border-amber-500/30' :
        overallStatus === 'error'   ? 'bg-red-500/5 border-red-500/30' :
        'bg-zinc-800 border-zinc-700'
      }`}>
        <OverallIcon className={`w-8 h-8 ${overallColor} flex-shrink-0`} />
        <div>
          <p className={`font-semibold ${overallColor}`}>
            {overallStatus === 'ok'    && 'All systems operational'}
            {overallStatus === 'warn'  && 'Some systems need attention'}
            {overallStatus === 'error' && 'System errors detected'}
            {overallStatus === 'loading' && 'Running health checks…'}
          </p>
          <p className="text-sm text-zinc-500 mt-0.5">
            {okCount} healthy · {warnCount} warnings · {errorCount} errors
          </p>
        </div>
      </div>

      {/* Individual checks */}
      <div className="grid grid-cols-1 gap-3">
        {checks.map((check) => {
          const { Icon, color, label } = STATUS_CONFIG[check.status];
          return (
            <div key={check.id} className="flex items-center gap-4 px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-xl">
              <Icon className={`w-5 h-5 flex-shrink-0 ${color} ${check.status === 'loading' ? 'animate-pulse' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-zinc-200">{check.label}</p>
                  {check.latencyMs !== undefined && (
                    <span className="text-[10px] text-zinc-600 font-mono">{check.latencyMs}ms</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{check.description}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${color}`}>{label}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5 max-w-[200px] text-right">{check.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
