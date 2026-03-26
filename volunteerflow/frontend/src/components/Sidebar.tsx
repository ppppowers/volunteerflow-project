'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
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

  useEffect(() => {
    setShowDev(isDevUser());
  }, []);

  return (
    <aside
      className="w-64 bg-white dark:bg-neutral-900 flex flex-col shrink-0 transition-colors"
      style={{ boxShadow: '2px 0 12px rgba(0,0,0,0.06)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-3">
        <Image
          src="/vf-logo-full.png"
          alt="VolunteerFlow"
          width={180}
          height={40}
          className="w-full h-auto"
          priority
        />
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-200 dark:shadow-primary-900/40'
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {showDev && (
          <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800">
            {devNavigation.map((item) => {
              const isActive = router.pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Dev
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3">
        <Link
          href="/help"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-xs font-medium"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          Help & Documentation
        </Link>
      </div>
    </aside>
  );
}
