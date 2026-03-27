'use client';

import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import { Search, Briefcase } from 'lucide-react';

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

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isOwner: boolean;
  joinedAt: string;
}

export function StaffTab() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded" />
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
            <Card key={s.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {getInitials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{s.name}</p>
                    {s.isOwner && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-full font-medium capitalize">
                  {s.role}
                </span>
                {s.joinedAt && (
                  <span>Joined {new Date(s.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
