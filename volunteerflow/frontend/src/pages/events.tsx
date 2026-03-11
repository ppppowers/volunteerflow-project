// frontend/src/pages/events.tsx
import { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Image as ImageIcon,
  X,
  Shield,
  Tag,
  Globe,
  Lock,
  AlertCircle,
  Copy,
  Eye,
  CalendarDays,
  UserCheck,
  UserX,
  Hourglass,
  FileText,
  Megaphone,
  Briefcase,
  Hash,
  Upload,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Shift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  signedUp: number;
  role: string;
  description?: string;
}

type VolunteerStatus = 'approved' | 'pending' | 'rejected';

interface EligibilitySettings {
  allowedStatuses: VolunteerStatus[];
  requireApplication: boolean;
  applicationTemplateId?: string;
  minimumAge?: number;
  requireBackgroundCheck: boolean;
  customRequirements: string[];
}

type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
type EventCategory =
  | 'community'
  | 'fundraising'
  | 'education'
  | 'environment'
  | 'health'
  | 'animals'
  | 'seniors'
  | 'youth'
  | 'disaster_relief'
  | 'other';

interface VolunteerEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  coverImage?: string;
  images: string[];
  location: string;
  address?: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  visibility: 'public' | 'private';
  maxVolunteers?: number;
  registrationDeadline?: string;
  shifts: Shift[];
  eligibility: EligibilitySettings;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

type PageView = 'list' | 'builder' | 'detail';

// ─── Constants ───────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 10);

const CATEGORIES: { value: EventCategory; label: string; icon: typeof Calendar }[] = [
  { value: 'community', label: 'Community', icon: Users },
  { value: 'fundraising', label: 'Fundraising', icon: Megaphone },
  { value: 'education', label: 'Education', icon: FileText },
  { value: 'environment', label: 'Environment', icon: Globe },
  { value: 'health', label: 'Health', icon: Shield },
  { value: 'animals', label: 'Animals', icon: Shield },
  { value: 'seniors', label: 'Seniors', icon: Users },
  { value: 'youth', label: 'Youth', icon: Users },
  { value: 'disaster_relief', label: 'Disaster Relief', icon: AlertCircle },
  { value: 'other', label: 'Other', icon: Tag },
];

