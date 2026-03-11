import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
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
  Activity,
  MapPin,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Mock data
const monthlyVolunteersData = [
  { month: 'Jan', volunteers: 145 },
  { month: 'Feb', volunteers: 178 },
  { month: 'Mar', volunteers: 210 },
  { month: 'Apr', volunteers: 198 },
  { month: 'May', volunteers: 234 },
  { month: 'Jun', volunteers: 267 },
];

const applicationStatusData = [
  { name: 'Approved', value: 345, color: '#22c55e' },
  { name: 'Pending', value: 123, color: '#f59e0b' },
  { name: 'Rejected', value: 45, color: '#ef4444' },
];

const eventCategoriesData = [
  { category: 'Community', count: 45 },
  { category: 'Education', count: 32 },
  { category: 'Healthcare', count: 28 },
  { category: 'Environment', count: 24 },
  { category: 'Senior Care', count: 18 },
];

const upcomingEvents = [
  { id: '1', title: 'Community Clean-up Drive', date: '2024-03-20', location: 'Central Park', volunteers: 24, capacity: 30 },
  { id: '2', title: 'Food Bank Support', date: '2024-03-18', location: 'Downtown Center', volunteers: 15, capacity: 20 },
  { id: '3', title: 'Youth Mentorship Program', date: '2024-03-25', location: 'Community Hall', volunteers: 12, capacity: 15 },
];

const recentApplications = [
  { id: '1', volunteer: 'Sarah Johnson', event: 'Community Clean-up Drive', date: '2024-03-10', status: 'pending' },
  { id: '2', volunteer: 'Michael Chen', event: 'Food Bank Support', date: '2024-03-08', status: 'approved' },
  { id: '3', volunteer: 'Emily Davis', event: 'Youth Mentorship Program', date: '2024-03-09', status: 'approved' },
  { id: '4', volunteer: 'David Martinez', event: 'Senior Care Assistance', date: '2024-03-11', status: 'pending' },
];

const topVolunteers = [
  { name: 'Alice Williams', events: 24, hours: 156, badge: 'Gold' },
  { name: 'Bob Anderson', events: 21, hours: 142, badge: 'Gold' },
  { name: 'Carol Martinez', events: 18, hours: 128, badge: 'Silver' },
  { name: 'Daniel Lee', events: 15, hours: 98, badge: 'Silver' },
  { name: 'Emma Thompson', events: 12, hours: 84, badge: 'Bronze' },
];

export default function Dashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const isAuthed = localStorage.getItem('vf_authed');
    if (!isAuthed) {
      router.replace('/auth');
    } else {
      setAuthed(true);
    }
  }, [router]);

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Gold': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'Silver': return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
      case 'Bronze': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      default: return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', icon: Clock };
      case 'approved': return { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', icon: CheckCircle };
      case 'rejected': return { bg: 'bg-danger-100 dark:bg-danger-900/30', text: 'text-danger-700 dark:text-danger-400', icon: XCircle };
      default: return { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300', icon: AlertCircle };
    }
  };

  const stats = [
    { title: 'Total Volunteers', value: '1,234', change: '+12%', trend: 'up', icon: Users, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600 dark:text-primary-400', changeColor: 'text-success-600 dark:text-success-400' },
    { title: 'Active Events', value: '48', change: '+8%', trend: 'up', icon: Calendar, bgColor: 'bg-success-100 dark:bg-success-900/30', iconColor: 'text-success-600 dark:text-success-400', changeColor: 'text-success-600 dark:text-success-400' },
    { title: 'Pending Applications', value: '123', change: '-5%', trend: 'down', icon: FileText, bgColor: 'bg-warning-100 dark:bg-warning-900/30', iconColor: 'text-warning-600 dark:text-warning-400', changeColor: 'text-danger-600 dark:text-danger-400' },
    { title: 'Total Hours', value: '8,456', change: '+18%', trend: 'up', icon: Clock, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600 dark:text-primary-400', changeColor: 'text-success-600 dark:text-success-400' },
  ];

  // Don't render anything until auth check is complete — avoids flash of dashboard
  if (!authed) return null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <Button>
              <Activity className="w-4 h-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{stat.title}</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <TrendIcon className={`w-4 h-4 ${stat.changeColor} mr-1`} />
                  <span className={`${stat.changeColor} font-medium`}>{stat.change}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-1">vs last month</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Volunteer Growth</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Monthly volunteer registration trends</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyVolunteersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" stroke="#737373" style={{ fontSize: '12px' }} />
                <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px' }} />
                <Line type="monotone" dataKey="volunteers" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Application Status</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Current application distribution</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={applicationStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                  {applicationStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {applicationStatusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Event Categories */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Events by Category</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Distribution of events across different categories</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventCategoriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="category" stroke="#737373" style={{ fontSize: '12px' }} />
              <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Upcoming Events</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center text-neutral-600 dark:text-neutral-400">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.location}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-neutral-600 dark:text-neutral-400">{event.volunteers}/{event.capacity} volunteers</span>
                      <div className="w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                        <div className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full" style={{ width: `${(event.volunteers / event.capacity) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Applications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Recent Applications</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {recentApplications.map((application) => {
                const statusStyle = getStatusStyles(application.status);
                const StatusIcon = statusStyle.icon;
                return (
                  <div key={application.id} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{application.volunteer}</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{application.event}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {application.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(application.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Volunteers */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Top Volunteers</h2>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {topVolunteers.map((volunteer, index) => (
                <div key={index} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center font-bold text-primary-600 dark:text-primary-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{volunteer.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(volunteer.badge)}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {volunteer.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        <span>{volunteer.events} events</span>
                        <span>•</span>
                        <span>{volunteer.hours} hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
