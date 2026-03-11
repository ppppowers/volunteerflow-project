'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  MapPin,
  Trash2,
  Star,
  TrendingUp,
  Upload,
  Camera,
  Hash,
  Clock,
  Eye,
  ChevronRight,
  X
} from 'lucide-react';

// --- Types ---

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  createdDate: string;
}

interface EventParticipation {
  id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'completed' | 'ongoing';
  role: string;
  hoursContributed?: number;
}

/** Org-level checklist template item */
interface ChecklistTemplate {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

/** Org-level certification template */
interface CertificationTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string; // emoji
}

/** Per-volunteer certification entry */
interface CertificationEntry {
  templateId: string;
  granted: boolean;
  grantedAt?: string;
  expiresAt?: string;
  note?: string;
}

interface Volunteer {
  id: string;
  volunteerId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  eventsCompleted: number;
  hoursContributed: number;
  skills: string[];
  rating: number;
  avatar?: string;
  applicationId?: string;
  events: EventParticipation[];
  checklist?: ChecklistItem[];
  certifications?: CertificationEntry[];
}

// --- Org-Level Templates (customizable by the organization) ---

const defaultChecklistTemplates: ChecklistTemplate[] = [
  { id: 'ct_1', label: 'Application Submitted', description: 'Volunteer has submitted their application form', required: true },
  { id: 'ct_2', label: 'Background Check Passed', description: 'Background screening completed and cleared', required: true },
  { id: 'ct_3', label: 'Orientation Attended', description: 'Completed new volunteer orientation session', required: true },
  { id: 'ct_4', label: 'Handbook Acknowledged', description: 'Read and signed the volunteer handbook', required: false },
  { id: 'ct_5', label: 'Emergency Contact Provided', description: 'Emergency contact info on file', required: true },
  { id: 'ct_6', label: 'Photo ID Verified', description: 'Government-issued photo ID verified', required: false },
];

const defaultCertificationTemplates: CertificationTemplate[] = [
  { id: 'cert_1', name: 'Kennel Certified', description: 'Qualified to work in the kennel area with dogs', icon: '🐕' },
  { id: 'cert_2', name: 'Cat Room Certified', description: 'Qualified to handle and care for cats', icon: '🐈' },
  { id: 'cert_3', name: 'Dog Walking', description: 'Approved for off-site dog walking', icon: '🦮' },
  { id: 'cert_4', name: 'Medical / First Aid', description: 'First aid or medical training certified', icon: '🏥' },
  { id: 'cert_5', name: 'Event Coordinator', description: 'Qualified to lead volunteer events', icon: '📋' },
  { id: 'cert_6', name: 'Transport Approved', description: 'Approved for animal transport duties', icon: '🚗' },
  { id: 'cert_7', name: 'Intake Processing', description: 'Trained on new animal intake procedures', icon: '📝' },
];

// --- Mock Data ---

