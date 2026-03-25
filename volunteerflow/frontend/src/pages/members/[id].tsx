'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  ArrowLeft, Edit, Save, X, Mail, Phone, MapPin, Calendar, Clock, Star,
  CheckCircle2, CreditCard, FileText, StickyNote, BadgeCheck, Users,
} from 'lucide-react';
import { mockMembers, type Member, type MembershipType, type MemberStatus } from '../people';

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-18');

const inputClass =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MEMBER_EVENTS: Record<
  string,
  { id: string; name: string; date: string; role: string; status: 'attended' | 'upcoming' | 'cancelled' }[]
> = {
  m1: [
    { id: 'me1', name: 'Annual Gala Dinner', date: '2026-02-14', role: 'VIP Guest', status: 'attended' },
    { id: 'me2', name: 'Spring Fundraiser', date: '2026-04-10', role: 'Attendee', status: 'upcoming' },
    { id: 'me3', name: 'Board Meeting Q1', date: '2026-01-20', role: 'Observer', status: 'attended' },
    { id: 'me4', name: 'Networking Evening', date: '2025-11-08', role: 'Attendee', status: 'attended' },
  ],
  m2: [
    { id: 'me5', name: 'Winter Food Drive', date: '2025-12-10', role: 'Attendee', status: 'attended' },
    { id: 'me6', name: 'Spring Fundraiser', date: '2026-04-10', role: 'Attendee', status: 'upcoming' },
  ],
};

const DEFAULT_MEMBER_EVENTS = [
  { id: 'mdef1', name: 'Annual General Meeting', date: '2026-01-15', role: 'Member', status: 'attended' as const },
  { id: 'mdef2', name: 'Community Open Day', date: '2026-03-22', role: 'Attendee', status: 'upcoming' as const },
];

const MOCK_MEMBER_PAYMENTS: Record<
  string,
  { id: string; description: string; amount: string; date: string; status: 'paid' | 'pending' | 'refunded' }[]
> = {
  m1: [
    { id: 'mp1', description: 'Annual Premium Membership', amount: '$250.00', date: '2024-02-01', status: 'paid' },
    { id: 'mp2', description: 'Annual Premium Renewal', amount: '$250.00', date: '2025-02-01', status: 'paid' },
    { id: 'mp3', description: 'Annual Premium Renewal', amount: '$250.00', date: '2026-02-01', status: 'paid' },
  ],
  m4: [
    { id: 'mp4', description: 'Annual Standard Membership', amount: '$75.00', date: '2022-06-01', status: 'paid' },
    { id: 'mp5', description: 'Annual Standard Renewal', amount: '$75.00', date: '2023-06-01', status: 'paid' },
    { id: 'mp6', description: 'Annual Standard Renewal', amount: '$75.00', date: '2024-06-01', status: 'paid' },
    { id: 'mp7', description: 'Annual Standard Renewal', amount: '$75.00', date: '2025-06-01', status: 'pending' },
  ],
};

const DEFAULT_MEMBER_PAYMENTS = [
  { id: 'mpdef1', description: 'Membership Registration', amount: '$75.00', date: '2023-01-01', status: 'paid' as const },
  { id: 'mpdef2', description: 'Annual Renewal', amount: '$75.00', date: '2024-01-01', status: 'paid' as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getRenewalColor = (renewalDate: string) => {
  const d = new Date(renewalDate);
  if (d < TODAY) return 'danger';
  const diffMs = d.getTime() - TODAY.getTime();
  const diffDays = diffMs / 86400000;
  if (diffDays <= 60) return 'warning';
  return 'success';
};

// ─── Config maps ──────────────────────────────────────────────────────────────

const statusConfig: Record<MemberStatus, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'bg-success-100 dark:bg-success-900/30',
    text: 'text-success-700 dark:text-success-400',
    label: 'Active',
  },
  expired: {
    bg: 'bg-danger-100 dark:bg-danger-900/30',
    text: 'text-danger-700 dark:text-danger-400',
    label: 'Expired',
  },
  pending: {
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    text: 'text-warning-700 dark:text-warning-400',
    label: 'Pending',
  },
  suspended: {
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-700 dark:text-neutral-300',
    label: 'Suspended',
  },
};

const membershipTypeConfig: Record<MembershipType, { bg: string; text: string; label: string }> = {
  standard: {
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-700 dark:text-neutral-300',
    label: 'Standard',
  },
  premium: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-400',
    label: 'Premium',
  },
  corporate: {
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    text: 'text-primary-700 dark:text-primary-400',
    label: 'Corporate',
  },
};

