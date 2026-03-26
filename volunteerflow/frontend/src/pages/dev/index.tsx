'use client';

import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { isDevAuthed, seedLogsIfEmpty } from '@/lib/devPortal';
import DevLayout from '@/components/dev/DevLayout';
import DashboardSection      from '@/components/dev/sections/DashboardSection';
import SignupControlSection  from '@/components/dev/sections/SignupControlSection';
import UserManagementSection from '@/components/dev/sections/UserManagementSection';
import FeatureFlagsSection   from '@/components/dev/sections/FeatureFlagsSection';
import ModulesSection        from '@/components/dev/sections/ModulesSection';
import LogsSection           from '@/components/dev/sections/LogsSection';
import ApiInspectorSection   from '@/components/dev/sections/ApiInspectorSection';
import ConfigSection         from '@/components/dev/sections/ConfigSection';
import HealthSection         from '@/components/dev/sections/HealthSection';

// ─── Access Denied screen ─────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Access Denied</h1>
        <p className="text-sm text-zinc-500 mb-8">
          You need a <span className="text-amber-400 font-semibold">dev</span>,{' '}
          <span className="text-sky-400 font-semibold">admin</span>, or{' '}
          <span className="text-amber-400 font-semibold">super_admin</span> role to access this portal.
        </p>
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
      </div>
    </div>
  );
}

// ─── Production guard ─────────────────────────────────────────────────────────

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevPortalPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(isDevAuthed());
    seedLogsIfEmpty();
  }, []);

  // Show a minimal dark loading shell while checking localStorage (avoids null flash)
  if (authed === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Head><title>Dev Portal — VolunteerFlow</title></Head>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!authed) return <AccessDenied />;

  const section = (router.query.s as string) || 'dashboard';

  function renderSection() {
    switch (section) {
      case 'dashboard': return <DashboardSection />;
      case 'signup':    return <SignupControlSection />;
      case 'users':     return <UserManagementSection />;
      case 'flags':     return <FeatureFlagsSection />;
      case 'modules':   return <ModulesSection />;
      case 'logs':      return <LogsSection />;
      case 'api':       return <ApiInspectorSection />;
      case 'config':    return <ConfigSection />;
      case 'health':    return <HealthSection />;
      default:          return <DashboardSection />;
    }
  }

  return (
    <>
      <Head><title>Dev Portal — VolunteerFlow</title></Head>
      <DevLayout section={section}>
        {renderSection()}
      </DevLayout>
    </>
  );
}
