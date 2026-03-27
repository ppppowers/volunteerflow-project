import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { PermissionGate } from '@/components/staff/PermissionGate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  created_at: string;
  staff_user_id: string;
  category: string;
  action: string;
  target_org_id?: string;
  target_org_name?: string;
  resource_type?: string;
  resource_id?: string;
  outcome: 'success' | 'denied' | 'error';
  reason?: string;
  field_changes?: Record<string, { before: unknown; after: unknown }> | null;
  metadata?: unknown;
  staff_email: string;
  staff_name: string;
  staff_role: string;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Filters {
  staffUserId: string;
  targetOrgId: string;
  category: string;
  outcome: string;
  from: string;
  to: string;
  q: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function OutcomeBadge({ outcome }: { outcome: AuditLog['outcome'] }) {
  if (outcome === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900 text-green-300 px-2 py-0.5 text-xs font-medium">
        success
      </span>
    );
  }
  if (outcome === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-900 text-red-300 px-2 py-0.5 text-xs font-medium">
        denied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900 text-amber-300 px-2 py-0.5 text-xs font-medium">
      error
    </span>
  );
}

// ─── Field changes inline diff ────────────────────────────────────────────────

function FieldChangeDetails({ fieldChanges }: { fieldChanges: AuditLog['field_changes'] }) {
  const [open, setOpen] = useState(false);
  if (!fieldChanges || Object.keys(fieldChanges).length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300 mt-1"
      >
        {open ? 'Hide details' : 'Details'}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {Object.entries(fieldChanges).map(([field, change]) => (
            <div key={field} className="text-xs text-gray-400 font-mono">
              <span className="text-gray-300">{field}:</span>{' '}
              <span className="text-red-400">&quot;{String(change?.before ?? '')}&quot;</span>
              {' → '}
              <span className="text-green-400">&quot;{String(change?.after ?? '')}&quot;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audit table ──────────────────────────────────────────────────────────────

function AuditTable({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  function SkeletonRow() {
    return (
      <tr className="border-t border-gray-700">
        {Array.from({ length: 7 }).map((_, i) => (
          <td key={i} className="px-3 py-3">
            <div className="h-3 bg-gray-700 rounded animate-pulse" style={{ width: `${50 + (i % 4) * 12}%` }} />
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm text-gray-300">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <th className="px-3 py-3 text-left">Timestamp</th>
            <th className="px-3 py-3 text-left">Staff</th>
            <th className="px-3 py-3 text-left">Role</th>
            <th className="px-3 py-3 text-left">Category</th>
            <th className="px-3 py-3 text-left">Action</th>
            <th className="px-3 py-3 text-left">Org</th>
            <th className="px-3 py-3 text-left">Outcome</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-gray-500">
                No audit logs found.
              </td>
            </tr>
          ) : (
            logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800 transition-colors">
                <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {formatTimestamp(log.created_at)}
                </td>
                <td className="px-3 py-3">
                  <p className="text-gray-200 text-sm">{log.staff_name}</p>
                  <p className="text-gray-500 text-xs">{log.staff_email}</p>
                </td>
                <td className="px-3 py-3 text-gray-400 text-xs">{log.staff_role}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs text-gray-300">
                    {log.category}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-300 text-sm">
                  <span>{log.action}</span>
                  {log.resource_type && (
                    <span className="text-gray-500 text-xs ml-1">({log.resource_type})</span>
                  )}
                  <FieldChangeDetails fieldChanges={log.field_changes} />
                </td>
                <td className="px-3 py-3 text-gray-400 text-sm">{log.target_org_name ?? '—'}</td>
                <td className="px-3 py-3">
                  <OutcomeBadge outcome={log.outcome} />
                  {log.reason && (
                    <p className="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate" title={log.reason}>
                      {log.reason}
                    </p>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffAuditPage() {
  const [filters, setFilters] = useState<Filters>({
    staffUserId: '',
    targetOrgId: '',
    category: '',
    outcome: '',
    from: '',
    to: '',
    q: '',
  });
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Debounce text search
  function handleQChange(value: string) {
    setFilters(f => ({ ...f, q: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(value);
      setPage(1);
    }, 300);
  }

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.staffUserId) params.set('staffUserId', filters.staffUserId);
      if (filters.targetOrgId) params.set('targetOrgId', filters.targetOrgId);
      if (filters.category) params.set('category', filters.category);
      if (filters.outcome) params.set('outcome', filters.outcome);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (debouncedQ) params.set('q', debouncedQ);
      params.set('page', String(page));
      params.set('limit', '20');

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('vf_staff_token') : null;
      const res = await fetch(`/api/staff/audit?${params}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('vf_staff_token');
        window.location.href = '/staff/login';
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to load audit logs');
      }
      const json = (await res.json()) as AuditResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters.staffUserId, filters.targetOrgId, filters.category, filters.outcome, filters.from, filters.to, debouncedQ, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.staffUserId) params.set('staffUserId', filters.staffUserId);
      if (filters.targetOrgId) params.set('targetOrgId', filters.targetOrgId);
      if (filters.category) params.set('category', filters.category);
      if (filters.outcome) params.set('outcome', filters.outcome);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (debouncedQ) params.set('q', debouncedQ);

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('vf_staff_token') : null;
      const res = await fetch(`/api/staff/audit/export?${params}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = data?.pages ?? 1;

  return (
    <StaffLayout requiredPerm="audit.view_all">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">All staff actions across all organizations</p>
          </div>
          <PermissionGate perm="audit.export">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </PermissionGate>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Action or resource type…"
              value={filters.q}
              onChange={e => handleQChange(e.target.value)}
              className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value)}
              className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
            >
              <option value="">All categories</option>
              <option value="auth">auth</option>
              <option value="support_view">support_view</option>
              <option value="org_edit">org_edit</option>
              <option value="note">note</option>
              <option value="audit">audit</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-xs text-gray-500 mb-1">Outcome</label>
            <select
              value={filters.outcome}
              onChange={e => handleFilterChange('outcome', e.target.value)}
              className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
            >
              <option value="">All outcomes</option>
              <option value="success">success</option>
              <option value="denied">denied</option>
              <option value="error">error</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={e => handleFilterChange('from', e.target.value)}
              className="bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={e => handleFilterChange('to', e.target.value)}
              className="bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
            />
          </div>

          {(filters.category || filters.outcome || filters.from || filters.to || filters.q) && (
            <button
              onClick={() => {
                setFilters({ staffUserId: '', targetOrgId: '', category: '', outcome: '', from: '', to: '', q: '' });
                setDebouncedQ('');
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 pb-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results summary */}
        {data && !loading && (
          <p className="text-xs text-gray-500">
            {data.total.toLocaleString()} result{data.total !== 1 ? 's' : ''}
          </p>
        )}

        {/* Table */}
        <AuditTable logs={data?.logs ?? []} loading={loading} />

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
