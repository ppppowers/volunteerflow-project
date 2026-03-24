import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { SupportBanner } from './SupportBanner';
import { StaffSidebar } from './StaffSidebar';
import { StaffHeader } from './StaffHeader';
import { Permission } from '../../lib/staffPermissions';

interface Props {
  children: React.ReactNode;
  requiredPerm?: Permission;
}

export function StaffLayout({ children, requiredPerm }: Props) {
  const { isAuthenticated, isLoading, canDo } = useStaffAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/staff/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">Loading...</div>;
  if (!isAuthenticated) return null;
  if (requiredPerm && !canDo(requiredPerm)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm mt-1 text-gray-600">You need <code className="bg-gray-800 px-1 rounded">{requiredPerm}</code> to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <SupportBanner />
      <StaffSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <StaffHeader />
        <main className="flex-1 overflow-auto p-6 bg-gray-950">{children}</main>
      </div>
    </div>
  );
}
