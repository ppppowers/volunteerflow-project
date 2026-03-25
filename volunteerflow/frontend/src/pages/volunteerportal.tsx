import { useState } from 'react';
import Head from 'next/head';

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

// ─── Data ─────────────────────────────────────────────────────────────────────

const MOCK_VOLUNTEER = { name: 'Maria González', email: 'maria@example.org', phone: '(555) 012-3456', since: 'March 2024', initials: 'MG' };

const MOCK_EVENTS = [
  { id: 1, title: 'Community Garden Restoration', month: 'JUL', day: '14', time: '9:00 AM – 1:00 PM', location: 'Riverside Park, Block C', desc: 'Help restore our community garden — planting, weeding, and building new raised beds. No experience needed, gloves provided!', needed: 20, signups: 14, category: 'Environment' },
  { id: 2, title: 'Senior Center Lunch Program',  month: 'JUL', day: '18', time: '11:00 AM – 2:00 PM', location: 'Oakwood Senior Center', desc: 'Assist with meal preparation and service for local seniors. A wonderful opportunity to connect with the community.', needed: 8, signups: 8, category: 'Care' },
  { id: 3, title: 'Youth Coding Workshop', month: 'JUL', day: '22', time: '10:00 AM – 4:00 PM', location: 'Central Library, Room 3B', desc: 'Help teach kids ages 10–14 the basics of coding with Scratch and Python. Beginner-friendly curriculum provided.', needed: 6, signups: 3, category: 'Education' },
  { id: 4, title: 'Food Bank Sorting Day', month: 'AUG', day: '02', time: '8:00 AM – 12:00 PM', location: 'Downtown Food Bank', desc: 'Sort and pack donated food items for distribution across the city. Physical activity involved — wear comfortable clothing.', needed: 25, signups: 11, category: 'Community' },
  { id: 5, title: 'Park Trail Cleanup', month: 'AUG', day: '09', time: '7:30 AM – 11:00 AM', location: 'Greenwood Trail Head', desc: 'Join us for a morning cleanup of the park trail. Trash bags and gloves provided.', needed: 15, signups: 15, category: 'Environment' },
];

