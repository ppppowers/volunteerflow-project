import React from 'react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
  outcome: 'success' | 'denied' | 'error';
  source?: 'staff' | 'org';
}

interface AuditLogTableProps {
  entries: AuditEntry[];
  loading: boolean;
  emptyMessage?: string;
}

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

function OutcomeBadge({ outcome }: { outcome: AuditEntry['outcome'] }) {
  if (outcome === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900 text-green-300 px-2 py-0.5 text-xs font-medium">
        ✓ success
      </span>
    );
  }
  if (outcome === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-900 text-red-300 px-2 py-0.5 text-xs font-medium">
        ✗ denied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900 text-amber-300 px-2 py-0.5 text-xs font-medium">
      ⚠ error
    </span>
  );
}

function SourceBadge({ source }: { source?: AuditEntry['source'] }) {
  if (!source) return null;
  if (source === 'staff') {
    return (
      <span className="rounded-full bg-purple-900 text-purple-300 px-2 py-0.5 text-xs font-medium">
        staff
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blue-900 text-blue-300 px-2 py-0.5 text-xs font-medium">
      org
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-700">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3 bg-gray-700 rounded animate-pulse"
            style={{ width: `${50 + (i % 4) * 15}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function AuditLogTable({ entries, loading, emptyMessage }: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm text-gray-300">
        <thead>
          <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Timestamp</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-left">Actor</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Target</th>
            <th className="px-4 py-3 text-left">Outcome</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                {emptyMessage ?? 'No activity recorded.'}
              </td>
            </tr>
          ) : (
            entries.map(entry => (
              <tr key={entry.id} className="hover:bg-gray-800 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={entry.source} />
                </td>
                <td className="px-4 py-3 text-gray-200">{entry.actor}</td>
                <td className="px-4 py-3 text-gray-300">{entry.action}</td>
                <td className="px-4 py-3 text-gray-400">{entry.target ?? '—'}</td>
                <td className="px-4 py-3">
                  <OutcomeBadge outcome={entry.outcome} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
