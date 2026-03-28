'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import {
  Search,
  Users,
  Clock,
  Calendar,
  Star,
  ChevronRight,
  Link2,
  Copy,
  Check,
  FileText,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

const selectCls = inputCls;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VolunteerRow {
  id: string;
  name: string;
  volunteerId: string;
  avatar: string;
  status: 'active' | 'inactive' | 'pending';
  hoursContributed: number;
  eventsCompleted: number;
  rating: number;
  skills: string[];
}

interface ApiVolunteerItem {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  skills?: string[];
  hoursContributed?: number;
  status: string;
}

function mapVolunteer(v: ApiVolunteerItem): VolunteerRow {
  const statusRaw = v.status?.toLowerCase();
  const status: VolunteerRow['status'] =
    statusRaw === 'inactive' ? 'inactive' : statusRaw === 'pending' ? 'pending' : 'active';
  return {
    id: v.id,
    name: `${v.firstName} ${v.lastName}`.trim(),
    volunteerId: `VOL-${v.id}`,
    avatar: v.avatar ?? '',
    status,
    hoursContributed: v.hoursContributed ?? 0,
    eventsCompleted: 0,
    rating: 0,
    skills: v.skills ?? [],
  };
}

// ─── VolunteersTab ─────────────────────────────────────────────────────────────

interface TemplateOption { id: string; name: string; }

export function VolunteersTab({
  templates = [],
  linkedFormId = null,
  onLinkForm,
}: {
  templates?: TemplateOption[];
  linkedFormId?: string | null;
  onLinkForm?: (formId: string | null) => void;
}) {
  const [volunteers, setVolunteers] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<ApiVolunteerItem[]>('/volunteers?limit=100')
      .then((data) => setVolunteers(data.map(mapVolunteer)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/volunteers/${id}`);
      setVolunteers((prev) => prev.filter((v) => v.id !== id));
      setConfirmDeleteId(null);
    } catch {
      // keep confirm open so user can retry
    } finally {
      setDeleting(false);
    }
  };

  const signupUrl = (() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    if (linkedFormId) params.set('form', linkedFormId);
    const qs = params.toString();
    return `${base}/apply${qs ? `?${qs}` : ''}`;
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return volunteers.filter((v) => {
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.skills.some((s) => s.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, volunteers]);

  const statusBadge = (status: 'active' | 'inactive' | 'pending') => {
    if (status === 'active')
      return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
    if (status === 'inactive')
      return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
    return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
  };

  return (
    <div className="space-y-4">
      {/* Volunteer Application link banner */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border"
           style={{ background: '#6366f110', borderColor: '#6366f140' }}>
        <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: '#6366f1' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Volunteer Application Link</p>
        </div>
        {/* Form selector */}
        {onLinkForm && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={linkedFormId ?? ''}
              onChange={(e) => onLinkForm(e.target.value || null)}
              className="text-xs border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1.5 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">No form linked</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg flex-shrink-0 transition-colors"
          style={copied
            ? { background: '#6366f120', color: '#6366f1', borderColor: '#6366f140' }
            : { color: '#6366f1', borderColor: '#6366f170', background: 'transparent' }}
        >
          {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, email, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + ' pl-9'}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={selectCls + ' sm:w-44'}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map((j) => <div key={j} className="h-14 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />)}
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {volunteers.length === 0 ? 'No volunteers yet.' : 'No volunteers match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <Card key={v.id} className="p-4 flex flex-col gap-3">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                {v.avatar ? (
                  <img
                    src={v.avatar}
                    alt={v.name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {getInitials(v.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {v.name}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                    {v.volunteerId}
                  </p>
                </div>
                <span
                  className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(v.status)}`}
                >
                  {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {v.hoursContributed}
                  </p>
                  <p className="text-xs text-neutral-400 leading-tight">Hours</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {v.eventsCompleted}
                  </p>
                  <p className="text-xs text-neutral-400 leading-tight">Events</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <Star className="w-3.5 h-3.5 mx-auto mb-1 text-neutral-400" />
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {v.rating.toFixed(1)}
                  </p>
                  <p className="text-xs text-neutral-400 leading-tight">Rating</p>
                </div>
              </div>

              {/* Skills */}
              {v.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {v.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer: view profile + remove */}
              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-700">
                {confirmDeleteId === v.id ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger-500 flex-shrink-0" />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-1">Remove volunteer?</span>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={deleting}
                      className="px-2.5 py-1 text-xs font-semibold bg-danger-600 hover:bg-danger-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {deleting ? '…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deleting}
                      className="px-2.5 py-1 text-xs font-semibold border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/volunteers/${v.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      View Profile
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setConfirmDeleteId(v.id)}
                      className="p-1.5 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
                      title="Remove volunteer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
