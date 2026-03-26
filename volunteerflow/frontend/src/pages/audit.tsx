import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  User,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
  Shield,
  Pencil,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Upload,
  Mail,
  Settings,
  Award,
  Clock,
  Folder,
  FileText,
  RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory =
  | 'auth'
  | 'volunteer'
  | 'event'
  | 'application'
  | 'message'
  | 'file'
  | 'hours'
  | 'badge'
  | 'settings'
  | 'import';

type ActionVerb =
  | 'login'
  | 'logout'
  | 'created'
  | 'updated'
  | 'deleted'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'uploaded'
  | 'exported'
  | 'imported'
  | 'issued'
  | 'revoked'
  | 'logged';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  user: string;
  userRole: 'admin' | 'leader' | 'system';
  category: ActionCategory;
  verb: ActionVerb;
  resource: string;
  detail: string;
  ip?: string;
}

interface AuditData {
  entries: AuditEntry[];
  users: string[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  auth:        { label: 'Auth',        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: Shield },
  volunteer:   { label: 'Volunteer',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: User },
  event:       { label: 'Event',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: Calendar },
  application: { label: 'Application', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: FileText },
  message:     { label: 'Message',     color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', icon: Mail },
  file:        { label: 'File',        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Folder },
  hours:       { label: 'Hours',       color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', icon: Clock },
  badge:       { label: 'Badge',       color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', icon: Award },
  settings:    { label: 'Settings',    color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300', icon: Settings },
  import:      { label: 'Import',      color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', icon: Upload },
};

const FALLBACK_CATEGORY = { label: 'Other', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', icon: Tag };

const VERB_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  login:    LogIn,
  logout:   LogOut,
  created:  Plus,
  updated:  Pencil,
  deleted:  Trash2,
  approved: Shield,
  rejected: Trash2,
  sent:     Mail,
  uploaded: Upload,
  exported: Download,
  imported: Upload,
  issued:   Award,
  revoked:  Trash2,
  logged:   Clock,
};

const VERB_COLOR: Record<string, string> = {
  login:    'text-success-600',
  logout:   'text-neutral-400',
  created:  'text-success-600',
  updated:  'text-primary-600',
  deleted:  'text-danger-600',
  approved: 'text-success-600',
  rejected: 'text-danger-600',
  sent:     'text-primary-600',
  uploaded: 'text-primary-600',
  exported: 'text-neutral-600',
  imported: 'text-primary-600',
  issued:   'text-success-600',
  revoked:  'text-danger-600',
  logged:   'text-teal-600',
};

const ALL_CATEGORIES: ActionCategory[] = [
  'auth', 'volunteer', 'event', 'application', 'message', 'file', 'hours', 'badge', 'settings', 'import',
];

const ALL_VERBS: ActionVerb[] = [
  'login', 'logout', 'created', 'updated', 'deleted', 'approved', 'rejected',
  'sent', 'uploaded', 'exported', 'imported', 'issued', 'revoked', 'logged',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVerb, setFilterVerb] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search)          params.set('search', search);
      if (filterUser)      params.set('userName', filterUser);
      if (filterCategory)  params.set('category', filterCategory);
      if (filterVerb)      params.set('verb', filterVerb);
      if (filterDateFrom)  params.set('dateFrom', filterDateFrom);
      if (filterDateTo)    params.set('dateTo', filterDateTo);

      const res = await api.get<AuditData>(`/audit?${params}`);
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
      setAllUsers(Array.isArray(res?.users) ? res.users : []);
      setTotal(res?.pagination?.total ?? 0);
      setPages(res?.pagination?.pages ?? 1);
    } catch {
      // leave existing entries shown
    } finally {
      setLoading(false);
    }
  }, [page, search, filterUser, filterCategory, filterVerb, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterUser, filterCategory, filterVerb, filterDateFrom, filterDateTo]);

  function exportCSV() {
    const headers = ['Timestamp', 'User', 'Role', 'Category', 'Action', 'Resource', 'Detail', 'IP'];
    const rows = entries.map(e => [
      formatFullTimestamp(e.timestamp),
      e.user,
      e.userRole,
      e.category,
      e.verb,
      e.resource,
      `"${e.detail.replace(/"/g, '""')}"`,
      e.ip || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeFilters = [filterUser, filterCategory, filterVerb, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <Layout>
      <Head><title>Audit Log — VolunteerFlow</title></Head>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Audit Log</h1>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              Complete history of all system actions by admins, leaders, and automated processes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudit}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by user, resource, or action..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                activeFilters > 0
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-1 border-t border-neutral-100 dark:border-neutral-700">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <User className="inline w-3 h-3 mr-1" />User
                </label>
                <select
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All users</option>
                  {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Tag className="inline w-3 h-3 mr-1" />Category
                </label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All categories</option>
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label ?? c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Filter className="inline w-3 h-3 mr-1" />Action
                </label>
                <select
                  value={filterVerb}
                  onChange={e => setFilterVerb(e.target.value)}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All actions</option>
                  {ALL_VERBS.map(v => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Calendar className="inline w-3 h-3 mr-1" />From
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Calendar className="inline w-3 h-3 mr-1" />To
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  min={filterDateFrom || undefined}
                  className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {activeFilters > 0 && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterUser(''); setFilterCategory(''); setFilterVerb(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                    className="text-sm text-danger-600 hover:text-danger-700 font-medium px-2 py-1.5"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {loading ? 'Loading…' : `Showing ${entries.length} of ${total} entries`}
        </div>

        {/* Log Table */}
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          {loading && entries.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" />
              <p className="text-sm">Loading audit log…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No log entries yet</p>
              <p className="text-xs mt-1 text-neutral-300">Actions will appear here as you use the system</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {entries.map(entry => {
                const catCfg = CATEGORY_CONFIG[entry.category] ?? FALLBACK_CATEGORY;
                const CatIcon = catCfg.icon;
                const VerbIcon = VERB_ICON[entry.verb] ?? Tag;
                const verbColor = VERB_COLOR[entry.verb] ?? 'text-neutral-600';
                const isExpanded = expandedId === entry.id;

                return (
                  <div key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                    <button
                      className="w-full text-left px-5 py-4"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Timestamp */}
                        <div className="w-20 shrink-0 text-right">
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>

                        {/* User */}
                        <div className="w-32 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              entry.userRole === 'system' ? 'bg-neutral-400' :
                              entry.userRole === 'leader' ? 'bg-warning-500' : 'bg-primary-500'
                            }`}>
                              {entry.user === 'System' ? 'S' : entry.user.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                              {entry.user}
                            </span>
                          </div>
                        </div>

                        {/* Category badge */}
                        <div className="w-28 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${catCfg.color}`}>
                            <CatIcon className="w-3 h-3" />
                            {catCfg.label}
                          </span>
                        </div>

                        {/* Verb */}
                        <div className="w-20 shrink-0 flex items-center gap-1">
                          <VerbIcon className={`w-3.5 h-3.5 ${verbColor}`} />
                          <span className={`text-xs font-semibold capitalize ${verbColor}`}>
                            {entry.verb}
                          </span>
                        </div>

                        {/* Resource + detail */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            {entry.resource}
                          </span>
                          {entry.detail && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2 truncate">
                              — {entry.detail}
                            </span>
                          )}
                        </div>

                        {/* Expand indicator */}
                        <div className="shrink-0">
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                            : <ChevronDown className="w-4 h-4 text-neutral-300" />
                          }
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <div className="px-5 pb-4 ml-24 border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-neutral-400 mb-0.5">Full timestamp</p>
                            <p className="font-medium text-neutral-700 dark:text-neutral-300">
                              {formatFullTimestamp(entry.timestamp)}
                            </p>
                          </div>
                          <div>
                            <p className="text-neutral-400 mb-0.5">User role</p>
                            <p className="font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                              {entry.userRole}
                            </p>
                          </div>
                          {entry.ip && (
                            <div>
                              <p className="text-neutral-400 mb-0.5">IP address</p>
                              <p className="font-mono font-medium text-neutral-700 dark:text-neutral-300">
                                {entry.ip}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-neutral-400 mb-0.5">Detail</p>
                            <p className="font-medium text-neutral-700 dark:text-neutral-300">
                              {entry.detail || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-500">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages || loading}
              className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
