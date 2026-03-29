import { useState, useMemo } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { PlanGate } from '@/components/PlanGate';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Search,
  Users,
  Calendar,
  ChevronDown,
  Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: string;
  issuedCount: number;
}

interface IssuedBadge {
  id: string;
  badgeTypeId: string;
  volunteerId: string;
  volunteerName: string;
  volunteerAvatar?: string;
  issuedAt: string;
  issuedBy: string;
  note: string;
  expiresAt?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const BADGE_ICONS = ['🏅', '⭐', '🎖️', '🏆', '🌟', '🎗️', '🦺', '🐾', '🌱', '🤝', '🚀', '💪', '🎓', '🔑', '🛡️', '❤️'];
const BADGE_COLORS = [
  { name: 'Gold', value: '#f59e0b' },
  { name: 'Silver', value: '#94a3b8' },
  { name: 'Bronze', value: '#b45309' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
];

const VOLUNTEERS = [
  { id: 'v1', name: 'Alice Williams', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 'v2', name: 'Bob Martinez', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: 'v3', name: 'Carol Davis', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 'v4', name: 'David Kim', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: 'v5', name: 'Emma Thompson', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 'v6', name: 'Frank Johnson', avatar: 'https://i.pravatar.cc/150?img=6' },
];

const INITIAL_BADGE_TYPES: BadgeType[] = [
  { id: 'bt1', name: '100 Hours Club', description: 'Awarded to volunteers who have logged 100+ hours', icon: '🏆', color: '#f59e0b', criteria: 'Log 100+ confirmed volunteer hours', issuedCount: 3 },
  { id: 'bt2', name: 'Event Leader', description: 'Recognized for leading and coordinating an event', icon: '⭐', color: '#3b82f6', criteria: 'Successfully coordinate one or more events', issuedCount: 5 },
  { id: 'bt3', name: 'First Responder', description: 'Completed first aid and emergency response training', icon: '🛡️', color: '#ef4444', criteria: 'Complete certified first aid training', issuedCount: 2 },
  { id: 'bt4', name: 'Community Champion', description: 'Outstanding contributions to community impact', icon: '❤️', color: '#10b981', criteria: 'Nominated by staff for exceptional community impact', issuedCount: 1 },
  { id: 'bt5', name: 'Mentor', description: 'Actively mentoring other volunteers', icon: '🎓', color: '#8b5cf6', criteria: 'Complete mentorship training and actively mentor 2+ volunteers', issuedCount: 4 },
];

const INITIAL_ISSUED: IssuedBadge[] = [
  { id: 'ib1', badgeTypeId: 'bt1', volunteerId: 'v1', volunteerName: 'Alice Williams', volunteerAvatar: 'https://i.pravatar.cc/150?img=1', issuedAt: '2026-03-10', issuedBy: 'Admin', note: 'Hit 100 hours milestone!' },
  { id: 'ib2', badgeTypeId: 'bt2', volunteerId: 'v1', volunteerName: 'Alice Williams', volunteerAvatar: 'https://i.pravatar.cc/150?img=1', issuedAt: '2026-02-20', issuedBy: 'Maria L.', note: 'Led the Winter Food Drive' },
  { id: 'ib3', badgeTypeId: 'bt2', volunteerId: 'v3', volunteerName: 'Carol Davis', volunteerAvatar: 'https://i.pravatar.cc/150?img=3', issuedAt: '2026-03-01', issuedBy: 'Admin', note: 'Coordinated Food Bank event' },
  { id: 'ib4', badgeTypeId: 'bt5', volunteerId: 'v2', volunteerName: 'Bob Martinez', volunteerAvatar: 'https://i.pravatar.cc/150?img=2', issuedAt: '2026-01-15', issuedBy: 'Admin', note: 'Mentoring 3 new volunteers' },
  { id: 'ib5', badgeTypeId: 'bt3', volunteerId: 'v4', volunteerName: 'David Kim', volunteerAvatar: 'https://i.pravatar.cc/150?img=4', issuedAt: '2026-02-05', issuedBy: 'Admin', note: 'Completed CPR/AED certification' },
  { id: 'ib6', badgeTypeId: 'bt4', volunteerId: 'v5', volunteerName: 'Emma Thompson', volunteerAvatar: 'https://i.pravatar.cc/150?img=5', issuedAt: '2026-03-12', issuedBy: 'Maria L.', note: '3 years of exceptional service' },
];

// ─── Badge Type Modal ─────────────────────────────────────────────────────────

function BadgeTypeModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: BadgeType;
  onSave: (bt: BadgeType) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BadgeType>(
    initial ?? { id: `bt${Date.now()}`, name: '', description: '', icon: '🏅', color: '#f59e0b', criteria: '', issuedCount: 0 }
  );
  const set = (k: keyof BadgeType) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{initial ? 'Edit Badge' : 'New Badge Type'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: `${form.color}20`, border: `2px solid ${form.color}40` }}>
              {form.icon}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Badge name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                placeholder="e.g. 100 Hours Club"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => set('icon')(ic)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === ic ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500 scale-110' : 'bg-neutral-100 dark:bg-neutral-800 hover:scale-105'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {BADGE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => set('color')(c.value)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: c.value }}
                  title={c.name}
                >
                  {form.color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="What this badge represents"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Earning criteria</label>
            <textarea
              value={form.criteria}
              onChange={(e) => set('criteria')(e.target.value)}
              rows={2}
              placeholder="How volunteers earn this badge"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()} className="flex-1">
            {initial ? 'Save changes' : 'Create badge'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Issue Badge Modal ────────────────────────────────────────────────────────

function IssueModal({
  badgeTypes,
  onIssue,
  onClose,
}: {
  badgeTypes: BadgeType[];
  onIssue: (badge: IssuedBadge) => void;
  onClose: () => void;
}) {
  const [badgeTypeId, setBadgeTypeId] = useState(badgeTypes[0]?.id ?? '');
  const [volunteerId, setVolunteerId] = useState('');
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const valid = badgeTypeId && volunteerId;

  const handleIssue = () => {
    if (!valid) return;
    const vol = VOLUNTEERS.find((v) => v.id === volunteerId)!;
    onIssue({
      id: `ib${Date.now()}`,
      badgeTypeId,
      volunteerId,
      volunteerName: vol.name,
      volunteerAvatar: vol.avatar,
      issuedAt: new Date().toISOString().split('T')[0],
      issuedBy: 'You',
      note,
      expiresAt: expiresAt || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Issue Badge</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Badge</label>
            <select
              value={badgeTypeId}
              onChange={(e) => setBadgeTypeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {badgeTypes.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.icon} {bt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Volunteer</label>
            <select
              value={volunteerId}
              onChange={(e) => setVolunteerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Select volunteer —</option>
              {VOLUNTEERS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for issuing this badge"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Expiry date (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleIssue} disabled={!valid} className="flex-1 flex items-center justify-center gap-2">
            <Award className="w-4 h-4" /> Issue badge
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageTab = 'issued' | 'types';

export default function BadgesPage() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>(INITIAL_BADGE_TYPES);
  const [issued, setIssued] = useState<IssuedBadge[]>(INITIAL_ISSUED);
  const [tab, setTab] = useState<PageTab>('issued');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [editBadge, setEditBadge] = useState<BadgeType | undefined>();
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filteredIssued = useMemo(() => {
    return issued.filter((b) => {
      if (filterType && b.badgeTypeId !== filterType) return false;
      if (search && !b.volunteerName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issued, search, filterType]);

  const saveBadgeType = (bt: BadgeType) => {
    setBadgeTypes((p) => {
      const exists = p.find((x) => x.id === bt.id);
      return exists ? p.map((x) => x.id === bt.id ? bt : x) : [...p, bt];
    });
    setShowBadgeModal(false);
    setEditBadge(undefined);
    showToast(editBadge ? 'Badge updated' : 'Badge type created');
  };

  const deleteBadgeType = (id: string) => {
    setBadgeTypes((p) => p.filter((bt) => bt.id !== id));
    setIssued((p) => p.filter((ib) => ib.badgeTypeId !== id));
    showToast('Badge type deleted');
  };

  const issueNew = (badge: IssuedBadge) => {
    setIssued((p) => [badge, ...p]);
    setBadgeTypes((p) => p.map((bt) => bt.id === badge.badgeTypeId ? { ...bt, issuedCount: bt.issuedCount + 1 } : bt));
    setShowIssueModal(false);
    showToast('Badge issued successfully');
  };

  const revoke = (id: string) => {
    const badge = issued.find((b) => b.id === id);
    if (badge) {
      setBadgeTypes((p) => p.map((bt) => bt.id === badge.badgeTypeId ? { ...bt, issuedCount: Math.max(0, bt.issuedCount - 1) } : bt));
    }
    setIssued((p) => p.filter((b) => b.id !== id));
    showToast('Badge revoked');
  };

  return (
    <Layout>
      <Head><title>Badges — VolunteerFlow</title></Head>
      <PlanGate feature="credentials_badges">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Credentials & Badges</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Define badge types and issue digital credentials to recognize volunteer achievements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'issued' && (
              <Button onClick={() => setShowIssueModal(true)} className="flex items-center gap-2">
                <Award className="w-4 h-4" /> Issue badge
              </Button>
            )}
            {tab === 'types' && (
              <Button onClick={() => { setEditBadge(undefined); setShowBadgeModal(true); }} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> New badge type
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
          {[{ id: 'issued', label: `Issued (${issued.length})` }, { id: 'types', label: `Badge Types (${badgeTypes.length})` }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as PageTab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Issued Badges */}
        {tab === 'issued' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search volunteers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All badge types</option>
                {badgeTypes.map((bt) => <option key={bt.id} value={bt.id}>{bt.icon} {bt.name}</option>)}
              </select>
            </div>

            {filteredIssued.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No badges issued yet. Start recognizing your volunteers!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIssued.map((ib) => {
                  const bt = badgeTypes.find((b) => b.id === ib.badgeTypeId);
                  if (!bt) return null;
                  return (
                    <Card key={ib.id} className="relative group">
                      <button
                        onClick={() => revoke(ib.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-all"
                        title="Revoke badge"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${bt.color}20`, border: `2px solid ${bt.color}40` }}>
                          {bt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{bt.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {ib.volunteerAvatar ? (
                              <img src={ib.volunteerAvatar} alt={ib.volunteerName} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-[9px] font-bold text-primary-700 dark:text-primary-400">
                                {ib.volunteerName[0]}
                              </div>
                            )}
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{ib.volunteerName}</p>
                          </div>
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                            Issued {ib.issuedAt} by {ib.issuedBy}
                          </p>
                          {ib.note && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 italic">{ib.note}</p>}
                          {ib.expiresAt && (
                            <p className="text-[11px] text-warning-600 dark:text-warning-400 mt-1">Expires {ib.expiresAt}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Badge Types */}
        {tab === 'types' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badgeTypes.map((bt) => (
              <Card key={bt.id} className="group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${bt.color}20`, border: `2px solid ${bt.color}40` }}>
                      {bt.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{bt.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" /> {bt.issuedCount} issued
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditBadge(bt); setShowBadgeModal(true); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteBadgeType(bt.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{bt.description}</p>
                {bt.criteria && (
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Criteria</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">{bt.criteria}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {(showBadgeModal) && (
        <BadgeTypeModal
          initial={editBadge}
          onSave={saveBadgeType}
          onClose={() => { setShowBadgeModal(false); setEditBadge(undefined); }}
        />
      )}
      {showIssueModal && (
        <IssueModal
          badgeTypes={badgeTypes}
          onIssue={issueNew}
          onClose={() => setShowIssueModal(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold rounded-xl shadow-2xl">
          <Check className="w-4 h-4 text-success-400 dark:text-success-600" />
          {toast}
        </div>
      )}
      </PlanGate>
    </Layout>
  );
}
