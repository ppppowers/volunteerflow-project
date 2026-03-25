'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import {
  Search,
  Users,
  Clock,
  Calendar,
  Star,
  ChevronRight,
} from 'lucide-react';
import { mockVolunteers } from '../../pages/volunteers';

// ─── Shared helpers ────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-18');

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

// ─── VolunteersTab ─────────────────────────────────────────────────────────────

export function VolunteersTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockVolunteers.filter((v) => {
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.skills.some((s) => s.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const statusBadge = (status: 'active' | 'inactive' | 'pending') => {
    if (status === 'active')
      return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
    if (status === 'inactive')
      return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400';
    return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
  };

  return (
    <div className="space-y-4">
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
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No volunteers match your search.</p>
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

              {/* View profile link */}
              <div className="pt-1 border-t border-neutral-100 dark:border-neutral-700">
                <Link
                  href={`/volunteers/${v.id}`}
                  className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  View Profile
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
