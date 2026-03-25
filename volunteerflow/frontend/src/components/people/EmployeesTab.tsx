'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Search,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  X,
  Check,
  Link2,
  Building2,
  Settings2,
} from 'lucide-react';
import { mockEmployees, type Employee, type EmploymentType, type EmployeeStatus } from '../../pages/people';
import { SignupFormBuilder } from './SignupFormBuilder';

// ─── Local helpers ─────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).slice(2, 10);

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

const selectCls = inputCls;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ─── EmployeeModal (internal) ──────────────────────────────────────────────────

interface EmployeeModalProps {
  employee: Partial<Employee> | null;
  onClose: () => void;
  onSave: (e: Employee) => void;
}

function EmployeeModal({ employee, onClose, onSave }: EmployeeModalProps) {
  const isNew = !employee?.id;
  const [form, setForm] = useState<Omit<Employee, 'id' | 'employeeId'>>({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    department: employee?.department ?? '',
    title: employee?.title ?? '',
    employmentType: employee?.employmentType ?? 'full-time',
    startDate: employee?.startDate ?? '',
    status: employee?.status ?? 'active',
    notes: employee?.notes ?? '',
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const nextEmployee: Employee = {
      id: employee?.id ?? generateId(),
      employeeId: employee?.employeeId ?? `EMP-${Math.floor(Math.random() * 900 + 100)}`,
      ...form,
    };
    onSave(nextEmployee);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {isNew ? 'Add Employee' : 'Edit Employee'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Name <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Email <span className="text-danger-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@org.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555-0000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="e.g. Operations"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Job title"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Employment Type
              </label>
              <select
                value={form.employmentType}
                onChange={(e) => set('employmentType', e.target.value)}
                className={selectCls}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={selectCls}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.email.trim()}
          >
            {isNew ? 'Add Employee' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── EmployeesTab ──────────────────────────────────────────────────────────────

export function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | EmploymentType>('all');

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'all' || e.department === deptFilter;
      const matchesType = typeFilter === 'all' || e.employmentType === typeFilter;
      return matchesSearch && matchesDept && matchesType;
    });
  }, [employees, search, deptFilter, typeFilter]);

  const typeBadgeCls = (t: EmploymentType) => {
    if (t === 'full-time')
      return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300';
    if (t === 'part-time')
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
  };

  const statusBadgeCls = (s: EmployeeStatus) => {
    if (s === 'active')
      return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
    if (s === 'on-leave')
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
    return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
  };

  const formatType = (t: EmploymentType) => {
    if (t === 'full-time') return 'Full-time';
    if (t === 'part-time') return 'Part-time';
    return 'Contractor';
  };

  const formatStatus = (s: EmployeeStatus) => {
    if (s === 'on-leave') return 'On Leave';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEdit = (e: Employee) => {
    setEditingEmployee(e);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (pendingDeleteId === id) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      const idx = mockEmployees.findIndex((x) => x.id === id);
      if (idx >= 0) mockEmployees.splice(idx, 1);
      setPendingDeleteId(null);
      toast.success('Employee deleted');
    } else {
      setPendingDeleteId(id);
    }
  };

  const handleSave = (e: Employee) => {
    setEmployees((prev) => {
      const exists = prev.find((x) => x.id === e.id);
      const next = exists ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e];
      const idx = mockEmployees.findIndex((x) => x.id === e.id);
      if (idx >= 0) mockEmployees[idx] = e; else mockEmployees.push(e);
      return next;
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Signup link row */}
      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Employee Application Link</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Share this link so candidates can submit an application</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0 flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Customize Form
        </button>
        <a href="/apply?type=employee" target="_blank" className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0">
          View Form
        </a>
        <button onClick={() => navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.origin + '/apply?type=employee' : '')} className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0">
          Copy Link
        </button>
      </div>

      {/* Filters + Add button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + ' pl-9'}
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className={selectCls + ' sm:w-48'}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className={selectCls + ' sm:w-44'}
        >
          <option value="all">All Types</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contractor">Contractor</option>
        </select>
        <Button onClick={handleAdd} className="flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No employees match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="group relative">
              <Card className="p-4 flex flex-col gap-3">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(e.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {e.name}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {e.employeeId}
                    </p>
                  </div>
                  {/* Edit/Delete on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0 items-center">
                    {pendingDeleteId === e.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="px-2 py-1 rounded-lg bg-danger-600 text-white text-xs font-semibold hover:bg-danger-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(e)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          title="Edit employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                          title="Delete employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Title & dept */}
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                  <span className="truncate">
                    {e.title} &middot; {e.department}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadgeCls(e.employmentType)}`}>
                    {formatType(e.employmentType)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeCls(e.status)}`}>
                    {formatStatus(e.status)}
                  </span>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                    <span className="truncate">{e.email}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                    <span>{e.phone}</span>
                  </div>
                </div>

                {/* Start date + profile link */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Started {e.startDate}</span>
                  </div>
                  <Link href={`/employees/${e.id}`} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5">
                    View Profile <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Form builder */}
      {showBuilder && (
        <SignupFormBuilder type="employee" onClose={() => setShowBuilder(false)} />
      )}
    </div>
  );
}