const EVENT_STATUS_CONFIG: Record<EventStatus, { color: string; bg: string; label: string }> = {
  draft: { color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-100 dark:bg-warning-900/40', label: 'Draft' },
  published: { color: 'text-success-600 dark:text-success-400', bg: 'bg-success-100 dark:bg-success-900/40', label: 'Published' },
  cancelled: { color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-100 dark:bg-danger-900/40', label: 'Cancelled' },
  completed: { color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-700', label: 'Completed' },
};

const VOLUNTEER_STATUS_CONFIG: Record<VolunteerStatus, { label: string; icon: typeof UserCheck; color: string }> = {
  approved: { label: 'Approved Volunteers', icon: UserCheck, color: 'text-success-600 dark:text-success-400' },
  pending: { label: 'Pending Volunteers', icon: Hourglass, color: 'text-warning-600 dark:text-warning-400' },
  rejected: { label: 'Rejected Volunteers', icon: UserX, color: 'text-danger-600 dark:text-danger-400' },
};

const DEFAULT_ELIGIBILITY: EligibilitySettings = {
  allowedStatuses: ['approved'],
  requireApplication: false,
  requireBackgroundCheck: false,
  customRequirements: [],
};

// TODO: Replace with real data from your application templates API/store
const APPLICATION_TEMPLATES = [
  { id: 'tmpl_1', name: 'General Volunteer Application' },
  { id: 'tmpl_2', name: 'Youth Mentorship Program' },
  { id: 'tmpl_3', name: 'Emergency Response Team' },
];

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const formatTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_EVENTS: VolunteerEvent[] = [
  {
    id: 'evt_1',
    title: 'Community Clean-up Drive',
    description: 'Join us for our monthly neighborhood clean-up event. We will be picking up litter, planting flowers, and beautifying our shared spaces. All supplies provided — just bring water and a positive attitude!',
    category: 'environment',
    coverImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=400&fit=crop',
    images: [],
    location: 'Central Park — West Entrance',
    address: '123 Park Ave, New York, NY 10001',
    startDate: '2024-04-15',
    endDate: '2024-04-15',
    status: 'published',
    visibility: 'public',
    maxVolunteers: 50,
    registrationDeadline: '2024-04-12',
    shifts: [
      { id: 's1', name: 'Morning Shift', date: '2024-04-15', startTime: '08:00', endTime: '12:00', capacity: 25, signedUp: 18, role: 'General Volunteer', description: 'Pick-up and planting crew' },
      { id: 's2', name: 'Afternoon Shift', date: '2024-04-15', startTime: '13:00', endTime: '17:00', capacity: 25, signedUp: 12, role: 'General Volunteer', description: 'Beautification and final sweep' },
    ],
    eligibility: { allowedStatuses: ['approved'], requireApplication: false, requireBackgroundCheck: false, customRequirements: [] },
    tags: ['outdoor', 'environment', 'family-friendly'],
    createdAt: '2024-03-01',
    updatedAt: '2024-03-10',
    contactName: 'Maria Lopez',
    contactEmail: 'maria@volunteerflow.com',
    notes: 'Rain date: April 22.',
  },
  {
    id: 'evt_2',
    title: 'Youth Mentorship Saturday',
    description: 'Spend the morning mentoring local youth through structured activities including homework help, career exploration, and team-building exercises.',
    category: 'youth',
    coverImage: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800&h=400&fit=crop',
    images: [],
    location: 'Downtown Community Center',
    address: '456 Main St, New York, NY 10002',
    startDate: '2024-04-20',
    endDate: '2024-04-20',
    status: 'published',
    visibility: 'public',
    maxVolunteers: 15,
    registrationDeadline: '2024-04-17',
    shifts: [
      { id: 's3', name: 'Full Day', date: '2024-04-20', startTime: '09:00', endTime: '14:00', capacity: 15, signedUp: 9, role: 'Mentor', description: 'One-on-one mentorship session' },
    ],
    eligibility: { allowedStatuses: ['approved'], requireApplication: true, applicationTemplateId: 'tmpl_2', requireBackgroundCheck: true, minimumAge: 21, customRequirements: ['Must complete orientation training'] },
    tags: ['mentorship', 'education', 'youth'],
    createdAt: '2024-03-05',
    updatedAt: '2024-03-12',
    contactName: 'James Wright',
    contactEmail: 'james@volunteerflow.com',
  },
  {
    id: 'evt_3',
    title: 'Food Bank Distribution Day',
    description: 'Help sort, pack, and distribute food boxes to families in need across our three distribution zones.',
    category: 'community',
    coverImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop',
    images: [],
    location: 'Regional Food Bank Warehouse',
    address: '789 Industrial Blvd, New York, NY 10003',
    startDate: '2024-04-25',
    endDate: '2024-04-25',
    status: 'draft',
    visibility: 'public',
    maxVolunteers: 40,
    shifts: [
      { id: 's4', name: 'Sorting', date: '2024-04-25', startTime: '07:00', endTime: '10:00', capacity: 15, signedUp: 0, role: 'Sorter' },
      { id: 's5', name: 'Packing', date: '2024-04-25', startTime: '10:00', endTime: '13:00', capacity: 15, signedUp: 0, role: 'Packer' },
      { id: 's6', name: 'Distribution', date: '2024-04-25', startTime: '13:00', endTime: '16:00', capacity: 10, signedUp: 0, role: 'Driver / Distributor' },
    ],
    eligibility: { allowedStatuses: ['approved', 'pending'], requireApplication: false, requireBackgroundCheck: false, customRequirements: ['Closed-toe shoes required', 'Able to lift 30 lbs'] },
    tags: ['food', 'community', 'physical'],
    createdAt: '2024-03-08',
    updatedAt: '2024-03-08',
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${color}`}>
      {label}
    </span>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
        {subtitle && <p className="text-neutral-600 dark:text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Collapsible section used inside the event builder */
function BuilderSection({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Calendar;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-neutral-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-neutral-100 dark:border-neutral-700 space-y-4">
          {children}
        </div>
      )}
    </Card>
  );
}

/** Reusable form field wrapper */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        {label}
        {required && <span className="text-danger-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

const selectClass =
  'px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none';

// ─── Shift Editor Row ────────────────────────────────────────────────────────

function ShiftRow({
  shift,
  onUpdate,
  onDelete,
}: {
  shift: Shift;
  onUpdate: (s: Shift) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={shift.name}
          onChange={(e) => onUpdate({ ...shift, name: e.target.value })}
          placeholder="Shift name (e.g. Morning Shift)"
          className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-primary-500 outline-none pb-0.5 flex-1 mr-3 placeholder-neutral-400 dark:placeholder-neutral-500"
        />
        <button
          onClick={onDelete}
          className="p-1 rounded text-neutral-400 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove shift"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Date</label>
          <input
            type="date"
            value={shift.date}
            onChange={(e) => onUpdate({ ...shift, date: e.target.value })}
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Start Time</label>
          <input
            type="time"
            value={shift.startTime}
            onChange={(e) => onUpdate({ ...shift, startTime: e.target.value })}
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">End Time</label>
          <input
            type="time"
            value={shift.endTime}
            onChange={(e) => onUpdate({ ...shift, endTime: e.target.value })}
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Capacity</label>
          <input
            type="number"
            min={1}
            value={shift.capacity}
            onChange={(e) => onUpdate({ ...shift, capacity: parseInt(e.target.value) || 1 })}
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Role / Position</label>
          <input
            type="text"
            value={shift.role}
            onChange={(e) => onUpdate({ ...shift, role: e.target.value })}
            placeholder="e.g. Team Lead, General Volunteer"
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Description (optional)</label>
          <input
            type="text"
            value={shift.description ?? ''}
            onChange={(e) => onUpdate({ ...shift, description: e.target.value || undefined })}
            placeholder="Brief description of duties..."
            className={inputClass + ' !py-2 !text-xs'}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Events() {
  const [view, setView] = useState<PageView>('list');
  const [events, setEvents] = useState<VolunteerEvent[]>(MOCK_EVENTS);
  const [editingEvent, setEditingEvent] = useState<VolunteerEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<VolunteerEvent | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Image URL input
  const [imageUrlInput, setImageUrlInput] = useState('');
  const coverFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Tag input
  const [tagInput, setTagInput] = useState('');

  // Custom requirement input
  const [requirementInput, setRequirementInput] = useState('');

  // ── Builder helpers ────────────────────────────────────────────────────

  const createBlankEvent = (): VolunteerEvent => ({
    id: generateId(),
    title: '',
    description: '',
    category: 'community',
    images: [],
    location: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    visibility: 'public',
    shifts: [],
    eligibility: { ...DEFAULT_ELIGIBILITY, allowedStatuses: ['approved'], customRequirements: [] },
    tags: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  });

  const openBuilder = (event?: VolunteerEvent) => {
    const e = event
      ? { ...event, shifts: event.shifts.map((s) => ({ ...s })), eligibility: { ...event.eligibility, allowedStatuses: [...event.eligibility.allowedStatuses], customRequirements: [...event.eligibility.customRequirements] }, tags: [...event.tags], images: [...event.images] }
      : createBlankEvent();
    setEditingEvent(e);
    setImageUrlInput('');
    setTagInput('');
    setRequirementInput('');
    setView('builder');
  };

  const saveEvent = () => {
    if (!editingEvent) return;
    const updated = { ...editingEvent, updatedAt: new Date().toISOString().split('T')[0] };
    setEvents((prev) => {
      const idx = prev.findIndex((ev) => ev.id === updated.id);
      return idx >= 0 ? prev.map((ev, i) => (i === idx ? updated : ev)) : [...prev, updated];
    });
    setEditingEvent(null);
    setView('list');
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  const duplicateEvent = (ev: VolunteerEvent) => {
    const dup: VolunteerEvent = {
      ...ev,
      id: generateId(),
      title: `${ev.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      shifts: ev.shifts.map((s) => ({ ...s, id: generateId(), signedUp: 0 })),
      eligibility: { ...ev.eligibility, allowedStatuses: [...ev.eligibility.allowedStatuses], customRequirements: [...ev.eligibility.customRequirements] },
      tags: [...ev.tags],
      images: [...ev.images],
    };
    setEvents((prev) => [...prev, dup]);
  };

  // Editing helpers — all use functional updater
  const updateField = <K extends keyof VolunteerEvent>(key: K, value: VolunteerEvent[K]) => {
    setEditingEvent((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateEligibility = <K extends keyof EligibilitySettings>(key: K, value: EligibilitySettings[K]) => {
    setEditingEvent((prev) =>
      prev ? { ...prev, eligibility: { ...prev.eligibility, [key]: value } } : prev,
    );
  };

  const addShift = () => {
    setEditingEvent((prev) => {
      if (!prev) return prev;
      const newShift: Shift = {
        id: generateId(),
        name: `Shift ${prev.shifts.length + 1}`,
        date: prev.startDate || '',
        startTime: '09:00',
        endTime: '12:00',
        capacity: 10,
        signedUp: 0,
        role: 'Volunteer',
      };
      return { ...prev, shifts: [...prev.shifts, newShift] };
    });
  };

  const updateShift = (shiftId: string, updated: Shift) => {
    setEditingEvent((prev) =>
      prev ? { ...prev, shifts: prev.shifts.map((s) => (s.id === shiftId ? updated : s)) } : prev,
    );
  };

  const deleteShift = (shiftId: string) => {
    setEditingEvent((prev) =>
      prev ? { ...prev, shifts: prev.shifts.filter((s) => s.id !== shiftId) } : prev,
    );
  };

  const addImage = () => {
    if (!imageUrlInput.trim()) return;
    setEditingEvent((prev) =>
      prev ? { ...prev, images: [...prev.images, imageUrlInput.trim()] } : prev,
    );
    setImageUrlInput('');
  };

  const removeImage = (idx: number) => {
    setEditingEvent((prev) =>
      prev ? { ...prev, images: prev.images.filter((_, i) => i !== idx) } : prev,
    );
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateField('coverImage', dataUrl);
    if (coverFileRef.current) coverFileRef.current.value = '';
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = await Promise.all(Array.from(files).map(fileToDataUrl));
    setEditingEvent((prev) =>
      prev ? { ...prev, images: [...prev.images, ...urls] } : prev,
    );
    if (galleryFileRef.current) galleryFileRef.current.value = '';
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    setEditingEvent((prev) => {
      if (!prev || prev.tags.includes(tagInput.trim().toLowerCase())) return prev;
      return { ...prev, tags: [...prev.tags, tagInput.trim().toLowerCase()] };
    });
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setEditingEvent((prev) =>
      prev ? { ...prev, tags: prev.tags.filter((tag) => tag !== t) } : prev,
    );
  };

  const addRequirement = () => {
    if (!requirementInput.trim()) return;
    updateEligibility('customRequirements', [
      ...(editingEvent?.eligibility.customRequirements ?? []),
      requirementInput.trim(),
    ]);
    setRequirementInput('');
  };

  const removeRequirement = (idx: number) => {
    setEditingEvent((prev) =>
      prev
        ? { ...prev, eligibility: { ...prev.eligibility, customRequirements: prev.eligibility.customRequirements.filter((_, i) => i !== idx) } }
        : prev,
    );
  };

  // ── Filtering ──────────────────────────────────────────────────────────

  const filtered = events.filter((ev) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || ev.title.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q) || ev.category.includes(q);
    const matchStatus = filterStatus === 'all' || ev.status === filterStatus;
    const matchCat = filterCategory === 'all' || ev.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const totalVolunteers = (ev: VolunteerEvent) => ev.shifts.reduce((sum, s) => sum + s.signedUp, 0);
  const totalCapacity = (ev: VolunteerEvent) => ev.shifts.reduce((sum, s) => sum + s.capacity, 0);

  // ── Renders ────────────────────────────────────────────────────────────

  /** EVENT LIST VIEW */
  const renderList = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Events"
        subtitle="Create, manage, and track volunteer events"
        action={
          <Button onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search events by name, location, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={inputClass + ' !pl-10'}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Event Cards */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">No events found</p>
          <Button onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first event
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((ev) => {
            const statusBadge = EVENT_STATUS_CONFIG[ev.status];
            const catMeta = CATEGORIES.find((c) => c.value === ev.category);
            const vol = totalVolunteers(ev);
            const cap = totalCapacity(ev);

            return (
              <Card key={ev.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Cover image */}
                {ev.coverImage ? (
                  <div className="h-40 bg-neutral-200 dark:bg-neutral-700 relative overflow-hidden">
                    <img src={ev.coverImage} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3">
                      <Badge {...statusBadge} />
                    </div>
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-neutral-800 flex items-center justify-center relative">
                    <Calendar className="w-8 h-8 text-primary-300 dark:text-primary-700" />
                    <div className="absolute top-3 right-3">
                      <Badge {...statusBadge} />
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                      {ev.title || 'Untitled Event'}
                    </h3>
                    {catMeta && (
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded flex-shrink-0">
                        {catMeta.label}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">
                    {ev.description || 'No description'}
                  </p>

                  {/* Meta info */}
                  <div className="space-y-1.5 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{formatDate(ev.startDate)}{ev.endDate !== ev.startDate ? ` – ${formatDate(ev.endDate)}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{vol} / {cap} volunteers · {ev.shifts.length} shift{ev.shifts.length !== 1 ? 's' : ''}</span>
                    </div>
                    {ev.eligibility.allowedStatuses.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {ev.eligibility.allowedStatuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')} volunteers only
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Capacity bar */}
                  {cap > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-neutral-500 dark:text-neutral-400">Capacity</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{Math.round((vol / cap) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${vol / cap >= 0.9 ? 'bg-danger-500' : vol / cap >= 0.6 ? 'bg-warning-500' : 'bg-success-500'}`}
                          style={{ width: `${Math.min(100, (vol / cap) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {ev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {ev.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-[10px] rounded-full font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-700 flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => openBuilder(ev)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setActiveEvent(ev); setView('detail'); }}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicateEvent(ev)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Duplicate
                    </Button>
                    <button
                      onClick={() => deleteEvent(ev.id)}
                      className="ml-auto p-1.5 rounded hover:bg-danger-50 dark:hover:bg-danger-900/30 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  /** EVENT BUILDER VIEW */
  const renderBuilder = () => {
    if (!editingEvent) return null;

    return (
      <div className="space-y-5">
        <SectionHeader
          title={editingEvent.title || 'New Event'}
          subtitle="Configure every detail of your event"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setEditingEvent(null); setView('list'); }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveEvent}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Event
              </Button>
            </div>
          }
        />

        {/* ── Section 1: Basic Info ─────────────────────────────────────────── */}
        <BuilderSection title="Basic Information" subtitle="Name, description, and category" icon={FileText} defaultOpen>
          <Field label="Event Title" required>
            <input
              type="text"
              value={editingEvent.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Community Clean-up Drive"
              className={inputClass}
            />
          </Field>

          <Field label="Description" required>
            <textarea
              value={editingEvent.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the event, expectations, and what volunteers can look forward to..."
              rows={4}
              className={inputClass + ' resize-none'}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category">
              <select
                value={editingEvent.category}
                onChange={(e) => updateField('category', e.target.value as EventCategory)}
                className={selectClass + ' w-full'}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={editingEvent.status}
                onChange={(e) => updateField('status', e.target.value as EventStatus)}
                className={selectClass + ' w-full'}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Visibility">
              <div className="flex gap-3">
                {[
                  { value: 'public' as const, icon: Globe, label: 'Public' },
                  { value: 'private' as const, icon: Lock, label: 'Private' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateField('visibility', opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                      editingEvent.visibility === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500'
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Max Volunteers (overall)">
              <input
                type="number"
                min={0}
                value={editingEvent.maxVolunteers ?? ''}
                onChange={(e) => updateField('maxVolunteers', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Leave blank for no limit"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Tags */}
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {editingEvent.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs rounded-full font-medium">
                  #{t}
                  <button onClick={() => removeTag(t)} className="text-neutral-400 hover:text-danger-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className={inputClass + ' flex-1'}
              />
              <Button size="sm" variant="outline" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Field>
        </BuilderSection>

        {/* ── Section 2: Images ─────────────────────────────────────────────── */}
        <BuilderSection title="Images" subtitle="Cover photo and gallery" icon={ImageIcon}>
          {/* Cover image */}
          <Field label="Cover Image">
            {editingEvent.coverImage ? (
              <div className="relative rounded-lg overflow-hidden h-44 bg-neutral-100 dark:bg-neutral-700 mb-2">
                <img src={editingEvent.coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => updateField('coverImage', undefined)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  title="Remove cover image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverFileRef.current?.click()}
                className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors mb-2"
              >
                <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Click to upload a cover image</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">or paste a URL below</p>
              </div>
            )}
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <input
                type="url"
                value={editingEvent.coverImage?.startsWith('data:') ? '' : editingEvent.coverImage ?? ''}
                onChange={(e) => updateField('coverImage', e.target.value || undefined)}
                placeholder="Or paste an image URL..."
                className={inputClass + ' flex-1'}
              />
              <Button size="sm" variant="outline" onClick={() => coverFileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1.5" />
                Upload
              </Button>
            </div>
          </Field>

          {/* Additional images */}
          <Field label="Additional Images">
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                placeholder="Paste image URL..."
                className={inputClass + ' flex-1'}
              />
              <Button size="sm" variant="outline" onClick={addImage}>
                <Plus className="w-4 h-4 mr-1.5" />
                URL
              </Button>
              <Button size="sm" variant="outline" onClick={() => galleryFileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1.5" />
                Upload
              </Button>
              <input
                ref={galleryFileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryFilesChange}
                className="hidden"
              />
            </div>

            {editingEvent.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {editingEvent.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden h-24 bg-neutral-100 dark:bg-neutral-700">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {/* Add more tile */}
                <button
                  onClick={() => galleryFileRef.current?.click()}
                  className="h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                >
                  <Plus className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Add more</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => galleryFileRef.current?.click()}
                className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
              >
                <ImageIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Drop images here or click to upload</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">You can also paste URLs above</p>
              </div>
            )}
          </Field>
        </BuilderSection>

        {/* ── Section 3: Location & Dates ───────────────────────────────────── */}
        <BuilderSection title="Location & Schedule" subtitle="Where and when the event takes place" icon={CalendarDays}>
          <Field label="Location Name" required>
            <input
              type="text"
              value={editingEvent.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g. Central Park — West Entrance"
              className={inputClass}
            />
          </Field>
          <Field label="Full Address">
            <input
              type="text"
              value={editingEvent.address ?? ''}
              onChange={(e) => updateField('address', e.target.value || undefined)}
              placeholder="123 Park Ave, New York, NY 10001"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Start Date" required>
              <input type="date" value={editingEvent.startDate} onChange={(e) => updateField('startDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="End Date" required>
              <input type="date" value={editingEvent.endDate} onChange={(e) => updateField('endDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Registration Deadline">
              <input
                type="date"
                value={editingEvent.registrationDeadline ?? ''}
                onChange={(e) => updateField('registrationDeadline', e.target.value || undefined)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Field label="Contact Name">
              <input type="text" value={editingEvent.contactName ?? ''} onChange={(e) => updateField('contactName', e.target.value || undefined)} placeholder="Jane Doe" className={inputClass} />
            </Field>
            <Field label="Contact Email">
              <input type="email" value={editingEvent.contactEmail ?? ''} onChange={(e) => updateField('contactEmail', e.target.value || undefined)} placeholder="jane@example.com" className={inputClass} />
            </Field>
            <Field label="Contact Phone">
              <input type="tel" value={editingEvent.contactPhone ?? ''} onChange={(e) => updateField('contactPhone', e.target.value || undefined)} placeholder="(555) 123-4567" className={inputClass} />
            </Field>
          </div>
        </BuilderSection>

        {/* ── Section 4: Shifts ──────────────────────────────────────────────── */}
        <BuilderSection title="Shifts" subtitle={`${editingEvent.shifts.length} shift${editingEvent.shifts.length !== 1 ? 's' : ''} configured`} icon={Clock}>
          {editingEvent.shifts.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
              <Clock className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">No shifts added yet</p>
              <Button size="sm" onClick={addShift}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Shift
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {editingEvent.shifts.map((s) => (
                <ShiftRow
                  key={s.id}
                  shift={s}
                  onUpdate={(updated) => updateShift(s.id, updated)}
                  onDelete={() => deleteShift(s.id)}
                />
              ))}
              <button
                onClick={addShift}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Shift
              </button>
            </div>
          )}
        </BuilderSection>

        {/* ── Section 5: Eligibility ─────────────────────────────────────────── */}
        <BuilderSection title="Eligibility & Requirements" subtitle="Control who can sign up" icon={Shield}>
          {/* Allowed volunteer statuses */}
          <Field label="Allowed Volunteer Statuses" required>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Select which volunteer statuses are permitted to register for this event.</p>
            <div className="space-y-2">
              {(['approved', 'pending', 'rejected'] as VolunteerStatus[]).map((status) => {
                const cfg = VOLUNTEER_STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                const checked = editingEvent.eligibility.allowedStatuses.includes(status);
                return (
                  <label
                    key={status}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = editingEvent.eligibility.allowedStatuses;
                        const next = checked ? current.filter((s) => s !== status) : [...current, status];
                        updateEligibility('allowedStatuses', next);
                      }}
                      className="rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                    />
                    <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{cfg.label}</span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {status === 'approved' && 'Volunteers whose application has been approved'}
                        {status === 'pending' && 'Volunteers with pending applications — not yet reviewed'}
                        {status === 'rejected' && 'Volunteers whose application was denied'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>

          {/* Require application */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/30 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Require Application Form</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Volunteers must complete a specific application before registering</p>
              </div>
            </div>
            <button
              onClick={() => updateEligibility('requireApplication', !editingEvent.eligibility.requireApplication)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                editingEvent.eligibility.requireApplication ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  editingEvent.eligibility.requireApplication ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {editingEvent.eligibility.requireApplication && (
            <Field label="Application Form">
              <select
                value={editingEvent.eligibility.applicationTemplateId ?? ''}
                onChange={(e) => updateEligibility('applicationTemplateId', e.target.value || undefined)}
                className={selectClass + ' w-full'}
              >
                <option value="">Select an application form...</option>
                {APPLICATION_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Background check */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/30 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Require Background Check</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Only volunteers with a completed background check can sign up</p>
              </div>
            </div>
            <button
              onClick={() => updateEligibility('requireBackgroundCheck', !editingEvent.eligibility.requireBackgroundCheck)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                editingEvent.eligibility.requireBackgroundCheck ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  editingEvent.eligibility.requireBackgroundCheck ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {/* Minimum age */}
          <Field label="Minimum Age">
            <input
              type="number"
              min={0}
              value={editingEvent.eligibility.minimumAge ?? ''}
              onChange={(e) => updateEligibility('minimumAge', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Leave blank for no age requirement"
              className={inputClass}
            />
          </Field>

          {/* Custom requirements */}
          <Field label="Custom Requirements">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Add any additional requirements volunteers must meet.</p>
            {editingEvent.eligibility.customRequirements.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {editingEvent.eligibility.customRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-warning-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">{req}</span>
                    <button
                      onClick={() => removeRequirement(idx)}
                      className="p-0.5 rounded text-neutral-400 hover:text-danger-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                placeholder="e.g. Must wear closed-toe shoes"
                className={inputClass + ' flex-1'}
              />
              <Button size="sm" variant="outline" onClick={addRequirement}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </Field>
        </BuilderSection>

        {/* ── Section 6: Notes ───────────────────────────────────────────────── */}
        <BuilderSection title="Internal Notes" subtitle="Private notes for organizers only" icon={Briefcase}>
          <Field label="Organizer Notes">
            <textarea
              value={editingEvent.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value || undefined)}
              placeholder="Internal notes, reminders, or special instructions for the organizing team..."
              rows={4}
              className={inputClass + ' resize-none'}
            />
          </Field>
        </BuilderSection>
      </div>
    );
  };

  /** EVENT DETAIL VIEW */
  const renderDetail = () => {
    if (!activeEvent) return null;
    const statusBadge = EVENT_STATUS_CONFIG[activeEvent.status];
    const catMeta = CATEGORIES.find((c) => c.value === activeEvent.category);
    const vol = totalVolunteers(activeEvent);
    const cap = totalCapacity(activeEvent);

    return (
      <div className="space-y-6">
        <SectionHeader
          title={activeEvent.title}
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setActiveEvent(null); setView('list'); }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => openBuilder(activeEvent)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
            </div>
          }
        />

        {/* Cover image */}
        {activeEvent.coverImage && (
          <div className="rounded-xl overflow-hidden h-56 bg-neutral-200 dark:bg-neutral-700">
            <img src={activeEvent.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Status & meta */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge {...statusBadge} />
            {catMeta && (
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                {catMeta.label}
              </span>
            )}
            <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              {activeEvent.visibility === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {activeEvent.visibility === 'public' ? 'Public' : 'Private'}
            </span>
            {activeEvent.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-[10px] rounded-full font-medium">#{t}</span>
            ))}
          </div>

          <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mb-4">{activeEvent.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Date</p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(activeEvent.startDate)}{activeEvent.endDate !== activeEvent.startDate ? ` – ${formatDate(activeEvent.endDate)}` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Location</p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{activeEvent.location}</p>
              {activeEvent.address && <p className="text-xs text-neutral-400 dark:text-neutral-500">{activeEvent.address}</p>}
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Volunteers</p>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{vol} / {cap}</p>
            </div>
            {activeEvent.registrationDeadline && (
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">Registration Deadline</p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{formatDate(activeEvent.registrationDeadline)}</p>
              </div>
            )}
          </div>

          {/* Contact */}
          {(activeEvent.contactName || activeEvent.contactEmail) && (
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Event Contact</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {activeEvent.contactName}{activeEvent.contactEmail ? ` · ${activeEvent.contactEmail}` : ''}{activeEvent.contactPhone ? ` · ${activeEvent.contactPhone}` : ''}
              </p>
            </div>
          )}
        </Card>

        {/* Shifts */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Shifts ({activeEvent.shifts.length})
          </h2>
          <div className="space-y-3">
            {activeEvent.shifts.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(s.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(s.startTime)} – {formatTime(s.endTime)}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{s.role}</span>
                    </div>
                    {s.description && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{s.signedUp} / {s.capacity}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">volunteers</p>
                    </div>
                    <div className="w-20 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.signedUp / s.capacity >= 0.9 ? 'bg-danger-500' : s.signedUp / s.capacity >= 0.6 ? 'bg-warning-500' : 'bg-success-500'}`}
                        style={{ width: `${Math.min(100, (s.signedUp / s.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Eligibility summary */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Eligibility</h2>
          <Card className="p-5 space-y-3">
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Allowed Statuses</p>
              <div className="flex flex-wrap gap-2">
                {activeEvent.eligibility.allowedStatuses.map((s) => {
                  const cfg = VOLUNTEER_STATUS_CONFIG[s];
                  const SIcon = cfg.icon;
                  return (
                    <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color} bg-neutral-50 dark:bg-neutral-700/50`}>
                      <SIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {activeEvent.eligibility.requireApplication && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-500" />
                Application form required{activeEvent.eligibility.applicationTemplateId ? ` — ${APPLICATION_TEMPLATES.find((t) => t.id === activeEvent.eligibility.applicationTemplateId)?.name ?? activeEvent.eligibility.applicationTemplateId}` : ''}
              </p>
            )}
            {activeEvent.eligibility.requireBackgroundCheck && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-warning-500" />
                Background check required
              </p>
            )}
            {activeEvent.eligibility.minimumAge && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-500" />
                Minimum age: {activeEvent.eligibility.minimumAge}
              </p>
            )}
            {activeEvent.eligibility.customRequirements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">Additional Requirements</p>
                <ul className="space-y-1">
                  {activeEvent.eligibility.customRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Internal notes */}
        {activeEvent.notes && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Internal Notes</h2>
            <Card className="p-5">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{activeEvent.notes}</p>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // ── Page ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {view === 'list' && renderList()}
        {view === 'builder' && renderBuilder()}
        {view === 'detail' && renderDetail()}
      </div>
    </Layout>
  );
}
