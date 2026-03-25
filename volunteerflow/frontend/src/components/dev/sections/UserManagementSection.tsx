'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search, ChevronDown, ChevronRight, Building2,
  Ban, CheckCircle, Shield, LogOut, Users,
  Crown, AlertTriangle, MoreHorizontal,
} from 'lucide-react';
import {
  getBusinesses, saveBusinesses, addLog,
  type Business, type BusinessUser, type BusinessStatus,
  type BusinessPlan, type UserRole, type UserStatus,
} from '@/lib/devPortal';

// ─── Badges ───────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<BusinessPlan, string> = {
  discover:   'bg-zinc-700 text-zinc-300',
  grow:       'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  enterprise: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
};

const BIZ_STATUS_BADGE: Record<BusinessStatus, string> = {
  active:    'bg-emerald-500/15 text-emerald-400',
  suspended: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

const USER_ROLE_BADGE: Record<UserRole, string> = {
  owner: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  admin: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  staff: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  user:  'bg-zinc-700 text-zinc-400',
};

const USER_STATUS_BADGE: Record<UserStatus, string> = {
  active:    'bg-emerald-500/15 text-emerald-400',
  banned:    'bg-red-500/15 text-red-400',
  suspended: 'bg-amber-500/15 text-amber-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── User row (inside an expanded business) ───────────────────────────────────

function UserRow({
  user, onUpdate,
}: {
  user: BusinessUser;
  onUpdate: (patch: Partial<BusinessUser>) => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roles: UserRole[] = ['owner', 'admin', 'staff', 'user'];

  function toggleBan() {
    onUpdate({ status: user.status === 'banned' ? 'active' : 'banned' });
  }
  function toggleSuspend() {
    onUpdate({ status: user.status === 'suspended' ? 'active' : 'suspended' });
  }
  function forceLogout() {
    addLog('warn', 'dev_portal', `Force logout: ${user.name}`, user.email);
    toast.success(`Force logout logged for ${user.name}.`);
  }

  return (
    <tr className="border-t border-zinc-700/30 hover:bg-zinc-700/10 transition-colors">
      <td className="pl-12 pr-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200 leading-none">{user.name}</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {/* Role picker */}
        <div className="relative inline-block">
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${USER_ROLE_BADGE[user.role]}`}
          >
            {user.role} <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {roleOpen && (
            <div className="absolute left-0 top-6 z-30 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[90px]">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => { onUpdate({ role: r }); setRoleOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors capitalize"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${USER_STATUS_BADGE[user.status]}`}>
          {user.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-[11px] text-zinc-500">{timeAgo(user.lastLogin)}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleSuspend}
            title={user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
            className="p-1.5 rounded text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleBan}
            title={user.status === 'banned' ? 'Unban' : 'Ban'}
            className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            {user.status === 'banned'
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <Ban className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={forceLogout}
            title="Force logout"
            className="p-1.5 rounded text-zinc-600 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Business row ─────────────────────────────────────────────────────────────

function BusinessRow({
  biz, onUpdate,
}: {
  biz: Business;
  onUpdate: (patch: Partial<Business>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);

  function updateUser(userId: string, patch: Partial<BusinessUser>) {
    const users = biz.users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    onUpdate({ users });
    const user = users.find((u) => u.id === userId);
    if (user) addLog('info', 'dev_portal', `User updated in ${biz.name}: ${user.name}`, user.email);
  }

  function suspendBiz() {
    const next: BusinessStatus = biz.status === 'suspended' ? 'active' : 'suspended';
    onUpdate({ status: next });
    addLog(next === 'suspended' ? 'warn' : 'success', 'dev_portal',
      `Business ${next === 'suspended' ? 'suspended' : 'reactivated'}: ${biz.name}`, biz.ownerEmail);
    setActionsOpen(false);
  }

  function cancelBiz() {
    if (!pendingCancel) { setPendingCancel(true); return; }
    onUpdate({ status: 'cancelled' });
    addLog('error', 'dev_portal', `Business account cancelled: ${biz.name}`, biz.ownerEmail);
    setPendingCancel(false);
    setActionsOpen(false);
  }

  const activeUsers = biz.users.filter((u) => u.status === 'active').length;

  return (
    <>
      {/* Business header row */}
      <tr
        className={`cursor-pointer transition-colors ${
          expanded ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/40'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            {expanded
              ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
            <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{biz.name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{biz.ownerEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${PLAN_BADGE[biz.plan]}`}>
            {biz.plan}
          </span>
        </td>
        <td className="px-4 py-4">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${BIZ_STATUS_BADGE[biz.status]}`}>
            {biz.status}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5 text-zinc-600" />
            <span>{activeUsers}/{biz.users.length} active</span>
          </div>
        </td>
        <td className="px-4 py-4 text-xs text-zinc-500">{formatDate(biz.createdAt)}</td>
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {actionsOpen && (
              <div className="absolute right-0 top-8 z-30 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1.5 min-w-[150px]">
                <button
                  onClick={suspendBiz}
                  className="w-full text-left px-4 py-2 text-xs text-amber-400 hover:bg-zinc-800 transition-colors"
                >
                  {biz.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
                </button>
                {pendingCancel ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <button
                      onClick={cancelBiz}
                      className="text-xs text-red-400 font-semibold hover:text-red-300 transition-colors"
                    >
                      Confirm cancel
                    </button>
                    <button
                      onClick={() => setPendingCancel(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={cancelBiz}
                    className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel account
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded users sub-table */}
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0 bg-zinc-800/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-zinc-700/50 bg-zinc-900/40">
                  <th className="pl-12 pr-4 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">User</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {biz.users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onUpdate={(patch) => updateUser(user.id, patch)}
                  />
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function UserManagementSection() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<BusinessPlan | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | 'all'>('all');

  useEffect(() => { setBusinesses(getBusinesses()); }, []);

  function updateBusiness(id: string, patch: Partial<Business>) {
    const next = businesses.map((b) => (b.id === id ? { ...b, ...patch } : b));
    setBusinesses(next);
    saveBusinesses(next);
  }

  const filtered = businesses.filter((b) => {
    const q = query.toLowerCase();
    const matchQ = !q || b.name.toLowerCase().includes(q) || b.ownerEmail.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q);
    const matchP = planFilter === 'all' || b.plan === planFilter;
    const matchS = statusFilter === 'all' || b.status === statusFilter;
    return matchQ && matchP && matchS;
  });

  const totalUsers = businesses.reduce((sum, b) => sum + b.users.length, 0);
  const activeOrgs = businesses.filter((b) => b.status === 'active').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">User Management</h2>
        <p className="text-sm text-zinc-500 mt-1">
          {businesses.length} organizations · {activeOrgs} active · {totalUsers} total users
        </p>
      </div>

      {/* Plan summary pills */}
      <div className="flex flex-wrap gap-2">
        {(['discover', 'grow', 'enterprise'] as BusinessPlan[]).map((plan) => {
          const count = businesses.filter((b) => b.plan === plan).length;
          return (
            <div key={plan} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${PLAN_BADGE[plan]}`}>
              {plan === 'enterprise' && <Crown className="w-3 h-3" />}
              {count} {plan}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by org name, owner, or email…"
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none placeholder-zinc-600"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as BusinessPlan | 'all')}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="all">All plans</option>
          <option value="discover">Discover</option>
          <option value="grow">Grow</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BusinessStatus | 'all')}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Suspended org warning */}
      {businesses.some((b) => b.status === 'suspended') && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {businesses.filter((b) => b.status === 'suspended').length} organization(s) suspended — click their row to expand and manage users.
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-900/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Users</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600">No organizations match your filters.</td>
                </tr>
              ) : (
                filtered.map((biz) => (
                  <BusinessRow
                    key={biz.id}
                    biz={biz}
                    onUpdate={(patch) => updateBusiness(biz.id, patch)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-zinc-600">Click any row to expand and manage that organization's users.</p>
    </div>
  );
}
