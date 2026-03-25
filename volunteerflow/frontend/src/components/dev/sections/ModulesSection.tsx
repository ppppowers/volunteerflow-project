'use client';

import { useEffect, useState } from 'react';
import { Package, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getModules, saveModules, addLog, type SystemModule, type ModuleStatus } from '@/lib/devPortal';

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; Icon: React.ElementType }> = {
  active:   { label: 'Active',    color: 'text-emerald-400 bg-emerald-400/10',  Icon: CheckCircle },
  warning:  { label: 'Warning',   color: 'text-amber-400 bg-amber-400/10',      Icon: AlertTriangle },
  error:    { label: 'Error',     color: 'text-red-400 bg-red-400/10',          Icon: XCircle },
  disabled: { label: 'Disabled',  color: 'text-zinc-500 bg-zinc-700/40',        Icon: AlertCircle },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ModulesSection() {
  const [modules, setModules] = useState<SystemModule[]>([]);

  useEffect(() => { setModules(getModules()); }, []);

  function toggle(id: string) {
    const next = modules.map((m) =>
      m.id === id
        ? { ...m, enabled: !m.enabled, status: (!m.enabled ? 'active' : 'disabled') as ModuleStatus }
        : m,
    );
    setModules(next);
    saveModules(next);
    const mod = next.find((m) => m.id === id);
    if (mod) {
      addLog(
        mod.enabled ? 'success' : 'warn',
        'modules',
        `Module "${mod.name}" ${mod.enabled ? 'enabled' : 'disabled'}`,
      );
    }
  }

  function refresh(id: string) {
    const next = modules.map((m) =>
      m.id === id
        ? { ...m, lastChecked: new Date().toISOString(), status: m.enabled ? 'active' as ModuleStatus : 'disabled' as ModuleStatus }
        : m,
    );
    setModules(next);
    saveModules(next);
  }

  function refreshAll() {
    const next = modules.map((m) => ({
      ...m,
      lastChecked: new Date().toISOString(),
      status: (m.enabled ? 'active' : 'disabled') as ModuleStatus,
    }));
    setModules(next);
    saveModules(next);
    addLog('info', 'modules', 'All modules refreshed');
  }

  const active   = modules.filter((m) => m.status === 'active').length;
  const warnings = modules.filter((m) => m.status === 'warning').length;
  const errors   = modules.filter((m) => m.status === 'error').length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Module Management</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {active} active · {warnings} warnings · {errors} errors
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh all
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {(['active', 'warning', 'error', 'disabled'] as ModuleStatus[]).map((s) => {
          const count = modules.filter((m) => m.status === s).length;
          const { color, Icon } = STATUS_CONFIG[s];
          return (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${color}`}>
              <Icon className="w-3.5 h-3.5" />
              {count} {s}
            </div>
          );
        })}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 gap-3">
        {modules.map((mod) => {
          const { label, color, Icon } = STATUS_CONFIG[mod.status];
          return (
            <div
              key={mod.id}
              className={`bg-zinc-800 border rounded-xl p-4 transition-colors ${
                mod.enabled ? 'border-zinc-700' : 'border-zinc-700/40 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className={`w-4 h-4 ${mod.enabled ? 'text-amber-400' : 'text-zinc-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-200">{mod.name}</p>
                      <span className="text-[10px] text-zinc-600 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">
                        v{mod.version}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
                        <Icon className="w-3 h-3" /> {label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{mod.description}</p>
                    {mod.dependencies.length > 0 && (
                      <p className="text-[10px] text-zinc-700 mt-1">
                        Deps: {mod.dependencies.join(', ')}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-700 mt-0.5">Last checked {timeAgo(mod.lastChecked)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => refresh(mod.id)}
                    title="Refresh"
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggle(mod.id)} aria-label={mod.enabled ? 'Disable' : 'Enable'}>
                    {mod.enabled
                      ? <ToggleRight className="w-8 h-8 text-emerald-400 hover:text-emerald-300 transition-colors" />
                      : <ToggleLeft  className="w-8 h-8 text-zinc-600 hover:text-zinc-400 transition-colors" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
