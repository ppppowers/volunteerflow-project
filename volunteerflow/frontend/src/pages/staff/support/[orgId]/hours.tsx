import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupportView } from '@/context/SupportViewContext';
import { staffApi } from '@/lib/staffApi';
import { SupportViewLayout } from './index';

interface HoursEntry {
  id: string;
  volunteer_name: string;
  event_name?: string;
  hours: number;
  date: string;
  status: string;
}

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export default function SupportHoursPage() {
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const { session } = useSupportView();

  const [entries, setEntries] = useState<HoursEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !session) return;
    setLoading(true);
    setError(null);
    staffApi.get(`/orgs/${orgId}/hours`)
      .then(data => setEntries((data as { hours: HoursEntry[] }).hours ?? []))
      .catch(() => setError('Failed to load hours.'))
      .finally(() => setLoading(false));
  }, [orgId, session]);

  if (!orgId) return null;

  return (
    <SupportViewLayout orgId={orgId} activeHref={`/staff/support/${orgId}/hours`}>
      <div className="max-w-5xl space-y-4">
        <h1 className="text-xl font-bold text-gray-100">Hours</h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Volunteer</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-700 rounded animate-pulse" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">No hours logged.</td>
                </tr>
              ) : (
                entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-200 font-medium">{e.volunteer_name}</td>
                    <td className="px-4 py-3 text-gray-400">{e.event_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-200 tabular-nums font-medium">{e.hours}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === 'approved' ? 'bg-green-900/40 text-green-300' :
                        e.status === 'pending' ? 'bg-yellow-900/40 text-yellow-300' :
                        e.status === 'rejected' ? 'bg-red-900/40 text-red-300' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SupportViewLayout>
  );
}
