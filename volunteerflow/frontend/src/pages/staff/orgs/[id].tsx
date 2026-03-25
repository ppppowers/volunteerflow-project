import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { OrgWorkspaceTabs } from '@/components/staff/OrgWorkspaceTabs';
import { AuditLogTable, AuditEntry } from '@/components/staff/AuditLogTable';
import { NoteEditor } from '@/components/staff/NoteEditor';
import { PermissionGate } from '@/components/staff/PermissionGate';
import { PLAN_BADGE, STATUS_BADGE } from '@/components/staff/staffOrgUtils';
import { staffApi, StaffApiError } from '@/lib/staffApi';
import { useStaffAuth } from '@/context/StaffAuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgDetail {
  id: string;
  org_name: string;
  email: string;
  contact_name?: string;
  contact_email?: string;
  plan: string;
  status: string;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  volunteer_count?: number;
  event_count?: number;
  pending_applications?: number;
  total_hours?: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  billing_info?: string;
}

interface Note {
  id: string;
  content: string;
  is_important: boolean;
  tags: string[];
  author_name?: string;
  author_id?: string;
  created_at: string;
}

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'enterprise'];
const STATUS_OPTIONS = ['active', 'suspended', 'trial', 'cancelled'];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 hover:border-gray-500 px-2.5 py-0.5 text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
    >
      {label}: {value.slice(0, 12)}&hellip;
      <span className="text-gray-500">{copied ? '✓' : '⎘'}</span>
    </button>
  );
}

