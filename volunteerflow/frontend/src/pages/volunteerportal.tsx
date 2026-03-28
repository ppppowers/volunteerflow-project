import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

// ─── Portal API client (uses separate vp_token to avoid conflicts with staff auth) ──

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
const VP_TOKEN_KEY = 'vp_token';

async function portalFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem(VP_TOKEN_KEY) : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({})) as { success?: boolean; data?: T; error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return (json?.success !== undefined && 'data' in json ? json.data : json) as T;
}

const portalApi = {
  get:    <T,>(path: string)               => portalFetch<T>('GET',    path),
  post:   <T,>(path: string, body: unknown) => portalFetch<T>('POST',   path, body),
  put:    <T,>(path: string, body: unknown) => portalFetch<T>('PUT',    path, body),
  delete: <T,>(path: string)               => portalFetch<T>('DELETE', path),
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  signedUp: number;
  role: string;
  description?: string;
}

interface PortalEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  spotsAvailable: number;
  participantCount: number;
  shifts: EventShift[];
}

interface TrainingSection {
  id: string;
  title: string;
  type: 'text' | 'video' | 'file';
  content?: string;
  videoUrl?: string;
  videoCaption?: string;
  filePrompt?: string;
  required: boolean;
}

interface PortalCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  estimatedMinutes: number;
  sections: TrainingSection[];
  dueDate: string | null;
  completedSections: string[];
  completed: boolean;
}

interface PortalSignup {
  id: string;
  event_id: string;
  shift_id: string | null;
  status: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  location: string;
  category: string;
  description: string;
}

