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
  Clock,
  BarChart2,
  MapPin,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePlan } from '@/context/usePlan';
import { type FeatureKey } from '@/lib/pricing.config';

interface Location { id: string; name: string; color: string; }

const LOC_KEY = 'vf_location_id';
const LOC_NAME_KEY = 'vf_location_name';

function getStoredLocation(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const id = sessionStorage.getItem(LOC_KEY);
    const name = sessionStorage.getItem(LOC_NAME_KEY);
    return id && name ? { id, name } : null;
  } catch { return null; }
}

function setStoredLocation(loc: Location | null) {
  try {
    if (loc) {
      sessionStorage.setItem(LOC_KEY, loc.id);
      sessionStorage.setItem(LOC_NAME_KEY, loc.name);
    } else {
      sessionStorage.removeItem(LOC_KEY);
      sessionStorage.removeItem(LOC_NAME_KEY);
    }
    window.dispatchEvent(new CustomEvent('vf:locationchange'));
  } catch { /* ignore */ }
}

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; featureKey?: FeatureKey }[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Vetting', href: '/vetting', icon: ShieldCheck },
  { name: 'Files', href: '/files', icon: Folder },
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'QR Codes', href: '/qr', icon: QrCode },
  { name: 'Hours', href: '/hours', icon: Clock },
  { name: 'Grant Report', href: '/grant-report', icon: BarChart2 },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Portal Designer', href: '/portal', icon: Globe },
  { name: 'Audit Log', href: '/audit', icon: ScrollText, featureKey: 'audit_logs' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const devNavigation = [
  { name: 'Dev Portal', href: '/dev', icon: Terminal },
];

function isDevUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const role = sessionStorage.getItem('vf_role');
    return role === 'super_admin' || role === 'admin' || role === 'dev';
  } catch {
    return false;
  }
}

export default function Sidebar() {
  const router = useRouter();
  const { can } = usePlan();
  const [showDev, setShowDev] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<{ id: string; name: string } | null>(null);
  const [locOpen, setLocOpen] = useState(false);

  useEffect(() => {
    setShowDev(isDevUser());
    setSelectedLoc(getStoredLocation());
    api.get<{ data: Location[] }>('/locations')
      .then((r) => { if (r.data?.length) setLocations(r.data); })
      .catch(() => {});
  }, []);

  const selectLocation = (loc: Location | null) => {
    const stored = loc ? { id: loc.id, name: loc.name } : null;
    setStoredLocation(loc);
    setSelectedLoc(stored);
    setLocOpen(false);
  };

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
          const isLocked = !!item.featureKey && !can(item.featureKey);
          if (isLocked) {
            return (
              <div
                key={item.name}
                title="Upgrade to Enterprise to unlock this feature"
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-neutral-300 dark:text-neutral-600 cursor-not-allowed select-none"
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item.name}</span>
                <Lock className="w-3 h-3 ml-auto shrink-0" />
              </div>
            );
          }
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

      {/* Location switcher — only shown when org has locations */}
      {locations.length > 0 && (
        <div className="px-3 pb-2 relative">
          <button
            onClick={() => setLocOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
            <span className="flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 text-left truncate">
              {selectedLoc ? selectedLoc.name : 'All Locations'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${locOpen ? 'rotate-180' : ''}`} />
          </button>
          {locOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={() => selectLocation(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${!selectedLoc ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-neutral-700 dark:text-neutral-300'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                All Locations
              </button>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => selectLocation(loc)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${selectedLoc?.id === loc.id ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-neutral-700 dark:text-neutral-300'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: loc.color }} />
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
