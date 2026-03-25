'use client';

import { Bell, Search, User, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface UserInfo {
  name: string;
  email: string;
}

function getUserInfo(): UserInfo {
  if (typeof window === 'undefined') {
    return { name: 'Admin User', email: '' };
  }
  try {
    const stored = localStorage.getItem('vf_user');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserInfo>;
      return {
        name: parsed.name || 'Admin User',
        email: parsed.email || '',
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { name: 'Admin User', email: '' };
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: 'Admin User', email: '' });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setUserInfo(getUserInfo());
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vf_token');
    localStorage.removeItem('vf_user');
    localStorage.removeItem('vf_role');
    router.push('/auth');
  };

  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search volunteers, events, applications..."
              aria-label="Search"
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6">
          {/* Dark mode toggle — only render after mount to avoid hydration mismatch */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              ) : (
                <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              )}
            </button>
          )}

          {/* Notifications */}
          <button
            className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 p-2" aria-label="Signed in user">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center" aria-hidden="true">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {mounted ? userInfo.name : 'Admin User'}
              </p>
              {mounted && userInfo.email && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{userInfo.email}</p>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
