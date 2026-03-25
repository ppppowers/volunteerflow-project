'use client';

import { useEffect, useState } from 'react';
import {
  Users, Calendar, FileText, Flag, Package,
  AlertTriangle, CheckCircle, TrendingUp, Activity,
} from 'lucide-react';
import {
  getFeatureFlags, getModules, getLogs, getDevConfig,
  type LogEntry,
} from '@/lib/devPortal';
import { mockVolunteers } from '@/pages/volunteers';
import { mockMembers, mockEmployees } from '@/pages/people';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const LOG_COLORS: Record<string, string> = {
  success: 'text-emerald-400',
  info:    'text-sky-400',
  warn:    'text-amber-400',
  error:   'text-red-400',
  debug:   'text-violet-400',
};

const LOG_BG: Record<string, string> = {
  success: 'bg-emerald-400/10',
  info:    'bg-sky-400/10',
  warn:    'bg-amber-400/10',
  error:   'bg-red-400/10',
  debug:   'bg-violet-400/10',
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, Icon, color }: {
  label: string; value: number | string; sub?: string;
  Icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardSection() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [flagsOn, setFlagsOn] = useState(0);
  const [flagsTotal, setFlagsTotal] = useState(0);
  const [modulesOn, setModulesOn] = useState(0);
  const [modulesTotal, setModulesTotal] = useState(0);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const flags = getFeatureFlags();
    setFlagsOn(flags.filter((f) => f.enabled).length);
    setFlagsTotal(flags.length);

    const modules = getModules();
    setModulesOn(modules.filter((m) => m.enabled && m.status !== 'disabled').length);
    setModulesTotal(modules.length);

    const cfg = getDevConfig();
    setSignupEnabled(cfg.signupEnabled);
    setMaintenance(cfg.maintenanceMode);

    setLogs(getLogs().slice(0, 8));
  }, []);

  const totalPeople = mockVolunteers.length + mockMembers.length + mockEmployees.length;
  const errorLogs = logs.filter((l) => l.level === 'error').length;
  const warnLogs  = logs.filter((l) => l.level === 'warn').length;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {maintenance && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Maintenance mode is currently <strong className="ml-1">ON</strong> — non-admin users see the maintenance page.
        </div>
      )}
      {!signupEnabled && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Signups are currently <strong className="ml-1">DISABLED</strong>.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total People"    value={totalPeople}  sub={`${mockVolunteers.length}v · ${mockMembers.length}m · ${mockEmployees.length}e`} Icon={Users}    color="bg-sky-500/20 text-sky-400" />
        <StatCard label="Feature Flags"  value={`${flagsOn}/${flagsTotal}`}  sub="enabled"                  Icon={Flag}     color="bg-violet-500/20 text-violet-400" />
        <StatCard label="Active Modules" value={`${modulesOn}/${modulesTotal}`} sub="running"               Icon={Package}  color="bg-emerald-500/20 text-emerald-400" />
        <StatCard label="Log Alerts"     value={errorLogs + warnLogs} sub={`${errorLogs} errors · ${warnLogs} warns`} Icon={AlertTriangle} color="bg-amber-500/20 text-amber-400" />
      </div>

      {/* Two-column: status + recent logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* System status */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" /> System Status
          </p>
          <div className="space-y-3">
            {[
              { label: 'Signup registrations', ok: signupEnabled },
              { label: 'Maintenance mode',     ok: !maintenance, invert: true },
              { label: `Feature flags (${flagsOn}/${flagsTotal} on)`, ok: flagsOn > 0 },
              { label: `Modules (${modulesOn}/${modulesTotal} active)`, ok: modulesOn === modulesTotal },
              { label: 'Error logs', ok: errorLogs === 0, invert: errorLogs > 0 },
            ].map(({ label, ok, invert }) => {
              const green = invert ? !ok : ok;
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{label}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${green ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${green ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {green ? 'OK' : 'ALERT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
          <p className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" /> Recent Activity
          </p>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs text-zinc-600">No log entries yet.</p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-start gap-2.5">
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${LOG_BG[l.level] ?? ''} ${LOG_COLORS[l.level] ?? 'text-zinc-400'}`}>
                    {l.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{l.message}</p>
                    <p className="text-[10px] text-zinc-600">{l.source} · {timeAgo(l.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* People breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" /> People Breakdown
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Volunteers', count: mockVolunteers.length, color: 'bg-primary-500/20 text-primary-400' },
            { label: 'Members',    count: mockMembers.length,    color: 'bg-indigo-500/20 text-indigo-400' },
            { label: 'Employees',  count: mockEmployees.length,  color: 'bg-emerald-500/20 text-emerald-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${color} mb-2`}>
                <span className="text-lg font-bold">{count}</span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