interface VolunteerProfile {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  hoursContributed: number;
  status: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function parseEventDate(dateStr: string | null): { month: string; day: string; timeStr: string } {
  if (!dateStr) return { month: '—', day: '—', timeStr: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: '—', day: '—', timeStr: '' };
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function formatEventTime(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';
  const s = parseEventDate(startDate);
  const e = endDate ? parseEventDate(endDate) : null;
  if (!e || !endDate) return s.timeStr;
  const eTime = new Date(endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${s.timeStr} – ${eTime}`;
}

function isUpcoming(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return new Date(dateStr) > new Date();
}

function formatJoinDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (profile: VolunteerProfile) => void }) {
  const [mode, setMode]         = useState<'login' | 'setup'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [loginError, setLoginError] = useState('');
  const [setupDone, setSetupDone]   = useState(false);

  const submitLogin = async () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setLoginError('');
    try {
      const res = await portalFetch<{ token: string; user: { id: string; email: string; fullName: string } }>(
        'POST', '/portal/login', { email: email.trim().toLowerCase(), password }
      );
      sessionStorage.setItem(VP_TOKEN_KEY, res.token);
      const profile = await portalApi.get<VolunteerProfile>('/portal/profile');
      onLogin(profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg === 'no_password') {
        setLoginError('');
        setMode('setup');
      } else if (msg.includes('profile not found')) {
        setLoginError('No volunteer account found for this email. Contact your organization.');
      } else {
        setLoginError('Invalid email or password.');
      }
      sessionStorage.removeItem(VP_TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  const submitSetup = async () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setLoginError('');
    try {
      await portalFetch('POST', '/portal/setup-password', { email: email.trim().toLowerCase(), password });
      setSetupDone(true);
      setMode('login');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const leftPanel = (
    <div className="hidden md:flex md:w-[440px] lg:w-[480px] flex-shrink-0 bg-neutral-900 dark:bg-neutral-950 flex-col justify-end p-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-36 -left-24 w-[500px] h-[500px] rounded-full bg-primary-500 opacity-10" />
        <div className="absolute bottom-20 -right-16 w-72 h-72 rounded-full bg-primary-400 opacity-10" />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-white/70 text-xs font-semibold uppercase tracking-wider">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          Volunteer Portal
        </div>
        <h1 className="text-4xl font-bold text-white leading-tight mb-4">
          Make a <span className="text-primary-400 italic">real</span> difference<br />in your community.
        </h1>
        <p className="text-white/55 text-[15px] leading-relaxed mb-10">
          Sign in to access your upcoming events, track your hours, and connect with your nonprofit team.
        </p>
        <div className="flex gap-8 pt-8 border-t border-white/10">
          {[['3,200+', 'Active volunteers'], ['48k', 'Hours contributed'], ['890', 'Events completed']].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white">{val}</div>
              <div className="text-xs text-white/45 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === 'setup') {
    return (
      <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
        {leftPanel}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[420px]">
            <div className="flex items-center gap-2.5 mb-10">
              <div className="w-9 h-9 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-neutral-900 dark:text-neutral-100 font-bold text-lg">VolunteerFlow</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Create your password</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Set a password for <strong>{email}</strong> to access the portal.</p>
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">{loginError}</div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSetup()}
                  className={`${inputCls} pr-10${errors.password ? ' !border-danger-500 !ring-danger-500/30' : ''}`} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.password}</p>}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Confirm Password</label>
              <input type="password" placeholder="Repeat your password" value={confirm}
                onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSetup()}
                className={`${inputCls}${errors.confirm ? ' !border-danger-500 !ring-danger-500/30' : ''}`} />
              {errors.confirm && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.confirm}</p>}
            </div>
            <button type="button" onClick={submitSetup} disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors mb-3">
              {loading ? 'Setting up…' : 'Create Password →'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setLoginError(''); }}
              className="w-full text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 text-center">
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
      {leftPanel}
      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-neutral-900 dark:text-neutral-100 font-bold text-lg">VolunteerFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Welcome back</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Sign in to your volunteer account to get started.</p>

          {setupDone && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
              Password created! Sign in below.
            </div>
          )}

          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
              {loginError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email Address</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitLogin()}
              className={`${inputCls}${errors.email ? ' !border-danger-500 !ring-danger-500/30' : ''}`} />
            {errors.email && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.email}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitLogin()}
                className={`${inputCls} pr-10${errors.password ? ' !border-danger-500 !ring-danger-500/30' : ''}`} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.password}</p>}
          </div>

          <button type="button" onClick={submitLogin} disabled={loading}
            className="w-full py-2.5 px-4 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors mb-4">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            First time?{' '}
            <button type="button" onClick={() => { setMode('setup'); setLoginError(''); setErrors({}); }}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Create your password
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ profile, onLogout }: { profile: VolunteerProfile; onLogout: () => void }) {
  return (
    <div className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 flex items-center px-4 gap-3 sticky top-0 z-50">
      <div className="flex items-center gap-2 mr-auto">
        <div className="w-7 h-7 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">V</span>
        </div>
        <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">VolunteerFlow</span>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
        Volunteer
      </span>
      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs border-2 border-primary-200 dark:border-primary-700">
        {getInitials(profile.name)}
      </div>
      <button onClick={onLogout} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-2 py-1">
        Sign out
      </button>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

type Tab = 'home' | 'events' | 'myevents' | 'training' | 'profile';

function BottomNav({ tab, setTab, myCount, trainingCount }: { tab: Tab; setTab: (t: Tab) => void; myCount: number; trainingCount: number }) {
  const items: { id: Tab; emoji: string; label: string }[] = [
    { id: 'home',     emoji: '🏠', label: 'Home'      },
    { id: 'events',   emoji: '📅', label: 'Sign Up'   },
    { id: 'myevents', emoji: '✅', label: 'My Events' },
    { id: 'training', emoji: '🎓', label: 'Training'  },
    { id: 'profile',  emoji: '👤', label: 'Profile'   },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex items-stretch z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative ${tab === item.id ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
        >
          <span className="text-xl leading-none relative">
            {item.emoji}
            {item.id === 'myevents' && myCount > 0 && tab !== 'myevents' && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-danger-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{myCount}</span>
            )}
            {item.id === 'training' && trainingCount > 0 && tab !== 'training' && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{trainingCount}</span>
            )}
          </span>
          <span className="text-[10.5px] font-semibold">{item.label}</span>
          {tab === item.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />}
        </button>
      ))}
    </div>
  );
}

// ─── Event Date Block ─────────────────────────────────────────────────────────

function DateBlock({ month, day, dark = false, muted = false }: { month: string; day: string; dark?: boolean; muted?: boolean }) {
  if (dark) return (
    <div className="flex-shrink-0 min-w-[54px] bg-neutral-800 dark:bg-neutral-700 rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">{month}</div>
      <div className="text-xl font-bold text-white leading-none mt-0.5">{day}</div>
    </div>
  );
  if (muted) return (
    <div className="flex-shrink-0 min-w-[54px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{month}</div>
      <div className="text-xl font-bold text-neutral-500 leading-none mt-0.5">{day}</div>
    </div>
  );
  return (
    <div className="flex-shrink-0 min-w-[54px] bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">{month}</div>
      <div className="text-xl font-bold text-primary-700 dark:text-primary-300 leading-none mt-0.5">{day}</div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────

function HomeTab({
  profile, signups, events, setTab,
}: {
  profile: VolunteerProfile;
  signups: PortalSignup[];
  events: PortalEvent[];
  setTab: (t: Tab) => void;
}) {
  const now = new Date();
  const upcomingSignups = signups.filter(s => isUpcoming(s.start_date));
  const pastSignups     = signups.filter(s => !isUpcoming(s.start_date));
  const availableCount  = events.filter(ev => {
    const alreadySigned = signups.some(s => s.event_id === ev.id);
    return !alreadySigned && ev.participantCount < ev.spotsAvailable && isUpcoming(ev.startDate);
  }).length;

  const firstName = profile.firstName || profile.name.split(' ')[0] || 'there';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Hero */}
      <div className="bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-500 opacity-10" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary-400 opacity-8" />
        </div>
        <div className="relative z-10">
          <p className="text-white/50 text-sm mb-1">{greeting} 👋</p>
          <p className="text-2xl font-bold text-white mb-5">Hello, <span className="text-primary-400">{firstName}</span></p>
          <div className="grid grid-cols-3 gap-3">
            {[
              [upcomingSignups.length,            'Upcoming'],
              [pastSignups.length,                'Completed'],
              [`${profile.hoursContributed}h`,   'Hours given'],
            ].map(([val, label]) => (
              <div key={String(label)} className="bg-white/7 border border-white/9 rounded-xl px-3 py-3.5 text-center">
                <div className="text-2xl font-bold text-white leading-none">{val}</div>
                <div className="text-[11px] text-white/45 font-medium mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next events */}
      {upcomingSignups.length > 0 && (
        <div className="mb-5">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Your next events</h3>
          {upcomingSignups.slice(0, 2).map(s => {
            const { month, day } = parseEventDate(s.start_date);
            const time = formatEventTime(s.start_date, s.end_date);
            return (
              <div key={s.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-2.5 flex gap-3 items-center shadow-sm">
                <DateBlock month={month} day={day} dark />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{s.title}</div>
                  {time && <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">⏰ {time}</div>}
                </div>
                <span className="flex items-center gap-1 px-2.5 py-1 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-[11px] font-bold rounded-full border border-success-200 dark:border-success-800">
                  ✓ Going
                </span>
              </div>
            );
          })}
          {upcomingSignups.length > 2 && (
            <button onClick={() => setTab('myevents')} className="w-full py-2 text-sm text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              View all {upcomingSignups.length} events →
            </button>
          )}
        </div>
      )}

      {/* Find opportunities */}
      <div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Find opportunities</h3>
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm">
          {availableCount > 0 ? (
            <>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                {availableCount} event{availableCount !== 1 ? 's' : ''} available to join
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Browse upcoming volunteer opportunities and sign up for events that fit your schedule.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">No new events right now</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Check back soon — your organization will post new opportunities here.</p>
            </>
          )}
          <button onClick={() => setTab('events')} className="px-4 py-2 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors">
            Browse Events →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shift List View (drill-down from an event card) ─────────────────────────

function ShiftListView({
  event: initialEvent, signups, onBack, onSignup, onCancel, showToast,
}: {
  event: PortalEvent;
  signups: PortalSignup[];
  onBack: () => void;
  onSignup: (eventId: string, shiftId?: string) => Promise<void>;
  onCancel: (eventId: string, shiftId?: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [event, setEvent] = useState<PortalEvent>(initialEvent);
  // Only block rendering if we have no cached shifts yet — show immediately if list already had them
  const [loadingEvent, setLoadingEvent] = useState((initialEvent.shifts ?? []).length === 0);
  const [fetchError, setFetchError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    portalApi.get<PortalEvent>(`/portal/events/${initialEvent.id}`)
      .then(fresh => { if (!cancelled) { setEvent(fresh); setFetchError(false); } })
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) setLoadingEvent(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEvent.id]);

  const hasShifts = (event.shifts ?? []).length > 0;
  const signedShiftIds = new Set(
    signups.filter(s => s.event_id === event.id && s.shift_id).map(s => s.shift_id!)
  );
  const signedForWholeEvent = signups.some(s => s.event_id === event.id && !s.shift_id);

  const handleSignup = async (shiftId?: string) => {
    setBusy(shiftId ?? 'event');
    try {
      await onSignup(event.id, shiftId);
      showToast('🎉 You\'re signed up!');
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Sign-up failed'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (shiftId?: string) => {
    setBusy(shiftId ?? 'event');
    try {
      await onCancel(event.id, shiftId);
      showToast('Signup cancelled');
    } catch {
      showToast('❌ Could not cancel signup');
    } finally {
      setBusy(null);
    }
  };

  const { month, day } = parseEventDate(event.startDate);
  const time = formatEventTime(event.startDate, event.endDate);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-4 transition-colors"
      >
        ← Back to events
      </button>

      {loadingEvent ? (
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 dark:text-neutral-500 py-12">
          <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          Loading shifts…
        </div>
      ) : (
        <>
          {fetchError && !hasShifts && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 text-sm text-red-600 dark:text-red-400">
              Could not load shift details. Please go back and try again.
            </div>
          )}

          {/* Event header */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-primary-400 to-warning-400" />
            <div className="flex gap-3 items-start">
              <DateBlock month={month} day={day} />
              <div className="flex-1">
                <p className="font-bold text-base text-neutral-900 dark:text-neutral-100 mb-1">{event.title}</p>
                <div className="flex flex-wrap gap-2">
                  {time && <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {time}</span>}
                  {event.location && <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {event.location}</span>}
                  {event.category && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {event.category}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2">{event.description}</p>
                )}
              </div>
            </div>
          </div>

          {hasShifts ? (
            <>
              <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">
                Available Shifts <span className="text-neutral-400 dark:text-neutral-500 font-normal">({event.shifts.length})</span>
              </h4>
              {event.shifts.map(shift => {
                const remaining = shift.capacity - shift.signedUp;
                const full = remaining <= 0;
                const signed = signedShiftIds.has(shift.id);
                const isBusy = busy === shift.id;
                const fillPct = Math.min(100, Math.round((shift.signedUp / Math.max(shift.capacity, 1)) * 100));
                return (
                  <div
                    key={shift.id}
                    className={`bg-white dark:bg-neutral-800 border rounded-xl p-4 mb-3 shadow-sm relative overflow-hidden ${
                      signed ? 'border-success-300 dark:border-success-700' : full ? 'border-neutral-200 dark:border-neutral-700 opacity-75' : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${signed ? 'bg-gradient-to-r from-success-400 to-primary-400' : full ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-gradient-to-r from-primary-400 to-warning-400'}`} />
                    <div className="mb-3">
                      <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{shift.name}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {shift.date && (
                          <span>📅 {new Date(shift.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        )}
                        {shift.startTime && shift.endTime && <span>⏰ {shift.startTime} – {shift.endTime}</span>}
                        {shift.role && <span>👤 {shift.role}</span>}
                      </div>
                      {shift.description && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed">{shift.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-[100px]">
                        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                          {full ? 'Shift full' : `${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
                        </p>
                        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${full ? 'bg-danger-400' : remaining > shift.capacity * 0.4 ? 'bg-success-400' : 'bg-warning-400'}`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                      {signed ? (
                        <button
                          onClick={() => handleCancel(shift.id)}
                          disabled={isBusy}
                          className="flex items-center gap-1 px-3 py-1.5 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-xs font-bold rounded-full border border-success-200 dark:border-success-800 hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200 dark:hover:bg-danger-900/20 dark:hover:text-danger-400 dark:hover:border-danger-800 transition-colors disabled:opacity-60"
                        >
                          {isBusy ? '…' : '✓ Signed up'}
                        </button>
                      ) : full ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold rounded-full">🔒 Full</span>
                      ) : (
                        <button
                          onClick={() => handleSignup(shift.id)}
                          disabled={isBusy}
                          className="px-4 py-1.5 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {isBusy ? 'Signing up…' : 'Sign Up'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">General Signup</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                No specific shifts for this event — sign up to join as a volunteer.
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  {event.spotsAvailable > 0 && (
                    <>
                      <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                        {Math.max(0, event.spotsAvailable - event.participantCount)} spot{event.spotsAvailable - event.participantCount !== 1 ? 's' : ''} remaining
                      </p>
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success-400 transition-all"
                          style={{ width: `${Math.min(100, Math.round((event.participantCount / Math.max(event.spotsAvailable, 1)) * 100))}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
                {signedForWholeEvent ? (
                  <button
                    onClick={() => handleCancel(undefined)}
                    disabled={busy === 'event'}
                    className="flex items-center gap-1 px-3 py-1.5 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-xs font-bold rounded-full border border-success-200 dark:border-success-800 hover:bg-danger-50 hover:text-danger-600 hover:border-danger-200 dark:hover:bg-danger-900/20 dark:hover:text-danger-400 dark:hover:border-danger-800 transition-colors disabled:opacity-60"
                  >
                    {busy === 'event' ? '…' : '✓ Signed up'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSignup(undefined)}
                    disabled={busy === 'event'}
                    className="px-4 py-1.5 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {busy === 'event' ? 'Signing up…' : 'Sign Up'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({
  events, signups, onSignup, onCancel, showToast,
}: {
  events: PortalEvent[];
  signups: PortalSignup[];
  onSignup: (eventId: string, shiftId?: string) => Promise<void>;
  onCancel: (eventId: string, shiftId?: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<PortalEvent | null>(null);

  // Keep selectedEvent in sync when the events list refreshes (e.g. after signup)
  useEffect(() => {
    if (selectedEvent) {
      const updated = events.find(e => e.id === selectedEvent.id);
      if (updated) setSelectedEvent(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  if (selectedEvent) {
    return (
      <ShiftListView
        event={selectedEvent}
        signups={signups}
        onBack={() => setSelectedEvent(null)}
        onSignup={onSignup}
        onCancel={onCancel}
        showToast={showToast}
      />
    );
  }

  if (!events.length) return (
    <div className="text-center py-16 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800 mt-2">
      <div className="text-4xl mb-3">📭</div>
      <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">No events posted yet</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Check back soon — your organization will post opportunities here.</p>
    </div>
  );

  return (
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Upcoming Events</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Tap an event to view shifts and sign up.</p>

      {events.map(ev => {
        const anySignedUp = signups.some(s => s.event_id === ev.id);
        const shiftCount  = ev.shifts?.length ?? 0;
        const remaining   = ev.spotsAvailable - ev.participantCount;
        const full        = remaining <= 0 && !anySignedUp;
        const { month, day } = parseEventDate(ev.startDate);
        const time = formatEventTime(ev.startDate, ev.endDate);

        return (
          <button
            key={ev.id}
            onClick={() => setSelectedEvent(ev)}
            className={`w-full text-left bg-white dark:bg-neutral-800 border rounded-xl p-5 mb-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] relative overflow-hidden ${
              anySignedUp ? 'border-success-300 dark:border-success-700' : full ? 'border-neutral-200 dark:border-neutral-700 opacity-75' : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${anySignedUp ? 'bg-gradient-to-r from-success-400 to-primary-400' : full ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-gradient-to-r from-primary-400 to-warning-400'}`} />

            <div className="flex gap-3 items-start">
              <DateBlock month={month} day={day} muted={full} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5 truncate">{ev.title}</p>
                <div className="flex flex-wrap gap-2">
                  {time && <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {time}</span>}
                  {ev.location && <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {ev.location}</span>}
                  {ev.category && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">
                      {ev.category}
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 line-clamp-2">{ev.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 text-sm self-center">›</div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                {shiftCount > 0 && (
                  <span>🕐 {shiftCount} shift{shiftCount !== 1 ? 's' : ''}</span>
                )}
                {!full && ev.spotsAvailable > 0 && (
                  <span>{remaining} spot{remaining !== 1 ? 's' : ''} left</span>
                )}
                {full && <span className="text-danger-400">Full</span>}
              </div>
              {anySignedUp && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-[11px] font-bold rounded-full border border-success-200 dark:border-success-800">
                  ✓ Signed up
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── My Events Tab ────────────────────────────────────────────────────────────

function MyEventsTab({
  signups, onCancel, showToast,
}: {
  signups: PortalSignup[];
  onCancel: (eventId: string, shiftId?: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [busy, setBusy]     = useState<string | null>(null);

  const upcomingList = signups.filter(s => isUpcoming(s.start_date));
  const pastList     = signups.filter(s => !isUpcoming(s.start_date));

  const handleCancel = async (signupId: string, eventId: string, shiftId?: string) => {
    setBusy(signupId);
    try {
      await onCancel(eventId, shiftId ?? undefined);
      showToast('Signup cancelled');
    } catch {
      showToast('❌ Could not cancel signup');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">My Events</h3>

      <div className="flex gap-2 mb-4">
        {([['upcoming', `Upcoming (${upcomingList.length})`], ['past', `Past (${pastList.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              subTab === id
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
                : 'bg-transparent text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'upcoming' && (
        upcomingList.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">No upcoming events yet</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Browse available opportunities and sign up for events that interest you.</p>
          </div>
        ) : (
          upcomingList.map(s => {
            const { month, day } = parseEventDate(s.start_date);
            const time = formatEventTime(s.start_date, s.end_date);
            return (
              <div key={s.id} className="bg-white dark:bg-neutral-800 border border-success-200 dark:border-success-800 rounded-xl p-5 mb-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-success-400 to-primary-400" />
                <div className="flex gap-3 items-start mb-3">
                  <DateBlock month={month} day={day} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{s.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {time && <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {time}</span>}
                      {s.location && <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {s.location}</span>}
                    </div>
                  </div>
                </div>
                {s.description && <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4 line-clamp-2">{s.description}</p>}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-xs font-bold rounded-full border border-success-200 dark:border-success-800">✓ You're going</span>
                    {s.shift_id && <span className="text-[11px] text-neutral-400 dark:text-neutral-500 px-1">Shift signup</span>}
                  </div>
                  <button
                    onClick={() => handleCancel(s.id, s.event_id, s.shift_id ?? undefined)}
                    disabled={busy === s.id}
                    className="px-3 py-1.5 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-xs font-semibold rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors disabled:opacity-60"
                  >
                    {busy === s.id ? '…' : 'Cancel signup'}
                  </button>
                </div>
              </div>
            );
          })
        )
      )}

      {subTab === 'past' && (
        pastList.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">No past events yet</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Your completed events will appear here.</p>
          </div>
        ) : (
          pastList.map(s => {
            const { month, day } = parseEventDate(s.start_date);
            const time = formatEventTime(s.start_date, s.end_date);
            return (
              <div key={s.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-3 shadow-sm relative overflow-hidden opacity-80">
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex gap-3 items-start mb-3">
                  <DateBlock month={month} day={day} muted />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{s.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {time && <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {time}</span>}
                      {s.location && <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {s.location}</span>}
                    </div>
                  </div>
                </div>
                {s.description && <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3 line-clamp-2">{s.description}</p>}
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold rounded-full border border-neutral-200 dark:border-neutral-600">
                  ✓ Completed
                </span>
              </div>
            );
          })
        )
      )}
    </div>
  );
}

// ─── Training Tab ─────────────────────────────────────────────────────────────

function embedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (/\.(mp4|webm|ogg)$/i.test(url)) return url; // direct video
  return null;
}

function CourseViewer({
  course, onBack, onSectionComplete, onCourseComplete, showToast,
}: {
  course: PortalCourse;
  onBack: () => void;
  onSectionComplete: (courseId: string, sectionId: string) => Promise<void>;
  onCourseComplete: (courseId: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set(course.completedSections));

  const sections = course.sections;
  const section = sections[idx] ?? null;
  const isLast = idx === sections.length - 1;
  const allRequiredDone = sections
    .filter(s => s.required)
    .every(s => completedSections.has(s.id));

  const markSection = async (sectionId: string) => {
    if (completedSections.has(sectionId)) return;
    setCompleting(true);
    try {
      await portalApi.post('/portal/training/progress', { courseId: course.id, sectionId });
      setCompletedSections(prev => new Set([...prev, sectionId]));
    } catch {
      showToast('❌ Could not save progress');
    } finally {
      setCompleting(false);
    }
  };

  const completeCourse = async () => {
    setCompleting(true);
    try {
      await portalApi.post('/portal/training/complete', { courseId: course.id });
      await onCourseComplete(course.id);
      showToast('🎉 Course completed!');
      onBack();
    } catch {
      showToast('❌ Could not record completion');
    } finally {
      setCompleting(false);
    }
  };

  const progressPct = sections.length > 0
    ? Math.round((completedSections.size / sections.length) * 100)
    : 0;

  if (!section) return (
    <div className="text-center py-16">
      <p className="text-neutral-500 dark:text-neutral-400 text-sm">This course has no content yet.</p>
      <button onClick={onBack} className="mt-4 text-sm text-primary-600 dark:text-primary-400 font-semibold">← Back</button>
    </div>
  );

  const embed = section.type === 'video' ? embedUrl(section.videoUrl ?? '') : null;
  const isDone = completedSections.has(section.id);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-4 transition-colors">
        ← Back to training
      </button>

      {/* Course header */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: course.color }} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{course.title}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Section {idx + 1} of {sections.length}
            </p>
          </div>
        </div>
        <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">{progressPct}% complete</p>
      </div>

      {/* Section content */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-4 shadow-sm">
        <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 mb-3">{section.title}</h3>

        {section.type === 'text' && section.content && (
          <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        )}

        {section.type === 'video' && (
          embed ? (
            /\.(mp4|webm|ogg)$/i.test(embed) ? (
              <video src={embed} controls className="w-full rounded-lg mb-2" />
            ) : (
              <div className="aspect-video rounded-lg overflow-hidden mb-2">
                <iframe src={embed} className="w-full h-full" allowFullScreen title={section.title} />
              </div>
            )
          ) : (
            <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-4 text-sm text-neutral-500 dark:text-neutral-400 text-center">
              Video unavailable — invalid URL
            </div>
          )
        )}
        {section.type === 'video' && section.videoCaption && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{section.videoCaption}</p>
        )}

        {section.type === 'file' && (
          <div className="bg-neutral-50 dark:bg-neutral-700/50 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-1 font-medium">
              {section.filePrompt || 'Upload the required file to complete this section.'}
            </p>
            {section.fileTypes && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Accepted: {section.fileTypes}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex-1 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 text-sm font-semibold rounded-lg transition-colors"
        >
          ← Previous
        </button>

        {isDone ? (
          isLast ? (
            allRequiredDone && !course.completed ? (
              <button
                onClick={completeCourse}
                disabled={completing}
                className="flex-1 py-2.5 bg-success-600 hover:bg-success-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {completing ? 'Saving…' : '🎉 Complete Course'}
              </button>
            ) : (
              <button
                onClick={onBack}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                ✓ Finish
              </button>
            )
          ) : (
            <button
              onClick={() => setIdx(i => i + 1)}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Next →
            </button>
          )
        ) : (
          <button
            onClick={async () => {
              await markSection(section.id);
              if (!isLast) setIdx(i => i + 1);
            }}
            disabled={completing}
            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {completing ? 'Saving…' : isLast ? 'Mark Complete' : 'Mark Complete & Next →'}
          </button>
        )}
      </div>

      {/* Section dots */}
      {sections.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === idx ? 'bg-primary-500 w-4' :
                completedSections.has(s.id) ? 'bg-success-400' :
                'bg-neutral-300 dark:bg-neutral-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingTab({
  courses, onSectionComplete, onCourseComplete, showToast,
}: {
  courses: PortalCourse[];
  onSectionComplete: (courseId: string, sectionId: string) => Promise<void>;
  onCourseComplete: (courseId: string) => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<PortalCourse | null>(null);

  if (selectedCourse) {
    const fresh = courses.find(c => c.id === selectedCourse.id) ?? selectedCourse;
    return (
      <CourseViewer
        course={fresh}
        onBack={() => setSelectedCourse(null)}
        onSectionComplete={onSectionComplete}
        onCourseComplete={onCourseComplete}
        showToast={showToast}
      />
    );
  }

  if (!courses.length) return (
    <div className="text-center py-16 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-800 mt-2">
      <div className="text-4xl mb-3">🎓</div>
      <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">No training assigned</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Your organization will post training courses here.</p>
    </div>
  );

  return (
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Training</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Complete your assigned courses.</p>

      {courses.map(course => {
        const total = course.sections.length;
        const done = course.completedSections.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const overdue = course.dueDate && !course.completed && new Date(course.dueDate) < new Date();

        return (
          <button
            key={course.id}
            onClick={() => setSelectedCourse(course)}
            className={`w-full text-left bg-white dark:bg-neutral-800 border rounded-xl p-5 mb-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] relative overflow-hidden ${
              course.completed ? 'border-success-300 dark:border-success-700' :
              overdue ? 'border-danger-300 dark:border-danger-700' :
              'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl`} style={{ backgroundColor: course.color }} />

            <div className="flex items-start gap-3 mb-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: course.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{course.title}</p>
                  {course.completed && (
                    <span className="flex-shrink-0 text-[11px] font-bold text-success-600 dark:text-success-400">✓ Done</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{course.category}</span>
                  {course.estimatedMinutes > 0 && <span>⏱ {course.estimatedMinutes} min</span>}
                  {course.dueDate && (
                    <span className={overdue ? 'text-danger-500 font-semibold' : ''}>
                      Due {new Date(course.dueDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 text-sm self-center">›</div>
            </div>

            {total > 0 && (
              <div>
                <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${course.completed ? 'bg-success-500' : 'bg-primary-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  {course.completed ? 'Completed' : done === 0 ? `${total} section${total !== 1 ? 's' : ''}` : `${done} / ${total} sections`}
                </p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ profile, onProfileUpdate, showToast }: {
  profile: VolunteerProfile;
  onProfileUpdate: (updated: VolunteerProfile) => void;
  showToast: (msg: string) => void;
}) {
  const [form, setForm]       = useState({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone });
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [showPws, setShowPws] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const set   = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setPw = (k: string) => (v: string) => setPwForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await portalApi.put('/portal/profile', { firstName: form.firstName, lastName: form.lastName, phone: form.phone });
      onProfileUpdate({ ...profile, firstName: form.firstName, lastName: form.lastName, name: `${form.firstName} ${form.lastName}`.trim(), phone: form.phone });
      showToast('✅ Profile saved!');
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to save'}`);
    } finally {
      setSaving(false);
    }
  };

  const changePw = async () => {
    if (!pwForm.current) return showToast('❌ Enter your current password.');
    if (pwForm.next.length < 8) return showToast('❌ New password must be at least 8 characters.');
    if (pwForm.next !== pwForm.confirm) return showToast('❌ Passwords don\'t match.');
    setSavingPw(true);
    try {
      await portalApi.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwForm({ current: '', next: '', confirm: '' });
      showToast('✅ Password updated!');
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : 'Failed to update password'}`);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      {/* Profile hero */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 mb-4 shadow-sm flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-2xl border-3 border-white dark:border-neutral-800 shadow-sm">
            {getInitials(profile.name)}
          </div>
        </div>
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{profile.name}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile.email}</p>
        {profile.joinDate && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-medium">Volunteer since {formatJoinDate(profile.joinDate)}</p>
        )}
      </div>

      {/* Personal info */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-3 shadow-sm">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">Personal Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">First Name</label>
            <input className={inputCls} value={form.firstName} onChange={e => set('firstName')(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Last Name</label>
            <input className={inputCls} value={form.lastName} onChange={e => set('lastName')(e.target.value)} />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Phone (optional)</label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="(555) 000-0000" />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Email Address</label>
          <input className={`${inputCls} opacity-60 cursor-not-allowed`} type="email" value={profile.email} readOnly />
          <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Email cannot be changed here. Contact your organization to update it.</p>
        </div>
        <button onClick={save} disabled={saving} className="w-full py-2.5 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">Change Password</p>
        {(['current', 'next', 'confirm'] as const).map((k, i) => {
          const labels = ['Current Password', 'New Password', 'Confirm New Password'];
          return (
            <div key={k} className="mb-3">
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">{labels[i]}</label>
              <div className="relative">
                <input
                  type={showPws[k] ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pwForm[k]}
                  onChange={e => setPw(k)(e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowPws(s => ({ ...s, [k]: !s[k] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  <EyeIcon open={showPws[k]} />
                </button>
              </div>
            </div>
          );
        })}
        <button onClick={changePw} disabled={savingPw} className="w-full py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-60 text-sm font-semibold rounded-lg transition-colors mt-1">
          {savingPw ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

function Dashboard({ profile: initialProfile, onLogout }: { profile: VolunteerProfile; onLogout: () => void }) {
  const [tab, setTab]         = useState<Tab>('home');
  const [profile, setProfile] = useState(initialProfile);
  const [events, setEvents]   = useState<PortalEvent[]>([]);
  const [signups, setSignups] = useState<PortalSignup[]>([]);
  const [courses, setCourses] = useState<PortalCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Load events, signups, and training on mount
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      portalApi.get<PortalEvent[]>('/portal/events'),
      portalApi.get<PortalSignup[]>('/portal/my-signups'),
      portalApi.get<PortalCourse[]>('/portal/training'),
    ]).then(([evResult, signupResult, trainingResult]) => {
      if (cancelled) return;
      if (evResult.status === 'fulfilled') setEvents(evResult.value ?? []);
      if (signupResult.status === 'fulfilled') setSignups(signupResult.value ?? []);
      if (trainingResult.status === 'fulfilled') setCourses(trainingResult.value ?? []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSignup = useCallback(async (eventId: string, shiftId?: string) => {
    await portalApi.post('/portal/signup', { eventId, shiftId });
    const ev = events.find(e => e.id === eventId);
    if (ev) {
      const newSignup: PortalSignup = {
        id: crypto.randomUUID(),
        event_id: eventId,
        shift_id: shiftId ?? null,
        status: 'APPROVED',
        title: ev.title,
        start_date: ev.startDate,
        end_date: ev.endDate,
        location: ev.location,
        category: ev.category,
        description: ev.description,
      };
      setSignups(prev => [...prev, newSignup]);
      setEvents(prev => prev.map(e => {
        if (e.id !== eventId) return e;
        if (shiftId) {
          return { ...e, shifts: e.shifts.map(s => s.id === shiftId ? { ...s, signedUp: s.signedUp + 1 } : s) };
        }
        return { ...e, participantCount: e.participantCount + 1 };
      }));
    }
  }, [events]);

  const handleCancel = useCallback(async (eventId: string, shiftId?: string) => {
    const qs = shiftId ? `?shiftId=${encodeURIComponent(shiftId)}` : '';
    await portalApi.delete(`/portal/signup/${eventId}${qs}`);
    setSignups(prev => prev.filter(s => !(s.event_id === eventId && (shiftId ? s.shift_id === shiftId : !s.shift_id))));
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      if (shiftId) {
        return { ...e, shifts: e.shifts.map(s => s.id === shiftId ? { ...s, signedUp: Math.max(0, s.signedUp - 1) } : s) };
      }
      return { ...e, participantCount: Math.max(0, e.participantCount - 1) };
    }));
  }, []);

  const handleSectionComplete = useCallback(async (courseId: string, sectionId: string) => {
    await portalApi.post('/portal/training/progress', { courseId, sectionId });
    setCourses(prev => prev.map(c => {
      if (c.id !== courseId) return c;
      if (c.completedSections.includes(sectionId)) return c;
      return { ...c, completedSections: [...c.completedSections, sectionId] };
    }));
  }, []);

  const handleCourseComplete = useCallback(async (courseId: string) => {
    await portalApi.post('/portal/training/complete', { courseId });
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, completed: true } : c));
  }, []);

  const upcomingSignupCount = signups.filter(s => isUpcoming(s.start_date)).length;
  const trainingCount = courses.filter(c => !c.completed).length;

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-50" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-neutral-400 dark:text-neutral-500">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading your portal…</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <TopBar profile={profile} onLogout={onLogout} />
      <div className="flex-1 px-5 py-6 pb-24 max-w-2xl mx-auto w-full">
        {tab === 'home'     && <HomeTab profile={profile} signups={signups} events={events} setTab={setTab} />}
        {tab === 'events'   && <EventsTab events={events} signups={signups} onSignup={handleSignup} onCancel={handleCancel} showToast={showToast} />}
        {tab === 'myevents' && <MyEventsTab signups={signups} onCancel={handleCancel} showToast={showToast} />}
        {tab === 'training' && <TrainingTab courses={courses} onSectionComplete={handleSectionComplete} onCourseComplete={handleCourseComplete} showToast={showToast} />}
        {tab === 'profile'  && <ProfileTab profile={profile} onProfileUpdate={setProfile} showToast={showToast} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} myCount={upcomingSignupCount} trainingCount={trainingCount} />

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-700 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl whitespace-nowrap z-[200]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function VolunteerPortal() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem(VP_TOKEN_KEY);
    if (!token) return;
    portalApi.get<VolunteerProfile>('/portal/profile')
      .then(setProfile)
      .catch(() => {
        sessionStorage.removeItem(VP_TOKEN_KEY);
      });
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(VP_TOKEN_KEY);
    setProfile(null);
  };

  return (
    <>
      <Head><title>Volunteer Portal — VolunteerFlow</title></Head>
      {profile
        ? <Dashboard profile={profile} onLogout={handleLogout} />
        : <LoginPage onLogin={setProfile} />
      }
    </>
  );
}
