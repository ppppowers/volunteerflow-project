import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { Users, Plus, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { VolunteersTab } from '@/components/people/VolunteersTab';
import { GroupTab, GROUP_COLORS, type PeopleGroup } from '@/components/people/GroupTab';
import toast from 'react-hot-toast';

// ─── Backward-compat exports (used by MembersTab.tsx / EmployeesTab.tsx) ───────
// These components are no longer rendered, but still compiled by TypeScript.

export type MembershipType = 'standard' | 'premium' | 'corporate';
export type MemberStatus   = 'active' | 'expired' | 'pending' | 'suspended';
export interface Member {
  id: string; memberId: string; name: string; email: string; phone: string;
  location: string; joinDate: string; renewalDate: string;
  membershipType: MembershipType; status: MemberStatus; notes?: string;
}
export const mockMembers: Member[] = [];

export type EmploymentType = 'full-time' | 'part-time' | 'contractor';
export type EmployeeStatus = 'active' | 'inactive' | 'on-leave';
export interface Employee {
  id: string; employeeId: string; name: string; email: string; phone: string;
  department: string; title: string; employmentType: EmploymentType;
  startDate: string; status: EmployeeStatus; notes?: string;
}
export const mockEmployees: Employee[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

// ─── NewGroupModal ─────────────────────────────────────────────────────────────

function NewGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), color);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">New Group</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Members, Donors, Staff…"
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
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c
                      ? 'border-neutral-900 dark:border-neutral-100 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            A signup link will be automatically generated for this group.
          </p>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<string>('volunteers');
  const [groups, setGroups] = useState<PeopleGroup[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);

  useEffect(() => {
    api.get<PeopleGroup[]>('/people/groups').then(setGroups).catch(() => {});
  }, []);

  const handleCreateGroup = async (name: string, color: string) => {
    const group = await api.post<PeopleGroup>('/people/groups', { name, color });
    setGroups((prev) => [...prev, group]);
    setActiveTab(group.id);
    setShowNewGroup(false);
    toast.success(`"${name}" group created`);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (activeTab === groupId) setActiveTab('volunteers');
  };

  const handleUpdateGroup = (updated: PeopleGroup) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

  const activeGroup = groups.find((g) => g.id === activeTab);

  return (
    <Layout>
      <Head><title>People — VolunteerFlow</title></Head>
      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">People</h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage volunteers and your custom people groups.
          </p>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="People categories"
          className="flex flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit max-w-full"
        >
          {/* Fixed Volunteers tab */}
          <button
            role="tab"
            aria-selected={activeTab === 'volunteers'}
            onClick={() => setActiveTab('volunteers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'volunteers'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            Volunteers
          </button>

          {/* Dynamic group tabs */}
          {groups.map((group) => (
            <button
              key={group.id}
              role="tab"
              aria-selected={activeTab === group.id}
              onClick={() => setActiveTab(group.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === group.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: group.color }} />
              {group.name}
            </button>
          ))}

          {/* Add Group button */}
          <button
            onClick={() => setShowNewGroup(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 transition-all border border-dashed border-neutral-300 dark:border-neutral-600"
          >
            <Plus className="w-3.5 h-3.5" />
            New Group
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'volunteers' ? (
          <VolunteersTab />
        ) : activeGroup ? (
          <GroupTab
            key={activeGroup.id}
            group={activeGroup}
            onDelete={() => handleDeleteGroup(activeGroup.id)}
            onUpdate={handleUpdateGroup}
          />
        ) : null}

        {/* New Group Modal */}
        {showNewGroup && (
          <NewGroupModal
            onClose={() => setShowNewGroup(false)}
            onCreate={handleCreateGroup}
          />
        )}
      </div>
    </Layout>
  );
}
