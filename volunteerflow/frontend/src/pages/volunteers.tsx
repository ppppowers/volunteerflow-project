'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useRef } from 'react';
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
  X,
  Download,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Check,
  FileText,
  Tag,
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

/** Per-volunteer hour log entry */
interface HourEntry {
  id: string;
  eventName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: 'confirmed' | 'pending' | 'flagged';
  notes?: string;
}

/** Badge issued to a volunteer */
interface VolunteerBadge {
  id: string;
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  issuedAt: string;
  issuedBy: string;
  note?: string;
  expiresAt?: string;
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
  tags: string[];
  rating: number;
  avatar?: string;
  applicationId?: string;
  events: EventParticipation[];
  checklist?: ChecklistItem[];
  certifications?: CertificationEntry[];
  hours?: HourEntry[];
  badges?: VolunteerBadge[];
  completedTrainings?: { courseId: string; courseTitle: string; completedAt: string; }[];
}

// --- Import Wizard ---

type ImportStep = 'upload' | 'map' | 'preview' | 'done';

interface ColumnMapping { csvCol: string; field: string; }
interface ParsedRow { [key: string]: string; }
interface MappedVolunteer { name: string; email: string; phone: string; location: string; status: string; skills: string; [key: string]: string; }

const VOLUNTEER_FIELDS = [
  { key: 'name', label: 'Full Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'location', label: 'Location / City', required: false },
  { key: 'status', label: 'Status (active/inactive)', required: false },
  { key: 'skills', label: 'Skills (comma-separated)', required: false },
  { key: 'joinDate', label: 'Join Date', required: false },
  { key: '__skip', label: '— Skip this column —', required: false },
];

const SAMPLE_CSV = `First Name,Last Name,Email,Phone,City,Skills
Jane,Smith,jane.smith@email.com,555-0101,New York,"Community Outreach, Fundraising"
Carlos,Rivera,c.rivera@email.com,555-0102,Los Angeles,Event Planning
Mia,Patel,mia.patel@email.com,555-0103,Chicago,"Teaching, Mentorship"`;

function parseCsvData(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += line[i]; }
    }
    values.push(cur.trim());
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
  return { headers, rows };
}

function autoMapCols(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    const l = h.toLowerCase();
    if (l.includes('first') && l.includes('name')) map[h] = '__first';
    else if (l.includes('last') && l.includes('name')) map[h] = '__last';
    else if (l === 'name' || l === 'full name' || l === 'fullname') map[h] = 'name';
    else if (l.includes('email')) map[h] = 'email';
    else if (l.includes('phone') || l.includes('mobile')) map[h] = 'phone';
    else if (l.includes('city') || l.includes('location') || l.includes('address')) map[h] = 'location';
    else if (l.includes('skill')) map[h] = 'skills';
    else if (l.includes('status')) map[h] = 'status';
    else map[h] = '__skip';
  });
  return map;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';

function ImportUploadStep({ onParsed }: { onParsed: (h: string[], r: ParsedRow[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const process = (text: string) => {
    const { headers, rows } = parseCsvData(text);
    if (!headers.length || !rows.length) { setError('Could not parse CSV — ensure it has a header row and at least one data row.'); return; }
    setError(''); onParsed(headers, rows);
  };
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) { setError('Please upload a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => process(e.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
        {(['file', 'paste'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}>
            {t === 'file' ? 'Upload file' : 'Paste CSV'}
          </button>
        ))}
      </div>
      {tab === 'file' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'}`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Drop your CSV file here</p>
          <p className="text-xs text-neutral-400">or click to browse</p>
          <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={SAMPLE_CSV} rows={7} className={inputCls + ' font-mono resize-none'} />
          <Button onClick={() => process(pasted)} disabled={!pasted.trim()} className="mt-3 flex items-center gap-2">Parse data <ArrowRight className="w-4 h-4" /></Button>
        </div>
      )}
      {error && <div className="mt-4 flex items-start gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-400"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}</div>}
      <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <p className="text-xs text-neutral-400">Need a template?</p>
        <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' })); a.download = 'volunteer-import-sample.csv'; a.click(); }} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
          <Download className="w-3.5 h-3.5" /> Download sample CSV
        </button>
      </div>
    </div>
  );
}

