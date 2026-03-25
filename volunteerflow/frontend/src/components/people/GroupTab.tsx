'use client';

import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import {
  Search, Plus, Edit2, Trash2, X, Check, Link2,
  Mail, Phone, Settings2, Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeopleGroup {
  id: string;
  name: string;
  slug: string;
  color: string;
  createdAt: string;
}

interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  joinedAt: string;
}

// ─── Local helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

export const GROUP_COLORS = [
  '#6366f1', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#7c3aed', '#db2777',
];

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// ─── MemberModal ───────────────────────────────────────────────────────────────

function MemberModal({
  groupId,
  member,
  onClose,
  onSave,
}: {
  groupId: string;
  member: Partial<GroupMember> | null;
  onClose: () => void;
  onSave: (m: GroupMember) => void;
}) {
  const isNew = !member?.id;
  const [form, setForm] = useState({
    name:   member?.name   ?? '',
    email:  member?.email  ?? '',
    phone:  member?.phone  ?? '',
    status: member?.status ?? 'active',
    notes:  member?.notes  ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let saved: GroupMember;
      if (isNew) {
        saved = await api.post<GroupMember>(`/people/groups/${groupId}/members`, form);
      } else {
        saved = await api.put<GroupMember>(`/people/groups/${groupId}/members/${member!.id}`, form);
      }
      onSave(saved);
    } catch {
      toast.error('Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555-0000"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional notes…"
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            <Check className="w-4 h-4 mr-1.5" />
            {isNew ? 'Add Member' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── EditGroupModal ────────────────────────────────────────────────────────────

function EditGroupModal({
  group,
  onClose,
  onSave,
}: {
  group: PeopleGroup;
  onClose: () => void;
  onSave: (updated: PeopleGroup) => void;
}) {
  const [name, setName] = useState(group.name);
  const [color, setColor] = useState(group.color);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await api.put<PeopleGroup>(`/people/groups/${group.id}`, { name, color });
      onSave(updated);
    } catch {
      toast.error('Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Edit Group</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Group Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-neutral-900 dark:border-neutral-100 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            <Check className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── GroupTab ──────────────────────────────────────────────────────────────────

export function GroupTab({
  group,
  onDelete,
  onUpdate,
}: {
  group: PeopleGroup;
  onDelete: () => void;
  onUpdate: (updated: PeopleGroup) => void;
}) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<GroupMember[]>(`/people/groups/${group.id}/members`)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [group.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [members, search, statusFilter]);

  const signupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/apply?group=${group.slug}`
      : `/apply?group=${group.slug}`;

  const handleSaveMember = (saved: GroupMember) => {
    setMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      return idx !== -1 ? prev.map((m) => (m.id === saved.id ? saved : m)) : [...prev, saved];
    });
    setShowModal(false);
    setEditingMember(null);
    toast.success(editingMember ? 'Member updated' : 'Member added');
  };

  const handleDeleteMember = async (id: string) => {
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    try {
      await api.delete(`/people/groups/${group.id}/members/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setPendingDeleteId(null);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to delete member');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await api.delete(`/people/groups/${group.id}`);
      toast.success(`"${group.name}" group deleted`);
      onDelete();
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
  };

  return (
    <div className="space-y-4">
      {/* Signup link banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl border"
        style={{ background: group.color + '18', borderColor: group.color + '50' }}
      >
        <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: group.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{group.name} Signup Link</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{signupUrl}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(signupUrl).then(() => toast.success('Link copied!'))}
          className="px-3 py-1.5 text-xs font-semibold border rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: group.color, borderColor: group.color + '70' }}
        >
          Copy Link
        </button>
      </div>

      {/* Toolbar */}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputCls + ' sm:w-40'}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => setShowEditGroup(true)} title="Edit group settings">
            <Settings2 className="w-4 h-4" />
          </Button>
          {confirmDeleteGroup ? (
            <>
              <Button
                onClick={handleDeleteGroup}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Confirm Delete
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDeleteGroup(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setConfirmDeleteGroup(true)}
              title="Delete group"
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => { setEditingMember(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Members grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {search || statusFilter !== 'all'
              ? 'No members match your search.'
              : 'No members yet — add the first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="group relative">
              <Card className="p-4 flex flex-col gap-3">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                    style={{ background: group.color }}
                  >
                    {getInitials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{m.name}</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(m.status)}`}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0 items-center">
                    {pendingDeleteId === m.id ? (
                      <>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingMember(m); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {m.email && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                      <span className="truncate">{m.email}</span>
                    </div>
                  )}
                  {m.phone && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
                      <span className="truncate">{m.phone}</span>
                    </div>
                  )}
                </div>

                {m.notes && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-2">{m.notes}</p>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <MemberModal
          groupId={group.id}
          member={editingMember}
          onClose={() => { setShowModal(false); setEditingMember(null); }}
          onSave={handleSaveMember}
        />
      )}
      {showEditGroup && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditGroup(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setShowEditGroup(false);
            toast.success('Group updated');
          }}
        />
      )}
    </div>
  );
}
