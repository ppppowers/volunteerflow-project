import React from 'react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { Permission } from '../../lib/staffPermissions';

interface Props {
  perm: Permission;
  mode?: 'hide' | 'disable';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ perm, mode = 'hide', fallback = null, children }: Props) {
  const { canDo } = useStaffAuth();
  if (canDo(perm)) return <>{children}</>;
  if (mode === 'disable') return (
    <div className="opacity-50 pointer-events-none cursor-not-allowed" title={`Requires: ${perm}`}>
      {children}
    </div>
  );
  return <>{fallback}</>;
}
