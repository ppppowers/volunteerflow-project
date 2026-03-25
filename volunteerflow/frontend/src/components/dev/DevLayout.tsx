'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  UserX,
  Users,
  Flag,
  Package,
  ScrollText,
  Terminal,
  Settings,
  Activity,
  ArrowLeft,
  Shield,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { getDevRole } from '@/lib/devPortal';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  key: string;
  label: string;
  Icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
      { key: 'health',    label: 'System Health', Icon: Activity },
    ],
  },
  {
    label: 'Control',
    items: [
      { key: 'signup',  label: 'Signup Control',  Icon: UserX },
      { key: 'config',  label: 'Configuration',   Icon: Wrench },
      { key: 'flags',   label: 'Feature Flags',   Icon: Flag },
    ],
  },
  {
    label: 'Data',
    items: [
      { key: 'users',   label: 'User Management', Icon: Users },
      { key: 'modules', label: 'Modules',         Icon: Package },
    ],
  },
  {
    label: 'Debug',
    items: [
      { key: 'logs', label: 'Logs & Debug', Icon: ScrollText },
      { key: 'api',  label: 'API Inspector', Icon: Terminal },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  admin:       'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  dev:         'bg-violet-500/20 text-violet-300 border border-violet-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface DevLayoutProps {
  section: string;
  children: React.ReactNode;
}

export default function DevLayout({ section, children }: DevLayoutProps) {
  const router = useRouter();
  const role = getDevRole() ?? 'dev';

  function navigate(key: string) {
    router.push(`/dev?s=${key}`, undefined, { shallow: true });
  }

  // Active section label for header
  const activeItem = NAV.flatMap((g) => g.items).find((i) => i.key === section);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100 leading-none">Dev Portal</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">VolunteerFlow</p>
            </div>
          </div>
          <div className="mt-3">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${ROLE_COLORS[role] ?? ROLE_COLORS['dev']}`}>
              {role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ key, label, Icon }) => {
                  const active = section === key;
                  return (
                    <button
                      key={key}
                      onClick={() => navigate(key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-zinc-800 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-amber-400' : ''}`} />
                      <span className="truncate">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-zinc-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-3 border-t border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to app</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 flex-shrink-0 bg-zinc-900/70 backdrop-blur border-b border-zinc-800 flex items-center px-6 gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-zinc-500">Dev Portal</span>
          <ChevronRight className="w-3 h-3 text-zinc-700" />
          <span className="text-xs font-medium text-zinc-300">{activeItem?.label ?? section}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 font-mono">v1.0.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="System online" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
