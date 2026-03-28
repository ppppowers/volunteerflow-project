import React, { useCallback, useEffect, useState } from 'react';
import { Terminal, Palette, Plus, Trash2 } from 'lucide-react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { PERMISSIONS } from '@/lib/staffPermissions';
import { staffApi } from '@/lib/staffApi';
import { DEFAULT_FLAGS, FlagCategory } from '@/lib/devPortal';

type Settings = Record<string, unknown>;

// ─── Toggle pill ─────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-amber-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-1 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<FlagCategory, string> = {
  core:         'bg-blue-900/40 text-blue-300 border border-blue-700',
  beta:         'bg-amber-900/40 text-amber-300 border border-amber-700',
  experimental: 'bg-purple-900/40 text-purple-300 border border-purple-700',
  deprecated:   'bg-gray-700/60 text-gray-400 border border-gray-600',
};

const CATEGORY_ORDER: FlagCategory[] = ['core', 'beta', 'experimental', 'deprecated'];
const CATEGORY_LABEL: Record<FlagCategory, string> = {
  core:         'Core',
  beta:         'Beta',
  experimental: 'Experimental',
  deprecated:   'Deprecated',
};

// ─── Portal Theme ─────────────────────────────────────────────────────────────

interface PortalTheme {
  id: string;
  name: string;
  description: string;
  badge?: string;
  plan: 'all' | 'grow' | 'enterprise';
  builtIn?: boolean;
  colors: {
    bg: string;
    header: string;
    headerText: string;
    accent: string;
    accentText: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    heroGradient?: string;
  };
}

const PLAN_BADGE: Record<string, string> = {
  all:        'bg-green-900/40 text-green-300 border border-green-700',
  grow:       'bg-blue-900/40 text-blue-300 border border-blue-700',
  enterprise: 'bg-purple-900/40 text-purple-300 border border-purple-700',
};

