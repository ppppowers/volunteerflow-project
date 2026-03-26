import { useState, useMemo } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { PlanGate } from '@/components/PlanGate';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  Check,
  X,
  TrendingUp,
  Users,
  Calendar,
  Award,
  ChevronDown,
  Edit2,
  Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoursEntry {
  id: string;
  volunteerId: string;
  volunteerName: string;
  volunteerAvatar?: string;
  eventId: string;
  eventName: string;
  date: string;
  hoursLogged: number;
  checkIn?: string;
  checkOut?: string;
  status: 'confirmed' | 'pending' | 'flagged';
  notes: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const VOLUNTEERS = [
  { id: 'v1', name: 'Alice Williams', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 'v2', name: 'Bob Martinez', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: 'v3', name: 'Carol Davis', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 'v4', name: 'David Kim', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: 'v5', name: 'Emma Thompson', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 'v6', name: 'Frank Johnson', avatar: 'https://i.pravatar.cc/150?img=6' },
];

const EVENTS = [
  { id: 'e1', name: 'Park Cleanup Drive' },
  { id: 'e2', name: 'Food Bank Saturday' },
  { id: 'e3', name: 'Youth Mentorship Workshop' },
  { id: 'e4', name: 'City Marathon Support' },
  { id: 'e5', name: 'Winter Food Drive' },
];

const INITIAL_ENTRIES: HoursEntry[] = [
  { id: 'h1', volunteerId: 'v1', volunteerName: 'Alice Williams', volunteerAvatar: 'https://i.pravatar.cc/150?img=1', eventId: 'e1', eventName: 'Park Cleanup Drive', date: '2026-03-15', hoursLogged: 4.5, checkIn: '09:00', checkOut: '13:30', status: 'confirmed', notes: 'Excellent team leader' },
  { id: 'h2', volunteerId: 'v2', volunteerName: 'Bob Martinez', volunteerAvatar: 'https://i.pravatar.cc/150?img=2', eventId: 'e1', eventName: 'Park Cleanup Drive', date: '2026-03-15', hoursLogged: 4.0, checkIn: '09:15', checkOut: '13:15', status: 'confirmed', notes: '' },
  { id: 'h3', volunteerId: 'v3', volunteerName: 'Carol Davis', volunteerAvatar: 'https://i.pravatar.cc/150?img=3', eventId: 'e2', eventName: 'Food Bank Saturday', date: '2026-03-14', hoursLogged: 6.0, checkIn: '08:00', checkOut: '14:00', status: 'confirmed', notes: 'Helped sort 800 lbs of food' },
  { id: 'h4', volunteerId: 'v4', volunteerName: 'David Kim', volunteerAvatar: 'https://i.pravatar.cc/150?img=4', eventId: 'e2', eventName: 'Food Bank Saturday', date: '2026-03-14', hoursLogged: 5.5, checkIn: '08:30', checkOut: '14:00', status: 'confirmed', notes: '' },
  { id: 'h5', volunteerId: 'v5', volunteerName: 'Emma Thompson', volunteerAvatar: 'https://i.pravatar.cc/150?img=5', eventId: 'e3', eventName: 'Youth Mentorship Workshop', date: '2026-03-12', hoursLogged: 3.0, checkIn: '13:00', checkOut: '16:00', status: 'confirmed', notes: '' },
  { id: 'h6', volunteerId: 'v1', volunteerName: 'Alice Williams', volunteerAvatar: 'https://i.pravatar.cc/150?img=1', eventId: 'e3', eventName: 'Youth Mentorship Workshop', date: '2026-03-12', hoursLogged: 3.5, checkIn: '12:30', checkOut: '16:00', status: 'pending', notes: 'Awaiting confirmation from coordinator' },
  { id: 'h7', volunteerId: 'v6', volunteerName: 'Frank Johnson', volunteerAvatar: 'https://i.pravatar.cc/150?img=6', eventId: 'e4', eventName: 'City Marathon Support', date: '2026-03-10', hoursLogged: 8.0, checkIn: '06:00', checkOut: '14:00', status: 'confirmed', notes: 'Water station coordinator' },
  { id: 'h8', volunteerId: 'v2', volunteerName: 'Bob Martinez', volunteerAvatar: 'https://i.pravatar.cc/150?img=2', eventId: 'e5', eventName: 'Winter Food Drive', date: '2026-03-08', hoursLogged: 2.0, checkIn: '', checkOut: '', status: 'flagged', notes: 'Check-in time not recorded' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HoursEntry['status'] }) {
  const map = {
    confirmed: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
    pending: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
    flagged: 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
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
  onSave: (entry: HoursEntry) => void;
  onClose: () => void;
}

function LogModal({ entry, onSave, onClose }: LogModalProps) {
  const isEdit = !!entry;
  const [form, setForm] = useState({
    volunteerId: entry?.volunteerId ?? '',
    eventId: entry?.eventId ?? '',
    date: entry?.date ?? new Date().toISOString().split('T')[0],
    checkIn: entry?.checkIn ?? '',
    checkOut: entry?.checkOut ?? '',
    hoursLogged: entry?.hoursLogged?.toString() ?? '',
    notes: entry?.notes ?? '',
  });

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-calculate hours from check-in/check-out
  const calcHours = (inT: string, outT: string) => {
    if (!inT || !outT) return '';
    const [ih, im] = inT.split(':').map(Number);
    const [oh, om] = outT.split(':').map(Number);
    const diff = (oh * 60 + om) - (ih * 60 + im);
    return diff > 0 ? (diff / 60).toFixed(1) : '';
  };

  const handleTimeChange = (field: 'checkIn' | 'checkOut', val: string) => {
    const updated = { ...form, [field]: val };
    const calc = calcHours(
      field === 'checkIn' ? val : form.checkIn,
      field === 'checkOut' ? val : form.checkOut
    );
    if (calc) updated.hoursLogged = calc;
    setForm(updated);
  };

  const valid = form.volunteerId && form.eventId && form.date && form.hoursLogged;

  const handleSave = () => {
    if (!valid) return;
    const vol = VOLUNTEERS.find((v) => v.id === form.volunteerId)!;
    const evt = EVENTS.find((e) => e.id === form.eventId)!;
    onSave({
      id: entry?.id ?? `h${Date.now()}`,
      volunteerId: form.volunteerId,
      volunteerName: vol.name,
      volunteerAvatar: vol.avatar,
      eventId: form.eventId,
      eventName: evt.name,
      date: form.date,
      hoursLogged: parseFloat(form.hoursLogged),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      status: 'confirmed',
      notes: form.notes,
    });
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
              value={form.volunteerId}
              onChange={(e) => set('volunteerId')(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Select volunteer —</option>
              {VOLUNTEERS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Event</label>
            <select
              value={form.eventId}
              onChange={(e) => set('eventId')(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Select event —</option>
              {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
                value={form.checkIn}
                onChange={(e) => handleTimeChange('checkIn', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Check-out</label>
              <input
                type="time"
                value={form.checkOut}
                onChange={(e) => handleTimeChange('checkOut', e.target.value)}
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
              value={form.hoursLogged}
              onChange={(e) => set('hoursLogged')(e.target.value)}
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
          <Button onClick={handleSave} disabled={!valid} className="flex-1 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> {isEdit ? 'Save changes' : 'Log hours'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HoursPage() {
  const [entries, setEntries] = useState<HoursEntry[]>(INITIAL_ENTRIES);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<HoursEntry | undefined>();
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVolunteer, setFilterVolunteer] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (search && !e.volunteerName.toLowerCase().includes(search.toLowerCase()) && !e.eventName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterEvent && e.eventId !== filterEvent) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterVolunteer && e.volunteerId !== filterVolunteer) return false;
      return true;
    });
  }, [entries, search, filterEvent, filterStatus, filterVolunteer]);

  const totalHours = entries.reduce((s, e) => s + e.hoursLogged, 0);
  const confirmedHours = entries.filter((e) => e.status === 'confirmed').reduce((s, e) => s + e.hoursLogged, 0);
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const flaggedCount = entries.filter((e) => e.status === 'flagged').length;

  // Top volunteers by hours
  const volunteerHours = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string; hours: number }> = {};
    entries.forEach((e) => {
      if (!map[e.volunteerId]) map[e.volunteerId] = { name: e.volunteerName, avatar: e.volunteerAvatar, hours: 0 };
      map[e.volunteerId].hours += e.hoursLogged;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.hours - a.hours).slice(0, 5);
  }, [entries]);

  const handleSave = (entry: HoursEntry) => {
    setEntries((p) => {
      const exists = p.find((e) => e.id === entry.id);
      return exists ? p.map((e) => e.id === entry.id ? entry : e) : [entry, ...p];
    });
    setShowModal(false);
    setEditEntry(undefined);
    showToast(editEntry ? 'Hours updated' : 'Hours logged successfully');
  };

  const handleDelete = (id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id));
    showToast('Entry deleted');
  };

  const confirmEntry = (id: string) => {
    setEntries((p) => p.map((e) => e.id === id ? { ...e, status: 'confirmed' } : e));
    showToast('Entry confirmed');
  };

  const exportCsv = () => {
    const rows = [
      ['Volunteer', 'Event', 'Date', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Notes'],
      ...entries.map((e) => [e.volunteerName, e.eventName, e.date, e.checkIn || '', e.checkOut || '', e.hoursLogged.toString(), e.status, e.notes]),
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
          <div className="flex items-center gap-2">
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
            { label: 'Total hours logged', value: totalHours.toFixed(1), icon: Clock, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
            { label: 'Confirmed hours', value: confirmedHours.toFixed(1), icon: Check, color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/20' },
            { label: 'Pending review', value: pendingCount, icon: Clock, color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20' },
            { label: 'Flagged entries', value: flaggedCount, icon: Filter, color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-50 dark:bg-danger-900/20' },
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
            <div className="space-y-3">
              {volunteerHours.map(([id, { name, avatar, hours }], i) => (
                <div key={id} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 text-right flex-shrink-0 ${i === 0 ? 'text-warning-500' : 'text-neutral-400'}`}>
                    #{i + 1}
                  </span>
                  <Avatar src={avatar} name={name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{name}</p>
                    <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${Math.min(100, (hours / volunteerHours[0][1].hours) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0">{hours}h</span>
                </div>
              ))}
            </div>
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
                {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
                          No entries match your filters.
                        </td>
                      </tr>
                    ) : filtered.map((e) => (
                      <tr key={e.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar src={e.volunteerAvatar} name={e.volunteerName} />
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{e.volunteerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 max-w-[160px] truncate">{e.eventName}</td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{e.date}</td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-xs">
                          {e.checkIn && e.checkOut ? `${e.checkIn} – ${e.checkOut}` : <span className="text-danger-400">Not recorded</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">{e.hoursLogged}h</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={e.status} />
                            {e.status !== 'confirmed' && (
                              <button
                                onClick={() => confirmEntry(e.id)}
                                className="text-[10px] text-success-600 dark:text-success-400 font-semibold hover:underline"
                              >
                                Confirm
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditEntry(e); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <p className="text-xs text-neutral-400">{filtered.length} entries</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Total: {filtered.reduce((s, e) => s + e.hoursLogged, 0).toFixed(1)}h
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
