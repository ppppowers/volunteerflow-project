import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  ArrowLeft, Mail, Phone, Calendar, Edit, Save, X,
  CheckSquare, Square, Plus, Trash2, CheckCircle, AlertTriangle, Settings,
} from 'lucide-react';
import { api } from '@/lib/api';

const generateId = () => Math.random().toString(36).substring(2, 10);

const inputClass =
  'w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  joinedAt: string;
}

interface GroupInfo {
  id: string;
  name: string;
  color: string;
  slug: string;
}

interface ChecklistItem { id: string; label: string; checked: boolean; createdDate: string; }
interface CertEntry { templateId: string; granted: boolean; grantedAt?: string; }

const DEFAULT_CERT_TEMPLATES = [
  { id: 'background-check', name: 'Background Check', icon: '🛡️' },
  { id: 'orientation', name: 'Orientation Complete', icon: '✅' },
  { id: 'training', name: 'Training Certified', icon: '🎓' },
];

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tenure(d: string) {
  if (!d) return '—';
  const days = Math.ceil((Date.now() - new Date(d).getTime()) / 86400000);
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active:   { bg: 'bg-success-100 dark:bg-success-900/30',  text: 'text-success-700 dark:text-success-400',  label: 'Active' },
  pending:  { bg: 'bg-warning-100 dark:bg-warning-900/30',  text: 'text-warning-700 dark:text-warning-400',  label: 'Pending' },
  inactive: { bg: 'bg-neutral-100 dark:bg-neutral-700',     text: 'text-neutral-600 dark:text-neutral-400',  label: 'Inactive' },
};

