'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  // 'checking' avoids the blank-flash while we read localStorage
  const [authState, setAuthState] = useState<'checking' | 'authed' | 'redirecting'>('checking');

  useEffect(() => {
    const token = localStorage.getItem('vf_token');
    if (!token) {
      setAuthState('redirecting');
      router.replace('/auth');
      return;
    }
    // Decode the JWT payload (client-side only — no secret needed, just check expiry)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem('vf_token');
        localStorage.removeItem('vf_user');
        setAuthState('redirecting');
        router.replace('/auth');
        return;
      }
      setAuthState('authed');
    } catch {
      localStorage.removeItem('vf_token');
      localStorage.removeItem('vf_user');
      setAuthState('redirecting');
      router.replace('/auth');
    }
  }, [router]);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 dark:text-neutral-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (authState === 'redirecting') {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
