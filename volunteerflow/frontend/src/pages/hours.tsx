import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { PlanGate } from '@/components/PlanGate';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import {
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  Check,
  X,
  Award,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoursEntry {
  id: string;
  volunteer_id: string;
  volunteer_name: string;
  volunteer_avatar?: string;
  event_id: string | null;
  event_name: string | null;
  event_category: string | null;
  date: string;
  hours_logged: number;
  check_in: string;
  check_out: string;
  status: 'confirmed' | 'pending' | 'flagged';
  notes: string;
}

interface VolunteerOption { id: string; name: string; avatar?: string; }
interface EventOption    { id: string; name: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HoursEntry['status'] }) {
  const map = {
    confirmed: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
    pending:   'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
    flagged:   'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Avatar({ src, name }: { src?: string; name: string }) {
  return src ? (
    <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
        {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
      </span>
    </div>
  );
}

// ─── Log Hours Modal ──────────────────────────────────────────────────────────

interface LogModalProps {
  entry?: HoursEntry;
  volunteers: VolunteerOption[];
  events: EventOption[];
  onSave: (entry: Partial<HoursEntry> & { id?: string }) => Promise<void>;
  onClose: () => void;
}

function LogModal({ entry, volunteers, events, onSave, onClose }: LogModalProps) {
  const isEdit = !!entry;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    volunteer_id: entry?.volunteer_id ?? '',
    event_id:     entry?.event_id ?? '',
    date:         entry?.date?.slice(0, 10) ?? new Date().toISOString().split('T')[0],
    check_in:     entry?.check_in ?? '',
    check_out:    entry?.check_out ?? '',
    hours_logged: entry?.hours_logged?.toString() ?? '',
    notes:        entry?.notes ?? '',
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const calcHours = (inT: string, outT: string) => {
    if (!inT || !outT) return '';
    const [ih, im] = inT.split(':').map(Number);
    const [oh, om] = outT.split(':').map(Number);
    const diff = (oh * 60 + om) - (ih * 60 + im);
    return diff > 0 ? (diff / 60).toFixed(1) : '';
  };

  const handleTimeChange = (field: 'check_in' | 'check_out', val: string) => {
    const updated = { ...form, [field]: val };
    const calc = calcHours(field === 'check_in' ? val : form.check_in, field === 'check_out' ? val : form.check_out);
    if (calc) updated.hours_logged = calc;
    setForm(updated);
  };

  const valid = form.volunteer_id && form.date && form.hours_logged;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({
        id:           entry?.id,
        volunteer_id: form.volunteer_id,
        event_id:     form.event_id || null,
        date:         form.date,
        hours_logged: parseFloat(form.hours_logged),
        check_in:     form.check_in,
        check_out:    form.check_out,
        notes:        form.notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {isEdit ? 'Edit Hours Entry' : 'Log Hours'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Volunteer</label>
            <select
              value={form.volunteer_id}
              onChange={(e) => set('volunteer_id')(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Select volunteer —</option>
              {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Event (optional)</label>
            <select
              value={form.event_id}
              onChange={(e) => set('event_id')(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— No specific event —</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date')(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Check-in</label>
              <input
                type="time"
                value={form.check_in}
                onChange={(e) => handleTimeChange('check_in', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Check-out</label>
              <input
                type="time"
                value={form.check_out}
                onChange={(e) => handleTimeChange('check_out', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Hours logged
              <span className="ml-1 font-normal text-neutral-400">(auto-calculated or enter manually)</span>
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={form.hours_logged}
              onChange={(e) => set('hours_logged')(e.target.value)}
              placeholder="e.g. 4.5"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Any notes about this session"
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={!valid || saving} className="flex-1 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Log hours')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HoursPage() {
  const router = useRouter();
  const [entries, setEntries]               = useState<HoursEntry[]>([]);
  const [volunteers, setVolunteers]         = useState<VolunteerOption[]>([]);
  const [events, setEvents]                 = useState<EventOption[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [editEntry, setEditEntry]           = useState<HoursEntry | undefined>();
  const [search, setSearch]                 = useState('');
  const [filterEvent, setFilterEvent]       = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [toast, setToast]                   = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadHours = async () => {
    try {
      const data = await api.get<{ hours: HoursEntry[] }>('/hours');
      setEntries(data.hours ?? []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    Promise.all([
      api.get<{ volunteers: { id: string; first_name: string; last_name: string; avatar: string }[] }>('/volunteers?limit=500'),
      api.get<{ events: { id: string; title: string }[] }>('/events?limit=500'),
      loadHours(),
    ]).then(([volData, evtData]) => {
      setVolunteers((volData as any).volunteers?.map((v: any) => ({ id: v.id, name: `${v.first_name} ${v.last_name}`, avatar: v.avatar })) ?? []);
      setEvents((evtData as any).events?.map((e: any) => ({ id: e.id, name: e.title })) ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => entries.filter((e) => {
    if (search && !e.volunteer_name?.toLowerCase().includes(search.toLowerCase()) && !e.event_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEvent && e.event_id !== filterEvent) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  }), [entries, search, filterEvent, filterStatus]);

  const totalHours     = entries.reduce((s, e) => s + Number(e.hours_logged), 0);
  const confirmedHours = entries.filter((e) => e.status === 'confirmed').reduce((s, e) => s + Number(e.hours_logged), 0);
  const pendingCount   = entries.filter((e) => e.status === 'pending').length;
  const flaggedCount   = entries.filter((e) => e.status === 'flagged').length;

  const volunteerHours = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string; hours: number }> = {};
    entries.forEach((e) => {
      if (!map[e.volunteer_id]) map[e.volunteer_id] = { name: e.volunteer_name, avatar: e.volunteer_avatar, hours: 0 };
      map[e.volunteer_id].hours += Number(e.hours_logged);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.hours - a.hours).slice(0, 5);
  }, [entries]);

  const handleSave = async (payload: Partial<HoursEntry> & { id?: string }) => {
    try {
      if (payload.id) {
        await api.put(`/hours/${payload.id}`, payload);
        showToast('Hours updated');
      } else {
        await api.post('/hours', payload);
        showToast('Hours logged successfully');
      }
      await loadHours();
      setShowModal(false);
      setEditEntry(undefined);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/hours/${id}`);
      setEntries((p) => p.filter((e) => e.id !== id));
      showToast('Entry deleted');
    } catch { showToast('Failed to delete'); }
  };

  const confirmEntry = async (id: string) => {
    try {
      await api.put(`/hours/${id}`, { status: 'confirmed' });
      setEntries((p) => p.map((e) => e.id === id ? { ...e, status: 'confirmed' } : e));
      showToast('Entry confirmed');
    } catch { showToast('Failed to confirm'); }
  };

  const exportCsv = () => {
    const rows = [
      ['Volunteer', 'Event', 'Date', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Notes'],
      ...entries.map((e) => [e.volunteer_name, e.event_name ?? '', e.date?.slice(0, 10) ?? '', e.check_in, e.check_out, String(e.hours_logged), e.status, e.notes]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'hours-report.csv';
    a.click();
  };

  return (
    <Layout>
      <Head><title>Hours — VolunteerFlow</title></Head>
      <PlanGate feature="hours_tracking">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Hours & Attendance</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Track volunteer hours, check-ins, and attendance across all events.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => router.push('/grant-report')} className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" /> Grant Report
            </Button>
            <Button variant="secondary" onClick={exportCsv} className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditEntry(undefined); setShowModal(true); }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Hours
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total hours logged',  value: totalHours.toFixed(1),     icon: Clock,   color: 'text-primary-600 dark:text-primary-400',  bg: 'bg-primary-50 dark:bg-primary-900/20'  },
            { label: 'Confirmed hours',      value: confirmedHours.toFixed(1), icon: Check,   color: 'text-success-600 dark:text-success-400',  bg: 'bg-success-50 dark:bg-success-900/20'  },
            { label: 'Pending review',       value: pendingCount,              icon: Clock,   color: 'text-warning-600 dark:text-warning-400',  bg: 'bg-warning-50 dark:bg-warning-900/20'  },
            { label: 'Flagged entries',      value: flaggedCount,              icon: Filter,  color: 'text-danger-600 dark:text-danger-400',    bg: 'bg-danger-50 dark:bg-danger-900/20'    },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stat.value}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Top volunteers leaderboard */}
          <Card className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-warning-500" />
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Top Volunteers</p>
            </div>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}</div>
            ) : volunteerHours.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">No hours logged yet</p>
            ) : (
              <div className="space-y-3">
                {volunteerHours.map(([id, { name, avatar, hours }], i) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-right flex-shrink-0 ${i === 0 ? 'text-warning-500' : 'text-neutral-400'}`}>#{i + 1}</span>
                    <Avatar src={avatar} name={name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{name}</p>
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (hours / volunteerHours[0][1].hours) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">{hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Hours log table */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search volunteer or event…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>

            {/* Table */}
            <Card className="overflow-hidden p-0">
              {loading ? (
                <div className="p-8 space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Volunteer</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Check-in/out</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-neutral-400">Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm">
                            {entries.length === 0 ? 'No hours logged yet. Click "Log Hours" to get started.' : 'No entries match your filters.'}
                          </td>
                        </tr>
                      ) : filtered.map((e) => (
                        <tr key={e.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar src={e.volunteer_avatar} name={e.volunteer_name} />
                              <span className="font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{e.volunteer_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 max-w-[160px] truncate">{e.event_name ?? '—'}</td>
                          <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{e.date?.slice(0, 10)}</td>
                          <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-xs">
                            {e.check_in && e.check_out ? `${e.check_in} – ${e.check_out}` : <span className="text-danger-400">Not recorded</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">{Number(e.hours_logged).toFixed(1)}h</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={e.status} />
                              {e.status !== 'confirmed' && (
                                <button onClick={() => confirmEntry(e.id)} className="text-[10px] text-success-600 dark:text-success-400 font-semibold hover:underline">
                                  Confirm
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => { setEditEntry(e); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <p className="text-xs text-neutral-400">{filtered.length} entries</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Total: {filtered.reduce((s, e) => s + Number(e.hours_logged), 0).toFixed(1)}h
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {showModal && (
        <LogModal
          entry={editEntry}
          volunteers={volunteers}
          events={events}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(undefined); }}
        />
      )}
      </PlanGate>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold rounded-xl shadow-2xl">
          <Check className="w-4 h-4 text-success-400 dark:text-success-600" />
          {toast}
        </div>
      )}
    </Layout>
  );
}
