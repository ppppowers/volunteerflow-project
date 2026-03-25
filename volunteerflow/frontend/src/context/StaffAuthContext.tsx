import React, { createContext, useContext, useEffect, useState } from 'react';
import { staffApi } from '../lib/staffApi';
import { canDo, Permission } from '../lib/staffPermissions';

interface StaffUser {
  staffId: string; email: string; name: string;
  roleId: string; permissions: string[]; sessionId: string;
}

interface StaffAuthCtx {
  staffUser: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  canDo: (perm: Permission) => boolean;
  logout: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthCtx | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vf_staff_user');
    if (raw) {
      try { setStaffUser(JSON.parse(raw)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const logout = async () => {
    await staffApi.post('/auth/logout', {}).catch(() => {});
    localStorage.removeItem('vf_staff_token');
    localStorage.removeItem('vf_staff_user');
    setStaffUser(null);
    window.location.href = '/staff/login';
  };

  return (
    <StaffAuthContext.Provider value={{
      staffUser,
      isAuthenticated: !!staffUser,
      isLoading,
      canDo: (perm) => canDo(staffUser?.permissions ?? [], perm),
      logout,
    }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be inside StaffAuthProvider');
  return ctx;
}