export default function GroupMemberProfile() {
  const router = useRouter();
  const { groupId, id } = router.query;

  const [member, setMember] = useState<GroupMember | null>(null);
  const [group, setGroup]   = useState<GroupInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'checklist' | 'certifications'>('overview');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState('');

  // Certifications
  const [certifications, setCertifications] = useState<CertEntry[]>([]);
  const [certTemplates, setCertTemplates] = useState(DEFAULT_CERT_TEMPLATES);
  const [showSettings, setShowSettings] = useState(false);
  const [newCertName, setNewCertName] = useState('');
  const [newCertIcon, setNewCertIcon] = useState('✅');

  useEffect(() => {
    if (!groupId || !id) return;

    // Fetch group info
    api.get<GroupInfo[]>('/people/groups')
      .then((groups) => {
        const g = groups.find((g) => String(g.id) === String(groupId));
        if (g) setGroup(g);
      })
      .catch(() => {});

    // Fetch members and find this one
    api.get<GroupMember[]>(`/people/groups/${groupId}/members`)
      .then((members) => {
        const found = members.find((m) => String(m.id) === String(id));
        if (found) {
          setMember(found);
          setFormData({ name: found.name, email: found.email, phone: found.phone, status: found.status, notes: found.notes ?? '' });
        }
      })
      .catch(() => {});
  }, [groupId, id]);

  if (!member) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-neutral-600 dark:text-neutral-400">Loading profile…</p>
        </div>
      </Layout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<GroupMember>(`/people/groups/${groupId}/members/${id}`, formData);
      setMember(updated);
      setIsEditing(false);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false);
    }
  };

  // Checklist helpers
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist((p) => [...p, { id: generateId(), label: newChecklistItem.trim(), checked: false, createdDate: new Date().toISOString() }]);
    setNewChecklistItem(''); setShowChecklistInput(false);
  };
  const toggleChecklist = (cid: string) => setChecklist((p) => p.map((i) => i.id === cid ? { ...i, checked: !i.checked } : i));
  const deleteChecklist = (cid: string) => setChecklist((p) => p.filter((i) => i.id !== cid));
  const saveChecklistEdit = () => {
    if (!editingChecklistLabel.trim()) return;
    setChecklist((p) => p.map((i) => i.id === editingChecklistId ? { ...i, label: editingChecklistLabel.trim() } : i));
    setEditingChecklistId(null); setEditingChecklistLabel('');
  };

  // Cert helpers
  const getCertStatus = (tid: string) => certifications.find((c) => c.templateId === tid)?.granted ?? false;
  const getCertDate   = (tid: string) => certifications.find((c) => c.templateId === tid)?.grantedAt;
  const toggleCert    = (tid: string) => {
    setCertifications((prev) => {
      const existing = prev.find((c) => c.templateId === tid);
      if (existing) return prev.map((c) => c.templateId === tid ? { ...c, granted: !c.granted, grantedAt: !c.granted ? new Date().toISOString().split('T')[0] : undefined } : c);
      return [...prev, { templateId: tid, granted: true, grantedAt: new Date().toISOString().split('T')[0] }];
    });
  };

  const completedChecklist = checklist.filter((i) => i.checked).length;
  const certCount = certifications.filter((c) => c.granted).length;
  const sc = statusConfig[member.status] ?? statusConfig.inactive;
  const groupColor = group?.color ?? '#6366f1';

  return (
    <Layout>
      <Head><title>{member.name} — {group?.name ?? 'Group'} Profile</title></Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back */}
        <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to People
        </Link>

        {group && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: groupColor }}>
            {group.name}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="space-y-4">
            <Card className="p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white ring-4 mb-3"
                  style={{ background: groupColor, boxShadow: `0 0 0 4px ${groupColor}22` }}
                >
                  {getInitials(member.name)}
                </div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{member.name}</h2>
                {member.email && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{member.email}</p>}
                <span className={`mt-3 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{tenure(member.joinedAt)}</p>
                  <p className="text-xs text-neutral-400">Tenure</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{completedChecklist}/{checklist.length || 0}</p>
                  <p className="text-xs text-neutral-400">Tasks</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg py-2 px-1">
                  <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{certCount}</p>
                  <p className="text-xs text-neutral-400">Certs</p>
                </div>
              </div>

              {/* Info rows (view) */}
              {!isEditing && (
                <div className="space-y-3 mb-5">
                  {member.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-neutral-400 font-medium">Email</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{member.email}</p>
                      </div>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-neutral-400 font-medium">Phone</p>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{member.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-neutral-400 font-medium">Joined</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{formatDate(member.joinedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="space-y-3 mb-5">
                  {[
                    { label: 'Name', key: 'name', type: 'text' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'Phone', key: 'phone', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">{label}</label>
                      <input
                        type={type}
                        value={formData[key as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClass}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className={inputClass + ' resize-none'} />
                  </div>
                </div>
              )}

              {/* Edit actions */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                      <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData({ name: member.name, email: member.email, phone: member.phone, status: member.status, notes: member.notes ?? '' }); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-full">
                    <Edit className="w-4 h-4 mr-1.5" /> Edit Profile
                  </Button>
                )}
              </div>
            </Card>

            {/* Quick action */}
            {member.email && (
              <Card className="p-4">
                <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  <Mail className="w-4 h-4" /> Send Email
                </a>
              </Card>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
              {(['overview', 'checklist', 'certifications'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold capitalize transition-all ${
                    tab === t
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {tab === 'overview' && (
              <Card className="p-6">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">Member Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', value: member.name },
                    { label: 'Email', value: member.email || '—' },
                    { label: 'Phone', value: member.phone || '—' },
                    { label: 'Status', value: sc.label },
                    { label: 'Group', value: group?.name ?? '—' },
                    { label: 'Joined', value: formatDate(member.joinedAt) },
                    { label: 'Tenure', value: tenure(member.joinedAt) },
                  ].map((row) => (
                    <div key={row.label} className="border-b border-neutral-100 dark:border-neutral-700 pb-3">
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium mb-0.5">{row.label}</p>
                      <p className="text-sm text-neutral-800 dark:text-neutral-200 font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>
                {member.notes && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                    <p className="text-xs text-neutral-400 font-medium mb-1">Notes</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{member.notes}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Checklist tab */}
            {tab === 'checklist' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Checklist</h3>
                    {checklist.length > 0 && (
                      <p className="text-xs text-neutral-400 mt-0.5">{completedChecklist}/{checklist.length} completed</p>
                    )}
                  </div>
                  <Button onClick={() => setShowChecklistInput(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>

                {showChecklistInput && (
                  <div className="flex gap-2 mb-3">
                    <input autoFocus value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()} placeholder="New checklist item…" className={inputClass} />
                    <Button onClick={addChecklistItem}><Plus className="w-4 h-4" /></Button>
                    <Button variant="secondary" onClick={() => { setShowChecklistInput(false); setNewChecklistItem(''); }}><X className="w-4 h-4" /></Button>
                  </div>
                )}

                {checklist.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400">
                    <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No checklist items yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 group">
                        <button onClick={() => toggleChecklist(item.id)} className="flex-shrink-0">
                          {item.checked
                            ? <CheckSquare className="w-4 h-4 text-primary-500" />
                            : <Square className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />}
                        </button>
                        {editingChecklistId === item.id ? (
                          <div className="flex gap-2 flex-1">
                            <input autoFocus value={editingChecklistLabel} onChange={(e) => setEditingChecklistLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveChecklistEdit()} className={inputClass} />
                            <Button onClick={saveChecklistEdit}><Plus className="w-4 h-4" /></Button>
                            <Button variant="secondary" onClick={() => { setEditingChecklistId(null); setEditingChecklistLabel(''); }}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <>
                            <span className={`flex-1 text-sm ${item.checked ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'}`}>{item.label}</span>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <button onClick={() => { setEditingChecklistId(item.id); setEditingChecklistLabel(item.label); }} className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteChecklist(item.id)} className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Certifications tab */}
            {tab === 'certifications' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Certifications</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{certCount}/{certTemplates.length} granted</p>
                  </div>
                  <Button variant="secondary" onClick={() => setShowSettings(!showSettings)} title="Manage templates">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                {showSettings && (
                  <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Certification Templates</p>
                    {certTemplates.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span>{t.icon} {t.name}</span>
                        <button onClick={() => setCertTemplates((p) => p.filter((c) => c.id !== t.id))} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input value={newCertIcon} onChange={(e) => setNewCertIcon(e.target.value)} className={inputClass + ' w-14 text-center'} placeholder="Icon" maxLength={2} />
                      <input value={newCertName} onChange={(e) => setNewCertName(e.target.value)} placeholder="Cert name" className={inputClass} />
                      <Button onClick={() => { if (!newCertName.trim()) return; setCertTemplates((p) => [...p, { id: generateId(), name: newCertName.trim(), icon: newCertIcon || '✅' }]); setNewCertName(''); setNewCertIcon('✅'); }}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {certTemplates.map((tmpl) => {
                    const granted = getCertStatus(tmpl.id);
                    const grantedAt = getCertDate(tmpl.id);
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => toggleCert(tmpl.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          granted
                            ? 'border-success-300 dark:border-success-700 bg-success-50 dark:bg-success-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <span className="text-xl">{tmpl.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{tmpl.name}</p>
                          {grantedAt && <p className="text-xs text-neutral-400 mt-0.5">Granted {grantedAt}</p>}
                        </div>
                        {granted
                          ? <CheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />
                          : <AlertTriangle className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