const PLAN_LABEL: Record<string, string> = {
  all:        'All Plans',
  grow:       'Grow+',
  enterprise: 'Enterprise',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDevConsolePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Per-toggle busy state to prevent double-clicks
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Textarea state for expanded message editors
  const [signupMsg, setSignupMsg]   = useState('');
  const [maintMsg, setMaintMsg]     = useState('');
  const [savingSignupMsg, setSavingSignupMsg] = useState(false);
  const [savingMaintMsg, setSavingMaintMsg]   = useState(false);

  // ── Theme management ────────────────────────────────────────────────────────
  const EMPTY_THEME_FORM = { name: '', description: '', bg: '#f8fafc', header: '#6366f1', accent: '#8b5cf6', text: '#1e293b', plan: 'all' };
  const [showAddTheme, setShowAddTheme]               = useState(false);
  const [themeForm, setThemeForm]                     = useState(EMPTY_THEME_FORM);
  const [confirmDeleteThemeId, setConfirmDeleteThemeId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffApi.get('/settings') as { data: Record<string, unknown> };
      const data: Settings = res.data ?? {};
      setSettings(data);
      // Sync textarea values from fresh data
      setSignupMsg(typeof data.signup_closed_message === 'string' ? data.signup_closed_message : '');
      setMaintMsg(typeof data.maintenance_message    === 'string' ? data.maintenance_message    : '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Generic patch helper ───────────────────────────────────────────────────

  async function patchSetting(key: string, value: unknown, busyKey?: string) {
    if (busyKey) setBusy(b => ({ ...b, [busyKey]: true }));
    setError('');
    try {
      await staffApi.patch(`/settings/${key}`, { value });
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to update ${key}`;
      setError(msg);
    } finally {
      if (busyKey) setBusy(b => ({ ...b, [busyKey]: false }));
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const signupEnabled    = settings.signup_enabled    === true;
  const maintenanceMode  = settings.maintenance_mode  === true;
  const featureFlags     = (settings.feature_flags as Record<string, boolean>) ?? {};

  // ── Feature flag toggle ────────────────────────────────────────────────────

  async function toggleFlag(flagId: string) {
    const current = featureFlags[flagId] !== false; // default true if missing
    const updated  = { ...featureFlags, [flagId]: !current };
    await patchSetting('feature_flags', updated, `flag_${flagId}`);
  }

  // ── Save message helpers ───────────────────────────────────────────────────

  async function saveSignupMessage() {
    setSavingSignupMsg(true);
    setError('');
    try {
      await staffApi.patch('/settings/signup_closed_message', { value: signupMsg });
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save message');
    } finally {
      setSavingSignupMsg(false);
    }
  }

  async function saveMaintMessage() {
    setSavingMaintMsg(true);
    setError('');
    try {
      await staffApi.patch('/settings/maintenance_message', { value: maintMsg });
      await loadSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save message');
    } finally {
      setSavingMaintMsg(false);
    }
  }

  // ── Theme helpers ───────────────────────────────────────────────────────────

  const themes: PortalTheme[] = Array.isArray(settings.themes) ? (settings.themes as PortalTheme[]) : [];

  async function addTheme() {
    if (!themeForm.name.trim()) return;
    const newTheme: PortalTheme = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: themeForm.name.trim(),
      description: themeForm.description.trim() || `${themeForm.name.trim()} theme`,
      plan: themeForm.plan as PortalTheme['plan'],
      colors: {
        bg: themeForm.bg,
        header: themeForm.header,
        headerText: '#ffffff',
        accent: themeForm.accent,
        accentText: '#ffffff',
        card: '#ffffff',
        text: themeForm.text,
        subtext: '#6b7280',
        border: '#e2e8f0',
      },
    };
    await patchSetting('themes', [...themes, newTheme], 'themes_add');
    setThemeForm(EMPTY_THEME_FORM);
    setShowAddTheme(false);
  }

  async function deleteTheme(id: string) {
    await patchSetting('themes', themes.filter(t => t.id !== id), `theme_del_${id}`);
    setConfirmDeleteThemeId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StaffLayout requiredPerm={PERMISSIONS.FEATURE_FLAGS_MANAGE}>
      <PermissionGate perm={PERMISSIONS.FEATURE_FLAGS_MANAGE}>
        <div className="min-h-screen bg-gray-900">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Page header */}
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-amber-400" />
              <h1 className="text-xl font-bold text-gray-100">Dev Console</h1>
            </div>

            {/* Error banner */}
            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Loading spinner */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* ── Section 1: System Toggles ──────────────────────────────── */}
                <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
                  <h2 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
                    System Toggles
                  </h2>

                  {/* Row 1: New Organization Signups */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-100">New Organization Signups</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Controls whether new organizations can register an account.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            signupEnabled
                              ? 'bg-green-900/50 text-green-300 border border-green-700'
                              : 'bg-red-900/50 text-red-300 border border-red-700'
                          }`}
                        >
                          {signupEnabled ? 'Open' : 'Closed'}
                        </span>
                        <Toggle
                          checked={signupEnabled}
                          onChange={() => patchSetting('signup_enabled', !signupEnabled, 'signup_enabled')}
                          disabled={busy.signup_enabled}
                        />
                      </div>
                    </div>

                    {/* Expanded: signup closed message */}
                    {!signupEnabled && (
                      <div className="space-y-2 pl-0 border-t border-gray-700 pt-4">
                        <label className="block text-sm text-gray-300 font-medium">
                          Closed message shown to visitors
                        </label>
                        <textarea
                          value={signupMsg}
                          onChange={e => setSignupMsg(e.target.value)}
                          rows={3}
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={saveSignupMessage}
                            disabled={savingSignupMsg}
                            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingSignupMsg ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-700" />

                  {/* Row 2: Maintenance Mode */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-100">Maintenance Mode</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Displays a maintenance banner to all users when enabled.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            maintenanceMode
                              ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                              : 'bg-green-900/50 text-green-300 border border-green-700'
                          }`}
                        >
                          {maintenanceMode ? 'Maintenance' : 'Live'}
                        </span>
                        <Toggle
                          checked={maintenanceMode}
                          onChange={() => patchSetting('maintenance_mode', !maintenanceMode, 'maintenance_mode')}
                          disabled={busy.maintenance_mode}
                        />
                      </div>
                    </div>

                    {/* Expanded: maintenance message */}
                    {maintenanceMode && (
                      <div className="space-y-2 border-t border-gray-700 pt-4">
                        <label className="block text-sm text-gray-300 font-medium">
                          Maintenance message shown to users
                        </label>
                        <textarea
                          value={maintMsg}
                          onChange={e => setMaintMsg(e.target.value)}
                          rows={3}
                          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={saveMaintMessage}
                            disabled={savingMaintMsg}
                            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingMaintMsg ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* ── Section 2: Portal Themes ───────────────────────────────── */}
                <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <h2 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">Portal Themes</h2>
                    </div>
                    <button
                      onClick={() => setShowAddTheme(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Theme
                    </button>
                  </div>

                  {/* Add theme form */}
                  {showAddTheme && (
                    <div className="bg-gray-900 border border-gray-600 rounded-xl p-4 space-y-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Theme</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Theme name</label>
                          <input
                            type="text"
                            value={themeForm.name}
                            onChange={e => setThemeForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Ocean Blue"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Description</label>
                          <input
                            type="text"
                            value={themeForm.description}
                            onChange={e => setThemeForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="e.g. Calming teal palette for environmental orgs."
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Background</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={themeForm.bg} onChange={e => setThemeForm(f => ({ ...f, bg: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-600 bg-transparent cursor-pointer p-0.5" />
                            <span className="text-sm text-gray-300 font-mono">{themeForm.bg}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Header / Primary</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={themeForm.header} onChange={e => setThemeForm(f => ({ ...f, header: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-600 bg-transparent cursor-pointer p-0.5" />
                            <span className="text-sm text-gray-300 font-mono">{themeForm.header}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Accent / CTA</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={themeForm.accent} onChange={e => setThemeForm(f => ({ ...f, accent: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-600 bg-transparent cursor-pointer p-0.5" />
                            <span className="text-sm text-gray-300 font-mono">{themeForm.accent}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Body text</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={themeForm.text} onChange={e => setThemeForm(f => ({ ...f, text: e.target.value }))} className="w-9 h-9 rounded-lg border border-gray-600 bg-transparent cursor-pointer p-0.5" />
                            <span className="text-sm text-gray-300 font-mono">{themeForm.text}</span>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Lock to plan</label>
                          <select
                            value={themeForm.plan}
                            onChange={e => setThemeForm(f => ({ ...f, plan: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="all">All Plans</option>
                            <option value="grow">Grow+ only</option>
                            <option value="enterprise">Enterprise only</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => { setShowAddTheme(false); setThemeForm(EMPTY_THEME_FORM); }}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addTheme}
                          disabled={!themeForm.name.trim() || !!busy.themes_add}
                          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 transition-colors"
                        >
                          {busy.themes_add ? 'Saving…' : 'Add Theme'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Theme list */}
                  {themes.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      No themes yet. Add one above.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700 rounded-lg border border-gray-700 overflow-hidden">
                      {themes.map(theme => (
                        <div key={theme.id} className="flex items-center gap-4 px-4 py-3 bg-gray-800/50 hover:bg-gray-700/30">
                          {/* Color swatches */}
                          <div className="flex gap-1.5 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full border border-gray-600 shadow-sm" style={{ background: theme.colors.header }} />
                            <div className="w-6 h-6 rounded-full border border-gray-600 shadow-sm" style={{ background: theme.colors.accent }} />
                          </div>
                          {/* Name + badges */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-100 text-sm">{theme.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PLAN_BADGE[theme.plan] ?? PLAN_BADGE.all}`}>
                                {PLAN_LABEL[theme.plan] ?? 'All Plans'}
                              </span>
                              {theme.builtIn && (
                                <span className="text-xs text-gray-500">built-in</span>
                              )}
                            </div>
                            {theme.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{theme.description}</p>
                            )}
                          </div>
                          {/* Delete */}
                          {!theme.builtIn && (
                            confirmDeleteThemeId === theme.id ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">Delete?</span>
                                <button
                                  onClick={() => deleteTheme(theme.id)}
                                  disabled={!!busy[`theme_del_${theme.id}`]}
                                  className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {busy[`theme_del_${theme.id}`] ? '…' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteThemeId(null)}
                                  className="px-2.5 py-1 text-xs font-semibold border border-gray-600 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteThemeId(theme.id)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                                title="Delete theme"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── Section 3: Feature Flags ──────────────────────────────── */}
                <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
                  <h2 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
                    Feature Flags
                  </h2>

                  {CATEGORY_ORDER.map(category => {
                    const flagsInCategory = DEFAULT_FLAGS.filter(f => f.category === category);
                    if (flagsInCategory.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                          {CATEGORY_LABEL[category]}
                        </h3>
                        <div className="divide-y divide-gray-700 rounded-lg border border-gray-700 overflow-hidden">
                          {flagsInCategory.map(flag => {
                            const enabled = featureFlags[flag.id] !== false; // default true if missing
                            const isBusy  = busy[`flag_${flag.id}`] ?? false;
                            return (
                              <div
                                key={flag.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-800/50 hover:bg-gray-750"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-gray-100 text-sm">
                                      {flag.name}
                                    </span>
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_BADGE[flag.category]}`}
                                    >
                                      {CATEGORY_LABEL[flag.category]}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400 mt-0.5 truncate">
                                    {flag.description}
                                  </p>
                                </div>
                                <div className="flex-shrink-0">
                                  <Toggle
                                    checked={enabled}
                                    onChange={() => toggleFlag(flag.id)}
                                    disabled={isBusy}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}
          </div>
        </div>
      </PermissionGate>
    </StaffLayout>
  );
}
