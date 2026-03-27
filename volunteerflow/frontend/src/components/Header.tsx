'use client';

import { Bell, Search, User, Moon, Sun, LogOut, MessageSquare } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FeedbackModal from './FeedbackModal';

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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setUserInfo(getUserInfo());
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vf_token');
    localStorage.removeItem('vf_user');
    localStorage.removeItem('vf_role');
    router.push('/landing');
  };

  return (
    <header
      className="bg-white dark:bg-neutral-900 px-6 py-3 transition-colors"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search volunteers, events..."
              aria-label="Search"
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Dark mode toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
              ) : (
                <Sun className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
              )}
            </button>
          )}

          {/* Feedback */}
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            aria-label="Send feedback"
          >
            <MessageSquare className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
          </button>

          {/* Notifications */}
          <button
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-[18px] h-[18px] text-neutral-500 dark:text-neutral-400" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-neutral-200 dark:border-neutral-700" aria-label="Signed in user">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 leading-tight">
                {mounted ? userInfo.name : 'Admin User'}
              </p>
              {mounted && userInfo.email && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-tight">{userInfo.email}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
  );
}