const mockVolunteers: Volunteer[] = [
  {
    id: '1',
    volunteerId: 'VOL-2024-001',
    name: 'Alice Williams',
    email: 'alice.w@email.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    joinDate: '2023-01-15',
    status: 'active',
    eventsCompleted: 24,
    hoursContributed: 156,
    skills: ['Community Outreach', 'Event Planning', 'Fundraising'],
    rating: 4.9,
    avatar: 'https://i.pravatar.cc/150?img=1',
    applicationId: 'APP-8821',
    events: [
      { id: 'e1', name: 'City Marathon Support', date: '2024-04-15', status: 'upcoming', role: 'Coordinator', hoursContributed: 0 },
      { id: 'e2', name: 'Winter Food Drive', date: '2023-12-10', status: 'completed', role: 'Distributor', hoursContributed: 8 },
      { id: 'e3', name: 'Park Cleanup Initiative', date: '2023-10-05', status: 'completed', role: 'Team Lead', hoursContributed: 6 },
      { id: 'e4', name: 'School Supply Drive', date: '2023-09-12', status: 'completed', role: 'Organizer', hoursContributed: 5 }
    ],
    checklist: [
      { id: 'c1', label: 'Background Check Completed', checked: true, createdDate: '2023-01-20' },
      { id: 'c2', label: 'Orientation Attended', checked: true, createdDate: '2023-01-22' },
      { id: 'c3', label: 'Safety Training', checked: false, createdDate: '2023-01-25' },
      { id: 'c4', label: 'Uniform Received', checked: true, createdDate: '2023-02-01' }
    ],
    certifications: [
      { templateId: 'cert_1', granted: true, grantedAt: '2023-03-10' },
      { templateId: 'cert_2', granted: true, grantedAt: '2023-04-05' },
      { templateId: 'cert_3', granted: true, grantedAt: '2023-03-15' },
      { templateId: 'cert_4', granted: false },
      { templateId: 'cert_5', granted: true, grantedAt: '2023-08-20' },
      { templateId: 'cert_6', granted: true, grantedAt: '2023-06-01' },
      { templateId: 'cert_7', granted: false },
    ]
  },
  {
    id: '2',
    volunteerId: 'VOL-2024-002',
    name: 'Bob Anderson',
    email: 'bob.a@email.com',
    phone: '+1 (555) 234-5678',
    location: 'Los Angeles, CA',
    joinDate: '2023-02-20',
    status: 'active',
    eventsCompleted: 21,
    hoursContributed: 142,
    skills: ['Healthcare', 'Senior Care', 'First Aid'],
    rating: 4.8,
    avatar: 'https://i.pravatar.cc/150?img=12',
    applicationId: 'APP-8845',
    events: [
      { id: 'e4', name: 'Blood Donation Camp', date: '2024-03-20', status: 'ongoing', role: 'Nurse Assistant', hoursContributed: 0 },
      { id: 'e5', name: 'Senior Home Visit', date: '2024-02-14', status: 'completed', role: 'Companion', hoursContributed: 4 },
      { id: 'e6', name: 'Health Awareness Drive', date: '2024-01-10', status: 'completed', role: 'Volunteer', hoursContributed: 6 }
    ],
    checklist: [
      { id: 'c5', label: 'Medical Clearance', checked: true, createdDate: '2023-02-22' },
      { id: 'c6', label: 'First Aid Certification', checked: true, createdDate: '2023-02-25' },
      { id: 'c7', label: 'CPR Training', checked: true, createdDate: '2023-03-01' }
    ],
    certifications: [
      { templateId: 'cert_1', granted: false },
      { templateId: 'cert_4', granted: true, grantedAt: '2023-03-10' },
      { templateId: 'cert_7', granted: true, grantedAt: '2023-04-01' },
    ]
  },
  {
    id: '3',
    volunteerId: 'VOL-2024-003',
    name: 'Carol Martinez',
    email: 'carol.m@email.com',
    phone: '+1 (555) 345-6789',
    location: 'Chicago, IL',
    joinDate: '2023-03-10',
    status: 'active',
    eventsCompleted: 18,
    hoursContributed: 128,
    skills: ['Education', 'Tutoring', 'Youth Mentorship'],
    rating: 4.7,
    avatar: 'https://i.pravatar.cc/150?img=5',
    events: [
      { id: 'e6', name: 'After School Program', date: '2024-01-15', status: 'completed', role: 'Tutor', hoursContributed: 10 },
      { id: 'e7', name: 'Summer Reading Camp', date: '2023-07-20', status: 'completed', role: 'Lead Teacher', hoursContributed: 20 }
    ],
    checklist: [
      { id: 'c8', label: 'Teaching Certificate Verified', checked: true, createdDate: '2023-03-12' },
      { id: 'c9', label: 'Child Safety Training', checked: true, createdDate: '2023-03-15' }
    ]
  },
  {
    id: '4',
    volunteerId: 'VOL-2024-004',
    name: 'Daniel Lee',
    email: 'daniel.l@email.com',
    phone: '+1 (555) 456-7890',
    location: 'Houston, TX',
    joinDate: '2023-04-05',
    status: 'active',
    eventsCompleted: 15,
    hoursContributed: 98,
    skills: ['Environmental', 'Conservation', 'Sustainability'],
    rating: 4.6,
    avatar: 'https://i.pravatar.cc/150?img=13',
    applicationId: 'APP-9012',
    events: [
      { id: 'e8', name: 'Tree Planting Drive', date: '2024-03-25', status: 'upcoming', role: 'Coordinator', hoursContributed: 0 },
      { id: 'e9', name: 'Beach Cleanup', date: '2024-02-05', status: 'completed', role: 'Volunteer', hoursContributed: 5 }
    ],
    checklist: [
      { id: 'c10', label: 'Environmental Safety Training', checked: true, createdDate: '2023-04-10' },
      { id: 'c11', label: 'Equipment Training', checked: false, createdDate: '2023-04-12' }
    ]
  },
  {
    id: '5',
    volunteerId: 'VOL-2024-005',
    name: 'Emma Thompson',
    email: 'emma.t@email.com',
    phone: '+1 (555) 567-8901',
    location: 'Phoenix, AZ',
    joinDate: '2023-05-12',
    status: 'inactive',
    eventsCompleted: 12,
    hoursContributed: 84,
    skills: ['Food Services', 'Kitchen Help', 'Distribution'],
    rating: 4.5,
    avatar: 'https://i.pravatar.cc/150?img=9',
    applicationId: 'APP-9134',
    events: [
      { id: 'e10', name: 'Community Kitchen', date: '2023-11-30', status: 'completed', role: 'Kitchen Staff', hoursContributed: 8 }
    ],
    checklist: [
      { id: 'c12', label: 'Food Handler Certification', checked: true, createdDate: '2023-05-15' },
      { id: 'c13', label: 'Kitchen Safety Training', checked: true, createdDate: '2023-05-18' }
    ]
  },
  {
    id: '6',
    volunteerId: 'VOL-2024-006',
    name: 'Frank Wilson',
    email: 'frank.w@email.com',
    phone: '+1 (555) 678-9012',
    location: 'Philadelphia, PA',
    joinDate: '2024-03-08',
    status: 'pending',
    eventsCompleted: 0,
    hoursContributed: 0,
    skills: ['Technology', 'IT Support', 'Digital Marketing'],
    rating: 0,
    applicationId: 'APP-9245',
    events: [],
    checklist: [
      { id: 'c14', label: 'Background Check', checked: false, createdDate: '2024-03-09' },
      { id: 'c15', label: 'Orientation Scheduled', checked: false, createdDate: '2024-03-09' }
    ]
  },
  {
    id: '7',
    volunteerId: 'VOL-2024-007',
    name: 'Grace Kim',
    email: 'grace.k@email.com',
    phone: '+1 (555) 789-0123',
    location: 'San Antonio, TX',
    joinDate: '2023-07-22',
    status: 'active',
    eventsCompleted: 9,
    hoursContributed: 67,
    skills: ['Arts & Crafts', 'Creative Activities', 'Children Programs'],
    rating: 4.4,
    avatar: 'https://i.pravatar.cc/150?img=20',
    events: [
      { id: 'e11', name: 'Kids Art Workshop', date: '2024-02-28', status: 'completed', role: 'Instructor', hoursContributed: 6 }
    ],
    checklist: [
      { id: 'c16', label: 'Child Working with Children Check', checked: true, createdDate: '2023-07-25' },
      { id: 'c17', label: 'Art Supplies Training', checked: true, createdDate: '2023-07-28' }
    ]
  },
  {
    id: '8',
    volunteerId: 'VOL-2024-008',
    name: 'Henry Davis',
    email: 'henry.d@email.com',
    phone: '+1 (555) 890-1234',
    location: 'San Diego, CA',
    joinDate: '2023-08-30',
    status: 'active',
    eventsCompleted: 7,
    hoursContributed: 52,
    skills: ['Construction', 'Home Repair', 'Manual Labor'],
    rating: 4.3,
    avatar: 'https://i.pravatar.cc/150?img=15',
    applicationId: 'APP-9356',
    events: [
      { id: 'e12', name: 'Habitat for Humanity', date: '2024-01-20', status: 'completed', role: 'Builder', hoursContributed: 12 }
    ],
    checklist: [
      { id: 'c18', label: 'Safety Equipment Issued', checked: true, createdDate: '2023-09-01' },
      { id: 'c19', label: 'Construction Safety Training', checked: true, createdDate: '2023-09-05' },
      { id: 'c20', label: 'Tool Operation Certification', checked: false, createdDate: '2023-09-08' }
    ]
  }
];

