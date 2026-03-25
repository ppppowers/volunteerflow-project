'use client';

import { useEffect, useState } from 'react';
import { UserCheck, UserX, AlertTriangle, ShieldOff, ShieldCheck, Save } from 'lucide-react';
import { getDevConfig, saveDevConfig, addLog, type DevConfig } from '@/lib/devPortal';

export default function SignupControlSection() {
  const [cfg, setCfg] = useState<DevConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setCfg(getDevConfig()); }, []);

  if (!cfg) return null;

  function toggle() {
    if (!cfg) return;
    const next = { ...cfg, signupEnabled: !cfg.signupEnabled };
    setCfg(next);
    saveDevConfig(next);
    addLog(
      next.signupEnabled ? 'success' : 'warn',
      'dev_portal',
      `Signups ${next.signupEnabled ? 'enabled' : 'disabled'} by admin`,
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function save() {
    if (!cfg) return;
    saveDevConfig(cfg);
    addLog('info', 'dev_portal', 'Signup control settings saved');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const on = cfg.signupEnabled;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Signup Control</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Globally enable or disable new user registrations. When disabled, all signup pages
          show a custom message and form submission is blocked.
        </p>
      </div>

      {/* Big toggle card */}
      <div className={`rounded-xl border p-6 transition-colors ${on ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${on ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {on
                ? <ShieldCheck className="w-6 h-6 text-emerald-400" />
                : <ShieldOff   className="w-6 h-6 text-red-400" />}
            </div>
            <div>
              <p className="font-semibold text-zinc-100">
                Signups are currently <span className={on ? 'text-emerald-400' : 'text-red-400'}>{on ? 'OPEN' : 'CLOSED'}</span>
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                {on ? 'New users can register on volunteer, member, and employee signup forms.'
                     : 'All signup forms are blocked. Existing users are unaffected.'}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggle}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${on ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-zinc-600 focus:ring-zinc-500'}`}
            aria-label={on ? 'Disable signups' : 'Enable signups'}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Custom closed message */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Message shown when signups are closed
        </p>
        <textarea
          value={cfg.signupClosedMessage}
          onChange={(e) => setCfg({ ...cfg, signupClosedMessage: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none resize-none placeholder-zinc-600"
          placeholder="Message to display on signup pages when closed…"
        />
        <p className="text-xs text-zinc-600">
          This message appears on all public signup pages (volunteer, member, employee).
        </p>
      </div>

      {/* Who this affects */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
        <p className="text-sm font-semibold text-zinc-300 mb-3">Affected Signup Pages</p>
        <div className="space-y-2">
          {[
            { label: 'Volunteer Signup',  path: '/apply?type=volunteer',  color: 'bg-primary-500/20 text-primary-400' },
            { label: 'Member Signup',     path: '/apply?type=member',     color: 'bg-indigo-500/20 text-indigo-400' },
            { label: 'Employee Signup',   path: '/apply?type=employee',   color: 'bg-emerald-500/20 text-emerald-400' },
          ].map(({ label, path, color }) => (
            <div key={path} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
              <div className="flex items-center gap-2.5">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>{label}</span>
                <span className="text-xs text-zinc-600 font-mono">{path}</span>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${on ? 'text-emerald-400' : 'text-red-400'}`}>
                {on ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                {on ? 'Open' : 'Blocked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
