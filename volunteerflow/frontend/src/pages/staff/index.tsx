import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { useStaffAuth } from '@/context/StaffAuthContext';
import { staffApi } from '@/lib/staffApi';

interface RecentOrg {
  id: string;
  org_name: string;
  plan: string;
  status: string;
}

interface AuditEntry {
  id: string;
  action?: string;
  category?: string;
  created_at?: string;
  staff_name?: string;
  org_name?: string;
  [key: string]: unknown;
}

interface ActiveSessions {
  count: number;
  [key: string]: unknown;
}

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-gray-700 text-gray-300',
  starter:    'bg-blue-900 text-blue-300',
  pro:        'bg-purple-900 text-purple-300',
  enterprise: 'bg-amber-900 text-amber-300',
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-green-900 text-green-300',
  suspended: 'bg-red-900 text-red-300',
  trial:     'bg-yellow-900 text-yellow-300',
  cancelled: 'bg-gray-700 text-gray-400',
};

function loadRecentOrgs(): RecentOrg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('vf_staff_recent_orgs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

function ManagementMetrics() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<number | null>(null);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      staffApi.get('/audit?limit=5&category=support_view') as Promise<{ entries?: AuditEntry[]; [k: string]: unknown }>,
      staffApi.get('/support/active') as Promise<ActiveSessions>,
    ])
      .then(([auditRes, sessionsRes]) => {
        if (cancelled) return;
        setAuditEntries(auditRes?.entries ?? []);
        setActiveSessions(sessionsRes?.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setMetricsError(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (metricsError) {
    return (
      <p className="text-sm text-gray-600 italic">Unable to load metrics.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Recent Support Activity */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Support Activity</h3>
        {auditEntries.length === 0 ? (
          <p className="text-sm text-gray-600">No recent activity.</p>
        ) : (
          <ul className="space-y-2">
            {auditEntries.map(entry => (
              <li key={entry.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">
                    {entry.action ?? entry.category ?? 'Support view'}
                    {entry.org_name ? <span className="text-gray-500"> — {entry.org_name}</span> : null}
                  </p>
                  {entry.staff_name && (
                    <p className="text-xs text-gray-600 truncate">{entry.staff_name}</p>
                  )}
                </div>
                {entry.created_at && (
                  <span className="text-xs text-gray-600 whitespace-nowrap">{relativeTime(entry.created_at)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Active Support Sessions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-col justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Active Support Sessions</h3>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-amber-400">
            {activeSessions === null ? '—' : activeSessions}
          </span>
          <span className="text-sm text-gray-500 mb-1">active session{activeSessions !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

export default function StaffHomePage() {
  const router = useRouter();
  const { canDo } = useStaffAuth();

  const [searchInput, setSearchInput] = useState('');
  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentOrgs(loadRecentOrgs());
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (q) {
      router.push(`/staff/orgs?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/staff/orgs');
    }
  }

  const showMetrics = canDo('dashboard.view_management_metrics');

  return (
    <StaffLayout>
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Search bar */}
        <div className="flex flex-col items-center pt-6 gap-3">
          <h1 className="text-2xl font-bold text-gray-100">Search organizations</h1>
          <p className="text-sm text-gray-500">Find any org by name, email, or ID</p>
          <form onSubmit={handleSearch} className="w-full max-w-xl flex gap-2 mt-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Org name, email, or ID…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
              autoFocus
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-3 rounded-lg text-sm transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Recently viewed */}
        {recentOrgs.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Recently Viewed</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentOrgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => router.push(`/staff/orgs/${org.id}`)}
                  className="rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 transition-colors p-4 text-left space-y-2"
                >
                  <p className="text-sm font-medium text-gray-100 truncate">{org.org_name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[org.plan] ?? 'bg-gray-700 text-gray-300'}`}>
                      {org.plan}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[org.status] ?? 'bg-gray-700 text-gray-400'}`}>
                      {org.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">{org.id.slice(0, 8)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Management metrics (gated) */}
        {showMetrics && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Management Metrics</h2>
            <ManagementMetrics />
          </div>
        )}

      </div>
    </StaffLayout>
  );
}
