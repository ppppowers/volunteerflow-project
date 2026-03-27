'use client';

import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { Search, Briefcase, Mail, Calendar, Shield, ChevronRight, X, Clock } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
  lastLogin: string | null;
}

// ─── Profile Drawer ───────────────────────────────────────────────────────────

function ProfileDrawer({ member, onClose }: { member: StaffRow; onClose: () => void }) {
  const initials = getInitials(member.name);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-neutral-900 z-50 shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Staff Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center px-6 py-8 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-2xl font-bold mb-4 ring-4 ring-emerald-50 dark:ring-emerald-900/20">
            {initials}
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 text-center">{member.name}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-0.5">{member.email}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold rounded-full capitalize">
              {member.role}
            </span>
            {member.isOwner && (
              <span className="px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full">
                Owner
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4 flex-1">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Details</h4>

            <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Email</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <Shield className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Role</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 capitalize">{member.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Joined</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{formatDate(member.joinedAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2.5">
              <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Last Active</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{timeAgo(member.lastLogin)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <a
            href={`mailto:${member.email}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            Send Email
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ member, onSelect }: { member: StaffRow; onSelect: () => void }) {
  const joinedDays = member.joinedAt
    ? Math.floor((Date.now() - new Date(member.joinedAt).getTime()) / 86400000)
    : null;
  const daysLabel = joinedDays !== null
    ? joinedDays < 30
      ? `${joinedDays}d`
      : joinedDays < 365
        ? `${Math.floor(joinedDays / 30)}mo`
        : `${Math.floor(joinedDays / 365)}y`
    : '—';

  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {getInitials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{member.name}</p>
            {member.isOwner && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                Owner
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{member.email}</p>
        </div>
        <span className="flex-shrink-0 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold rounded-full capitalize">
          {member.role}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
          <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{daysLabel}</p>
          <p className="text-xs text-neutral-400 leading-tight">Tenure</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
          <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate capitalize leading-tight pt-0.5">
            {member.isOwner ? 'Owner' : member.role.split(' ')[0]}
          </p>
          <p className="text-xs text-neutral-400 leading-tight">Role</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
          <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{timeAgo(member.lastLogin)}</p>
          <p className="text-xs text-neutral-400 leading-tight">Active</p>
        </div>
      </div>

      {/* View profile */}
      <div className="pt-1 border-t border-neutral-100 dark:border-neutral-700">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          View Profile
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}

// ─── StaffTab ─────────────────────────────────────────────────────────────────

export function StaffTab() {
  const [staff, setStaff]       = useState<StaffRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<StaffRow | null>(null);

  useEffect(() => {
    api.get<StaffRow[]>('/team')
      .then(setStaff)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q),
    );
  }, [search, staff]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + ' pl-9'}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-14 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />)}
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {staff.length === 0 ? 'No staff members yet.' : 'No staff match your search.'}
          </p>
          {staff.length === 0 && (
            <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-500">
              Invite team members in Settings → Team.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <StaffCard key={s.id} member={s} onSelect={() => setSelected(s)} />
          ))}
        </div>
      )}

      {/* Profile drawer */}
      {selected && (
        <ProfileDrawer member={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
