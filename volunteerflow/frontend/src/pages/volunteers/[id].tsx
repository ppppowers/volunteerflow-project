'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  ArrowLeft, Edit, Save, X, Mail, Phone, MapPin, Calendar, Star, Upload,
  Hash, Clock, History, FileText, ExternalLink, TrendingUp, Award, Target,
  Users, Briefcase, CheckSquare, Square, Plus, Trash2, CheckCircle2,
  Settings, Shield, BadgeCheck, AlarmCheck, CheckCircle, AlertTriangle,
  GraduationCap, Tag, ShieldCheck, RefreshCw, Crown, Lock,
} from 'lucide-react';
import { usePlan } from '@/context/usePlan';
import {
  mockVolunteers, defaultChecklistTemplates, defaultCertificationTemplates,
  type Volunteer, type EventParticipation, type ChecklistItem,
  type ChecklistTemplate, type CertificationTemplate, type CertificationEntry,
  type HourEntry, type VolunteerBadge,
} from '../volunteers';
import { api } from '@/lib/api';

interface ApiVolunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  joinDate?: string;
  avatar?: string;
  skills?: string[];
  tags?: string[];
  hoursContributed?: number;
  status: string;
  isLeader?: boolean;
}

interface BgCheck {
  checkr_candidate_id: string | null;
  checkr_report_id: string | null;
  checkr_status: string | null;
  checkr_report_url: string | null;
  background_checked_at: string | null;
}

const generateId = () => Math.random().toString(36).substring(2, 10);
const inputClass = 'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

