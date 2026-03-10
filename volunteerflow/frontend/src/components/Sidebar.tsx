'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  Heart
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Volunteers', href: '/volunteers', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex flex-col transition-colors">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">VolunteerFlow</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
          <p className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-1">Need Help?</p>
          <p className="text-xs text-primary-700 dark:text-primary-300 mb-3">Check our documentation</p>
          <button className="w-full px-4 py-2 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </aside>
  );
}