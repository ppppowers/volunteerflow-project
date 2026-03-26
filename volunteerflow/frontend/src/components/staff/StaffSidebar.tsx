import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Terminal } from 'lucide-react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { PERMISSIONS } from '../../lib/staffPermissions';

const NAV_ITEMS = [
  { href: '/staff', label: 'Home', icon: '🏠' },
  { href: '/staff/orgs', label: 'Organizations', icon: '🏢' },
  { href: '/staff/audit', label: 'Audit Log', icon: '📋' },
  { href: '/staff/employees', label: 'Employees', icon: '👥' },
  { href: '/staff/roles', label: 'Roles', icon: '🔑' },
];

export function StaffSidebar() {
  const router = useRouter();
  const { staffUser } = useStaffAuth();
  const permissions = staffUser?.permissions ?? [];
  return (
    <nav className="w-56 bg-gray-900 text-gray-100 flex flex-col h-full border-r border-gray-800">
      <div className="px-4 py-5 border-b border-gray-800">
        <span className="text-amber-400 font-bold text-sm tracking-wide uppercase">Staff Portal</span>
      </div>
      <ul className="flex-1 py-3 space-y-1 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/staff'
            ? router.pathname === '/staff'
            : router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-amber-500 text-gray-900 font-medium' : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
        {permissions.includes(PERMISSIONS.FEATURE_FLAGS_MANAGE) && (
          <li>
            <Link
              href="/staff/dev"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                router.pathname === '/staff/dev' ? 'bg-amber-500 text-gray-900 font-medium' : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Terminal size={16} />
              Dev Console
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
