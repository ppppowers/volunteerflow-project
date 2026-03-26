import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { staffApi } from '../lib/staffApi';

interface SupportSession {
  sessionId: string; orgId: string; orgName: string;
  mode: 'support'; startedAt: string;
}

interface SupportViewCtx {
  session: SupportSession | null;
  isInSupportView: boolean;
  isHydrated: boolean;
  enterSupportView: (s: SupportSession, orgToken: string) => void;
  exitSupportView: () => Promise<void>;
}

const SupportViewContext = createContext<SupportViewCtx | null>(null);

export function SupportViewProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SupportSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate session from sessionStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vf_support_session');
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setIsHydrated(true);
  }, []);

  // Heartbeat every 60s
  useEffect(() => {
    if (!session) return;
    heartbeatRef.current = setInterval(() => {
      staffApi.patch(`/support/${session.sessionId}/pages`, { type: 'heartbeat' }).catch(() => {});
    }, 60_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [session]);

  // sendBeacon on tab close
  useEffect(() => {
    if (!session) return;
    const handler = () => {
      navigator.sendBeacon(`/api/staff/support/exit`, JSON.stringify({ sessionId: session.sessionId }));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session]);

  const enterSupportView = (s: SupportSession, orgToken: string) => {
    // Back up any existing org token so we can restore it on exit
    const existing = localStorage.getItem('vf_token');
    if (existing) sessionStorage.setItem('vf_token_backup', existing);
    localStorage.setItem('vf_token', orgToken);
    sessionStorage.setItem('vf_support_session', JSON.stringify(s));
    setSession(s);
  };

  const exitSupportView = async () => {
    if (!session) return;
    await staffApi.post('/support/exit', { sessionId: session.sessionId }).catch(() => {});
    // Restore original org token (or remove if there wasn't one)
    const backup = sessionStorage.getItem('vf_token_backup');
    if (backup) {
      localStorage.setItem('vf_token', backup);
      sessionStorage.removeItem('vf_token_backup');
    } else {
      localStorage.removeItem('vf_token');
    }
    sessionStorage.removeItem('vf_support_session');
    setSession(null);
    window.location.href = `/staff/orgs/${session.orgId}`;
  };

  return (
    <SupportViewContext.Provider value={{ session, isInSupportView: !!session, isHydrated, enterSupportView, exitSupportView }}>
      {children}
    </SupportViewContext.Provider>
  );
}

export function useSupportView() {
  const ctx = useContext(SupportViewContext);
  if (!ctx) throw new Error('useSupportView must be inside SupportViewProvider');
  return ctx;
}
