import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { Users, Briefcase, Plus, X, Check, Link2, Copy, ArrowRight, FileText, UserPlus, Mail, Phone, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { VolunteersTab } from '@/components/people/VolunteersTab';
import { StaffTab } from '@/components/people/StaffTab';
import { GroupTab, GROUP_COLORS, type PeopleGroup } from '@/components/people/GroupTab';
import { PlanGate } from '@/components/PlanGate';
import { usePlan } from '@/context/usePlan';
import toast from 'react-hot-toast';

interface TemplateOption { id: string; name: string; }

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
  onClose: (created?: PeopleGroup) => void;
  onCreate: (name: string, color: string, templateId?: string) => Promise<PeopleGroup>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<PeopleGroup | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<{ id: string; name: string; status: string }[]>('/application-templates')
      .then((data) => setTemplates(data.filter((t) => t.status === 'active')))
      .catch(() => {});
  }, []);

  const signupUrl = createdGroup
    ? (() => {
        const params = new URLSearchParams({ group: createdGroup.slug });
        if (createdGroup.applicationTemplateId) params.set('form', createdGroup.applicationTemplateId);
        return `${typeof window !== 'undefined' ? window.location.origin : ''}/apply?${params.toString()}`;
      })()
    : '';

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const group = await onCreate(name.trim(), color, templateId || undefined);
      setCreatedGroup(group);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Step 2: Invitation link ───────────────────────────────────────────────
  if (createdGroup) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="p-6 text-center border-b border-neutral-200 dark:border-neutral-700">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: createdGroup.color + '20' }}
            >
              <Check className="w-6 h-6" style={{ color: createdGroup.color }} />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              "{createdGroup.name}" Created!
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Share this invitation link so people can sign up directly to this group.
            </p>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
              <Link2 className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300 truncate font-mono">
                {signupUrl}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0"
                style={{
                  background: copied ? createdGroup.color + '20' : undefined,
                  color: copied ? createdGroup.color : undefined,
                }}
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
              Anyone with this link can join <span className="font-semibold">{createdGroup.name}</span> by filling out the signup form.
            </p>
          </div>

          <div className="flex gap-3 p-5 pt-0">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={() => onClose(createdGroup)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ background: createdGroup.color }}
            >
              Go to Group
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Form ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">New Group</h2>
          <button
            onClick={() => onClose()}
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
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Application Form <span className="font-normal text-neutral-400">(optional)</span>
                </span>
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className={inputCls}
              >
                <option value="">No form — just invite link</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                When set, the invitation link will open this application form.
              </p>
            </div>
          )}
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            An invitation link will be generated so you can invite people to this group.
          </p>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => onClose()}
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

// ─── AddPersonModal ───────────────────────────────────────────────────────────

