import React from 'react';
import { useStaffAuth } from '../../context/StaffAuthContext';

export function StaffHeader() {
  const { staffUser, logout } = useStaffAuth();
  if (!staffUser) return null;

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 px-6 flex items-center justify-between">
      <div className="text-sm text-gray-400">
        Internal Staff Dashboard
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-200 font-medium">{staffUser.name}</p>
          <p className="text-xs text-gray-500">{staffUser.roleId.replace('role_', '').replace('_', ' ')}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
