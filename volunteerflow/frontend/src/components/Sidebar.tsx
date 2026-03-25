'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  Heart,
  MessageSquare,
  Folder,
  ShieldCheck,
  ScrollText,
  Globe,
  GraduationCap,
  Terminal,
  QrCode,
  HelpCircle,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Vetting', href: '/vetting', icon: ShieldCheck },
  { name: 'Files', href: '/files', icon: Folder },
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'QR Codes', href: '/qr', icon: QrCode },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Portal Designer', href: '/portal', icon: Globe },
  { name: 'Audit Log', href: '/audit', icon: ScrollText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const devNavigation = [
  { name: 'Dev Portal', href: '/dev', icon: Terminal },
];

function isDevUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const role = localStorage.getItem('vf_role');
    return role === 'super_admin' || role === 'admin' || role === 'dev';
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const router = useRouter();
  const [showDev, setShowDev] = useState(false);

  // Read role client-side only to avoid SSR mismatch
  useEffect(() => {
    setShowDev(isDevUser());
  }, []);

  return (
    <aside className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex flex-col transition-colors shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center" aria-hidden="true">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">VolunteerFlow</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}

        {/* Dev tools — only shown to super_admin / admin / dev roles */}
        {showDev && (
          <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-700">
            {devNavigation.map((item) => {
              const isActive = router.pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-sm">{item.name}</span>
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Dev
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-4 h-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">Need Help?</p>
          </div>
          <p className="text-xs text-primary-700 dark:text-primary-300 mb-3">
            Check our documentation and support resources.
          </p>
          <a
            href="https://docs.volunteerflow.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
          >
            View Docs
          </a>
        </div>
      </div>
    </aside>
  );
}
