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
  description?: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  sort_order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeClass(roleId: string): string {
  if (roleId === 'role_owner')       return 'bg-amber-900/60 text-amber-300 border border-amber-700';
  if (roleId === 'role_super_admin') return 'bg-red-900/60 text-red-300 border border-red-700';
  if (roleId === 'role_admin')       return 'bg-blue-900/60 text-blue-300 border border-blue-700';
  if (roleId === 'role_manager')     return 'bg-green-900/60 text-green-300 border border-green-700';
  return 'bg-gray-700 text-gray-300 border border-gray-600';
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
  return new Date(dateStr).toLocaleDateString();
}

// ─── Create Employee Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  roles: Role[];
  onClose: () => void;
  onCreated: (emp: Employee) => void;
}

function CreateEmployeeModal({ roles, onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ name: '', email: '', title: '', roleId: roles[0]?.id ?? '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await staffApi.post('/employees', {
        name: form.name.trim(),
        email: form.email.trim(),
        title: form.title.trim() || undefined,
        roleId: form.roleId,
        password: form.password,
      }) as { employee: Employee };
      onCreated(res.employee);
    } catch (err) {
      setError(err instanceof StaffApiError ? err.message : 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Add Employee</h2>
        {error && <p className="mb-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name <span className="text-red-400">*</span></label>
            <input
              type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email <span className="text-red-400">*</span></label>
            <input
              type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="employee@company.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. Support Engineer (optional)"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <select
              value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
              className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            >
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Password <span className="text-red-400">*</span></label>
            <input
              type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confirm Password <span className="text-red-400">*</span></label>
            <input
              type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm px-4 py-2 transition-colors font-medium">
              {saving ? 'Creating…' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [empRes, roleRes] = await Promise.all([
          staffApi.get('/employees') as Promise<{ employees: Employee[] }>,
          staffApi.get('/roles') as Promise<{ roles: Role[] }>,
        ]);
        setEmployees(empRes.employees);
        setRoles(roleRes.roles);
      } catch (err) {
        setError(err instanceof StaffApiError ? err.message : 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleCreated(emp: Employee) {
    setEmployees(prev => [...prev, emp]);
    setShowCreate(false);
  }

  return (
    <StaffLayout requiredPerm="employees.view">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">Employees</h1>
          <PermissionGate perm="employees.create">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 font-medium transition-colors"
            >
              + Add Employee
            </button>
          </PermissionGate>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

        {/* Loading */}
        {loading && <p className="text-sm text-gray-500">Loading employees…</p>}

        {/* Empty state */}
        {!loading && !error && employees.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-lg">No employees found.</p>
          </div>
        )}

        {/* Table */}
        {!loading && employees.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Last Login</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {employees.map(emp => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/staff/employees/${emp.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-200">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{emp.email}</td>
                    <td className="px-4 py-3 text-gray-400">{emp.title || <span className="text-gray-600">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(emp.role_id)}`}>
                        {emp.role_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emp.is_active
                        ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-900/60 text-green-300 border border-green-700">Active</span>
                        : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-900/60 text-red-300 border border-red-700">Disabled</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{relativeTime(emp.last_login)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-amber-500 hover:text-amber-400">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateEmployeeModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </StaffLayout>
  );
}
