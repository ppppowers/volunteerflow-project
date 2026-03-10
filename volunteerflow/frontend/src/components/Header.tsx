'use client';

import { Bell, Search, User, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useEffect, useState } from 'react';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search volunteers, events, applications..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6">
          {/* Dark Mode Toggle - only show when mounted */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              ) : (
                <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              )}
            </button>
          )}

          {/* Notifications */}
          <button className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <button className="flex items-center gap-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Admin User</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">admin@volunteerflow.com</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}