'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  ArrowLeft, Edit, Save, X, Mail, Phone, Building2, Briefcase, Clock,
  Timer, FileText, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle,
  Users, StickyNote,
} from 'lucide-react';
import { mockEmployees, type Employee, type EmploymentType, type EmployeeStatus } from '../people';

// ─── Input class ──────────────────────────────────────────────────────────────

const inputClass = 'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EMPLOYEE_HOURS: Record<string, { id: string; weekEnding: string; regular: number; overtime: number; status: 'approved' | 'pending' | 'rejected' }[]> = {
  e1: [
    { id: 'eh1', weekEnding: '2026-03-14', regular: 40, overtime: 2, status: 'approved' },
    { id: 'eh2', weekEnding: '2026-03-07', regular: 40, overtime: 0, status: 'approved' },
    { id: 'eh3', weekEnding: '2026-02-28', regular: 38, overtime: 4, status: 'approved' },
    { id: 'eh4', weekEnding: '2026-02-21', regular: 40, overtime: 0, status: 'pending' },
    { id: 'eh5', weekEnding: '2026-02-14', regular: 40, overtime: 6, status: 'approved' },
  ],
  e2: [
    { id: 'eh6', weekEnding: '2026-03-14', regular: 40, overtime: 0, status: 'approved' },
    { id: 'eh7', weekEnding: '2026-03-07', regular: 40, overtime: 0, status: 'approved' },
    { id: 'eh8', weekEnding: '2026-02-28', regular: 40, overtime: 0, status: 'pending' },
  ],
};

const DEFAULT_EMPLOYEE_HOURS = [
  { id: 'ehdef1', weekEnding: '2026-03-14', regular: 35, overtime: 0, status: 'approved' as const },
  { id: 'ehdef2', weekEnding: '2026-03-07', regular: 35, overtime: 0, status: 'approved' as const },
  { id: 'ehdef3', weekEnding: '2026-02-28', regular: 35, overtime: 0, status: 'pending' as const },
];

const MOCK_EMPLOYEE_DOCS: Record<string, { id: string; name: string; type: string; uploadedAt: string }[]> = {
  e1: [
    { id: 'ed1', name: 'Employment Contract', type: 'Contract', uploadedAt: '2022-01-15' },
    { id: 'ed2', name: 'Photo ID — Passport', type: 'ID', uploadedAt: '2022-01-15' },
    { id: 'ed3', name: 'First Aid Certificate', type: 'Certification', uploadedAt: '2024-03-01' },
    { id: 'ed4', name: 'Confidentiality Agreement', type: 'Policy', uploadedAt: '2022-01-20' },
  ],
};

const DEFAULT_EMPLOYEE_DOCS = [
  { id: 'eddef1', name: 'Employment Contract', type: 'Contract', uploadedAt: '2022-01-01' },
  { id: 'eddef2', name: 'Photo ID', type: 'ID', uploadedAt: '2022-01-01' },
];

const MOCK_EMERGENCY_CONTACTS: Record<string, { name: string; relationship: string; phone: string; email: string }> = {
  e1: { name: 'Patricia Johnson', relationship: 'Spouse', phone: '+1 555-3001', email: 'patricia.j@email.com' },
  e2: { name: 'David Liu', relationship: 'Parent', phone: '+1 555-3002', email: 'david.l@email.com' },
  e3: { name: 'Maria Torres', relationship: 'Sibling', phone: '+1 555-3003', email: 'maria.t@email.com' },
};

