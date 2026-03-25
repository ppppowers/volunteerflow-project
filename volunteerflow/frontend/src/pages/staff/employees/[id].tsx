import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { staffApi, StaffApiError } from '@/lib/staffApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  email: string;
  name: string;
  title?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  role_id: string;
  role_name: string;
}

interface Role {
  id: string;
  name: string;
  is_system: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeClass(roleId: string): string {
  if (roleId === 'role_owner')       return 'bg-amber-900/60 text-amber-300 border border-amber-700';
  if (roleId === 'role_super_admin') return 'bg-red-900/60 text-red-300 border border-red-700';
  if (roleId === 'role_admin')       return 'bg-blue-900/60 text-blue-300 border border-blue-700';
  if (roleId === 'role_manager')     return 'bg-green-900/60 text-green-300 border border-green-700';
  return 'bg-gray-700 text-gray-300 border border-gray-600';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Disable Confirmation Modal ───────────────────────────────────────────────

interface DisableModalProps {
  employeeName: string;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}

function DisableConfirmModal({ employeeName, onCancel, onConfirm, saving }: DisableModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Disable Account</h2>
        <p className="text-sm text-gray-400 mb-6">
          Are you sure you want to disable <span className="text-gray-200 font-medium">{employeeName}</span>&apos;s account?
          They will no longer be able to log in.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm px-4 py-2 transition-colors font-medium"
          >
            {saving ? 'Disabling…' : 'Disable Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Disable
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [empRes, roleRes] = await Promise.all([
          staffApi.get(`/employees/${id}`) as Promise<{ employee: Employee }>,
          staffApi.get('/roles') as Promise<{ roles: Role[] }>,
        ]);
        setEmployee(empRes.employee);
        setEditName(empRes.employee.name);
        setEditTitle(empRes.employee.title ?? '');
        setEditRoleId(empRes.employee.role_id);
        setRoles(roleRes.roles);
      } catch (err) {
        setError(err instanceof StaffApiError ? err.message : 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await staffApi.patch(`/employees/${employee.id}`, {
        name: editName,
        title: editTitle || undefined,
        roleId: editRoleId,
      }) as { employee: Employee };
      setEmployee(res.employee);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof StaffApiError ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableConfirm() {
    if (!employee) return;
    setDisabling(true);
    setDisableError('');
    try {
      await staffApi.patch(`/employees/${employee.id}/disable`, {});
      setEmployee(prev => prev ? { ...prev, is_active: false } : prev);
      setShowDisableModal(false);
    } catch (err) {
      setDisableError(err instanceof StaffApiError ? err.message : 'Failed to disable account');
      setShowDisableModal(false);
    } finally {
      setDisabling(false);
    }
  }

  return (
    <StaffLayout requiredPerm="employees.view">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/staff/employees')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          &larr; Back to Employees
        </button>

        {/* Loading / Error */}
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

        {employee && (
          <>
            {/* Header card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-gray-100">{employee.name}</h1>
                  <p className="text-sm text-gray-400 font-mono">{employee.email}</p>
                  {employee.title && <p className="text-sm text-gray-400">{employee.title}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(employee.role_id)}`}>
                    {employee.role_name}
                  </span>
                  {employee.is_active
                    ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-900/60 text-green-300 border border-green-700">Active</span>
                    : <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-900/60 text-red-300 border border-red-700">Disabled</span>
                  }
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div><span className="text-gray-600">Created</span> <span className="text-gray-400">{formatDate(employee.created_at)}</span></div>
                <div><span className="text-gray-600">Last login</span> <span className="text-gray-400">{relativeTime(employee.last_login)}</span></div>
              </div>
            </div>

            {/* Edit form */}
            <PermissionGate perm="employees.edit">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-base font-semibold text-gray-200 mb-4">Edit Details</h2>
                {saveError && <p className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{saveError}</p>}
                {saveSuccess && <p className="mb-3 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded px-3 py-2">Changes saved.</p>}
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Name</label>
                    <input
                      type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Title</label>
                    <input
                      type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Role</label>
                    <select
                      value={editRoleId} onChange={e => setEditRoleId(e.target.value)}
                      className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <button
                    type="submit" disabled={saving}
                    className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm px-5 py-2 font-medium transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </PermissionGate>

            {/* Disable section */}
            {employee.is_active && (
              <PermissionGate perm="employees.disable">
                <div className="bg-gray-900 border border-red-900/40 rounded-xl p-6">
                  <h2 className="text-base font-semibold text-red-400 mb-1">Danger Zone</h2>
                  <p className="text-sm text-gray-500 mb-4">Disabling this account will prevent the employee from logging in.</p>
                  {disableError && <p className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{disableError}</p>}
                  <button
                    onClick={() => setShowDisableModal(true)}
                    className="rounded-lg bg-red-800 hover:bg-red-700 text-red-200 text-sm px-4 py-2 font-medium transition-colors"
                  >
                    Disable Account
                  </button>
                </div>
              </PermissionGate>
            )}
          </>
        )}
      </div>

      {showDisableModal && employee && (
        <DisableConfirmModal
          employeeName={employee.name}
          onCancel={() => setShowDisableModal(false)}
          onConfirm={handleDisableConfirm}
          saving={disabling}
        />
      )}
    </StaffLayout>
  );
}