export default function VolunteerDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rightTab, setRightTab] = useState<'overview' | 'hours' | 'badges' | 'training'>('overview');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState('');

  // Org templates
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>(defaultChecklistTemplates);
  const [certTemplates, setCertTemplates] = useState<CertificationTemplate[]>(defaultCertificationTemplates);
  const [showSettings, setShowSettings] = useState(false);

  // Settings inputs
  const [newTmplLabel, setNewTmplLabel] = useState('');
  const [newTmplDesc, setNewTmplDesc] = useState('');
  const [newTmplRequired, setNewTmplRequired] = useState(false);
  const [newCertName, setNewCertName] = useState('');
  const [newCertDesc, setNewCertDesc] = useState('');
  const [newCertIcon, setNewCertIcon] = useState('✅');

  // Inline editing for existing templates
  const [editingTmplId, setEditingTmplId] = useState<string | null>(null);
  const [editingTmplLabel, setEditingTmplLabel] = useState('');
  const [editingTmplDesc, setEditingTmplDesc] = useState('');
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [editingCertName, setEditingCertName] = useState('');
  const [editingCertDesc, setEditingCertDesc] = useState('');
  const [editingCertIcon, setEditingCertIcon] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', location: '', skills: '',
    status: 'active' as 'active' | 'inactive' | 'pending', avatar: '',
  });

  const { can } = usePlan();

  // ── Leader toggle ─────────────────────────────────────────────────────────
  const [leaderLoading, setLeaderLoading] = useState(false);

  const handleToggleLeader = async () => {
    if (!volunteer) return;
    setLeaderLoading(true);
    try {
      const res = await api.patch<{ data: { isLeader: boolean } }>(`/volunteers/${volunteer.id}/leader`, { isLeader: !volunteer.isLeader });
      setVolunteer({ ...volunteer, isLeader: (res as any).data?.isLeader ?? !volunteer.isLeader });
    } catch {
      // ignore
    } finally {
      setLeaderLoading(false);
    }
  };

  // ── Background check ──────────────────────────────────────────────────────
  const [bgCheck, setBgCheck]     = useState<BgCheck | null>(null);
  const [bgInviting, setBgInviting] = useState(false);
  const [bgError, setBgError]     = useState('');
  const [bgToast, setBgToast]     = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<{ check: BgCheck }>(`/background-checks/${id}`)
      .then((res) => setBgCheck((res as any).check ?? null))
      .catch(() => {});
  }, [id]);

  const handleRunCheck = async () => {
    if (!volunteer) return;
    setBgInviting(true);
    setBgError('');
    try {
      const res = await api.post<{ invitation_url: string; status: string }>(
        '/background-checks/invite', { volunteerId: volunteer.id }
      );
      setBgCheck((prev) => ({ ...(prev ?? { checkr_candidate_id: null, checkr_report_id: null, checkr_report_url: null, background_checked_at: null }), checkr_status: 'pending' }));
      setBgToast('Invitation sent — volunteer will receive an email from Checkr');
      setTimeout(() => setBgToast(''), 4000);
      // Open the invitation URL in a new tab so staff can copy/share it if needed
      if ((res as any).invitation_url) window.open((res as any).invitation_url, '_blank');
    } catch (err: any) {
      setBgError(err?.message ?? 'Failed to send invitation');
    } finally {
      setBgInviting(false);
    }
  };

  // ── Tag management ────────────────────────────────────────────────────────
  const [orgTags, setOrgTags] = useState<string[]>([]);
  const [tagPickerInput, setTagPickerInput] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    api.get<{ data: string[] }>('/volunteers/tags')
      .then(res => setOrgTags((res as unknown as { data: string[] }).data ?? []))
      .catch(() => {});
  }, []);

  const saveVolunteerTags = async (tags: string[]) => {
    if (!volunteer) return;
    try {
      await api.put(`/volunteers/${volunteer.id}`, { tags });
      setVolunteer({ ...volunteer, tags });
      const unique = Array.from(new Set([...orgTags, ...tags])).sort();
      setOrgTags(unique);
    } catch {
      // silently ignore if backend offline
    }
  };

  const addTag = (tag: string) => {
    if (!volunteer || volunteer.tags?.includes(tag)) return;
    saveVolunteerTags([...(volunteer.tags ?? []), tag]);
    setTagPickerInput('');
    setShowTagPicker(false);
  };

  const removeTag = (tag: string) => {
    if (!volunteer) return;
    saveVolunteerTags((volunteer.tags ?? []).filter(t => t !== tag));
  };

  useEffect(() => {
    if (!id) return;
    api.get<ApiVolunteer>(`/volunteers/${id}`)
      .then((data) => {
        const statusRaw = data.status?.toLowerCase();
        const status: Volunteer['status'] =
          statusRaw === 'inactive' ? 'inactive' : statusRaw === 'pending' ? 'pending' : 'active';
        const v: Volunteer = {
          id: data.id,
          volunteerId: `VOL-${data.id}`,
          name: `${data.firstName} ${data.lastName}`.trim(),
          email: data.email,
          phone: data.phone ?? '',
          location: data.location ?? '',
          joinDate: data.joinDate ?? new Date().toISOString().split('T')[0],
          status,
          eventsCompleted: 0,
          hoursContributed: data.hoursContributed ?? 0,
          skills: data.skills ?? [],
          tags: data.tags ?? [],
          rating: 0,
          avatar: data.avatar ?? '',
          events: [],
          checklist: [],
          certifications: [],
          isLeader: data.isLeader ?? false,
        };
        setVolunteer(v);
        setFormData({ name: v.name, email: v.email, phone: v.phone, location: v.location, skills: v.skills.join(', '), status: v.status, avatar: v.avatar || '' });
        setAvatarPreview(v.avatar || '');
      })
      .catch(() => {
        // Fall back to mock data when backend is offline
        const found = mockVolunteers.find((v) => String(v.id) === String(id));
        if (found) {
          const withDefaults = { ...found, checklist: found.checklist || [], certifications: found.certifications || [] };
          setVolunteer(withDefaults);
          setFormData({ name: found.name, email: found.email, phone: found.phone, location: found.location, skills: found.skills.join(', '), status: found.status, avatar: found.avatar || '' });
          setAvatarPreview(found.avatar || '');
        }
      });
  }, [id]);

  if (!volunteer) {
    return (<Layout><div className="flex items-center justify-center h-64"><p className="text-neutral-600 dark:text-neutral-400">Loading volunteer details...</p></div></Layout>);
  }

  const statusConfig = {
    active: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', label: 'Active' },
    inactive: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-700 dark:text-neutral-300', label: 'Inactive' },
    pending: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', label: 'Pending' },
  };
  const eventStatusConfig = {
    upcoming: { bg: 'bg-primary-500', label: 'Upcoming' },
    ongoing: { bg: 'bg-warning-500', label: 'Ongoing' },
    completed: { bg: 'bg-success-500', label: 'Completed' },
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();
  const calculateTimeInService = () => {
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(volunteer.joinDate).getTime()) / 86400000);
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    return years > 0 ? `${years}y ${months}m` : `${months}m`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { const r = reader.result as string; setAvatarPreview(r); setFormData({ ...formData, avatar: r }); };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setVolunteer({ ...volunteer, name: formData.name, email: formData.email, phone: formData.phone, location: formData.location, skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean), status: formData.status, avatar: formData.avatar || volunteer.avatar });
    setIsEditing(false); setShowSettings(false);
  };
  const handleCancel = () => {
    setFormData({ name: volunteer.name, email: volunteer.email, phone: volunteer.phone, location: volunteer.location, skills: volunteer.skills.join(', '), status: volunteer.status, avatar: volunteer.avatar || '' });
    setAvatarPreview(volunteer.avatar || ''); setIsEditing(false); setShowSettings(false);
  };

  // Checklist
  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setVolunteer({ ...volunteer, checklist: [...(volunteer.checklist || []), { id: generateId(), label: newChecklistItem.trim(), checked: false, createdDate: new Date().toISOString() }] });
    setNewChecklistItem(''); setShowChecklistInput(false);
  };
  const handleToggleChecklistItem = (itemId: string) => { setVolunteer({ ...volunteer, checklist: (volunteer.checklist || []).map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }); };
  const handleDeleteChecklistItem = (itemId: string) => { setVolunteer({ ...volunteer, checklist: (volunteer.checklist || []).filter(i => i.id !== itemId) }); };
  const handleStartEditChecklistItem = (item: ChecklistItem) => { setEditingChecklistId(item.id); setEditingChecklistLabel(item.label); };
  const handleSaveChecklistItem = () => {
    if (!editingChecklistLabel.trim()) return;
    setVolunteer({ ...volunteer, checklist: (volunteer.checklist || []).map(i => i.id === editingChecklistId ? { ...i, label: editingChecklistLabel.trim() } : i) });
    setEditingChecklistId(null); setEditingChecklistLabel('');
  };
  const handleCancelEditChecklistItem = () => { setEditingChecklistId(null); setEditingChecklistLabel(''); };

  const seedChecklistFromTemplates = () => {
    const existing = (volunteer.checklist || []).map(c => c.label.toLowerCase());
    const toAdd = checklistTemplates.filter(t => !existing.includes(t.label.toLowerCase()));
    if (!toAdd.length) return;
    setVolunteer({ ...volunteer, checklist: [...(volunteer.checklist || []), ...toAdd.map(t => ({ id: generateId(), label: t.label, checked: false, createdDate: new Date().toISOString() }))] });
  };

  // Certifications
  const toggleCertification = (templateId: string) => {
    const certs = volunteer.certifications || [];
    const existing = certs.find(c => c.templateId === templateId);
    if (existing) {
      setVolunteer({ ...volunteer, certifications: certs.map(c => c.templateId === templateId ? { ...c, granted: !c.granted, grantedAt: !c.granted ? new Date().toISOString().split('T')[0] : undefined } : c) });
    } else {
      setVolunteer({ ...volunteer, certifications: [...certs, { templateId, granted: true, grantedAt: new Date().toISOString().split('T')[0] }] });
    }
  };
  const getCertStatus = (tid: string) => (volunteer.certifications || []).find(c => c.templateId === tid)?.granted ?? false;
  const getCertGrantedAt = (tid: string) => (volunteer.certifications || []).find(c => c.templateId === tid)?.grantedAt;

  // Org settings
  const addChecklistTemplate = () => { if (!newTmplLabel.trim()) return; setChecklistTemplates(p => [...p, { id: generateId(), label: newTmplLabel.trim(), description: newTmplDesc.trim() || undefined, required: newTmplRequired }]); setNewTmplLabel(''); setNewTmplDesc(''); setNewTmplRequired(false); };
  const removeChecklistTemplate = (tid: string) => setChecklistTemplates(p => p.filter(t => t.id !== tid));
  const toggleChecklistTemplateRequired = (tid: string) => setChecklistTemplates(p => p.map(t => t.id === tid ? { ...t, required: !t.required } : t));
  const addCertTemplate = () => { if (!newCertName.trim()) return; setCertTemplates(p => [...p, { id: generateId(), name: newCertName.trim(), description: newCertDesc.trim() || undefined, icon: newCertIcon || '✅' }]); setNewCertName(''); setNewCertDesc(''); setNewCertIcon('✅'); };
  const removeCertTemplate = (cid: string) => { setCertTemplates(p => p.filter(c => c.id !== cid)); setVolunteer({ ...volunteer, certifications: (volunteer.certifications || []).filter(c => c.templateId !== cid) }); };

  // Inline rename handlers
  const startEditChecklistTmpl = (tmpl: ChecklistTemplate) => { setEditingTmplId(tmpl.id); setEditingTmplLabel(tmpl.label); setEditingTmplDesc(tmpl.description || ''); };
  const saveEditChecklistTmpl = () => {
    if (!editingTmplLabel.trim() || !editingTmplId) return;
    setChecklistTemplates(p => p.map(t => t.id === editingTmplId ? { ...t, label: editingTmplLabel.trim(), description: editingTmplDesc.trim() || undefined } : t));
    setEditingTmplId(null); setEditingTmplLabel(''); setEditingTmplDesc('');
  };
  const cancelEditChecklistTmpl = () => { setEditingTmplId(null); setEditingTmplLabel(''); setEditingTmplDesc(''); };

  const startEditCertTmpl = (cert: CertificationTemplate) => { setEditingCertId(cert.id); setEditingCertName(cert.name); setEditingCertDesc(cert.description || ''); setEditingCertIcon(cert.icon); };
  const saveEditCertTmpl = () => {
    if (!editingCertName.trim() || !editingCertId) return;
    setCertTemplates(p => p.map(c => c.id === editingCertId ? { ...c, name: editingCertName.trim(), description: editingCertDesc.trim() || undefined, icon: editingCertIcon || '✅' } : c));
    setEditingCertId(null); setEditingCertName(''); setEditingCertDesc(''); setEditingCertIcon('');
  };
  const cancelEditCertTmpl = () => { setEditingCertId(null); setEditingCertName(''); setEditingCertDesc(''); setEditingCertIcon(''); };

  const upcomingEvents = volunteer.events.filter(e => e.status === 'upcoming');
  const completedEvents = volunteer.events.filter(e => e.status === 'completed');
  const ongoingEvents = volunteer.events.filter(e => e.status === 'ongoing');
  const checklistStats = { total: volunteer.checklist?.length || 0, completed: volunteer.checklist?.filter(i => i.checked).length || 0 };
  const certStats = { total: certTemplates.length, granted: certTemplates.filter(t => getCertStatus(t.id)).length };

  return (
    <>
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back to Volunteers</Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{isEditing ? 'Edit Volunteer' : 'Volunteer Profile'}</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-2"><Hash className="w-3 h-3" />{volunteer.volunteerId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button variant="outline" size="sm" onClick={() => setShowSettings(v => !v)} className={showSettings ? 'ring-2 ring-primary-500' : ''}>
                <Settings className="w-4 h-4 mr-2" />Manage Templates
              </Button>
            )}
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-2" />Edit Profile</Button>
            ) : (<>
              <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-2" />Cancel</Button>
              <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </>)}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"><Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" /></div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Organization Templates</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Customize checklists and certifications for all volunteers</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Checklist Templates */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />Checklist Items</h3>
                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                  {checklistTemplates.map(tmpl => (
                    <div key={tmpl.id} className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg group">
                      {editingTmplId === tmpl.id ? (
                        <div className="flex-1 space-y-1.5">
                          <input type="text" value={editingTmplLabel} onChange={e => setEditingTmplLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditChecklistTmpl(); if (e.key === 'Escape') cancelEditChecklistTmpl(); }} className={inputClass + ' !py-1.5 !text-sm font-medium'} autoFocus />
                          <input type="text" value={editingTmplDesc} onChange={e => setEditingTmplDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditChecklistTmpl(); if (e.key === 'Escape') cancelEditChecklistTmpl(); }} placeholder="Description (optional)" className={inputClass + ' !py-1 !text-xs'} />
                          <div className="flex gap-1">
                            <Button size="sm" onClick={saveEditChecklistTmpl}><Save className="w-3 h-3 mr-1" />Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEditChecklistTmpl}>Cancel</Button>
                          </div>
                        </div>
                      ) : (<>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEditChecklistTmpl(tmpl)} title="Click to rename">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{tmpl.label}</p>
                          {tmpl.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{tmpl.description}</p>}
                        </div>
                        <button onClick={() => toggleChecklistTemplateRequired(tmpl.id)} className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 transition-colors ${tmpl.required ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`} title="Toggle required">
                          {tmpl.required ? 'Required' : 'Optional'}
                        </button>
                        <button onClick={() => startEditChecklistTmpl(tmpl)} className="p-1 rounded text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 opacity-0 group-hover:opacity-100 transition-all" title="Rename"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeChecklistTemplate(tmpl.id)} className="p-1 rounded text-neutral-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>)}
                    </div>
                  ))}
                  {checklistTemplates.length === 0 && <p className="text-sm text-neutral-400 italic text-center py-4">No checklist templates — add one below</p>}
                </div>
                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <input type="text" value={newTmplLabel} onChange={e => setNewTmplLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistTemplate()} placeholder="New checklist item name..." className={inputClass} />
                  <input type="text" value={newTmplDesc} onChange={e => setNewTmplDesc(e.target.value)} placeholder="Description (optional)" className={inputClass} />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                      <input type="checkbox" checked={newTmplRequired} onChange={e => setNewTmplRequired(e.target.checked)} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />Required
                    </label>
                    <Button size="sm" onClick={addChecklistTemplate} disabled={!newTmplLabel.trim()}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                  </div>
                </div>
              </div>

              {/* Certification Templates */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" />Certifications</h3>
                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                  {certTemplates.map(cert => (
                    <div key={cert.id} className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg group">
                      {editingCertId === cert.id ? (
                        <div className="flex-1 space-y-1.5">
                          <div className="flex gap-2">
                            <input type="text" value={editingCertIcon} onChange={e => setEditingCertIcon(e.target.value)} className={inputClass + ' !w-14 !py-1.5 text-center'} maxLength={4} />
                            <input type="text" value={editingCertName} onChange={e => setEditingCertName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditCertTmpl(); if (e.key === 'Escape') cancelEditCertTmpl(); }} className={inputClass + ' !py-1.5 !text-sm font-medium flex-1'} autoFocus />
                          </div>
                          <input type="text" value={editingCertDesc} onChange={e => setEditingCertDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditCertTmpl(); if (e.key === 'Escape') cancelEditCertTmpl(); }} placeholder="Description (optional)" className={inputClass + ' !py-1 !text-xs'} />
                          <div className="flex gap-1">
                            <Button size="sm" onClick={saveEditCertTmpl}><Save className="w-3 h-3 mr-1" />Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEditCertTmpl}>Cancel</Button>
                          </div>
                        </div>
                      ) : (<>
                        <span className="text-lg flex-shrink-0">{cert.icon}</span>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEditCertTmpl(cert)} title="Click to rename">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{cert.name}</p>
                          {cert.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{cert.description}</p>}
                        </div>
                        <button onClick={() => startEditCertTmpl(cert)} className="p-1 rounded text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 opacity-0 group-hover:opacity-100 transition-all" title="Rename"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeCertTemplate(cert.id)} className="p-1 rounded text-neutral-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>)}
                    </div>
                  ))}
                  {certTemplates.length === 0 && <p className="text-sm text-neutral-400 italic text-center py-4">No certifications — add one below</p>}
                </div>
                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex gap-2">
                    <input type="text" value={newCertIcon} onChange={e => setNewCertIcon(e.target.value)} placeholder="🐕" className={inputClass + ' !w-14 text-center'} maxLength={4} />
                    <input type="text" value={newCertName} onChange={e => setNewCertName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCertTemplate()} placeholder="Certification name..." className={inputClass + ' flex-1'} />
                  </div>
                  <input type="text" value={newCertDesc} onChange={e => setNewCertDesc(e.target.value)} placeholder="Description (optional)" className={inputClass} />
                  <div className="flex justify-end"><Button size="sm" onClick={addCertTemplate} disabled={!newCertName.trim()}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button></div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {(isEditing ? avatarPreview : volunteer.avatar) ? (
                    <img src={isEditing ? avatarPreview : volunteer.avatar} alt={volunteer.name} className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 dark:border-primary-800" />
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg">{getInitials(volunteer.name)}</div>
                  )}
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                      <Upload className="w-5 h-5 text-white" /><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
                {isEditing ? (
                  <div className="w-full space-y-3 mb-4">
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 text-center text-lg font-bold border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500">
                      <option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option>
                    </select>
                  </div>
                ) : (<>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">{volunteer.name}</h2>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig[volunteer.status].bg} ${statusConfig[volunteer.status].text}`}>{statusConfig[volunteer.status].label}</span>
                </>)}
                {volunteer.rating > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 w-full">
                    <Star className="w-5 h-5 fill-warning-400 text-warning-400" />
                    <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{volunteer.rating.toFixed(1)}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">/ 5.0</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Org Tags */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Org Tags</h3>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">Visible to org only</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {(volunteer.tags ?? []).map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium rounded-full">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-violet-900 dark:hover:text-violet-100 transition-colors ml-0.5"
                      title={`Remove tag "${tag}"`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => { setShowTagPicker(v => !v); setTagPickerInput(''); }}
                    className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 text-sm font-medium rounded-full hover:border-violet-500 hover:text-violet-700 dark:hover:border-violet-500 dark:hover:text-violet-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Tag
                  </button>
                  {showTagPicker && (
                    <div
                      className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search or create tag..."
                          value={tagPickerInput}
                          onChange={(e) => setTagPickerInput(e.target.value)}
                          onBlur={() => setTimeout(() => setShowTagPicker(false), 150)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagPickerInput.trim()) addTag(tagPickerInput.trim());
                            else if (e.key === 'Escape') setShowTagPicker(false);
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
                        {orgTags
                          .filter(t => !(volunteer.tags ?? []).includes(t) && t.toLowerCase().includes(tagPickerInput.toLowerCase()))
                          .map(t => (
                            <button
                              key={t}
                              onMouseDown={() => addTag(t)}
                              className="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                            >
                              {t}
                            </button>
                          ))
                        }
                        {tagPickerInput.trim() && !orgTags.includes(tagPickerInput.trim()) && (
                          <button
                            onMouseDown={() => addTag(tagPickerInput.trim())}
                            className="w-full text-left px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors font-medium"
                          >
                            + Create &ldquo;{tagPickerInput.trim()}&rdquo;
                          </button>
                        )}
                        {orgTags.filter(t => !(volunteer.tags ?? []).includes(t) && t.toLowerCase().includes(tagPickerInput.toLowerCase())).length === 0 && !tagPickerInput.trim() && (
                          <p className="px-3 py-2 text-sm text-neutral-400">Type to search or create a tag</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {(volunteer.tags ?? []).length === 0 && !showTagPicker && (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">No tags yet</p>
                )}
              </div>
            </Card>

            {/* Contact */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Contact Information</h3>
              <div className="space-y-4">
                {([['email', Mail, 'Email', 'email'] as const, ['phone', Phone, 'Phone', 'tel'] as const, ['location', MapPin, 'Location', 'text'] as const]).map(([key, Icon, label, type]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</label>
                    {isEditing ? (
                      <input type={type} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="w-full mt-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-neutral-900 dark:text-neutral-100"><Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" /><span className="truncate">{(volunteer as any)[key]}</span></div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Key Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" /><span className="text-sm text-neutral-700 dark:text-neutral-300">Joined</span></div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{new Date(volunteer.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
                  <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-success-600 dark:text-success-400" /><span className="text-sm text-neutral-700 dark:text-neutral-300">Service</span></div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{calculateTimeInService()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800">
                  <div className="flex items-center gap-2"><Users className="w-5 h-5 text-warning-600 dark:text-warning-400" /><span className="text-sm text-neutral-700 dark:text-neutral-300">Events</span></div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{volunteer.eventsCompleted}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" /><span className="text-sm text-neutral-700 dark:text-neutral-300">Hours</span></div>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{volunteer.hoursContributed}</span>
                </div>
              </div>
            </Card>

            {/* Leader / Captain */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Leader / Captain</h3>
                {!can('leader_user_type') && <Lock className="w-3.5 h-3.5 text-neutral-400 ml-auto" />}
              </div>
              {can('leader_user_type') ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {volunteer.isLeader
                        ? 'This volunteer is designated as a leader/captain.'
                        : 'Designate this volunteer as a leader or captain.'}
                    </p>
                    {volunteer.isLeader && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        <Crown className="w-3 h-3" />
                        Leader
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleLeader}
                    disabled={leaderLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${volunteer.isLeader ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'} disabled:opacity-50`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${volunteer.isLeader ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">
                  Upgrade to Enterprise to designate volunteer leaders and captains.
                </p>
              )}
            </Card>

            {/* Background Check */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Background Check</h3>
                </div>
                {(() => {
                  const s = bgCheck?.checkr_status;
                  if (!s) return null;
                  const map: Record<string, string> = {
                    pending:    'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
                    processing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                    clear:      'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
                    consider:   'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
                    suspended:  'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400',
                  };
                  const label: Record<string, string> = {
                    pending: 'Invite Sent', processing: 'Running', clear: 'Clear',
                    consider: 'Needs Review', suspended: 'Suspended',
                  };
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[s] ?? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                      {label[s] ?? s}
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-3">
                {bgCheck?.background_checked_at && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Completed {new Date(bgCheck.background_checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                {bgCheck?.checkr_report_url && (
                  <a
                    href={bgCheck.checkr_report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> View Checkr Report
                  </a>
                )}
                {bgError && (
                  <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {bgError}
                  </p>
                )}
                {!bgCheck?.checkr_status || bgCheck.checkr_status === 'consider' || bgCheck.checkr_status === 'suspended' ? (
                  <Button
                    onClick={handleRunCheck}
                    disabled={bgInviting}
                    className="w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {bgInviting
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                      : <><ShieldCheck className="w-4 h-4" /> {bgCheck?.checkr_status ? 'Re-run Background Check' : 'Run Background Check'}</>
                    }
                  </Button>
                ) : bgCheck.checkr_status === 'pending' || bgCheck.checkr_status === 'processing' ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 italic text-center">
                    {bgCheck.checkr_status === 'pending' ? 'Waiting for volunteer to complete the form…' : 'Check is running — results typically take 1–3 days'}
                  </p>
                ) : null}
              </div>
            </Card>

            {/* Skills */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Skills & Expertise</h3>
              {isEditing ? (
                <textarea value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="Enter skills separated by commas" className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500" rows={4} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {volunteer.skills.length > 0 ? volunteer.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-lg border border-primary-200 dark:border-primary-800">{skill}</span>
                  )) : <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">No skills listed</p>}
                </div>
              )}
            </Card>

            {volunteer.applicationId && (
              <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" /><div><h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Application</h4><p className="text-sm text-neutral-600 dark:text-neutral-400">View submission details</p></div></div>
                  <Link href={`/applications?id=${volunteer.applicationId}`}><Button variant="outline" size="sm">{volunteer.applicationId}<ExternalLink className="w-3 h-3 ml-2" /></Button></Link>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center"><Award className="w-6 h-6 text-success-600 dark:text-success-400" /></div><div><p className="text-sm text-neutral-600 dark:text-neutral-400">Events</p><p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{volunteer.eventsCompleted}</p></div></div></Card>
              <button className="text-left" onClick={() => setRightTab('hours')}><Card className="p-5 hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" /></div><div><p className="text-sm text-neutral-600 dark:text-neutral-400">Hours</p><p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{volunteer.hoursContributed}</p></div></div></Card></button>
              <button className="text-left" onClick={() => setRightTab('badges')}><Card className="p-5 hover:ring-2 hover:ring-warning-300 dark:hover:ring-warning-700 transition-all"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center"><BadgeCheck className="w-6 h-6 text-warning-600 dark:text-warning-400" /></div><div><p className="text-sm text-neutral-600 dark:text-neutral-400">Badges</p><p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{(volunteer.badges ?? []).length}</p></div></div></Card></button>
              <button className="text-left" onClick={() => setRightTab('training')}><Card className="p-5 hover:ring-2 hover:ring-success-300 dark:hover:ring-success-700 transition-all"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center"><GraduationCap className="w-6 h-6 text-success-600 dark:text-success-400" /></div><div><p className="text-sm text-neutral-600 dark:text-neutral-400">Training</p><p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{(volunteer.completedTrainings ?? []).length}</p></div></div></Card></button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
              {([
                { id: 'overview',  label: 'Overview',  icon: Target },
                { id: 'hours',     label: 'Hours',     icon: Clock },
                { id: 'badges',    label: 'Badges',    icon: BadgeCheck },
                { id: 'training',  label: 'Training',  icon: GraduationCap },
              ] as { id: typeof rightTab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setRightTab(id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rightTab === id
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {id === 'hours' && (volunteer.hours ?? []).length > 0 && (
                    <span className="text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                      {(volunteer.hours ?? []).length}
                    </span>
                  )}
                  {id === 'badges' && (volunteer.badges ?? []).length > 0 && (
                    <span className="text-[10px] font-bold bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-300 px-1.5 py-0.5 rounded-full">
                      {(volunteer.badges ?? []).length}
                    </span>
                  )}
                  {id === 'training' && (volunteer.completedTrainings ?? []).length > 0 && (
                    <span className="text-[10px] font-bold bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 px-1.5 py-0.5 rounded-full">
                      {(volunteer.completedTrainings ?? []).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {rightTab === 'overview' && <>

            {/* Certifications */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Certifications</h3><p className="text-sm text-neutral-500 dark:text-neutral-400">Track what this volunteer is qualified for</p></div>
                </div>
                {certStats.total > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <Shield className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{certStats.granted} / {certStats.total}</span>
                  </div>
                )}
              </div>
              {certTemplates.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  <BadgeCheck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No certifications configured</p><p className="text-xs mt-1">Click <strong>Edit Profile</strong> then <strong>Manage Templates</strong> to add certifications</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {certTemplates.map(cert => {
                    const granted = getCertStatus(cert.id);
                    const grantedAt = getCertGrantedAt(cert.id);
                    return (
                      <div
                        key={cert.id}
                        onClick={isEditing ? () => toggleCertification(cert.id) : undefined}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                          granted
                            ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                        } ${isEditing ? 'cursor-pointer hover:shadow-sm' : ''} ${!isEditing && !granted ? 'opacity-60' : ''}`}
                      >
                        <span className="text-2xl flex-shrink-0">{cert.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{cert.name}</span>
                            {granted && <CheckCircle2 className="w-4 h-4 text-success-600 dark:text-success-400 flex-shrink-0" />}
                          </div>
                          {cert.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{cert.description}</p>}
                          {granted && grantedAt && <p className="text-[10px] text-success-600 dark:text-success-400 mt-1">Certified {new Date(grantedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                          {!granted && isEditing && <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">Click to certify</p>}
                          {!granted && !isEditing && <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">Not certified</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Checklist */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Onboarding Checklist</h3><p className="text-sm text-neutral-600 dark:text-neutral-400">Track requirements and milestones</p></div>
                </div>
                <div className="flex items-center gap-2">
                  {checklistStats.total > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                      <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{checklistStats.completed} / {checklistStats.total}</span>
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={seedChecklistFromTemplates} title="Add any missing org template items"><Plus className="w-3.5 h-3.5 mr-1" />Sync Templates</Button>
                </div>
              </div>

              {checklistStats.total > 0 && (
                <div className="mb-4"><div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(checklistStats.completed / checklistStats.total) * 100}%` }} /></div></div>
              )}

              <div className="space-y-2 mb-4">
                {(volunteer.checklist || []).length > 0 ? (volunteer.checklist || []).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                    <button onClick={() => handleToggleChecklistItem(item.id)} className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {item.checked ? <CheckSquare className="w-5 h-5 text-success-600 dark:text-success-400" /> : <Square className="w-5 h-5 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400" />}
                    </button>
                    {editingChecklistId === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="text" value={editingChecklistLabel} onChange={e => setEditingChecklistLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveChecklistItem(); if (e.key === 'Escape') handleCancelEditChecklistItem(); }} className="flex-1 px-3 py-1.5 border border-primary-300 dark:border-primary-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500" autoFocus />
                        <Button size="sm" onClick={handleSaveChecklistItem}><Save className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEditChecklistItem}><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (<>
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>{item.label}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEditChecklistItem(item)} className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors" title="Edit"><Edit className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" /></button>
                        <button onClick={() => handleDeleteChecklistItem(item.id)} className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" /></button>
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-600">{new Date(item.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </>)}
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400"><CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">No checklist items yet</p><p className="text-xs mt-1">Click <strong>Sync Templates</strong> to pull from org templates, or add custom items below</p></div>
                )}
              </div>

              {showChecklistInput ? (
                <div className="flex gap-2">
                  <input type="text" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem(); if (e.key === 'Escape') { setShowChecklistInput(false); setNewChecklistItem(''); } }} placeholder="e.g., Uniform Received, Safety Training..." className={inputClass + ' flex-1'} autoFocus />
                  <Button onClick={handleAddChecklistItem}><Save className="w-4 h-4 mr-2" />Add</Button>
                  <Button variant="outline" onClick={() => { setShowChecklistInput(false); setNewChecklistItem(''); }}>Cancel</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setShowChecklistInput(true)}><Plus className="w-4 h-4 mr-2" />Add Custom Checklist Item</Button>
              )}
            </Card>

            {/* Events */}
            {upcomingEvents.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2"><Target className="w-5 h-5" />Upcoming Events</h3>
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1"><h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{event.name}</h4><div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400"><Calendar className="w-4 h-4" /><span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span></div><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span></p></div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white`}>{eventStatusConfig[event.status].label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {ongoingEvents.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2"><History className="w-5 h-5" />Currently Participating</h3>
                <div className="space-y-3">
                  {ongoingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-warning-200 dark:border-warning-800 rounded-lg bg-warning-50 dark:bg-warning-900/20">
                      <div className="w-2 h-2 bg-warning-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1"><h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{event.name}</h4><div className="flex items-center gap-2 mt-2 text-sm text-neutral-600 dark:text-neutral-400"><Calendar className="w-4 h-4" /><span>Started {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span></p></div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white`}>{eventStatusConfig[event.status].label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2"><History className="w-5 h-5" />Event History ({completedEvents.length})</h3>
              {completedEvents.length > 0 ? (
                <div className="space-y-3">
                  {completedEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <div className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{event.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                          <span>•</span><span>Role: <span className="font-medium text-neutral-700 dark:text-neutral-300">{event.role}</span></span>
                          {event.hoursContributed && event.hoursContributed > 0 && (<><span>•</span><div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span><span className="font-medium text-neutral-700 dark:text-neutral-300">{event.hoursContributed}h</span> contributed</span></div></>)}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventStatusConfig[event.status].bg} text-white flex-shrink-0`}>{eventStatusConfig[event.status].label}</span>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-center text-neutral-500 dark:text-neutral-400 italic py-8">No completed events yet</p>)}
            </Card>

            </>}

            {/* ── HOURS TAB ────────────────────────────────────────────── */}
            {rightTab === 'hours' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Hours Log</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {volunteer.hoursContributed} total hours across {(volunteer.hours ?? []).length} sessions
                      </p>
                    </div>
                  </div>
                  {/* Confirmed / pending / flagged summary */}
                  <div className="flex items-center gap-3 text-xs">
                    {(['confirmed', 'pending', 'flagged'] as HourEntry['status'][]).map(s => {
                      const count = (volunteer.hours ?? []).filter(h => h.status === s).length;
                      if (!count) return null;
                      const cfg = {
                        confirmed: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
                        pending:   'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
                        flagged:   'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
                      }[s];
                      return (
                        <span key={s} className={`px-2 py-0.5 rounded-full font-semibold capitalize ${cfg}`}>
                          {count} {s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {(volunteer.hours ?? []).length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hours logged for this volunteer yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      {[
                        { label: 'Total Hours', value: volunteer.hoursContributed, color: 'text-primary-600 dark:text-primary-400' },
                        { label: 'Confirmed', value: (volunteer.hours ?? []).filter(h => h.status === 'confirmed').reduce((s, h) => s + h.hours, 0), color: 'text-success-600 dark:text-success-400' },
                        { label: 'Pending', value: (volunteer.hours ?? []).filter(h => h.status === 'pending').reduce((s, h) => s + h.hours, 0), color: 'text-warning-600 dark:text-warning-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3 text-center">
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Hour entries */}
                    {(volunteer.hours ?? []).map((entry: HourEntry) => {
                      const statusCfg = {
                        confirmed: { icon: CheckCircle,     color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800' },
                        pending:   { icon: AlarmCheck,      color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800' },
                        flagged:   { icon: AlertTriangle,   color: 'text-danger-600 dark:text-danger-400',   bg: 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800' },
                      }[entry.status];
                      const StatusIcon = statusCfg.icon;
                      return (
                        <div key={entry.id} className={`flex items-start gap-4 p-4 border rounded-lg ${statusCfg.bg}`}>
                          <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusCfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{entry.eventName}</h4>
                              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex-shrink-0 ml-2">
                                {entry.hours}h
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                              <span>{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span>·</span>
                              <span>{entry.checkIn} – {entry.checkOut}</span>
                              <span className={`capitalize font-semibold ${statusCfg.color}`}>{entry.status}</span>
                            </div>
                            {entry.notes && (
                              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 italic">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* ── BADGES TAB ───────────────────────────────────────────── */}
            {rightTab === 'badges' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Badges & Credentials</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {(volunteer.badges ?? []).length} badge{(volunteer.badges ?? []).length !== 1 ? 's' : ''} earned
                      </p>
                    </div>
                  </div>
                </div>

                {(volunteer.badges ?? []).length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <BadgeCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No badges issued to this volunteer yet.</p>
                    <p className="text-xs mt-1">Go to <strong>Badges</strong> in the sidebar to issue one.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(volunteer.badges ?? []).map((badge: VolunteerBadge) => {
                      const isExpired = badge.expiresAt && new Date(badge.expiresAt) < new Date();
                      return (
                        <div
                          key={badge.id}
                          className={`flex items-start gap-4 p-4 border-2 rounded-xl ${
                            isExpired
                              ? 'border-neutral-200 dark:border-neutral-700 opacity-60'
                              : 'border-neutral-100 dark:border-neutral-700'
                          }`}
                        >
                          {/* Badge icon */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ backgroundColor: badge.badgeColor + '22', border: `2px solid ${badge.badgeColor}44` }}
                          >
                            {badge.badgeIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{badge.badgeName}</p>
                              {isExpired && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500">Expired</span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              Issued {new Date(badge.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} by {badge.issuedBy}
                            </p>
                            {badge.expiresAt && (
                              <p className={`text-xs mt-0.5 ${isExpired ? 'text-danger-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                {isExpired ? 'Expired' : 'Expires'} {new Date(badge.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                            {badge.note && (
                              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic mt-1">{badge.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* ── TRAINING TAB ─────────────────────────────────────────── */}
            {rightTab === 'training' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-success-600 dark:text-success-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Completed Training</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {(volunteer.completedTrainings ?? []).length} course{(volunteer.completedTrainings ?? []).length !== 1 ? 's' : ''} completed
                      </p>
                    </div>
                  </div>
                </div>

                {(volunteer.completedTrainings ?? []).length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No training completed yet.</p>
                    <p className="text-xs mt-1">Go to <strong>Training</strong> in the sidebar to record a completion.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(volunteer.completedTrainings ?? []).map((t) => (
                      <div
                        key={t.courseId + t.completedAt}
                        className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{t.courseTitle}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Completed {new Date(t.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 whitespace-nowrap">
                          Complete
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      </div>
    </Layout>

    {bgToast && (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold rounded-xl shadow-2xl">
        <CheckCircle2 className="w-4 h-4 text-success-400 dark:text-success-600 flex-shrink-0" />
        {bgToast}
      </div>
    )}
    </>
  );
}
