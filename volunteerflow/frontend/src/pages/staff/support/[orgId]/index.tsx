import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSupportView } from '@/context/SupportViewContext';
import { staffApi } from '@/lib/staffApi';

// ---------------------------------------------------------------------------
// SupportViewLayout — shared nav wrapper for all support view pages
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
}

export function SupportViewLayout({
  children,
  orgId,
  activeHref,
}: {
  children: React.ReactNode;
  orgId: string;
  activeHref: string;
}) {
  const { session, isHydrated, exitSupportView } = useSupportView();
  const router = useRouter();

  // Guard: wait for hydration before redirecting to avoid false redirect on first render
  useEffect(() => {
    if (!isHydrated) return;
    if (!session || session.orgId !== orgId) {
      router.replace('/staff/orgs');
    }
  }, [isHydrated, session, orgId, router]);

  if (!isHydrated || !session || session.orgId !== orgId) return null;

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: `/staff/support/${orgId}` },
    { label: 'Volunteers', href: `/staff/support/${orgId}/volunteers` },
    { label: 'Events', href: `/staff/support/${orgId}/events` },
    { label: 'Applications', href: `/staff/support/${orgId}/applications` },
    { label: 'Hours', href: `/staff/support/${orgId}/hours` },
    { label: 'Settings', href: `/staff/support/${orgId}/settings` },
  ];

  return (
    // pt-10 to clear the fixed amber SupportBanner (h ~40px)
    <div className="flex min-h-screen bg-gray-950 pt-10">
      {/* Sidebar nav */}
      <aside className="w-52 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Support View</p>
          <p className="text-sm font-medium text-gray-200 mt-0.5 truncate">{session.orgName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {'Full Support'}
          </p>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map(item => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={exitSupportView}
            className="w-full rounded-lg bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-300 text-sm px-3 py-2 transition-colors text-left"
          >
            Exit Support View
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard stats page
// ---------------------------------------------------------------------------

interface DashboardStats {
  volunteer_count: number;
  event_count: number;
  pending_applications: number;
  total_hours: number;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-100 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

export default function SupportDashboardPage() {
  const router = useRouter();
  const { orgId } = router.query as { orgId: string };
  const { session } = useSupportView();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !session) return;
    setLoading(true);
    setError(null);
    staffApi.get(`/orgs/${orgId}/dashboard-stats`)
      .then(data => setStats((data as { stats: DashboardStats }).stats ?? data as DashboardStats))
      .catch(() => setError('Failed to load dashboard stats.'))
      .finally(() => setLoading(false));
  }, [orgId, session]);

  if (!orgId) return null;

  return (
    <SupportViewLayout orgId={orgId} activeHref={`/staff/support/${orgId}`}>
      <div className="max-w-4xl space-y-6">
        <h1 className="text-xl font-bold text-gray-100">
          Dashboard &mdash; {session?.orgName ?? orgId}
        </h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-lg border border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Volunteers" value={stats.volunteer_count} />
            <StatCard label="Events" value={stats.event_count} />
            <StatCard label="Pending Applications" value={stats.pending_applications} />
            <StatCard label="Total Hours" value={stats.total_hours} />
          </div>
        ) : null}
      </div>
    </SupportViewLayout>
  );
}
