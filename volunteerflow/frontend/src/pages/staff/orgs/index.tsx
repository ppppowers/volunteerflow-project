import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { OrgSearchTable, Org } from '@/components/staff/OrgSearchTable';
import { staffApi } from '@/lib/staffApi';

interface ApiResponse {
  orgs: Org[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface RecentOrg {
  id: string;
  org_name: string;
  plan: string;
  status: string;
}

const PLAN_OPTIONS = ['all', 'free', 'starter', 'pro', 'enterprise'];
const STATUS_OPTIONS = ['all', 'active', 'suspended', 'trial', 'cancelled'];

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

export default function StaffOrgsPage() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([]);

  // Sync recently viewed on mount (client-side only)
  useEffect(() => {
    setRecentOrgs(loadRecentOrgs());
  }, []);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrgs = useCallback(async (q: string, pl: string, st: string, pg: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg) });
      if (q) params.set('q', q);
      if (pl !== 'all') params.set('plan', pl);
      if (st !== 'all') params.set('status', st);
      const res = await staffApi.get(`/orgs?${params.toString()}`) as ApiResponse;
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger fetch with a constant 300ms debounce for all query changes including clears
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOrgs(query, plan, status, page);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, plan, status, page, fetchOrgs]);

  // Reset to page 1 when filters change
  function handleQueryChange(val: string) {
    setPage(1);
    setQuery(val);
  }
  function handlePlanChange(val: string) {
    setPage(1);
    setPlan(val);
  }
  function handleStatusChange(val: string) {
    setPage(1);
    setStatus(val);
  }

  const showRecent = !query && plan === 'all' && status === 'all';

  const from = data ? (data.page - 1) * data.limit + 1 : 0;
  const to   = data ? Math.min(data.page * data.limit, data.total) : 0;

  return (
    <StaffLayout requiredPerm="orgs.view">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-100">Organizations</h1>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or ID…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          />
          <select
            value={plan}
            onChange={e => handlePlanChange(e.target.value)}
            className="bg-gray-800 text-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          >
            {PLAN_OPTIONS.map(p => (
              <option key={p} value={p}>{p === 'all' ? 'All plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
            className="bg-gray-800 text-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Recently viewed (only shown when no active search/filter) */}
        {showRecent && recentOrgs.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Recently Viewed</h2>
            <div className="rounded-lg border border-gray-800 bg-gray-900 divide-y divide-gray-800">
              {recentOrgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => router.push(`/staff/orgs/${org.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="flex-1 text-sm text-gray-200 font-medium">{org.org_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[org.plan] ?? 'bg-gray-700 text-gray-300'}`}>
                    {org.plan}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[org.status] ?? 'bg-gray-700 text-gray-400'}`}>
                    {org.status}
                  </span>
                  <span className="text-xs text-gray-600 font-mono">{org.id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">{error}</p>
        )}

        {/* Result count */}
        {data && !loading && (
          <p className="text-xs text-gray-500">
            Showing {from}–{to} of {data.total} org{data.total !== 1 ? 's' : ''}
          </p>
        )}

        {/* Table */}
        <OrgSearchTable orgs={data?.orgs ?? []} loading={loading} />

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm px-4 py-2 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {data.page} of {data.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pages, p + 1))}
              disabled={page >= data.pages}
              className="rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm px-4 py-2 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
