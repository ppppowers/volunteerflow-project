import React from 'react';
import { useRouter } from 'next/router';

export interface Org {
  id: string;
  org_name: string;
  email: string;
  contact_name?: string;
  plan: string;
  status: string;
  volunteer_count?: number;
  event_count?: number;
  created_at: string;
  last_activity?: string;
}

export interface OrgSearchTableProps {
  orgs: Org[];
  loading: boolean;
  onOpen?: (org: Org) => void;
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

function formatJoined(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`;
  } catch {
    return '—';
  }
}

function writeRecentOrg(org: Org) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('vf_staff_recent_orgs');
    const list: Array<{ id: string; org_name: string; plan: string; status: string }> =
      raw ? JSON.parse(raw) : [];
    const filtered = list.filter(o => o.id !== org.id);
    filtered.unshift({ id: org.id, org_name: org.org_name, plan: org.plan, status: org.status });
    localStorage.setItem('vf_staff_recent_orgs', JSON.stringify(filtered.slice(0, 10)));
  } catch {}
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-800">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-700 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="h-6 w-14 bg-gray-700 rounded-lg animate-pulse" />
      </td>
    </tr>
  );
}

export function OrgSearchTable({ orgs, loading, onOpen }: OrgSearchTableProps) {
  const router = useRouter();

  function handleOpen(org: Org) {
    writeRecentOrg(org);
    router.push(`/staff/orgs/${org.id}`);
    onOpen?.(org); // additive callback, not a replacement
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm text-gray-300">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Organization</th>
            <th className="px-4 py-3 text-left">Owner</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Volunteers</th>
            <th className="px-4 py-3 text-right">Events</th>
            <th className="px-4 py-3 text-left">Joined</th>
            <th className="px-4 py-3 text-left">Last Activity</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : orgs.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                No organizations found.
              </td>
            </tr>
          ) : (
            orgs.map(org => (
              <tr key={org.id} className="hover:bg-gray-800 transition-colors">
                {/* Org name + ID chip */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-100">{org.org_name}</span>
                    <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400 font-mono">
                      {org.id.slice(0, 8)}
                    </span>
                  </div>
                </td>
                {/* Owner */}
                <td className="px-4 py-3 text-gray-400">{org.contact_name ?? '—'}</td>
                {/* Plan badge */}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE[org.plan] ?? 'bg-gray-700 text-gray-300'}`}>
                    {org.plan}
                  </span>
                </td>
                {/* Status badge */}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[org.status] ?? 'bg-gray-700 text-gray-400'}`}>
                    {org.status}
                  </span>
                </td>
                {/* Volunteers */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {org.volunteer_count ?? 0}
                </td>
                {/* Events */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {org.event_count ?? 0}
                </td>
                {/* Joined */}
                <td className="px-4 py-3 text-gray-400">{formatJoined(org.created_at)}</td>
                {/* Last Activity */}
                <td className="px-4 py-3 text-gray-400">{relativeTime(org.last_activity)}</td>
                {/* Open button */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleOpen(org)}
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
