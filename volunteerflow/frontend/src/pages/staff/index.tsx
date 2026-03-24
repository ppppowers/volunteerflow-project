import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { useStaffAuth } from '@/context/StaffAuthContext';
import { staffApi } from '@/lib/staffApi';
import { PLAN_BADGE, STATUS_BADGE, RecentOrg, loadRecentOrgs, relativeTimeCompact } from '@/components/staff/staffOrgUtils';

interface AuditLog {
  id: string;
  action?: string;
  category?: string;
  created_at?: string;
  staff_name?: string;
  target_org_name?: string;
  target_org_id?: string;
  [key: string]: unknown;
}

interface AuditResponse {
  logs?: AuditLog[];
  total?: number;
  [key: string]: unknown;
}

interface ActiveSessionsResponse {
  sessions?: unknown[];
  count?: number;
  [key: string]: unknown;
}

function MetricCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-col justify-between min-h-[90px]">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h3>
      <div className="flex items-end gap-2 mt-2">
        <span className="text-3xl font-bold text-amber-400">{value}</span>
        {sub && <span className="text-sm text-gray-500 mb-0.5">{sub}</span>}
      </div>
    </div>
  );
}

function ManagementMetrics() {
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [recentTotal, setRecentTotal] = useState<number | null>(null);
  const [auditError, setAuditError] = useState(false);

  const [activeSessions, setActiveSessions] = useState<number | null>(null);
  const [sessionsError, setSessionsError] = useState(false);

  const [deniedTotal, setDeniedTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.allSettled([
      staffApi.get('/audit?limit=10') as Promise<AuditResponse>,
      staffApi.get('/support/active') as Promise<ActiveSessionsResponse>,
      staffApi.get(`/audit?category=auth&outcome=denied&from=${encodeURIComponent(sevenDaysAgo)}`) as Promise<AuditResponse>,
    ]).then(([recentResult, activeResult, deniedResult]) => {
      if (cancelled) return;

      if (recentResult.status === 'fulfilled') {
        const logs = recentResult.value?.logs ?? [];
        setRecentLogs(logs);
        setRecentTotal(recentResult.value?.total ?? logs.length);
      } else {
        setAuditError(true);
      }

      if (activeResult.status === 'fulfilled') {
        const sessions = activeResult.value?.sessions;
        setActiveSessions(
          activeResult.value?.count ?? (Array.isArray(sessions) ? sessions.length : 0)
        );
      } else {
        setSessionsError(true);
      }

      if (deniedResult.status === 'fulfilled') {
        const logs = deniedResult.value?.logs ?? [];
        setDeniedTotal(deniedResult.value?.total ?? logs.length);
      }
      // denied failures are non-critical — no error state needed
    });
    return () => { cancelled = true; };
  }, []);

  // Derive unique org count from recentLogs
  const orgsAccessed = recentLogs.length > 0
    ? new Set(recentLogs.map(l => l.target_org_id).filter(Boolean)).size
    : null;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Recent Actions (7d)"
          value={auditError ? '—' : (recentTotal === null ? '…' : recentTotal)}
        />
        <MetricCard
          label="Active Sessions Now"
          value={sessionsError ? '—' : (activeSessions === null ? '…' : activeSessions)}
          sub={activeSessions === 1 ? 'session' : 'sessions'}
        />
        <MetricCard
          label="Denied Attempts (7d)"
          value={deniedTotal === null ? '…' : deniedTotal}
        />
        <MetricCard
          label="Orgs Accessed (7d)"
          value={auditError ? '—' : (orgsAccessed === null ? '…' : orgsAccessed)}
        />
      </div>

      {/* Recent high-risk list */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Staff Actions</h3>
        {auditError ? (
          <p className="text-sm text-gray-600 italic">Unable to load recent activity.</p>
        ) : recentLogs.length === 0 ? (
          <p className="text-sm text-gray-600">No recent activity.</p>
        ) : (
          <ul className="space-y-2">
            {recentLogs.slice(0, 5).map(entry => (
              <li key={entry.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">
                    {entry.action ?? entry.category ?? 'action'}
                    {entry.target_org_name
                      ? <span className="text-gray-500"> — {entry.target_org_name}</span>
                      : null}
                  </p>
                  {entry.staff_name && (
                    <p className="text-xs text-gray-600 truncate">{entry.staff_name}</p>
                  )}
                </div>
                {entry.created_at && (
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {relativeTimeCompact(entry.created_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function StaffHomePage() {
  const router = useRouter();
  const { canDo } = useStaffAuth();

  const [searchInput, setSearchInput] = useState('');
  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([]);

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
