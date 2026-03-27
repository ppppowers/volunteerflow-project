import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupportView } from '@/context/SupportViewContext';
import { staffApi } from '@/lib/staffApi';
import { SupportViewLayout } from './index';

type SettingsMap = Record<string, unknown>;

export default function SupportSettingsPage() {
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const { session } = useSupportView();

  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !session) return;
    setLoading(true);
    setError(null);
    staffApi.get(`/orgs/${orgId}/settings`)
      .then(data => {
        const d = data as { settings?: SettingsMap } | SettingsMap;
        setSettings((('settings' in d && d.settings) ? d.settings : d) as SettingsMap);
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, [orgId, session]);

  if (!orgId) return null;

  const rows = settings
    ? Object.entries(settings).filter(([k]) => k !== 'id' && k !== 'org_id')
    : [];

  return (
    <SupportViewLayout orgId={orgId} activeHref={`/staff/support/${orgId}/settings`}>
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-bold text-gray-100">Settings</h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="h-3 bg-gray-700 rounded animate-pulse w-32" />
                <div className="h-3 bg-gray-700 rounded animate-pulse flex-1" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500 italic">No settings available.</p>
          ) : (
            rows.map(([key, value]) => (
              <div key={key} className="flex items-start gap-4 px-5 py-3">
                <span className="w-48 flex-shrink-0 text-xs font-medium text-gray-400 pt-0.5 uppercase tracking-wide">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="flex-1 text-sm text-gray-200 font-mono break-all">
                  {value === null || value === undefined
                    ? <span className="text-gray-500 italic not-italic font-sans">—</span>
                    : typeof value === 'boolean'
                    ? <span className={value ? 'text-green-400' : 'text-red-400'}>{String(value)}</span>
                    : typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </SupportViewLayout>
  );
}