// Export for use in detail page
export { mockVolunteers, defaultChecklistTemplates, defaultCertificationTemplates };
export type { Volunteer, EventParticipation, ChecklistItem, ChecklistTemplate, CertificationTemplate, CertificationEntry };

export default function Volunteers() {
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<Volunteer[]>(mockVolunteers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    avatar: ''
  });

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const statusConfig = {
    active: { 
      bg: 'bg-success-100 dark:bg-success-900/30', 
      text: 'text-success-700 dark:text-success-400', 
      label: 'Active' 
    },
    inactive: { 
      bg: 'bg-neutral-100 dark:bg-neutral-700', 
      text: 'text-neutral-700 dark:text-neutral-300', 
      label: 'Inactive' 
    },
    pending: { 
      bg: 'bg-warning-100 dark:bg-warning-900/30', 
      text: 'text-warning-700 dark:text-warning-400', 
      label: 'Pending' 
    }
  };

  // Filter volunteers
  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = 
      volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.volunteerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: volunteers.length,
    active: volunteers.filter(v => v.status === 'active').length,
    pending: volunteers.filter(v => v.status === 'pending').length,
    totalHours: volunteers.reduce((sum, v) => sum + v.hoursContributed, 0)
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setFormData({ ...formData, avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle add volunteer
  const handleAddVolunteer = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      skills: '',
      status: 'active',
      avatar: ''
    });
    setAvatarPreview('');
    setShowModal(true);
  };

  // Handle delete volunteer
  const handleDeleteVolunteer = (id: string) => {
    if (confirm('Are you sure you want to delete this volunteer?')) {
      setVolunteers(prev => prev.filter(v => v.id !== id));
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newId = `VOL-${new Date().getFullYear()}-${String(volunteers.length + 1).padStart(3, '0')}`;
    const newVolunteer: Volunteer = {
      id: Date.now().toString(),
      volunteerId: newId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      joinDate: new Date().toISOString().split('T')[0],
      status: formData.status,
      eventsCompleted: 0,
      hoursContributed: 0,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      rating: 0,
      avatar: formData.avatar,
      events: [],
      checklist: []
    };
    setVolunteers(prev => [newVolunteer, ...prev]);
    setShowModal(false);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Volunteers</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Manage your volunteer community
            </p>
          </div>
          <Button onClick={handleAddVolunteer}>
            <Plus className="w-4 h-4 mr-2" />
            Add Volunteer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Volunteers</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                  {stats.total}
                </p>
              </div>
              <Users className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex items-center mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400 mr-1" />
              <span className="text-success-600 dark:text-success-400 font-medium">+12%</span>
              <span className="text-neutral-500 dark:text-neutral-400 ml-1">vs last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Active</p>
                <p className="text-3xl font-bold text-success-600 dark:text-success-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-success-600 dark:text-success-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Pending</p>
                <p className="text-3xl font-bold text-warning-600 dark:text-warning-400 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning-600 dark:text-warning-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Hours</p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                  {stats.totalHours.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                placeholder="Search by ID, name, email, location, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Volunteers Grid */}
        {filteredVolunteers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-neutral-400 dark:text-neutral-600 mx-auto mb-4" />
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-2">No volunteers found</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
              Try adjusting your search or filters
            </p>
            <Button onClick={handleAddVolunteer}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Volunteer
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVolunteers.map((volunteer) => (
              <Card key={volunteer.id} className="p-6 hover:shadow-lg transition-shadow group">
                
                {/* Header: ID & Delete */}
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                    <Hash className="w-3 h-3 mr-1" />
                    {volunteer.volunteerId}
                  </span>
                  <button
                    onClick={() => handleDeleteVolunteer(volunteer.id)}
                    className="p-1.5 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete volunteer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile */}
                <div className="flex flex-col items-center text-center mb-4">
                  {volunteer.avatar ? (
                    <img
                      src={volunteer.avatar}
                      alt={volunteer.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary-200 dark:border-primary-800 mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md mb-3">
                      {getInitials(volunteer.name)}
                    </div>
                  )}
                  
                  <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 mb-1">
                    {volunteer.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[volunteer.status].bg} ${statusConfig[volunteer.status].text}`}>
                      {statusConfig[volunteer.status].label}
                    </span>
                    {volunteer.rating > 0 && (
                      <div className="flex items-center text-xs text-warning-600 dark:text-warning-400">
                        <Star className="w-3 h-3 fill-current mr-0.5" />
                        <span className="font-medium">{volunteer.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Info */}
                <div className="space-y-2 mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center justify-center">
                    <Mail className="w-3 h-3 mr-1.5 opacity-70" />
                    <span className="truncate text-xs">{volunteer.email}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <MapPin className="w-3 h-3 mr-1.5 opacity-70" />
                    <span className="text-xs">{volunteer.location}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                      {volunteer.eventsCompleted}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Events</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {volunteer.hoursContributed}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Hours</p>
                  </div>
                </div>

                {/* View Details Button */}
                <Link href={`/volunteers/${volunteer.id}`}>
                  <Button className="w-full" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Profile
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>

              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div 
            className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Add New Volunteer
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 dark:from-primary-600 dark:to-primary-800 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                        {formData.name ? getInitials(formData.name) : <Camera className="w-10 h-10" />}
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                      <Upload className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3">
                    Upload profile picture
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                      placeholder="john@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                      placeholder="New York, NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
                      placeholder="Community Outreach, Event Planning"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Volunteer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}