function AddPersonModal({
  groups,
  onClose,
}: {
  groups: PeopleGroup[];
  onClose: () => void;
}) {
  const [name, setName]        = useState('');
  const [email, setEmail]      = useState('');
  const [phone, setPhone]      = useState('');
  const [dest, setDest]        = useState('volunteers');
  const [saving, setSaving]    = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied]    = useState(false);

  const canSave = name.trim() && email.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      if (dest === 'volunteers') {
        // Don't create the volunteer yet — send them to /apply so they go through screening first.
        // They'll appear in the Applications → Submissions tab after submitting,
        // and the admin can approve them there to generate the /create-account link.
        const qs = new URLSearchParams({ name: name.trim(), email: email.trim() });
        if (phone.trim()) qs.set('phone', phone.trim());
        setInviteLink(`${origin}/apply?${qs.toString()}`);
      } else {
        await api.post(`/people/groups/${dest}/members`, {
          name: name.trim(), email: email.trim(), phone: phone.trim(), status: 'active',
        });
        const qs = new URLSearchParams({ name: name.trim(), email: email.trim() });
        if (phone.trim()) qs.set('phone', phone.trim());
        setInviteLink(`${origin}/create-account?${qs.toString()}`);
      }
    } catch {
      toast.error('Failed to add person');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Step 2: Invite link ───────────────────────────────────────────────────
  if (inviteLink) {
    const destLabel = dest === 'volunteers'
      ? 'Volunteers'
      : groups.find((g) => g.id === dest)?.name ?? 'the group';

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="p-6 text-center border-b border-neutral-200 dark:border-neutral-700">
            <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{name.trim()} Added!</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Added to <span className="font-semibold">{destLabel}</span>. Share this link — they just need to set a password to activate their account.
            </p>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
              <Link2 className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300 truncate font-mono">{inviteLink}</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${copied ? 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'}`}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
              Their name and email will be pre-filled when they open this link.
            </p>
          </div>

          <div className="flex gap-3 p-5 pt-0">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copy Link
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white rounded-xl transition-colors"
            >
              Done <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Form ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Add Person</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className={inputCls + ' pl-8'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Phone <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0000"
                className={inputCls + ' pl-8'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Add to
            </label>
            <select value={dest} onChange={(e) => setDest(e.target.value)} className={inputCls}>
              <option value="volunteers">Volunteers</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            An invite link will be generated so they can complete their profile.
          </p>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-neutral-200 dark:border-neutral-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Adding…' : 'Add Person'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const { can } = usePlan();
  const [activeTab, setActiveTab] = useState<string>('volunteers');
  const [groups, setGroups] = useState<PeopleGroup[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [volunteerFormId, setVolunteerFormId] = useState<string | null>(null);
  const [formTemplates, setFormTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    api.get<PeopleGroup[]>('/people/groups').then(setGroups).catch(() => {});
    api.get<{ volunteerFormId: string | null }>('/settings/volunteer-form')
      .then((d) => setVolunteerFormId(d.volunteerFormId))
      .catch(() => {});
    api.get<{ id: string; name: string; status: string }[]>('/application-templates')
      .then((data) => setFormTemplates(data.filter((t) => t.status === 'active')))
      .catch(() => {});
  }, []);

  const handleVolunteerFormLink = (formId: string | null) => {
    setVolunteerFormId(formId);
    api.put('/settings/volunteer-form', { volunteerFormId: formId }).catch(() => {});
  };

  const handleCreateGroup = async (name: string, color: string, applicationTemplateId?: string): Promise<PeopleGroup> => {
    const group = await api.post<PeopleGroup>('/people/groups', { name, color, applicationTemplateId });
    setGroups((prev) => [...prev, group]);
    return group;
  };

  const handleNewGroupClose = (created?: PeopleGroup) => {
    setShowNewGroup(false);
    if (created) setActiveTab(created.id);
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">People</h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage volunteers and your custom people groups.
            </p>
          </div>
          <button
            onClick={() => setShowAddPerson(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Person
          </button>
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

          {/* Fixed Staff tab */}
          <button
            role="tab"
            aria-selected={activeTab === 'staff'}
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'staff'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Briefcase className="w-4 h-4" aria-hidden="true" />
            Staff
          </button>

          <button
            onClick={() => setShowNewGroup(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Group
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'volunteers' ? (
          <VolunteersTab
            templates={formTemplates}
            linkedFormId={volunteerFormId}
            onLinkForm={handleVolunteerFormLink}
          />
        ) : activeTab === 'staff' ? (
          <StaffTab />
        ) : activeGroup ? (
          <GroupTab
            key={activeGroup.id}
            group={activeGroup}
            onDelete={() => handleDeleteGroup(activeGroup.id)}
            onUpdate={handleUpdateGroup}
            templates={formTemplates}
          />
        ) : null}

        {/* New Group Modal */}
        {showNewGroup && (
          <PlanGate
            feature="group_registration"
            fallback={
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">Upgrade to Grow</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                    People groups are available on the Grow plan and above.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNewGroup(false)}
                      className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { window.location.href = '/pricing'; }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      View plans <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            }
          >
            <NewGroupModal
              onClose={handleNewGroupClose}
              onCreate={handleCreateGroup}
            />
          </PlanGate>
        )}

        {/* Add Person Modal */}
        {showAddPerson && (
          <AddPersonModal
            groups={groups}
            onClose={() => setShowAddPerson(false)}
          />
        )}
      </div>
    </Layout>
  );
}
