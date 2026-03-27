import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  UserPlus,
  CalendarPlus,
  ShieldCheck,
  MessageSquare,
  QrCode,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiStats {
  totalVolunteers: number;
  activeVolunteers: number;
  totalHours: number;
  totalEvents: number;
  upcomingEvents: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  eventsByCategory: { category: string; count: number }[];
}

interface DashEvent {
  id: string;
  title: string;
  startDate: string;
  location: string;
  participantCount: number;
  spotsAvailable: number;
}

interface DashApplication {
  id: string;
  volunteer?: { firstName: string; lastName: string };
  volunteerId: string;
  event?: { title: string };
  eventId: string;
  status: string;
  createdAt: string;
}

interface DashVolunteer {
  id: string;
  firstName: string;
  lastName: string;
  hoursContributed: number;
  status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (n: number) => n.toLocaleString();

function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':  return { bg: 'bg-warning-100 dark:bg-warning-900/30',  text: 'text-warning-700 dark:text-warning-400',  icon: Clock };
    case 'approved': return { bg: 'bg-success-100 dark:bg-success-900/30',  text: 'text-success-700 dark:text-success-400',  icon: CheckCircle };
    case 'rejected': return { bg: 'bg-danger-100 dark:bg-danger-900/30',    text: 'text-danger-700 dark:text-danger-400',    icon: XCircle };
    default:         return { bg: 'bg-neutral-100 dark:bg-neutral-700',      text: 'text-neutral-700 dark:text-neutral-300', icon: AlertCircle };
  }
}