const PAST_EVENTS = [
  { id: 101, title: 'Spring Food Drive', month: 'MAY', day: '10', time: '9:00 AM – 1:00 PM', location: 'Community Center', desc: 'Helped sort and pack over 800 lbs of food donations.', hours: 4 },
  { id: 102, title: 'Youth Mentorship Kickoff', month: 'JUN', day: '03', time: '2:00 PM – 5:00 PM', location: 'West Side Library', desc: 'Introduced students to our summer mentorship program.', hours: 3 },
];

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors';

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const submit = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 1100);
  };

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
      {/* Left panel */}
      <div className="hidden md:flex md:w-[440px] lg:w-[480px] flex-shrink-0 bg-neutral-900 dark:bg-neutral-950 flex-col justify-end p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 -left-24 w-[500px] h-[500px] rounded-full bg-primary-500 opacity-10" />
          <div className="absolute bottom-20 -right-16 w-72 h-72 rounded-full bg-primary-400 opacity-10" />
        </div>
        {/* Dot grid */}
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

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-neutral-900 dark:text-neutral-100 font-bold text-lg">VolunteerFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Welcome back</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Sign in to your volunteer account to get started.</p>

          {/* Info notice */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 text-sm mb-6">
            <span className="mt-0.5 flex-shrink-0">ℹ️</span>
            <span>Volunteer accounts are created automatically after your application is reviewed and approved by the organization.</span>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`${inputCls}${errors.email ? ' !border-danger-500 !ring-danger-500/30' : ''}`}
            />
            {errors.email && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
              <button type="button" className="text-xs text-primary-600 dark:text-primary-400 hover:underline" onClick={() => setForgotMsg('Check your email for a password reset link.')}>
                Forgot password?
              </button>
            </div>
            {forgotMsg && <p className="text-xs text-success-600 dark:text-success-400 mb-1">{forgotMsg}</p>}
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${inputCls} pr-10${errors.password ? ' !border-danger-500 !ring-danger-500/30' : ''}`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">{errors.password}</p>}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ onLogout }: { onLogout: () => void }) {
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
        {MOCK_VOLUNTEER.initials}
      </div>
      <button onClick={onLogout} className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-2 py-1">
        Sign out
      </button>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

type Tab = 'home' | 'events' | 'myevents' | 'profile';

function BottomNav({ tab, setTab, myCount }: { tab: Tab; setTab: (t: Tab) => void; myCount: number }) {
  const items: { id: Tab; emoji: string; label: string }[] = [
    { id: 'home',     emoji: '🏠', label: 'Home'      },
    { id: 'events',   emoji: '📅', label: 'Sign Up'   },
    { id: 'myevents', emoji: '✅', label: 'My Events' },
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
          </span>
          <span className="text-[10.5px] font-semibold">{item.label}</span>
          {tab === item.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />}
        </button>
      ))}
    </div>
  );
}

// ─── Event Date Block ──────────────────────────────────────────────────────────

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

function HomeTab({ myEvents, setTab }: { myEvents: number[]; setTab: (t: Tab) => void }) {
  const upcoming   = MOCK_EVENTS.filter(e => myEvents.includes(e.id)).slice(0, 2);
  const totalHours = PAST_EVENTS.reduce((s, e) => s + e.hours, 0);

  return (
    <div>
      {/* Hero */}
      <div className="bg-neutral-900 dark:bg-neutral-800 rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary-500 opacity-10" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary-400 opacity-8" />
        </div>
        <div className="relative z-10">
          <p className="text-white/50 text-sm mb-1">Good morning 👋</p>
          <p className="text-2xl font-bold text-white mb-5">Hello, <span className="text-primary-400">{MOCK_VOLUNTEER.name.split(' ')[0]}</span></p>
          <div className="grid grid-cols-3 gap-3">
            {[
              [myEvents.length,     'Upcoming'],
              [PAST_EVENTS.length,  'Completed'],
              [`${totalHours}h`,    'Hours given'],
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
      {upcoming.length > 0 && (
        <div className="mb-5">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Your next events</h3>
          {upcoming.map(ev => (
            <div key={ev.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-2.5 flex gap-3 items-center shadow-sm">
              <DateBlock month={ev.month} day={ev.day} dark />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">{ev.title}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">⏰ {ev.time}</div>
              </div>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-[11px] font-bold rounded-full border border-success-200 dark:border-success-800">
                ✓ Going
              </span>
            </div>
          ))}
          {myEvents.length > 2 && (
            <button onClick={() => setTab('myevents')} className="w-full py-2 text-sm text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              View all {myEvents.length} events →
            </button>
          )}
        </div>
      )}

      {/* Find opportunities */}
      <div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Find opportunities</h3>
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            {MOCK_EVENTS.filter(e => !myEvents.includes(e.id) && e.signups < e.needed).length} events available to join
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Browse upcoming volunteer opportunities and sign up for events that fit your schedule.</p>
          <button onClick={() => setTab('events')} className="px-4 py-2 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors">
            Browse Events →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ myEvents, setMyEvents, showToast }: { myEvents: number[]; setMyEvents: (e: number[]) => void; showToast: (msg: string) => void }) {
  const signUp = (id: number) => { setMyEvents([...myEvents, id]); showToast('🎉 You\'re signed up!'); };
  const pct    = (ev: typeof MOCK_EVENTS[0]) => Math.min(100, Math.round((ev.signups / ev.needed) * 100));

  return (
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Upcoming Events</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Find and sign up for volunteer opportunities near you.</p>

      {MOCK_EVENTS.map(ev => {
        const signed    = myEvents.includes(ev.id);
        const full      = ev.signups >= ev.needed && !signed;
        const remaining = ev.needed - ev.signups;
        const fillPct   = pct(ev);

        return (
          <div
            key={ev.id}
            className={`bg-white dark:bg-neutral-800 border rounded-xl p-5 mb-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden ${
              signed ? 'border-success-300 dark:border-success-700' : full ? 'border-neutral-200 dark:border-neutral-700 opacity-75' : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${signed ? 'bg-gradient-to-r from-success-400 to-primary-400' : full ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-gradient-to-r from-primary-400 to-warning-400'}`} />

            <div className="flex gap-3 items-start mb-3">
              <DateBlock month={ev.month} day={ev.day} muted={full} />
              <div className="flex-1">
                <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{ev.title}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {ev.time}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {ev.location}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600">{ev.category}</span>
                </div>
              </div>
            </div>

            <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">{ev.desc}</p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  {full ? 'Event full' : `${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
                </p>
                <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${full ? 'bg-danger-400' : remaining > ev.needed * 0.4 ? 'bg-success-400' : 'bg-warning-400'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
              {signed ? (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-xs font-bold rounded-full border border-success-200 dark:border-success-800">✓ Signed up</span>
              ) : full ? (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold rounded-full">🔒 Full</span>
              ) : (
                <button onClick={() => signUp(ev.id)} className="px-4 py-1.5 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors">
                  Sign Up
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── My Events Tab ────────────────────────────────────────────────────────────

function MyEventsTab({ myEvents, setMyEvents, showToast }: { myEvents: number[]; setMyEvents: (e: number[]) => void; showToast: (msg: string) => void }) {
  const [subTab, setSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const upcomingList = MOCK_EVENTS.filter(e => myEvents.includes(e.id));
  const cancel = (id: number) => { setMyEvents(myEvents.filter(e => e !== id)); showToast('Signup cancelled'); };

  return (
    <div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">My Events</h3>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {([['upcoming', `Upcoming (${upcomingList.length})`], ['past', `Past (${PAST_EVENTS.length})`]] as const).map(([id, label]) => (
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
          upcomingList.map(ev => (
            <div key={ev.id} className="bg-white dark:bg-neutral-800 border border-success-200 dark:border-success-800 rounded-xl p-5 mb-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-gradient-to-r from-success-400 to-primary-400" />
              <div className="flex gap-3 items-start mb-3">
                <DateBlock month={ev.month} day={ev.day} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{ev.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {ev.time}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {ev.location}</span>
                  </div>
                </div>
              </div>
              <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">{ev.desc}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1 px-3 py-1.5 bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400 text-xs font-bold rounded-full border border-success-200 dark:border-success-800">✓ You're going</span>
                <button onClick={() => cancel(ev.id)} className="px-3 py-1.5 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 text-xs font-semibold rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                  Cancel signup
                </button>
              </div>
            </div>
          ))
        )
      )}

      {subTab === 'past' && PAST_EVENTS.map(ev => (
        <div key={ev.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-3 shadow-sm relative overflow-hidden opacity-80">
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl bg-neutral-200 dark:bg-neutral-700" />
          <div className="flex gap-3 items-start mb-3">
            <DateBlock month={ev.month} day={ev.day} muted />
            <div className="flex-1">
              <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1.5">{ev.title}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">⏰ {ev.time}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">📍 {ev.location}</span>
              </div>
            </div>
          </div>
          <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">{ev.desc}</p>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs font-bold rounded-full border border-neutral-200 dark:border-neutral-600">
            ✓ Completed · {ev.hours}h
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ showToast }: { showToast: (msg: string) => void }) {
  const [form, setForm]       = useState({ name: MOCK_VOLUNTEER.name, email: MOCK_VOLUNTEER.email, phone: MOCK_VOLUNTEER.phone });
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [showPws, setShowPws] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving]   = useState(false);

  const set   = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setPw = (k: string) => (v: string) => setPwForm(f => ({ ...f, [k]: v }));

  const save = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast('✅ Profile saved!'); }, 900);
  };

  const changePw = () => {
    if (!pwForm.current) return showToast('❌ Enter your current password.');
    if (pwForm.next.length < 8) return showToast('❌ New password must be at least 8 characters.');
    if (pwForm.next !== pwForm.confirm) return showToast('❌ Passwords don\'t match.');
    showToast('✅ Password updated!');
  };

  return (
    <div>
      {/* Profile hero */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 mb-4 shadow-sm flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-2xl border-3 border-white dark:border-neutral-800 shadow-sm">
            {MOCK_VOLUNTEER.initials}
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center cursor-pointer border-2 border-white dark:border-neutral-800 text-[11px]">
            ✏️
          </div>
        </div>
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{form.name}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{form.email}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-medium">Volunteer since {MOCK_VOLUNTEER.since}</p>
      </div>

      {/* Personal info */}
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 mb-3 shadow-sm">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">Personal Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Full Name</label>
            <input className={inputCls} value={form.name} onChange={e => set('name')(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Phone (optional)</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Email Address</label>
          <input className={inputCls} type="email" value={form.email} onChange={e => set('email')(e.target.value)} />
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
        <button onClick={changePw} className="w-full py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm font-semibold rounded-lg transition-colors mt-1">
          Update Password
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab]         = useState<Tab>('home');
  const [myEvents, setMyEvents] = useState<number[]>([1]);
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <TopBar onLogout={onLogout} />
      <div className="flex-1 px-5 py-6 pb-24 max-w-2xl mx-auto w-full">
        {tab === 'home'      && <HomeTab myEvents={myEvents} setTab={setTab} />}
        {tab === 'events'    && <EventsTab myEvents={myEvents} setMyEvents={setMyEvents} showToast={showToast} />}
        {tab === 'myevents'  && <MyEventsTab myEvents={myEvents} setMyEvents={setMyEvents} showToast={showToast} />}
        {tab === 'profile'   && <ProfileTab showToast={showToast} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} myCount={myEvents.length} />

      {/* Toast */}
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
  const [authed, setAuthed] = useState(false);
  return (
    <>
      <Head><title>Volunteer Portal — VolunteerFlow</title></Head>
      {authed
        ? <Dashboard onLogout={() => setAuthed(false)} />
        : <LoginPage onLogin={() => setAuthed(true)} />
      }
    </>
  );
}
