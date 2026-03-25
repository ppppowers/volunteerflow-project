import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupportView } from '@/context/SupportViewContext';
import { staffApi } from '@/lib/staffApi';
import { SupportViewLayout } from './index';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  joined_at: string;
}

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

export default function SupportVolunteersPage() {
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const { session } = useSupportView();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !session) return;
    setLoading(true);
    setError(null);
    staffApi.get(`/orgs/${orgId}/volunteers`)
      .then(data => setVolunteers((data as { volunteers: Volunteer[] }).volunteers ?? []))
      .catch(() => setError('Failed to load volunteers.'))
      .finally(() => setLoading(false));
  }, [orgId, session]);

  if (!orgId) return null;

  return (
    <SupportViewLayout orgId={orgId} activeHref={`/staff/support/${orgId}/volunteers`}>
      <div className="max-w-5xl space-y-4">
        <h1 className="text-xl font-bold text-gray-100">Volunteers</h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
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
              ) : volunteers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">No volunteers found.</td>
                </tr>
              ) : (
                volunteers.map(v => (
                  <tr key={v.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-200 font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-gray-400">{v.email}</td>
                    <td className="px-4 py-3 text-gray-400">{v.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.status === 'active' ? 'bg-green-900/40 text-green-300' :
                        v.status === 'inactive' ? 'bg-gray-700 text-gray-400' :
                        'bg-yellow-900/40 text-yellow-300'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(v.joined_at)}</td>
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
