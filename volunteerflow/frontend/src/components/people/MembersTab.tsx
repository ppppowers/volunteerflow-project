'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Search,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  X,
  Check,
  Link2,
  Settings2,
} from 'lucide-react';
import { mockMembers, type Member, type MembershipType, type MemberStatus } from '../../pages/people';
import { SignupFormBuilder } from './SignupFormBuilder';

// ─── Local helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

const selectCls = inputCls;

const generateId = () => Math.random().toString(36).slice(2, 10);

const TODAY = new Date('2026-03-18');

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function getRenewalStatus(renewalDate: string): 'expired' | 'soon' | 'ok' {
  const renewal = new Date(renewalDate);
  if (renewal < TODAY) return 'expired';
  const msIn60Days = 60 * 24 * 60 * 60 * 1000;
  if (renewal.getTime() - TODAY.getTime() <= msIn60Days) return 'soon';
  return 'ok';
}

// ─── MemberModal ───────────────────────────────────────────────────────────────

interface MemberModalProps {
  member: Partial<Member> | null;
  onClose: () => void;
  onSave: (m: Member) => void;
}

function MemberModal({ member, onClose, onSave }: MemberModalProps) {
  const isNew = !member?.id;
  const [form, setForm] = useState<Omit<Member, 'id' | 'memberId'>>({
    name: member?.name ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    location: member?.location ?? '',
    joinDate: member?.joinDate ?? '',
    renewalDate: member?.renewalDate ?? '',
    membershipType: member?.membershipType ?? 'standard',
    status: member?.status ?? 'active',
    notes: member?.notes ?? '',
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const nextMember: Member = {
      id: member?.id ?? generateId(),
      memberId: member?.memberId ?? `MEM-${Math.floor(Math.random() * 900 + 100)}`,
      ...form,
    };
    onSave(nextMember);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {isNew ? 'Add Member' : 'Edit Member'}
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
                placeholder="email@example.com"
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
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="City, State"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Membership Type
              </label>
              <select
                value={form.membershipType}
                onChange={(e) => set('membershipType', e.target.value)}
                className={selectCls}
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="corporate">Corporate</option>
              </select>
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
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Join Date
              </label>
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => set('joinDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Renewal Date
              </label>
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => set('renewalDate', e.target.value)}
                className={inputCls}
              />
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
            <Check className="w-4 h-4 mr-1.5" />
            {isNew ? 'Add Member' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── MembersTab ────────────────────────────────────────────────────────────────

export function MembersTab() {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MembershipType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || m.membershipType === typeFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [members, search, typeFilter, statusFilter]);

  const typeBadgeCls = (t: MembershipType) => {
    if (t === 'premium')
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    if (t === 'corporate')
      return 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300';
    return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300';
  };

  const statusBadgeCls = (s: MemberStatus) => {
    if (s === 'active')
      return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
    if (s === 'expired')
      return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400';
    if (s === 'pending')
      return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
    return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
  };

  const renewalDisplay = (renewalDate: string) => {
    const rs = getRenewalStatus(renewalDate);
    if (rs === 'expired')
      return (
        <span className="text-danger-600 dark:text-danger-400 font-semibold">Expired</span>
      );
    if (rs === 'soon')
      return (
        <span className="text-warning-600 dark:text-warning-400 font-semibold">
          {renewalDate}
        </span>
      );
    return <span className="text-neutral-600 dark:text-neutral-400">{renewalDate}</span>;
  };

  const handleAdd = () => {
    setEditingMember(null);
    setShowModal(true);
  };

  const handleEdit = (m: Member) => {
    setEditingMember(m);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (pendingDeleteId === id) {
      const idx = mockMembers.findIndex((m) => m.id === id);
      if (idx !== -1) mockMembers.splice(idx, 1);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setPendingDeleteId(null);
      toast.success('Member deleted');
    } else {
      setPendingDeleteId(id);
    }
  };

  const handleSave = (saved: Member) => {
    const idx = mockMembers.findIndex((m) => m.id === saved.id);
    if (idx !== -1) {
      // Update existing in mockMembers
      mockMembers[idx] = saved;
      setMembers((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
    } else {
      // Push new into mockMembers
      mockMembers.push(saved);
      setMembers((prev) => [...prev, saved]);
    }
    setShowModal(false);
    setEditingMember(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  return (
    <div className="space-y-4">
      {/* Signup link banner */}
      <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
        <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Member Signup Link</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">Share this link so people can apply for membership</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-3 py-1.5 text-xs font-semibold border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex-shrink-0 flex items-center gap-1.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Customize Form
        </button>
        <a
          href="/apply?type=member"
          target="_blank"
          className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
        >
          View Form
        </a>
        <button
          onClick={() =>
            navigator.clipboard.writeText(
              typeof window !== 'undefined' ? window.location.origin + '/apply?type=member' : ''
            )
          }
          className="px-3 py-1.5 text-xs font-semibold border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex-shrink-0"
        >
          Copy Link
        </button>
      </div>

      {/* Filters + Add button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + ' pl-9'}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className={selectCls + ' sm:w-44'}
        >
          <option value="all">All Types</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="corporate">Corporate</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={selectCls + ' sm:w-44'}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button onClick={handleAdd} className="flex-shrink-0 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No members match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="group relative">
              <Card className="p-4 flex flex-col gap-3">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {m.memberId}
                    </p>
                  </div>
                  {/* Edit/Delete on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0 items-center">
                    {pendingDeleteId === m.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(m.id)}
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
                          onClick={() => handleEdit(m)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          title="Edit member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadgeCls(m.membershipType)}`}
                  >
                    {m.membershipType.charAt(0).toUpperCase() + m.membershipType.slice(1)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeCls(m.status)}`}
                  >
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                    <span className="truncate">{m.location}</span>
                  </div>
                </div>

                {/* Renewal + profile link */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="text-neutral-400">Renews:</span>
                    {renewalDisplay(m.renewalDate)}
                  </div>
                  <Link
                    href={`/members/${m.id}`}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
                  >
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
        <MemberModal
          member={editingMember}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}

      {/* Form builder */}
      {showBuilder && (
        <SignupFormBuilder type="member" onClose={() => setShowBuilder(false)} />
      )}
    </div>
  );
}

export default MembersTab;