const renewalColorClasses = {
  danger: {
    border: 'border-danger-200 dark:border-danger-800',
    bg: 'bg-danger-50 dark:bg-danger-900/20',
    icon: 'text-danger-600 dark:text-danger-400',
    value: 'text-danger-700 dark:text-danger-400',
  },
  warning: {
    border: 'border-warning-200 dark:border-warning-800',
    bg: 'bg-warning-50 dark:bg-warning-900/20',
    icon: 'text-warning-600 dark:text-warning-400',
    value: 'text-warning-700 dark:text-warning-400',
  },
  success: {
    border: 'border-success-200 dark:border-success-800',
    bg: 'bg-success-50 dark:bg-success-900/20',
    icon: 'text-success-600 dark:text-success-400',
    value: 'text-success-700 dark:text-success-400',
  },
};

const paymentStatusConfig = {
  paid: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', label: 'Paid' },
  pending: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', label: 'Pending' },
  refunded: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300', label: 'Refunded' },
};

const eventStatusConfig = {
  attended: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', label: 'Attended' },
  upcoming: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-700 dark:text-primary-400', label: 'Upcoming' },
  cancelled: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-500 dark:text-neutral-400', label: 'Cancelled' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MemberDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [member, setMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rightTab, setRightTab] = useState<'overview' | 'events' | 'payments' | 'notes'>('overview');
  const [notesValue, setNotesValue] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    membershipType: 'standard' as MembershipType,
    renewalDate: '',
    status: 'active' as MemberStatus,
    notes: '',
  });

  useEffect(() => {
    if (id) {
      const found = mockMembers.find((m) => m.id === id);
      if (found) {
        setMember(found);
        setFormData({
          name: found.name,
          email: found.email,
          phone: found.phone,
          location: found.location,
          membershipType: found.membershipType,
          renewalDate: found.renewalDate,
          status: found.status,
          notes: found.notes || '',
        });
        setNotesValue(found.notes || '');
      }
    }
  }, [id]);

  if (!member) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </Layout>
    );
  }

  const handleSave = () => {
    const idx = mockMembers.findIndex((m) => m.id === member.id);
    if (idx !== -1) {
      mockMembers[idx] = {
        ...mockMembers[idx],
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        membershipType: formData.membershipType,
        renewalDate: formData.renewalDate,
        status: formData.status,
        notes: formData.notes,
      };
    }
    setMember({
      ...member,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      membershipType: formData.membershipType,
      renewalDate: formData.renewalDate,
      status: formData.status,
      notes: formData.notes,
    });
    setNotesValue(formData.notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      location: member.location,
      membershipType: member.membershipType,
      renewalDate: member.renewalDate,
      status: member.status,
      notes: member.notes || '',
    });
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    const idx = mockMembers.findIndex((m) => m.id === member.id);
    if (idx !== -1) {
      mockMembers[idx] = { ...mockMembers[idx], notes: notesValue };
    }
    setMember({ ...member, notes: notesValue });
  };

  const memberEvents = MOCK_MEMBER_EVENTS[member.id] ?? DEFAULT_MEMBER_EVENTS;
  const memberPayments = MOCK_MEMBER_PAYMENTS[member.id] ?? DEFAULT_MEMBER_PAYMENTS;
  const renewalColor = getRenewalColor(member.renewalDate);
  const renewalCls = renewalColorClasses[renewalColor];
  const memberEventCount = memberEvents.length;

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Main Content Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ───────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4 flex-shrink-0">
                  <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                    {getInitials(member.name)}
                  </span>
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 text-center text-xl font-bold border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                    {member.name}
                  </h2>
                )}

                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">{member.memberId}</p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[member.status].bg} ${statusConfig[member.status].text}`}
                  >
                    {statusConfig[member.status].label}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${membershipTypeConfig[member.membershipType].bg} ${membershipTypeConfig[member.membershipType].text}`}
                  >
                    {membershipTypeConfig[member.membershipType].label}
                  </span>
                </div>
              </div>

              {/* Edit / Save / Cancel */}
              <div className="flex gap-2 mb-6">
                {!isEditing ? (
                  <Button className="w-full" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button className="flex-1" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Edit form fields */}
              {isEditing && (
                <div className="space-y-3 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-700">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Membership Type
                    </label>
                    <select
                      value={formData.membershipType}
                      onChange={(e) => setFormData({ ...formData, membershipType: e.target.value as MembershipType })}
                      className={inputClass}
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      value={formData.renewalDate}
                      onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as MemberStatus })}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className={inputClass}
                      placeholder="Add notes about this member..."
                    />
                  </div>
                </div>
              )}

              {/* Contact info (view mode) */}
              {!isEditing && (
                <div className="space-y-3 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300 truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{member.location}</span>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {/* Member Since */}
                <button
                  className="text-left flex flex-col items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all"
                  onClick={() => setRightTab('overview')}
                >
                  <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400 mb-1" />
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 text-center leading-tight">
                    Member Since
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 text-center leading-tight">
                    {new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </button>

                {/* Renewal */}
                <button
                  className={`text-left flex flex-col items-center p-3 rounded-lg border hover:ring-2 transition-all ${renewalCls.bg} ${renewalCls.border}`}
                  onClick={() => setRightTab('overview')}
                >
                  <Clock className={`w-4 h-4 mb-1 ${renewalCls.icon}`} />
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 text-center leading-tight">
                    Renewal
                  </span>
                  <span className={`text-xs font-bold mt-0.5 text-center leading-tight ${renewalCls.value}`}>
                    {new Date(member.renewalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </button>

                {/* Events */}
                <button
                  className="text-left flex flex-col items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800 hover:ring-2 hover:ring-warning-300 dark:hover:ring-warning-700 transition-all"
                  onClick={() => setRightTab('events')}
                >
                  <Star className="w-4 h-4 text-warning-600 dark:text-warning-400 mb-1" />
                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 text-center leading-tight">
                    Events
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 text-center leading-tight">
                    {memberEventCount}
                  </span>
                </button>
              </div>
            </Card>

            {/* Back to People */}
            <Link href="/people">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to People
              </Button>
            </Link>
          </div>

          {/* ── Right Column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab bar */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit flex-wrap">
              {(
                [
                  { id: 'overview', label: 'Overview', icon: BadgeCheck },
                  { id: 'events', label: 'Events', icon: Calendar },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'notes', label: 'Notes', icon: StickyNote },
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
                {/* Membership Details */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <BadgeCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        Membership Details
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Plan and standing information</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Membership Type</span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${membershipTypeConfig[member.membershipType].bg} ${membershipTypeConfig[member.membershipType].text}`}
                      >
                        {membershipTypeConfig[member.membershipType].label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Member Since</span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {formatDate(member.joinDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Renewal Date</span>
                      <span className={`text-sm font-medium ${renewalCls.value}`}>
                        {formatDate(member.renewalDate)}
                        {renewalColor === 'danger' && (
                          <span className="ml-2 text-xs font-semibold bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400 px-2 py-0.5 rounded-full">
                            Expired
                          </span>
                        )}
                        {renewalColor === 'warning' && (
                          <span className="ml-2 text-xs font-semibold bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-0.5 rounded-full">
                            Renew Soon
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Status</span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[member.status].bg} ${statusConfig[member.status].text}`}
                      >
                        {statusConfig[member.status].label}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Contact Information */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success-600 dark:text-success-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        Contact Information
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">How to reach this member</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Email
                        </p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Phone
                        </p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Location
                        </p>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.location}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ── EVENTS TAB ────────────────────────────────────────────── */}
            {rightTab === 'events' && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Event History</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {memberEvents.length} event{memberEvents.length !== 1 ? 's' : ''} on record
                    </p>
                  </div>
                </div>

                {memberEvents.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No events on record for this member.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {event.status === 'attended' ? (
                            <CheckCircle2 className="w-5 h-5 text-success-600 dark:text-success-400" />
                          ) : event.status === 'upcoming' ? (
                            <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <X className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {event.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            <span>·</span>
                            <span>
                              Role:{' '}
                              <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span>
                            </span>
                          </div>
                        </div>
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${eventStatusConfig[event.status].bg} ${eventStatusConfig[event.status].text}`}
                        >
                          {eventStatusConfig[event.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ── PAYMENTS TAB ──────────────────────────────────────────── */}
            {rightTab === 'payments' && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Payment History</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {memberPayments.length} transaction{memberPayments.length !== 1 ? 's' : ''} on record
                    </p>
                  </div>
                </div>

                {memberPayments.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No payment records for this member.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-success-50 dark:bg-success-900/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-success-600 dark:text-success-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {payment.description}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {formatDate(payment.date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {payment.amount}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${paymentStatusConfig[payment.status].bg} ${paymentStatusConfig[payment.status].text}`}
                          >
                            {paymentStatusConfig[payment.status].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ── NOTES TAB ─────────────────────────────────────────────── */}
            {rightTab === 'notes' && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                    <StickyNote className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notes</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Internal notes about this member
                    </p>
                  </div>
                </div>

                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={8}
                  className={inputClass}
                  placeholder="Add notes about this member — these are internal only and not visible to the member..."
                />

                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSaveNotes}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