const DEFAULT_EMERGENCY_CONTACT = { name: '', relationship: '', phone: '', email: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTenure(startDate: string): string {
  const start = new Date(startDate);
  const today = new Date('2026-03-18');
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    today.getMonth() -
    start.getMonth();
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr${years > 1 ? 's' : ''}`;
  return `${years} yr${years > 1 ? 's' : ''} ${rem} mo`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmployeeDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rightTab, setRightTab] = useState<'overview' | 'hours' | 'documents' | 'emergency'>('overview');

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    title: '',
    employmentType: 'full-time' as EmploymentType,
    startDate: '',
    status: 'active' as EmployeeStatus,
    notes: '',
  });

  // Notes inline save
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  // Emergency contact
  const [emergencyContact, setEmergencyContact] = useState(DEFAULT_EMERGENCY_CONTACT);
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState(DEFAULT_EMERGENCY_CONTACT);
  const [emergencySaved, setEmergencySaved] = useState(false);

  useEffect(() => {
    if (id) {
      const found = mockEmployees.find((e) => e.id === id);
      if (found) {
        setEmployee(found);
        setFormData({
          name: found.name,
          email: found.email,
          phone: found.phone,
          department: found.department,
          title: found.title,
          employmentType: found.employmentType,
          startDate: found.startDate,
          status: found.status,
          notes: found.notes ?? '',
        });
        setNotesValue(found.notes ?? '');
        const ec = MOCK_EMERGENCY_CONTACTS[found.id] ?? DEFAULT_EMERGENCY_CONTACT;
        setEmergencyContact(ec);
        setEmergencyForm(ec);
      }
    }
  }, [id]);

  if (!employee) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-600 dark:text-neutral-400">Loading employee details...</p>
        </div>
      </Layout>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const hours = MOCK_EMPLOYEE_HOURS[employee.id] ?? DEFAULT_EMPLOYEE_HOURS;
  const docs = MOCK_EMPLOYEE_DOCS[employee.id] ?? DEFAULT_EMPLOYEE_DOCS;
  const totalHours = hours.reduce((sum, h) => sum + h.regular + h.overtime, 0);

  // ── Config maps ─────────────────────────────────────────────────────────────

  const statusConfig: Record<EmployeeStatus, { bg: string; text: string; label: string }> = {
    active:   { bg: 'bg-success-100 dark:bg-success-900/30',  text: 'text-success-700 dark:text-success-400',  label: 'Active'   },
    inactive: { bg: 'bg-neutral-100 dark:bg-neutral-700',     text: 'text-neutral-700 dark:text-neutral-300',  label: 'Inactive' },
    'on-leave': { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', label: 'On Leave' },
  };

  const employmentTypeConfig: Record<EmploymentType, { bg: string; text: string; label: string }> = {
    'full-time':  { bg: 'bg-primary-100 dark:bg-primary-900/30',  text: 'text-primary-700 dark:text-primary-400',  label: 'Full-Time'   },
    'part-time':  { bg: 'bg-warning-100 dark:bg-warning-900/30',  text: 'text-warning-700 dark:text-warning-400',  label: 'Part-Time'   },
    'contractor': { bg: 'bg-violet-100 dark:bg-violet-900/30',    text: 'text-violet-700 dark:text-violet-400',    label: 'Contractor'  },
  };

  const hourStatusConfig = {
    approved: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', label: 'Approved' },
    pending:  { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', label: 'Pending'  },
    rejected: { bg: 'bg-danger-100 dark:bg-danger-900/30',   text: 'text-danger-700 dark:text-danger-400',   label: 'Rejected' },
  };

  const docTypeConfig: Record<string, { bg: string; text: string }> = {
    Contract:      { bg: 'bg-primary-100 dark:bg-primary-900/30',  text: 'text-primary-700 dark:text-primary-400'  },
    ID:            { bg: 'bg-neutral-100 dark:bg-neutral-700',     text: 'text-neutral-700 dark:text-neutral-300'  },
    Certification: { bg: 'bg-success-100 dark:bg-success-900/30',  text: 'text-success-700 dark:text-success-400'  },
    Policy:        { bg: 'bg-warning-100 dark:bg-warning-900/30',  text: 'text-warning-700 dark:text-warning-400'  },
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const updated: Employee = {
      ...employee,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      department: formData.department,
      title: formData.title,
      employmentType: formData.employmentType,
      startDate: formData.startDate,
      status: formData.status,
      notes: formData.notes,
    };
    // Mutate array entry
    const idx = mockEmployees.findIndex((e) => e.id === employee.id);
    if (idx !== -1) Object.assign(mockEmployees[idx], updated);
    setEmployee(updated);
    setNotesValue(formData.notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      title: employee.title,
      employmentType: employee.employmentType,
      startDate: employee.startDate,
      status: employee.status,
      notes: employee.notes ?? '',
    });
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    const updated = { ...employee, notes: notesValue };
    const idx = mockEmployees.findIndex((e) => e.id === employee.id);
    if (idx !== -1) Object.assign(mockEmployees[idx], updated);
    setEmployee(updated);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleSaveEmergency = () => {
    setEmergencyContact(emergencyForm);
    setIsEditingEmergency(false);
    setEmergencySaved(true);
    setTimeout(() => setEmergencySaved(false), 2000);
  };

  const handleCancelEmergency = () => {
    setEmergencyForm(emergencyContact);
    setIsEditingEmergency(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/people">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />Back to People
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {isEditing ? 'Edit Employee' : 'Employee Profile'}
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">{employee.employeeId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />Edit Profile
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Two-column layout ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Profile card */}
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Initials circle */}
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-4">
                  {getInitials(isEditing ? formData.name || employee.name : employee.name)}
                </div>

                {isEditing ? (
                  <div className="w-full space-y-3 mb-2">
                    {/* Name */}
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Full name"
                      className={inputClass + ' text-center font-bold text-lg'}
                    />
                    {/* Email */}
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email address"
                      className={inputClass}
                    />
                    {/* Phone */}
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone number"
                      className={inputClass}
                    />
                    {/* Department */}
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Department"
                      className={inputClass}
                    />
                    {/* Title */}
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Job title"
                      className={inputClass}
                    />
                    {/* Employment type */}
                    <select
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
                      className={inputClass}
                    >
                      <option value="full-time">Full-Time</option>
                      <option value="part-time">Part-Time</option>
                      <option value="contractor">Contractor</option>
                    </select>
                    {/* Start date */}
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className={inputClass}
                    />
                    {/* Status */}
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as EmployeeStatus })}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                    {/* Notes */}
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes / bio..."
                      rows={3}
                      className={inputClass}
                    />
                    <div className="flex gap-2 pt-1">
                      <Button className="flex-1" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />Save
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Name + ID */}
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{employee.name}</h2>
                    <p className="text-sm text-neutral-400 mb-3">{employee.employeeId}</p>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[employee.status].bg} ${statusConfig[employee.status].text}`}>
                        {statusConfig[employee.status].label}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${employmentTypeConfig[employee.employmentType].bg} ${employmentTypeConfig[employee.employmentType].text}`}>
                        {employmentTypeConfig[employee.employmentType].label}
                      </span>
                    </div>

                    {/* Contact info */}
                    <div className="w-full space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-left">
                      <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <Mail className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <Phone className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                        <span>{employee.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <Building2 className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                        <span>{employee.department}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                        <Briefcase className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                        <span>{employee.title}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Stats row — 3 clickable cards */}
            {!isEditing && (
              <div className="grid grid-cols-3 gap-3">
                {/* Tenure */}
                <button className="text-left" onClick={() => setRightTab('overview')}>
                  <Card className={`p-4 hover:ring-2 hover:ring-emerald-300 dark:hover:ring-emerald-700 transition-all ${rightTab === 'overview' ? 'ring-2 ring-emerald-400 dark:ring-emerald-600' : ''}`}>
                    <div className="flex flex-col items-center text-center gap-1">
                      <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-1">
                        <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                        {getTenure(employee.startDate)}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Tenure</p>
                    </div>
                  </Card>
                </button>

                {/* Hours logged */}
                <button className="text-left" onClick={() => setRightTab('hours')}>
                  <Card className={`p-4 hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all ${rightTab === 'hours' ? 'ring-2 ring-primary-400 dark:ring-primary-600' : ''}`}>
                    <div className="flex flex-col items-center text-center gap-1">
                      <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-1">
                        <Timer className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                        {totalHours}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Hours Logged</p>
                    </div>
                  </Card>
                </button>

                {/* Documents */}
                <button className="text-left" onClick={() => setRightTab('documents')}>
                  <Card className={`p-4 hover:ring-2 hover:ring-warning-300 dark:hover:ring-warning-700 transition-all ${rightTab === 'documents' ? 'ring-2 ring-warning-400 dark:ring-warning-600' : ''}`}>
                    <div className="flex flex-col items-center text-center gap-1">
                      <div className="w-9 h-9 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center mb-1">
                        <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                        {docs.length}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Documents</p>
                    </div>
                  </Card>
                </button>
              </div>
            )}

            {/* Back link */}
            <div className="pt-1">
              <Link
                href="/people"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to People
              </Link>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab bar */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit flex-wrap">
              {(
                [
                  { id: 'overview',   label: 'Overview',          icon: Briefcase   },
                  { id: 'hours',      label: 'Hours',             icon: Timer       },
                  { id: 'documents',  label: 'Documents',         icon: FileText    },
                  { id: 'emergency',  label: 'Emergency Contact', icon: Users       },
                ] as { id: typeof rightTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setRightTab(id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rightTab === id
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
            {rightTab === 'overview' && (
              <>
                {/* Role Details */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Role Details</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Employment information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Department</p>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{employee.department}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Title</p>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{employee.title}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Employment Type</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-medium ${employmentTypeConfig[employee.employmentType].bg} ${employmentTypeConfig[employee.employmentType].text}`}>
                        {employmentTypeConfig[employee.employmentType].label}
                      </span>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Start Date</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {new Date(employee.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg sm:col-span-2">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-sm font-medium ${statusConfig[employee.status].bg} ${statusConfig[employee.status].text}`}>
                        {statusConfig[employee.status].label}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Notes / Bio */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                      <StickyNote className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notes / Bio</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Additional information about this employee</p>
                    </div>
                  </div>
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes or a bio for this employee..."
                    rows={4}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <Button size="sm" onClick={handleSaveNotes}>
                      <Save className="w-3.5 h-3.5 mr-1.5" />Save Notes
                    </Button>
                    {notesSaved && (
                      <span className="text-sm text-success-600 dark:text-success-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />Saved!
                      </span>
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* ── HOURS TAB ─────────────────────────────────────────────── */}
            {rightTab === 'hours' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Timesheet</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {totalHours} total hours across {hours.length} week{hours.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
                    {(['approved', 'pending', 'rejected'] as const).map((s) => {
                      const count = hours.filter((h) => h.status === s).length;
                      if (!count) return null;
                      return (
                        <span key={s} className={`px-2 py-0.5 rounded-full font-semibold capitalize ${hourStatusConfig[s].bg} ${hourStatusConfig[s].text}`}>
                          {count} {s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/60">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Week Ending</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Regular</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Overtime</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                      {hours.map((row) => (
                        <tr key={row.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100 font-medium">
                            {new Date(row.weekEnding).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">{row.regular}h</td>
                          <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">
                            {row.overtime > 0 ? (
                              <span className="text-warning-600 dark:text-warning-400 font-medium">+{row.overtime}h</span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                            {row.regular + row.overtime}h
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${hourStatusConfig[row.status].bg} ${hourStatusConfig[row.status].text}`}>
                              {hourStatusConfig[row.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-t-2 border-neutral-200 dark:border-neutral-700">
                        <td className="px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {hours.reduce((s, h) => s + h.regular, 0)}h
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-warning-600 dark:text-warning-400">
                          +{hours.reduce((s, h) => s + h.overtime, 0)}h
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600 dark:text-primary-400">
                          {totalHours}h
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* ── DOCUMENTS TAB ─────────────────────────────────────────── */}
            {rightTab === 'documents' && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Documents</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {docs.length} document{docs.length !== 1 ? 's' : ''} on file
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {docs.map((doc) => {
                    const typeCfg = docTypeConfig[doc.type] ?? { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300' };
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{doc.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${typeCfg.bg} ${typeCfg.text}`}>
                          {doc.type}
                        </span>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex-shrink-0"
                          title="Download (demo)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── EMERGENCY CONTACT TAB ─────────────────────────────────── */}
            {rightTab === 'emergency' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Emergency Contact</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Person to contact in case of emergency</p>
                    </div>
                  </div>
                  {!isEditingEmergency ? (
                    <Button size="sm" variant="outline" onClick={() => { setEmergencyForm(emergencyContact); setIsEditingEmergency(true); }}>
                      <Edit className="w-3.5 h-3.5 mr-1.5" />Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleCancelEmergency}>
                        <X className="w-3.5 h-3.5 mr-1.5" />Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEmergency}>
                        <Save className="w-3.5 h-3.5 mr-1.5" />Save
                      </Button>
                    </div>
                  )}
                </div>

                {emergencySaved && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg text-sm text-success-700 dark:text-success-400">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Emergency contact saved successfully.
                  </div>
                )}

                {isEditingEmergency ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        value={emergencyForm.name}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                        placeholder="Full name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Relationship</label>
                      <input
                        type="text"
                        value={emergencyForm.relationship}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, relationship: e.target.value })}
                        placeholder="e.g., Spouse, Parent, Sibling"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={emergencyForm.phone}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                        placeholder="+1 555-0000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Email</label>
                      <input
                        type="email"
                        value={emergencyForm.email}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, email: e.target.value })}
                        placeholder="contact@email.com"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {emergencyContact.name ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Contact Name</p>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{emergencyContact.name}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Relationship</p>
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">{emergencyContact.relationship}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Phone</p>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">{emergencyContact.phone}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Email</p>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">{emergencyContact.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-neutral-400 dark:text-neutral-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No emergency contact on file</p>
                        <p className="text-xs mt-1">Click <strong>Edit</strong> to add one.</p>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