function ImportMapStep({ headers, rows, mapping, setMapping, onNext, onBack }: { headers: string[]; rows: ParsedRow[]; mapping: Record<string, string>; setMapping: (m: Record<string, string>) => void; onNext: () => void; onBack: () => void; }) {
  const emailMapped = Object.values(mapping).includes('email');
  const nameMapped = Object.values(mapping).includes('name') || Object.values(mapping).includes('__first');
  const canProceed = emailMapped && nameMapped;
  return (
    <div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Match each column to a volunteer field. Auto-mapping applied where possible.</p>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {headers.map((h) => (
          <div key={h} className="grid grid-cols-2 gap-3 items-center p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{h}</p>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono truncate">{rows.slice(0, 2).map((r) => r[h]).filter(Boolean).join(', ')}</p>
            </div>
            <select value={mapping[h] ?? '__skip'} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })} className={inputCls}>
              {VOLUNTEER_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
              <option value="__first">First Name (combine)</option>
              <option value="__last">Last Name (combine)</option>
            </select>
          </div>
        ))}
      </div>
      {!canProceed && <div className="mt-3 flex items-start gap-2 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg text-sm text-warning-700 dark:text-warning-400"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />Map at least <strong className="mx-1">Name</strong> and <strong>Email</strong> to continue.</div>}
      <div className="flex justify-between mt-5">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex items-center gap-2">Preview <ArrowRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function ImportPreviewStep({ rows, mapping, onImport, onBack, importing }: { rows: ParsedRow[]; mapping: Record<string, string>; onImport: (v: MappedVolunteer[]) => void; onBack: () => void; importing: boolean; }) {
  const mapped: MappedVolunteer[] = rows.map((row) => {
    const vol: MappedVolunteer = { name: '', email: '', phone: '', location: '', status: 'active', skills: '' };
    let firstName = ''; let lastName = '';
    Object.entries(mapping).forEach(([col, field]) => {
      if (field === '__skip') return;
      if (field === '__first') firstName = row[col] ?? '';
      else if (field === '__last') lastName = row[col] ?? '';
      else vol[field] = row[col] ?? '';
    });
    if (firstName || lastName) vol.name = `${firstName} ${lastName}`.trim();
    return vol;
  });
  const valid = mapped.filter((v) => v.name && v.email);
  const invalid = mapped.filter((v) => !v.name || !v.email);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{valid.length} valid · {invalid.length} will be skipped (missing name or email)</p>
        {invalid.length > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400"><AlertCircle className="w-3 h-3" />{invalid.length} skipped</span>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-100 dark:border-neutral-800 max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
              <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Email</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden sm:table-cell">Location</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">OK</th>
            </tr>
          </thead>
          <tbody>
            {mapped.slice(0, 50).map((v, i) => {
              const ok = !!(v.name && v.email);
              return (
                <tr key={i} className={`border-b border-neutral-50 dark:border-neutral-800/50 ${!ok ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">{v.name || <span className="text-danger-400 italic text-xs">missing</span>}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 text-xs">{v.email || <span className="text-danger-400 italic">missing</span>}</td>
                  <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400 text-xs hidden sm:table-cell">{v.location || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {ok ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-success-100 dark:bg-success-900/30"><Check className="w-2.5 h-2.5 text-success-600 dark:text-success-400" /></span>
                       : <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger-100 dark:bg-danger-900/30"><X className="w-2.5 h-2.5 text-danger-600 dark:text-danger-400" /></span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-5">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={() => onImport(valid)} disabled={valid.length === 0 || importing} className="flex items-center gap-2">
          {importing ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importing…</> : <><Users className="w-4 h-4" />Import {valid.length} volunteer{valid.length !== 1 ? 's' : ''}</>}
        </Button>
      </div>
    </div>
  );
}

function ImportDoneStep({ count, onReset, onClose }: { count: number; onReset: () => void; onClose: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-success-600 dark:text-success-400" />
      </div>
      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Import complete!</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{count} volunteer{count !== 1 ? 's' : ''} imported and added to your list.</p>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onReset} className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Import more</Button>
        <Button onClick={onClose} className="flex items-center gap-2"><Users className="w-4 h-4" />Done</Button>
      </div>
    </div>
  );
}

const IMPORT_STEPS: { id: ImportStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map columns' },
  { id: 'preview', label: 'Preview' },
  { id: 'done', label: 'Done' },
];

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

const mockVolunteers: Volunteer[] = [];

// Export for use in detail page
export { mockVolunteers, defaultChecklistTemplates, defaultCertificationTemplates };
export type { Volunteer, EventParticipation, ChecklistItem, ChecklistTemplate, CertificationTemplate, CertificationEntry, HourEntry, VolunteerBadge };
export { mockVolunteers as mutableMockVolunteers };

// ─── API <-> Frontend adapter ──────────────────────────────────────────────────

interface ApiVolunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  skills?: string[];
  tags?: string[];
  hoursContributed?: number;
  status: string;
}

function mapApiVolunteer(v: ApiVolunteer): Volunteer {
  const statusRaw = v.status?.toLowerCase();
  const status: Volunteer['status'] =
    statusRaw === 'inactive' ? 'inactive' : statusRaw === 'pending' ? 'pending' : 'active';
  return {
    id: v.id,
    volunteerId: `VOL-${v.id}`,
    name: `${v.firstName} ${v.lastName}`.trim(),
    email: v.email,
    phone: v.phone ?? '',
    location: '',
    joinDate: new Date().toISOString().split('T')[0],
    status,
    eventsCompleted: 0,
    hoursContributed: v.hoursContributed ?? 0,
    skills: v.skills ?? [],
    tags: v.tags ?? [],
    rating: 0,
    events: [],
    checklist: [],
  };
}

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Import wizard state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [importing, setImporting] = useState(false);

  const openImport = () => { setImportStep('upload'); setImportHeaders([]); setImportRows([]); setImportMapping({}); setImportedCount(0); setShowImport(true); };
  const closeImport = () => setShowImport(false);

  const handleImportParsed = (h: string[], r: ParsedRow[]) => { setImportHeaders(h); setImportRows(r); setImportMapping(autoMapCols(h)); setImportStep('map'); };
  const handleImportConfirm = (vols: MappedVolunteer[]) => {
    setImporting(true);
    setTimeout(() => {
      const newVols: Volunteer[] = vols.map((v, i) => ({
        id: `import_${Date.now()}_${i}`,
        volunteerId: `VOL-${new Date().getFullYear()}-${String(volunteers.length + i + 1).padStart(3, '0')}`,
        name: v.name,
        email: v.email,
        phone: v.phone || '',
        location: v.location || '',
        joinDate: new Date().toISOString().split('T')[0],
        status: (v.status === 'inactive' ? 'inactive' : v.status === 'pending' ? 'pending' : 'active') as 'active' | 'inactive' | 'pending',
        eventsCompleted: 0,
        hoursContributed: 0,
        skills: v.skills ? v.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        tags: [],
        rating: 0,
        events: [],
        checklist: [],
      }));
      setVolunteers((prev) => [...newVols, ...prev]);
      setImportedCount(vols.length);
      setImporting(false);
      setImportStep('done');
    }, 1200);
  };

  // ── Tag management ────────────────────────────────────────────────────────
  const [orgTags, setOrgTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null);
  const [tagPickerInput, setTagPickerInput] = useState('');

  useEffect(() => {
    api.get<{ data: string[] }>('/volunteers/tags')
      .then(res => setOrgTags((res as unknown as { data: string[] }).data ?? []))
      .catch(() => {});
  }, []);

  const saveVolunteerTags = async (volunteerId: string, tags: string[]) => {
    try {
      await api.put(`/volunteers/${volunteerId}`, { tags });
      setVolunteers(prev => prev.map(v => v.id === volunteerId ? { ...v, tags } : v));
      // Refresh org tag list
      const unique = Array.from(new Set([...orgTags, ...tags])).sort();
      setOrgTags(unique);
    } catch {
      toast.error('Failed to save tags');
    }
  };

  const addTagToVolunteer = (volunteerId: string, tag: string) => {
    const vol = volunteers.find(v => v.id === volunteerId);
    if (!vol || vol.tags.includes(tag)) return;
    saveVolunteerTags(volunteerId, [...vol.tags, tag]);
    setTagPickerInput('');
    setEditingTagsFor(null);
  };

  const removeTagFromVolunteer = (volunteerId: string, tag: string) => {
    const vol = volunteers.find(v => v.id === volunteerId);
    if (!vol) return;
    saveVolunteerTags(volunteerId, vol.tags.filter(t => t !== tag));
  };

  // Form state
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    avatar: ''
  });

  // Fetch volunteers from backend on mount; fall back to mock data if unreachable
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<ApiVolunteer[]>('/volunteers?limit=100')
      .then((data) => {
        if (!cancelled) {
          setVolunteers(data.map(mapApiVolunteer));
          setUsingMockData(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVolunteers(mockVolunteers);
          setUsingMockData(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1); }, [searchTerm, statusFilter]);

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

  const PAGE_SIZE = 12;

  // Filter volunteers
  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch =
      volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.volunteerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      volunteer.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
      volunteer.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
    const matchesTag = tagFilter === 'all' || volunteer.tags.includes(tagFilter);

    return matchesSearch && matchesStatus && matchesTag;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVolunteers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedVolunteers = filteredVolunteers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    setFormErrors({});
    setShowModal(true);
  };

  // Handle delete volunteer
  const handleDeleteVolunteer = (id: string) => {
    const target = volunteers.find(v => v.id === id);
    if (!target) return;
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete <strong>{target.name}</strong>?</p>
        <p className="text-xs text-neutral-500">This action cannot be undone.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                if (!usingMockData) await api.delete(`/volunteers/${id}`);
                setVolunteers(prev => prev.filter(v => v.id !== id));
                toast.success('Volunteer deleted');
              } catch {
                toast.error('Failed to delete volunteer');
              }
            }}
            className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before API call
    const errors: { name?: string; email?: string } = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required.';
    } else if (formData.name.trim().split(/\s+/).length < 2) {
      errors.name = 'Please enter a first and last name.';
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!emailRe.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const nameParts = formData.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '-';
    const skills = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
    const statusUpper = formData.status.toUpperCase();

    if (usingMockData) {
      // Offline: add locally only
      const newVolunteer: Volunteer = {
        id: Date.now().toString(),
        volunteerId: `VOL-${new Date().getFullYear()}-${String(volunteers.length + 1).padStart(3, '0')}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        joinDate: new Date().toISOString().split('T')[0],
        status: formData.status,
        eventsCompleted: 0,
        hoursContributed: 0,
        skills,
        tags: [],
        rating: 0,
        avatar: formData.avatar,
        events: [],
        checklist: [],
      };
      setVolunteers(prev => [newVolunteer, ...prev]);
      setShowModal(false);
      return;
    }

    try {
      const created = await api.post<ApiVolunteer>('/volunteers', {
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        skills,
        status: statusUpper,
      });
      setVolunteers(prev => [{ ...mapApiVolunteer(created), location: formData.location, avatar: formData.avatar }, ...prev]);
      setShowModal(false);
      toast.success('Volunteer added');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to add volunteer';
      toast.error(msg);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Layout>
      <Head>
        <title>Volunteers — VolunteerFlow</title>
      </Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Volunteers</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Manage your volunteer community
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={handleAddVolunteer}>
              <Plus className="w-4 h-4 mr-2" />
              Add Volunteer
            </Button>
          </div>
        </div>

        {/* Offline/mock data banner */}
        {usingMockData && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg text-sm text-warning-700 dark:text-warning-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Backend offline — showing demo data. Changes will not be saved.</span>
          </div>
        )}

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
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors"
              >
                <option value="all">All Tags</option>
                {orgTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </Card>

        {/* Volunteers Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredVolunteers.length === 0 ? (
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
            {paginatedVolunteers.map((volunteer) => (
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

                {/* Tags */}
                {(volunteer.tags.length > 0 || true) && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {volunteer.tags.map(tag => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => removeTagFromVolunteer(volunteer.id, tag)}
                            className="hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
                            title={`Remove tag "${tag}"`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setEditingTagsFor(editingTagsFor === volunteer.id ? null : volunteer.id);
                            setTagPickerInput('');
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 border border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 text-xs font-medium rounded-full hover:border-violet-500 hover:text-violet-700 dark:hover:border-violet-500 dark:hover:text-violet-200 transition-colors"
                          title="Add tag"
                        >
                          <Tag className="w-3 h-3" />
                          Tag
                        </button>
                        {editingTagsFor === volunteer.id && (
                          <div
                            className="absolute bottom-full left-0 mb-1 w-52 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search or create tag..."
                                value={tagPickerInput}
                                onChange={(e) => setTagPickerInput(e.target.value)}
                                onBlur={() => setTimeout(() => setEditingTagsFor(null), 150)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && tagPickerInput.trim()) {
                                    addTagToVolunteer(volunteer.id, tagPickerInput.trim());
                                  } else if (e.key === 'Escape') {
                                    setEditingTagsFor(null);
                                  }
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              />
                            </div>
                            <div className="max-h-36 overflow-y-auto py-1">
                              {orgTags
                                .filter(t => !volunteer.tags.includes(t) && t.toLowerCase().includes(tagPickerInput.toLowerCase()))
                                .map(t => (
                                  <button
                                    key={t}
                                    onMouseDown={() => addTagToVolunteer(volunteer.id, t)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                                  >
                                    {t}
                                  </button>
                                ))
                              }
                              {tagPickerInput.trim() && !orgTags.includes(tagPickerInput.trim()) && (
                                <button
                                  onMouseDown={() => addTagToVolunteer(volunteer.id, tagPickerInput.trim())}
                                  className="w-full text-left px-3 py-1.5 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors font-medium"
                                >
                                  + Create &ldquo;{tagPickerInput.trim()}&rdquo;
                                </button>
                              )}
                              {orgTags.filter(t => !volunteer.tags.includes(t) && t.toLowerCase().includes(tagPickerInput.toLowerCase())).length === 0 && !tagPickerInput.trim() && (
                                <p className="px-3 py-2 text-xs text-neutral-400">Type to search or create a tag</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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

        {/* Pagination */}
        {!loading && filteredVolunteers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredVolunteers.length)} of {filteredVolunteers.length} volunteers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-700 dark:text-neutral-300 px-2">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
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
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors((prev) => ({ ...prev, name: undefined })); }}
                      className={`w-full px-4 py-2 border ${formErrors.name ? 'border-danger-500 dark:border-danger-400' : 'border-neutral-300 dark:border-neutral-600'} bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors`}
                      placeholder="John Doe"
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors((prev) => ({ ...prev, email: undefined })); }}
                      className={`w-full px-4 py-2 border ${formErrors.email ? 'border-danger-500 dark:border-danger-400' : 'border-neutral-300 dark:border-neutral-600'} bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors`}
                      placeholder="john@email.com"
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{formErrors.email}</p>}
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

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[9999]" onClick={(e) => { if (e.target === e.currentTarget) closeImport(); }}>
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Import Volunteers</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Bulk import from a CSV file</p>
                </div>
              </div>
              <button onClick={closeImport} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Progress stepper */}
            {importStep !== 'done' && (
              <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-100 dark:border-neutral-700">
                {IMPORT_STEPS.filter(s => s.id !== 'done').map((s, i, arr) => {
                  const stepIdx = IMPORT_STEPS.findIndex(x => x.id === importStep);
                  const thisIdx = IMPORT_STEPS.findIndex(x => x.id === s.id);
                  const done = thisIdx < stepIdx;
                  const active = s.id === importStep;
                  return (
                    <div key={s.id} className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center gap-2 ${active ? 'text-primary-600 dark:text-primary-400' : done ? 'text-success-600 dark:text-success-400' : 'text-neutral-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? 'bg-primary-600 text-white' : done ? 'bg-success-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                          {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className={`flex-1 h-px ${done ? 'bg-success-400' : 'bg-neutral-200 dark:bg-neutral-700'}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step content */}
            <div className="p-6">
              {importStep === 'upload'  && <ImportUploadStep onParsed={handleImportParsed} />}
              {importStep === 'map'     && <ImportMapStep headers={importHeaders} rows={importRows} mapping={importMapping} setMapping={setImportMapping} onNext={() => setImportStep('preview')} onBack={() => setImportStep('upload')} />}
              {importStep === 'preview' && <ImportPreviewStep rows={importRows} mapping={importMapping} onImport={handleImportConfirm} onBack={() => setImportStep('map')} importing={importing} />}
              {importStep === 'done'    && <ImportDoneStep count={importedCount} onReset={() => setImportStep('upload')} onClose={closeImport} />}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}