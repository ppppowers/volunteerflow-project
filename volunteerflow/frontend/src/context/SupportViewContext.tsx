import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { staffApi } from '../lib/staffApi';

interface SupportSession {
  sessionId: string; orgId: string; orgName: string;
  mode: 'view_only' | 'support'; startedAt: string;
}

interface SupportViewCtx {
  session: SupportSession | null;
  isInSupportView: boolean;
  exitSupportView: () => Promise<void>;
}

const SupportViewContext = createContext<SupportViewCtx | null>(null);

export function SupportViewProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SupportSession | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('vf_support_session');
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch {}
    }
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

  const exitSupportView = async () => {
    if (!session) return;
    await staffApi.post('/support/exit', { sessionId: session.sessionId }).catch(() => {});
    sessionStorage.removeItem('vf_support_session');
    setSession(null);
    window.location.href = `/staff/orgs/${session.orgId}`;
  };

  return (
    <SupportViewContext.Provider value={{ session, isInSupportView: !!session, exitSupportView }}>
      {children}
    </SupportViewContext.Provider>
  );
}

export function useSupportView() {
  const ctx = useContext(SupportViewContext);
  if (!ctx) throw new Error('useSupportView must be inside SupportViewProvider');
  return ctx;
}