function FieldRow({
  label,
  value,
  locked,
  editing,
  onChange,
  inputType = 'text',
}: {
  label: string;
  value: string;
  locked?: boolean;
  editing?: boolean;
  onChange?: (v: string) => void;
  inputType?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <span className="w-40 flex-shrink-0 text-xs font-medium text-gray-400 pt-0.5 flex items-center gap-1">
        {label}
        {locked && <span title="Requires elevated permission">🔒</span>}
      </span>
      {editing && !locked && onChange ? (
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-gray-900 text-gray-100 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-amber-500 border border-gray-700"
        />
      ) : (
        <span className="flex-1 text-sm text-gray-200">{value || '—'}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function OverviewTab({
  org,
  notes,
  activity,
  activityLoading,
  onSwitchTab,
}: {
  org: OrgDetail;
  notes: Note[];
  activity: AuditEntry[];
  activityLoading: boolean;
  onSwitchTab: (tab: string) => void;
}) {
  const recentNotes = notes.slice(0, 2);
  const recentActivity = activity.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Volunteers" value={org.volunteer_count ?? 0} />
        <StatCard label="Events" value={org.event_count ?? 0} />
        <StatCard label="Pending Apps" value={org.pending_applications ?? 0} />
        <StatCard label="Total Hours" value={org.total_hours ?? 0} />
      </div>

      {/* Recent notes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300">Recent Notes</h3>
          <button
            onClick={() => onSwitchTab('notes')}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            View all &rarr;
          </button>
        </div>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {recentNotes.map(note => (
              <div
                key={note.id}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300"
              >
                {note.is_important && (
                  <span className="inline-block mb-1 rounded-full bg-amber-900 text-amber-300 px-2 py-0.5 text-xs font-medium mr-2">
                    Important
                  </span>
                )}
                <p>{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
        <AuditLogTable entries={recentActivity} loading={activityLoading} />
      </div>
    </div>
  );
}

function AccountTab({
  org,
  editingOrg,
  editFields,
  onFieldChange,
  saving,
  onSave,
  onCancel,
}: {
  org: OrgDetail;
  editingOrg: boolean;
  editFields: Partial<OrgDetail>;
  onFieldChange: (key: keyof OrgDetail, value: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { canDo } = useStaffAuth();
  const canEditBasic = canDo('orgs.edit_basic');
  const canEditPlan = canDo('orgs.edit_plan');
  const canEditStatus = canDo('orgs.edit_status');

  const f = (key: keyof OrgDetail) => String((editingOrg ? editFields[key] ?? org[key] : org[key]) ?? '');

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Org info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Organization Info</h3>
        <FieldRow
          label="Org Name"
          value={f('org_name')}
          editing={editingOrg && canEditBasic}
          locked={!canEditBasic}
          onChange={v => onFieldChange('org_name', v)}
        />
        <FieldRow label="Account Email" value={f('email')} editing={false} />
        <FieldRow
          label="Contact Name"
          value={f('contact_name')}
          editing={editingOrg && canEditBasic}
          locked={!canEditBasic}
          onChange={v => onFieldChange('contact_name', v)}
        />
        <FieldRow
          label="Contact Email"
          value={f('contact_email')}
          editing={editingOrg && canEditBasic}
          locked={!canEditBasic}
          onChange={v => onFieldChange('contact_email', v)}
        />
      </div>

      {/* Plan */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-1">
          Plan
          {!canEditPlan && <span title="Requires orgs.edit_plan">🔒</span>}
        </h3>
        {editingOrg && canEditPlan ? (
          <select
            value={f('plan')}
            onChange={e => onFieldChange('plan', e.target.value)}
            className="bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          >
            {PLAN_OPTIONS.map(p => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${PLAN_BADGE[org.plan] ?? 'bg-gray-700 text-gray-300'}`}
          >
            {org.plan}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-1">
          Status
          {!canEditStatus && <span title="Requires orgs.edit_status">🔒</span>}
        </h3>
        {editingOrg && canEditStatus ? (
          <select
            value={f('status')}
            onChange={e => onFieldChange('status', e.target.value)}
            className="bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[org.status] ?? 'bg-gray-700 text-gray-400'}`}
          >
            {org.status}
          </span>
        )}
      </div>

      {/* Save / Cancel */}
      {editingOrg && (
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-sm px-5 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function NotesTab({
  orgId,
  notes,
  notesLoading,
  notesError,
  deleteError,
  showNoteEditor,
  editingNote,
  onNewNote,
  onEditNote,
  onDeleteNote,
  onSaveNote,
  onCancelNote,
  currentStaffId,
}: {
  orgId: string;
  notes: Note[];
  notesLoading: boolean;
  notesError: string | null;
  deleteError: string | null;
  showNoteEditor: boolean;
  editingNote: Note | null;
  onNewNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveNote: (note: Note) => void;
  onCancelNote: () => void;
  currentStaffId?: string;
}) {
  const { canDo } = useStaffAuth();

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Notes</h3>
        <PermissionGate perm="notes.create">
          <button
            onClick={onNewNote}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            + New Note
          </button>
        </PermissionGate>
      </div>

      {/* Error banners */}
      {notesError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {notesError}
        </p>
      )}
      {deleteError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {deleteError}
        </p>
      )}

      {/* Note list */}
      {notesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-lg border border-gray-700 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-200">{note.content}</p>
                <div className="flex gap-2 flex-shrink-0">
                  {/* Edit: own notes OR edit_any */}
                  {(canDo('notes.edit_any') || (canDo('notes.edit_own') && note.author_id === currentStaffId)) && (
                    <button
                      onClick={() => onEditNote(note)}
                      className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <PermissionGate perm="notes.delete">
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </div>
              </div>
              {/* Tags */}
              {(note.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags?.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-700 text-gray-300 px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Footer */}
              <div className="flex items-center gap-2">
                {note.is_important && (
                  <span className="rounded-full bg-amber-900 text-amber-300 px-2 py-0.5 text-xs font-medium">
                    Important
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {note.author_name ?? 'Staff'} &middot; {formatDate(note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note editor (inline) */}
      {(showNoteEditor || editingNote) && (
        <NoteEditor
          orgId={orgId}
          existingNote={editingNote ?? undefined}
          onSave={note => onSaveNote(note as Note)}
          onCancel={onCancelNote}
        />
      )}
    </div>
  );
}

function ActivityTab({
  activity,
  activityLoading,
  activityError,
}: {
  activity: AuditEntry[];
  activityLoading: boolean;
  activityError: string | null;
}) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = activity.filter(entry => {
    const ts = new Date(entry.timestamp).getTime();
    if (fromDate && ts < new Date(fromDate).getTime()) return false;
    if (toDate && ts > new Date(toDate + 'T23:59:59').getTime()) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {activityError && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {activityError}
        </p>
      )}
      {/* Date filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-gray-400">
          From
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-xs border border-gray-700 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          To
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-xs border border-gray-700 outline-none focus:ring-1 focus:ring-amber-500"
          />
        </label>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <AuditLogTable entries={filtered} loading={activityLoading} />
    </div>
  );
}

function BillingTab({
  org,
  editingOrg,
  editFields,
  onFieldChange,
}: {
  org: OrgDetail;
  editingOrg: boolean;
  editFields: Partial<OrgDetail>;
  onFieldChange: (key: keyof OrgDetail, value: string) => void;
}) {
  const { canDo } = useStaffAuth();
  const canViewSensitive = canDo('orgs.view_sensitive');
  const canEditBilling = canDo('orgs.edit_billing');

  if (!canViewSensitive) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center text-gray-500">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm font-medium">Billing details require elevated access</p>
          <p className="text-xs mt-1">Requires: orgs.view_sensitive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* IDs */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Payment Provider</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-40">Stripe Customer ID</span>
            {org.stripe_customer_id ? (
              <CopyChip label="cus" value={org.stripe_customer_id} />
            ) : (
              <span className="text-sm text-gray-500">—</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-40">Subscription ID</span>
            {org.stripe_subscription_id ? (
              <CopyChip label="sub" value={org.stripe_subscription_id} />
            ) : (
              <span className="text-sm text-gray-500">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Invoice history placeholder */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Invoice History</h3>
        <p className="text-sm text-gray-500 italic">
          Invoice history will be available in a future update.
        </p>
      </div>

      {/* Billing info */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1">
          Billing Info
          {!canEditBilling && <span title="Requires orgs.edit_billing">🔒</span>}
        </h3>
        {editingOrg && canEditBilling ? (
          <textarea
            value={String(editFields.billing_info ?? org.billing_info ?? '')}
            onChange={e => onFieldChange('billing_info', e.target.value)}
            rows={4}
            className="w-full bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700 resize-y"
          />
        ) : (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">
            {org.billing_info || <span className="text-gray-500 italic">No billing info recorded.</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function SessionsTab({ activity, loading }: { activity: AuditEntry[]; loading: boolean }) {
  const staffSessions = activity.filter(e => e.source === 'staff');

  // Attempt to pair sessions by heuristic: consecutive staff entries that look like session start/end
  // Surface them as a simple table since we don't have a dedicated sessions endpoint
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Showing staff-initiated activity entries. Dedicated session tracking will be available in a
        future update.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Staff Member</th>
              <th className="px-4 py-3 text-left">Mode / Action</th>
              <th className="px-4 py-3 text-left">Start Time</th>
              <th className="px-4 py-3 text-left">Outcome</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-700">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-700 rounded animate-pulse" style={{ width: '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : staffSessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  No staff sessions recorded.
                </td>
              </tr>
            ) : (
              staffSessions.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 text-gray-200">{entry.actor}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.action}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {entry.outcome === 'success' ? (
                      <span className="text-green-400 text-xs">✓ success</span>
                    ) : entry.outcome === 'denied' ? (
                      <span className="text-red-400 text-xs">✗ denied</span>
                    ) : (
                      <span className="text-amber-400 text-xs">⚠ error</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const VALID_TABS = ['overview', 'account', 'notes', 'activity', 'billing', 'sessions'];

export default function OrgWorkspacePage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { canDo, staffUser } = useStaffAuth();

  // Tab state — driven by URL hash
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    function syncTab() {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) setActiveTab(hash);
    }
    syncTab();
    window.addEventListener('hashchange', syncTab);
    return () => window.removeEventListener('hashchange', syncTab);
  }, []);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }

  // Data state
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState('');

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Edit state
  const [editingOrg, setEditingOrg] = useState(false);
  const [editFields, setEditFields] = useState<Partial<OrgDetail>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Note editor state
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Support view modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMode, setSupportMode] = useState<'view_only' | 'support'>('view_only');
  const [supportReason, setSupportReason] = useState('');
  const [supportViewError, setSupportViewError] = useState<string | null>(null);
  const [supportViewLoading, setSupportViewLoading] = useState(false);

  // Fetch org
  const fetchOrg = useCallback(async () => {
    if (!id) return;
    setOrgLoading(true);
    setOrgError('');
    try {
      const data = await staffApi.get(`/orgs/${id}`) as { org: OrgDetail };
      setOrg(data.org);
    } catch (err: unknown) {
      setOrgError(err instanceof Error ? err.message : 'Failed to load organization.');
    } finally {
      setOrgLoading(false);
    }
  }, [id]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const data = await staffApi.get(`/orgs/${id}/notes?page=1`) as { notes: Note[] };
      setNotes(data.notes ?? []);
    } catch {
      setNotesError('Failed to load notes. Please refresh.');
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  // Fetch activity
  const fetchActivity = useCallback(async () => {
    if (!id) return;
    setActivityLoading(true);
    setActivityError(null);
    try {
      const data = await staffApi.get(`/orgs/${id}/activity`) as { activity: AuditEntry[] };
      setActivity(data.activity ?? []);
    } catch {
      setActivityError('Failed to load activity. Please refresh.');
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchOrg();
      fetchNotes();
      fetchActivity();
    }
  }, [id, fetchOrg, fetchNotes, fetchActivity]);

  // ---- Edit handlers ----
  function handleEditFieldChange(key: keyof OrgDetail, value: string) {
    setEditFields(prev => ({ ...prev, [key]: value }));
  }

  function handleStartEdit() {
    if (!org) return;
    setEditFields({
      org_name: org.org_name,
      contact_name: org.contact_name ?? '',
      contact_email: org.contact_email ?? '',
      plan: org.plan,
      status: org.status,
      billing_info: org.billing_info ?? '',
    });
    setEditingOrg(true);
    setSaveError('');
  }

  function handleCancelEdit() {
    setEditingOrg(false);
    setEditFields({});
    setSaveError('');
  }

  async function handleSaveOrg() {
    if (!org || !id) return;
    setSaving(true);
    setSaveError('');
    try {
      const updates: Record<string, unknown> = {};
      if (canDo('orgs.edit_basic')) {
        if (editFields.org_name !== undefined) updates.org_name = editFields.org_name;
        if (editFields.contact_name !== undefined) updates.contact_name = editFields.contact_name;
        if (editFields.contact_email !== undefined) updates.contact_email = editFields.contact_email;
      }
      if (canDo('orgs.edit_plan') && editFields.plan !== undefined) updates.plan = editFields.plan;
      if (canDo('orgs.edit_status') && editFields.status !== undefined) updates.status = editFields.status;
      if (canDo('orgs.edit_billing') && editFields.billing_info !== undefined) updates.billing_info = editFields.billing_info;

      const result = await staffApi.patch(`/orgs/${id}`, updates) as { org: OrgDetail };
      setOrg(result.org ?? { ...org, ...updates });
      setEditingOrg(false);
      setEditFields({});
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  // ---- Note handlers ----
  function handleSaveNote(note: Note) {
    setNotes(prev => {
      const existing = prev.findIndex(n => n.id === note.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = note;
        return next;
      }
      return [note, ...prev];
    });
    setShowNoteEditor(false);
    setEditingNote(null);
  }

  async function handleDeleteNote(noteId: string) {
    if (!id) return;
    setDeleteError(null);
    try {
      await staffApi.delete(`/orgs/${id}/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch {
      setDeleteError('Failed to delete note. Please try again.');
    }
  }

  // ---- Support view ----
  function handleOpenSupportModal() {
    setSupportMode('view_only');
    setSupportReason('');
    setSupportViewError(null);
    setShowSupportModal(true);
  }

  async function handleConfirmSupportView() {
    if (!org || !supportReason.trim()) return;
    setSupportViewLoading(true);
    setSupportViewError(null);
    try {
      const result = await staffApi.post('/support/enter', {
        orgId: org.id,
        mode: supportMode,
        reason: supportReason.trim(),
      }) as { sessionId: string; orgId: string; orgName: string; mode: string };
      sessionStorage.setItem('vf_support_session', JSON.stringify({
        sessionId: result.sessionId,
        orgId: result.orgId,
        orgName: result.orgName,
        mode: result.mode,
      }));
      router.push(`/staff/support/${org.id}`);
    } catch {
      setSupportViewError('Failed to enter support view. Please try again.');
    } finally {
      setSupportViewLoading(false);
    }
  }

  // ---- Loading / error states ----
  if (orgLoading) {
    return (
      <StaffLayout requiredPerm="orgs.view">
        <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
      </StaffLayout>
    );
  }

  if (orgError || !org) {
    return (
      <StaffLayout requiredPerm="orgs.view">
        <div className="max-w-xl mx-auto mt-16 text-center">
          <p className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-sm">
            {orgError || 'Organization not found.'}
          </p>
          <button
            onClick={() => router.push('/staff/orgs')}
            className="mt-4 text-sm text-gray-400 hover:text-gray-200 underline"
          >
            Back to Organizations
          </button>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout requiredPerm="orgs.view">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left — org info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-100">{org.org_name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_BADGE[org.plan] ?? 'bg-gray-700 text-gray-300'}`}
                >
                  {org.plan}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[org.status] ?? 'bg-gray-700 text-gray-400'}`}
                >
                  {org.status}
                </span>
              </div>

              <p className="text-sm text-gray-400">
                {org.owner_name ?? org.contact_name ?? '—'}
                {(org.owner_email ?? org.contact_email) && (
                  <span className="ml-2 text-gray-500">
                    &lt;{org.owner_email ?? org.contact_email}&gt;
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <CopyChip label="ID" value={org.id} />
                <span className="text-xs text-gray-500">
                  Joined {formatDate(org.created_at)}
                </span>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <PermissionGate perm="support.view_mode">
                  <button
                    onClick={handleOpenSupportModal}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm px-4 py-2 transition-colors"
                  >
                    Enter Support View
                  </button>
                </PermissionGate>
                <PermissionGate perm="orgs.edit_basic">
                  <button
                    onClick={handleStartEdit}
                    disabled={editingOrg}
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 transition-colors"
                  >
                    Edit Org
                  </button>
                </PermissionGate>
              </div>
              {supportViewError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                  {supportViewError}
                </p>
              )}
            </div>
          </div>

          {saveError && (
            <p className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
              {saveError}
            </p>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs                                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <OrgWorkspaceTabs activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                org={org}
                notes={notes}
                activity={activity}
                activityLoading={activityLoading}
                onSwitchTab={handleTabChange}
              />
            )}

            {activeTab === 'account' && (
              <AccountTab
                org={org}
                editingOrg={editingOrg}
                editFields={editFields}
                onFieldChange={handleEditFieldChange}
                saving={saving}
                onSave={handleSaveOrg}
                onCancel={handleCancelEdit}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab
                orgId={id}
                notes={notes}
                notesLoading={notesLoading}
                notesError={notesError}
                deleteError={deleteError}
                showNoteEditor={showNoteEditor}
                editingNote={editingNote}
                onNewNote={() => { setShowNoteEditor(true); setEditingNote(null); setDeleteError(null); }}
                onEditNote={note => { setEditingNote(note); setShowNoteEditor(false); setDeleteError(null); }}
                onDeleteNote={handleDeleteNote}
                onSaveNote={handleSaveNote}
                onCancelNote={() => { setShowNoteEditor(false); setEditingNote(null); }}
                currentStaffId={staffUser?.staffId}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityTab activity={activity} activityLoading={activityLoading} activityError={activityError} />
            )}

            {activeTab === 'billing' && (
              <BillingTab
                org={org}
                editingOrg={editingOrg}
                editFields={editFields}
                onFieldChange={handleEditFieldChange}
              />
            )}

            {activeTab === 'sessions' && (
              <SessionsTab activity={activity} loading={activityLoading} />
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Enter Support View Modal                                          */}
      {/* ---------------------------------------------------------------- */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Enter Support View</h2>
              <p className="text-sm text-gray-400 mt-1">
                You are about to enter support view for <strong className="text-gray-200">{org.org_name}</strong>.
                All actions will be logged.
              </p>
            </div>

            {/* Mode selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Mode
              </label>
              <select
                value={supportMode}
                onChange={e => setSupportMode(e.target.value as 'view_only' | 'support')}
                className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700"
              >
                <option value="view_only">View Only</option>
                {canDo('support.impersonation') && (
                  <option value="support">Full Support</option>
                )}
              </select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={supportReason}
                onChange={e => setSupportReason(e.target.value)}
                placeholder="Brief description of why you are entering support view…"
                rows={3}
                className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 border border-gray-700 resize-none placeholder-gray-600"
              />
            </div>

            {supportViewError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
                {supportViewError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleConfirmSupportView}
                disabled={!supportReason.trim() || supportViewLoading}
                className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                {supportViewLoading ? 'Entering…' : 'Enter Support View'}
              </button>
              <button
                onClick={() => { setShowSupportModal(false); setSupportViewError(null); }}
                disabled={supportViewLoading}
                className="rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-sm px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
