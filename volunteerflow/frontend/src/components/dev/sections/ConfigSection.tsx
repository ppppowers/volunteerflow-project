'use client';

import { useEffect, useState } from 'react';
import { Wrench, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { getDevConfig, saveDevConfig, DEFAULT_CONFIG, addLog, type DevConfig } from '@/lib/devPortal';

const inputCls =
  'w-full px-3 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none placeholder-zinc-600 transition-colors';

const labelCls = 'block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function ConfigSection() {
  const [cfg, setCfg] = useState<DevConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);

  useEffect(() => { setCfg(getDevConfig()); }, []);

  function set<K extends keyof DevConfig>(key: K, value: DevConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function save() {
    saveDevConfig(cfg);
    addLog('info', 'dev_portal', 'Global configuration saved');
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    if (!pendingReset) { setPendingReset(true); return; }
    setCfg(DEFAULT_CONFIG);
    saveDevConfig(DEFAULT_CONFIG);
    setDirty(false);
    setPendingReset(false);
    addLog('warn', 'dev_portal', 'Configuration reset to defaults');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
        <p className="text-sm text-zinc-500 mt-1">Global application settings. Changes persist to local storage.</p>
      </div>

      {/* App Info */}
      <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" /> Application Info
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="App Name">
            <input value={cfg.appName} onChange={(e) => set('appName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Organization Name">
            <input value={cfg.orgName} onChange={(e) => set('orgName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Support Email">
            <input type="email" value={cfg.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Access Control */}
      <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-300">Access Control</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Signup Registrations</p>
              <p className="text-xs text-zinc-500">Allow new users to register</p>
            </div>
            <button
              onClick={() => set('signupEnabled', !cfg.signupEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${cfg.signupEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.signupEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <Field label="Signup Closed Message">
            <textarea
              value={cfg.signupClosedMessage}
              onChange={(e) => set('signupClosedMessage', e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </Field>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-zinc-200">Maintenance Mode</p>
              <p className="text-xs text-zinc-500">Show maintenance page to non-admins</p>
            </div>
            <button
              onClick={() => set('maintenanceMode', !cfg.maintenanceMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${cfg.maintenanceMode ? 'bg-amber-500' : 'bg-zinc-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {cfg.maintenanceMode && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">Maintenance mode is ON. Non-admin users will be blocked.</p>
            </div>
          )}

          <Field label="Maintenance Message">
            <textarea
              value={cfg.maintenanceMessage}
              onChange={(e) => set('maintenanceMessage', e.target.value)}
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </Field>
        </div>
      </section>

      {/* Security */}
      <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-300">Security</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Login Attempts">
            <input
              type="number"
              min={1}
              max={20}
              value={cfg.maxLoginAttempts}
              onChange={(e) => set('maxLoginAttempts', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Session Timeout (minutes)">
            <input
              type="number"
              min={5}
              max={1440}
              value={cfg.sessionTimeoutMinutes}
              onChange={(e) => set('sessionTimeoutMinutes', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm font-medium text-zinc-200">Debug Mode</p>
            <p className="text-xs text-zinc-500">Log extra detail for debugging</p>
          </div>
          <button
            onClick={() => set('debugMode', !cfg.debugMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${cfg.debugMode ? 'bg-violet-500' : 'bg-zinc-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.debugMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-sm font-semibold rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" /> Save Changes
        </button>
        {pendingReset ? (
          <>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/40 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Confirm Reset
            </button>
            <button
              onClick={() => setPendingReset(false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset Defaults
          </button>
        )}
        {saved && <span className="text-sm text-emerald-400 font-medium">Saved!</span>}
        {dirty && !saved && <span className="text-xs text-amber-400">Unsaved changes</span>}
      </div>
    </div>
  );
}
