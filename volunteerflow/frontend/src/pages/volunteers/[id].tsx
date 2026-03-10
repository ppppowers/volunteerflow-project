'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Upload,
  Camera,
  Hash,
  Clock,
  History,
  FileText,
  ExternalLink,
  TrendingUp,
  Award,
  Target,
  Users,
  Briefcase,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { mockVolunteers, type Volunteer, type EventParticipation } from '../volunteers';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  createdDate: string;
}

export default function VolunteerDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState('');
  
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
    if (id) {
      const found = mockVolunteers.find(v => v.id === id);
      if (found) {
        // Initialize checklist if it doesn't exist
        const volunteerWithChecklist = {
          ...found,
          checklist: found.checklist || []
        };
        setVolunteer(volunteerWithChecklist);
        setFormData({
          name: found.name,
          email: found.email,
          phone: found.phone,
          location: found.location,
          skills: found.skills.join(', '),
          status: found.status,
          avatar: found.avatar || ''
        });
        setAvatarPreview(found.avatar || '');
      }
    }
  }, [id]);

  if (!volunteer) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-600 dark:text-neutral-400">Loading volunteer details...</p>
        </div>
      </Layout>
    );
  }

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

  const eventStatusConfig = {
    upcoming: { bg: 'bg-primary-500', text: 'text-primary-700 dark:text-primary-300', label: 'Upcoming' },
    ongoing: { bg: 'bg-warning-500', text: 'text-warning-700 dark:text-warning-300', label: 'Ongoing' },
    completed: { bg: 'bg-success-500', text: 'text-success-700 dark:text-success-300', label: 'Completed' }
  };

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

  const handleSave = () => {
    setVolunteer({
      ...volunteer,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      status: formData.status,
      avatar: formData.avatar || volunteer.avatar
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: volunteer.name,
      email: volunteer.email,
      phone: volunteer.phone,
      location: volunteer.location,
      skills: volunteer.skills.join(', '),
      status: volunteer.status,
      avatar: volunteer.avatar || ''
    });
    setAvatarPreview(volunteer.avatar || '');
    setIsEditing(false);
  };

  // Checklist Functions
  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      label: newChecklistItem.trim(),
      checked: false,
      createdDate: new Date().toISOString()
    };

    setVolunteer({
      ...volunteer,
      checklist: [...(volunteer.checklist || []), newItem]
    });

    setNewChecklistItem('');
    setShowChecklistInput(false);
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setVolunteer({
      ...volunteer,
      checklist: (volunteer.checklist || []).map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this checklist item?')) {
      setVolunteer({
        ...volunteer,
        checklist: (volunteer.checklist || []).filter(item => item.id !== itemId)
      });
    }
  };

  const handleStartEditChecklistItem = (item: ChecklistItem) => {
    setEditingChecklistId(item.id);
    setEditingChecklistLabel(item.label);
  };

  const handleSaveChecklistItem = () => {
    if (!editingChecklistLabel.trim()) return;

    setVolunteer({
      ...volunteer,
      checklist: (volunteer.checklist || []).map(item =>
        item.id === editingChecklistId ? { ...item, label: editingChecklistLabel.trim() } : item
      )
    });

    setEditingChecklistId(null);
    setEditingChecklistLabel('');
  };

  const handleCancelEditChecklistItem = () => {
    setEditingChecklistId(null);
    setEditingChecklistLabel('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateTimeInService = () => {
    const joinDate = new Date(volunteer.joinDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  const upcomingEvents = volunteer.events.filter(e => e.status === 'upcoming');
  const completedEvents = volunteer.events.filter(e => e.status === 'completed');
  const ongoingEvents = volunteer.events.filter(e => e.status === 'ongoing');

  const checklistStats = {
    total: volunteer.checklist?.length || 0,
    completed: volunteer.checklist?.filter(item => item.checked).length || 0
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/volunteers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Volunteers
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {isEditing ? 'Edit Volunteer' : 'Volunteer Profile'}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-2">
                <Hash className="w-3 h-3" />
                {volunteer.volunteerId}
              </p>
            </div>
          </div>
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                
                {/* Avatar */}
                <div className="relative mb-4">
                  {(isEditing ? avatarPreview : volunteer.avatar) ? (
                    <img
                      src={isEditing ? avatarPreview : volunteer.avatar}
                      alt={volunteer.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                      {getInitials(volunteer.name)}
                    </div>
                  )}
                  
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                      <Upload className="w-5 h-5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Name & Status */}
                {isEditing ? (
                  <div className="w-full space-y-3 mb-4">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 text-center text-lg font-bold border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                      {volunteer.name}
                    </h2>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig[volunteer.status].bg} ${statusConfig[volunteer.status].text}`}>
                      {statusConfig[volunteer.status].label}
                    </span>
                  </>
                )}

                {/* Rating */}
                {volunteer.rating > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 w-full">
                    <Star className="w-5 h-5 fill-warning-400 text-warning-400" />
                    <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {volunteer.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">/ 5.0</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Contact Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1 text-neutral-900 dark:text-neutral-100">
                      <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <a href={`mailto:${volunteer.email}`} className="hover:text-primary-600 dark:hover:text-primary-400 truncate">
                        {volunteer.email}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1 text-neutral-900 dark:text-neutral-100">
                      <Phone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <a href={`tel:${volunteer.phone}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                        {volunteer.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1 text-neutral-900 dark:text-neutral-100">
                      <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      {volunteer.location}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Key Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Key Statistics
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Joined</span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {new Date(volunteer.joinDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-success-600 dark:text-success-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Time in Service</span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 text-right">
                    {calculateTimeInService()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Events</span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {volunteer.eventsCompleted}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-info-50 dark:bg-info-900/20 rounded-lg border border-info-200 dark:border-info-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-info-600 dark:text-info-400" />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Hours</span>
                  </div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {volunteer.hoursContributed}
                  </span>
                </div>
              </div>
            </Card>

            {/* Skills */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Skills & Expertise
              </h3>

              {isEditing ? (
                <textarea
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Enter skills separated by commas"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={4}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {volunteer.skills.length > 0 ? (
                    volunteer.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-lg border border-primary-200 dark:border-primary-800"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">No skills listed</p>
                  )}
                </div>
              )}
            </Card>

            {/* Application Link */}
            {volunteer.applicationId && (
              <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Application</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">View submission details</p>
                    </div>
                  </div>
                  <Link href={`/applications?id=${volunteer.applicationId}`}>
                    <Button variant="outline" size="sm">
                      {volunteer.applicationId}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Event History & Custom Checklist */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Events Completed</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                      {volunteer.eventsCompleted}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Hours Contributed</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                      {volunteer.hoursContributed}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Custom Checklist Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Custom Tracking Checklist
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Track custom items like documents, training, certifications
                    </p>
                  </div>
                </div>
                {checklistStats.total > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {checklistStats.completed} / {checklistStats.total}
                    </span>
                  </div>
                )}
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 mb-4">
                {(volunteer.checklist || []).length > 0 ? (
                  (volunteer.checklist || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                    >
                      <button
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                      >
                        {item.checked ? (
                          <CheckSquare className="w-5 h-5 text-success-600 dark:text-success-400" />
                        ) : (
                          <Square className="w-5 h-5 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400" />
                        )}
                      </button>

                      {editingChecklistId === item.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingChecklistLabel}
                            onChange={(e) => setEditingChecklistLabel(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveChecklistItem();
                              if (e.key === 'Escape') handleCancelEditChecklistItem();
                            }}
                            className="flex-1 px-3 py-1.5 border border-primary-300 dark:border-primary-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleSaveChecklistItem}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEditChecklistItem}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className={`flex-1 text-sm ${item.checked ? 'line-through text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEditChecklistItem(item)}
                              className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                              title="Edit item"
                            >
                              <Edit className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" />
                            </button>
                          </div>
                          <span className="text-xs text-neutral-400 dark:text-neutral-600">
                            {new Date(item.createdDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No checklist items yet</p>
                    <p className="text-xs mt-1">Add custom items to track volunteer requirements</p>
                  </div>
                )}
              </div>

              {/* Add New Item */}
              {showChecklistInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddChecklistItem();
                      if (e.key === 'Escape') {
                        setShowChecklistInput(false);
                        setNewChecklistItem('');
                      }
                    }}
                    placeholder="e.g., Background Check Completed, Training Session Attended..."
                    className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <Button onClick={handleAddChecklistItem}>
                    <Save className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowChecklistInput(false);
                      setNewChecklistItem('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowChecklistInput(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Checklist Item
                </Button>
              )}

              {/* Helper Text */}
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  <strong>💡 Tip:</strong> Use this checklist to track anything specific to your organization like background checks, orientation completion, document submissions, uniform collection, or any custom requirements.
                </p>
              </div>
            </Card>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Upcoming Events
                </h3>

                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {event.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(event.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span>
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white`}>
                        {eventStatusConfig[event.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Ongoing Events */}
            {ongoingEvents.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Currently Participating
                </h3>

                <div className="space-y-3">
                  {ongoingEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-warning-200 dark:border-warning-800 rounded-lg bg-warning-50 dark:bg-warning-900/20">
                      <div className="w-2 h-2 bg-warning-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {event.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Started {new Date(event.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span>
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white`}>
                        {eventStatusConfig[event.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Event History */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Event History ({completedEvents.length})
              </h3>

              {completedEvents.length > 0 ? (
                <div className="space-y-3">
                  {completedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <div className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {event.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(event.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <span>•</span>
                          <span>Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span></span>
                          {event.hoursContributed && event.hoursContributed > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span><span className="font-medium text-neutral-700 dark:text-neutral-300">{event.hoursContributed}h</span> contributed</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white flex-shrink-0`}>
                        {eventStatusConfig[event.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 italic py-8">
                  No completed events yet
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}