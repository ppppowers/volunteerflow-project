import React, { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { staffApi, StaffApiError } from '@/lib/staffApi';
import { useStaffAuth } from '@/context/StaffAuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  sort_order: number;
}

// ─── Permission groups (from plan spec) ──────────────────────────────────────

const PERMISSION_GROUPS: { label: string; perms: string[] }[] = [
  {
    label: 'Organizations',
    perms: ['orgs.view', 'orgs.view_sensitive', 'orgs.edit_basic', 'orgs.edit_contact', 'orgs.edit_plan', 'orgs.edit_status', 'orgs.edit_billing', 'orgs.assign_rep'],
  },
  {
    label: 'Notes',
    perms: ['notes.view', 'notes.create', 'notes.edit_own', 'notes.edit_any', 'notes.delete'],
  },
  {
    label: 'Audit',
    perms: ['audit.view_org', 'audit.view_all', 'audit.export'],
  },
  {
    label: 'Support',
    perms: ['support.view_mode', 'support.impersonation'],
  },
  {
    label: 'Employees',
    perms: ['employees.view', 'employees.create', 'employees.edit', 'employees.disable'],
  },
  {
    label: 'Roles',
    perms: ['roles.view', 'roles.manage'],
  },
  {
    label: 'Other',
    perms: ['feature_flags.manage', 'dashboard.view_management_metrics'],
  },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap(g => g.perms);

function permLabel(perm: string): string {
  const parts = perm.split('.');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

// ─── Role Row ─────────────────────────────────────────────────────────────────

interface RoleRowProps {
  role: Role;
  canManage: boolean;
  onSaved: (updated: Role) => void;
}

function RoleRow({ role, canManage, onSaved }: RoleRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({ ...role.permissions });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const permCount = Object.values(role.permissions).filter(Boolean).length;
  const isReadOnly = role.is_system || !canManage;

  function togglePerm(perm: string) {
    if (isReadOnly) return;
    setLocalPerms(prev => ({ ...prev, [perm]: !prev[perm] }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await staffApi.patch(`/roles/${role.id}`, { permissions: localPerms }) as { role: Role };
      onSaved(res.role);
      setLocalPerms({ ...res.role.permissions });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof StaffApiError ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-gray-800 last:border-0">
      {/* Role header row */}
      <button
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-800/40 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="flex-1 font-medium text-gray-200">{role.name}</span>
        <span className="text-sm text-gray-500 hidden sm:block">{role.description || <span className="text-gray-700">No description</span>}</span>
        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${role.is_system ? 'bg-amber-900/50 text-amber-300 border border-amber-700' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
          {role.is_system ? 'System' : 'Custom'}
        </span>
        <span className="text-xs text-gray-500">{permCount} perm{permCount !== 1 ? 's' : ''}</span>
        <span className="text-gray-600 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded permissions grid */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-900/50">
          {saveError && <p className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{saveError}</p>}
          {saveSuccess && <p className="mb-3 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded px-3 py-2">Permissions saved.</p>}

          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.perms.map(perm => {
                  const active = !!localPerms[perm];
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors select-none
                        ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}
                        ${active
                          ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                          : 'bg-gray-800 text-gray-500 border-gray-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => togglePerm(perm)}
                        disabled={isReadOnly}
                        className="w-3 h-3 accent-amber-500"
                      />
                      {permLabel(perm)}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {!isReadOnly && (
            <PermissionGate perm="roles.manage">
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm px-5 py-2 font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save Permissions'}
              </button>
            </PermissionGate>
          )}

          {role.is_system && (
            <p className="mt-3 text-xs text-gray-600">System roles are read-only. Permissions cannot be modified.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRolesPage() {
  const { canDo } = useStaffAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canManage = canDo('roles.manage');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await staffApi.get('/roles') as { roles: Role[] };
        setRoles(res.roles);
      } catch (err) {
        setError(err instanceof StaffApiError ? err.message : 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleRoleSaved(updated: Role) {
    setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  return (
    <StaffLayout requiredPerm="roles.view">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-100">Roles &amp; Permissions</h1>

        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">{error}</p>}
        {loading && <p className="text-sm text-gray-500">Loading roles…</p>}

        {!loading && roles.length === 0 && !error && (
          <p className="text-sm text-gray-600">No roles found.</p>
        )}

        {!loading && roles.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 px-4 py-2 border-b border-gray-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Role Name</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 hidden sm:block">Description</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Type</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Permissions</span>
            </div>

            {roles.map(role => (
              <RoleRow
                key={role.id}
                role={role}
                canManage={canManage}
                onSaved={handleRoleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