function SkeletonBlock({ h = 'h-20' }: { h?: string }) {
  return <div className={`${h} bg-neutral-100 dark:bg-neutral-700 rounded-xl animate-pulse`} />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Add Volunteer',        href: '/people',       icon: UserPlus,      color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' },
  { label: 'Create Event',         href: '/events',       icon: CalendarPlus,  color: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400' },
  { label: 'Review Applications',  href: '/applications', icon: FileText,      color: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400' },
  { label: 'Vetting Queue',        href: '/vetting',      icon: ShieldCheck,   color: 'bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400' },
  { label: 'Send Message',         href: '/messages',     icon: MessageSquare, color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' },
  { label: 'Generate QR Code',     href: '/qr',           icon: QrCode,        color: 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300' },
];

export default function Dashboard() {
  const [stats, setStats]               = useState<ApiStats | null>(null);
  const [events, setEvents]             = useState<DashEvent[]>([]);
  const [applications, setApplications] = useState<DashApplication[]>([]);
  const [volunteers, setVolunteers]     = useState<DashVolunteer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [userName, setUserName]         = useState('');

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('vf_user');
      if (stored) {
        const parsed = JSON.parse(stored) as { name?: string };
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<ApiStats>('/dashboard/stats').catch(() => null),
      api.get<DashEvent[]>('/events?status=PUBLISHED&limit=3').catch(() => []),
      api.get<DashApplication[]>('/applications?limit=4').catch(() => []),
      api.get<DashVolunteer[]>('/volunteers?limit=10').catch(() => []),
    ]).then(([statsData, eventsData, appsData, volsData]) => {
      if (cancelled) return;
      if (statsData) setStats(statsData);
      setEvents(eventsData ?? []);
      setApplications(appsData ?? []);
      const sorted = [...(volsData ?? [])].sort((a, b) => b.hoursContributed - a.hoursContributed).slice(0, 5);
      setVolunteers(sorted);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const statCards = [
    {
      title: 'Total Volunteers',
      value: loading ? '…' : fmtNum(stats?.totalVolunteers ?? 0),
      sub: stats ? `${fmtNum(stats.activeVolunteers)} active` : '…',
      trend: 'up',
      icon: Users,
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      subColor: 'text-success-600 dark:text-success-400',
    },
    {
      title: 'Active Events',
      value: loading ? '…' : fmtNum(stats?.upcomingEvents ?? 0),
      sub: stats ? `${fmtNum(stats.totalEvents)} total` : '…',
      trend: 'up',
      icon: Calendar,
      bgColor: 'bg-success-100 dark:bg-success-900/30',
      iconColor: 'text-success-600 dark:text-success-400',
      subColor: 'text-success-600 dark:text-success-400',
    },
    {
      title: 'Pending Applications',
      value: loading ? '…' : fmtNum(stats?.pendingApplications ?? 0),
      sub: stats ? `${fmtNum(stats.totalApplications)} total` : '…',
      trend: 'down',
      icon: FileText,
      bgColor: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-600 dark:text-warning-400',
      subColor: 'text-danger-600 dark:text-danger-400',
    },
    {
      title: 'Total Hours',
      value: loading ? '…' : fmtNum(stats?.totalHours ?? 0),
      sub: stats ? `${fmtNum(stats.approvedApplications)} approved apps` : '…',
      trend: 'up',
      icon: Clock,
      bgColor: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      subColor: 'text-success-600 dark:text-success-400',
    },
  ];

  const applicationPieData = stats
    ? [
        { name: 'Approved', value: stats.approvedApplications, color: '#22c55e' },
        { name: 'Pending',  value: stats.pendingApplications,  color: '#f59e0b' },
        { name: 'Rejected', value: Math.max(0, stats.totalApplications - stats.approvedApplications - stats.pendingApplications), color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  const categoryData = stats?.eventsByCategory ?? [];

  return (
    <Layout>
      <Head>
        <title>Dashboard — VolunteerFlow</title>
        <meta name="description" content="VolunteerFlow management dashboard" />
      </Head>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Welcome back{userName ? `, ${userName}` : ''}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <Card key={index} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 ${stat.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  {!loading && (
                    <TrendIcon className={`w-4 h-4 ${stat.subColor} mt-1`} />
                  )}
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{stat.value}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{stat.title}</p>
                <p className={`text-xs font-medium mt-1 ${loading ? 'text-neutral-400' : stat.subColor}`}>{stat.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Application Status Pie */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Application Status</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Current application distribution</p>
            </div>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-neutral-100 dark:bg-neutral-700 animate-pulse" />
              </div>
            ) : applicationPieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-sm">
                No applications yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={applicationPieData}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {applicationPieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {applicationPieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Events by Category */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Events by Category</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Distribution across categories</p>
            </div>
            {loading ? (
              <div className="h-[300px] flex items-end gap-3 pb-4 px-2">
                {[60, 90, 45, 75, 55].map((h, i) => (
                  <div key={i} className="flex-1 bg-neutral-100 dark:bg-neutral-700 rounded animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : categoryData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-sm">
                No events yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="category" stroke="#737373" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Upcoming Events */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Upcoming Events</h2>
              <Link href="/events" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock /> <SkeletonBlock /> <SkeletonBlock />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2 truncate">{event.title}</h3>
                    <div className="space-y-1.5 text-sm">
                      {event.startDate && (
                        <div className="flex items-center text-neutral-500 dark:text-neutral-400 gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-neutral-500 dark:text-neutral-400 gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs">{event.participantCount}/{event.spotsAvailable} spots</span>
                        <div className="w-20 bg-neutral-200 dark:bg-neutral-600 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (event.participantCount / Math.max(1, event.spotsAvailable)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Applications */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Recent Applications</h2>
              <Link href="/applications" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock h="h-16" /> <SkeletonBlock h="h-16" /> <SkeletonBlock h="h-16" /> <SkeletonBlock h="h-16" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const statusStyle = getStatusStyles(app.status);
                  const StatusIcon = statusStyle.icon;
                  const name = app.volunteer
                    ? `${app.volunteer.firstName} ${app.volunteer.lastName}`.trim()
                    : app.volunteerId;
                  const eventName = app.event?.title ?? app.eventId;
                  return (
                    <div key={app.id} className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate text-sm">{name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{eventName}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Top Volunteers by Hours */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Top Volunteers</h2>
              <Link href="/people" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                <SkeletonBlock h="h-14" /> <SkeletonBlock h="h-14" /> <SkeletonBlock h="h-14" />
                <SkeletonBlock h="h-14" /> <SkeletonBlock h="h-14" />
              </div>
            ) : volunteers.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-8 text-center">No volunteers yet</p>
            ) : (
              <div className="space-y-2">
                {volunteers.map((v, index) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{v.firstName} {v.lastName}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{fmtNum(v.hoursContributed)} hrs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </Layout>
  );
}
