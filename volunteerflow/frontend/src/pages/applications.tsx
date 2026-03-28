// frontend/src/pages/applications.tsx
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  Copy,
  ArrowLeft,
  Type,
  AlignLeft,
  CheckSquare,
  Circle,
  List,
  Hash,
  CalendarDays,
  Mail,
  ToggleLeft,
  X,
  FileQuestion,
  ClipboardList,
  Link2,
  QrCode,
  Send,
  ExternalLink,
  Check,
  Users,
  UserCheck,
  Crown,
  Edit,
} from 'lucide-react';
import { SignupFormBuilder } from '@/components/people/SignupFormBuilder';
import { signupFormConfigs } from '@/lib/signupForms';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'checkbox'
  | 'checkbox_group'
  | 'radio'
  | 'dropdown'
  | 'number'
  | 'date'
  | 'email'
  | 'toggle';

interface QuestionOption {
  id: string;
  label: string;
}

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: QuestionOption[];
  description?: string;
}

interface ApplicationTemplate {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'draft' | 'archived';
  submissionCount: number;
}

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

interface Submission {
  id: string;
  templateId: string;
  templateName: string;
  volunteerName: string;
  volunteerEmail: string;
  submittedAt: string;
  status: SubmissionStatus;
  answers: Record<string, string | string[] | boolean>;
}

type PageView = 'templates' | 'builder' | 'submissions' | 'submission_detail' | 'signup_forms';

interface GroupItem {
  id: string;
  name: string;
  color: string;
  applicationTemplateId?: string | null;
}

// ─── Question type metadata ──────────────────────────────────────────────────

const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  icon: typeof Type;
  hasOptions: boolean;
}[] = [
  { type: 'short_text', label: 'Short Text', icon: Type, hasOptions: false },
  { type: 'long_text', label: 'Long Text', icon: AlignLeft, hasOptions: false },
  { type: 'checkbox', label: 'Single Checkbox', icon: CheckSquare, hasOptions: false },
  { type: 'checkbox_group', label: 'Checkbox Group', icon: CheckSquare, hasOptions: true },
  { type: 'radio', label: 'Multiple Choice', icon: Circle, hasOptions: true },
  { type: 'dropdown', label: 'Dropdown', icon: List, hasOptions: true },
  { type: 'number', label: 'Number', icon: Hash, hasOptions: false },
  { type: 'date', label: 'Date', icon: CalendarDays, hasOptions: false },
  { type: 'email', label: 'Email', icon: Mail, hasOptions: false },
  { type: 'toggle', label: 'Yes / No', icon: ToggleLeft, hasOptions: false },
];

// ─── Default starter template ────────────────────────────────────────────────

const DEFAULT_APPLICATION_QUESTIONS: Question[] = [
  {
    id: 'dq-motivation',
    type: 'long_text',
    label: 'Why do you want to volunteer with us?',
    placeholder: 'Tell us what motivates you and what you hope to contribute…',
    required: true,
  },
  {
    id: 'dq-experience',
    type: 'long_text',
    label: 'Describe any relevant skills or experience',
    placeholder: 'Include any volunteering, work, or training that applies…',
    required: false,
  },
  {
    id: 'dq-availability',
    type: 'checkbox_group',
    label: 'When are you available?',
    required: true,
    options: [
      { id: 'dq-av-wkday-am',  label: 'Weekday mornings'    },
      { id: 'dq-av-wkday-pm',  label: 'Weekday afternoons'  },
      { id: 'dq-av-wkday-eve', label: 'Weekday evenings'    },
      { id: 'dq-av-wkend-am',  label: 'Weekend mornings'    },
      { id: 'dq-av-wkend-pm',  label: 'Weekend afternoons'  },
    ],
  },
  {
    id: 'dq-referral',
    type: 'dropdown',
    label: 'How did you hear about us?',
    required: false,
    options: [
      { id: 'dq-ref-friend', label: 'Friend or family'  },
      { id: 'dq-ref-social', label: 'Social media'      },
      { id: 'dq-ref-search', label: 'Web search'        },
      { id: 'dq-ref-event',  label: 'Community event'   },
      { id: 'dq-ref-other',  label: 'Other'             },
    ],
  },
  {
    id: 'dq-driver-license',
    type: 'toggle',
    label: 'Do you have a valid driver\'s license?',
    required: false,
  },
  {
    id: 'dq-emergency-name',
    type: 'short_text',
    label: 'Emergency contact name',
    placeholder: 'Full name',
    required: false,
  },
  {
    id: 'dq-emergency-phone',
    type: 'short_text',
    label: 'Emergency contact phone',
    placeholder: '+1 555-0000',
    required: false,
  },
  {
    id: 'dq-conduct',
    type: 'checkbox',
    label: 'I agree to abide by the volunteer code of conduct',
    required: true,
  },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 10);

const MOCK_TEMPLATES: ApplicationTemplate[] = [];

const MOCK_SUBMISSIONS: Submission[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  SubmissionStatus,
  { icon: typeof Clock; color: string; bg: string; label: string }
> = {
  pending: { icon: Clock, color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-100 dark:bg-warning-900/40', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-success-600 dark:text-success-400', bg: 'bg-success-100 dark:bg-success-900/40', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-100 dark:bg-danger-900/40', label: 'Rejected' },
};

const TEMPLATE_STATUS_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: 'text-success-600 dark:text-success-400', bg: 'bg-success-100 dark:bg-success-900/40', label: 'Active' },
  draft: { color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-100 dark:bg-warning-900/40', label: 'Draft' },
  archived: { color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-700', label: 'Archived' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const getApplicationUrl = (templateId: string) => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com';
  return `${base}/apply?form=${templateId}`;
};

const getQrCodeUrl = (data: string, size = 200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Pill / badge renderer */
function Badge({ color, bg, label, icon: Icon }: { color: string; bg: string; label: string; icon?: typeof Clock }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${bg} ${color}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

/** Reusable section heading with optional action */
function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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

/** Question row inside the builder */
function QuestionRow({
  question,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  question: Question;
  index: number;
  total: number;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const meta = QUESTION_TYPES.find((qt) => qt.type === question.type)!;
  const IconComp = meta.icon;

  const updateOption = (optId: string, label: string) => {
    onUpdate({
      ...question,
      options: question.options?.map((o) => (o.id === optId ? { ...o, label } : o)),
    });
  };

  const addOption = () => {
    onUpdate({
      ...question,
      options: [...(question.options ?? []), { id: generateId(), label: '' }],
    });
  };

  const removeOption = (optId: string) => {
    onUpdate({
      ...question,
      options: question.options?.filter((o) => o.id !== optId),
    });
  };

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={() => onDrop()}
      className={`group relative border rounded-lg p-4 bg-white dark:bg-neutral-800 transition-all select-none ${
        isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
      } ${
        isDragOver && !isDragging
          ? 'border-primary-400 dark:border-primary-500 shadow-md ring-2 ring-primary-200 dark:ring-primary-800'
          : 'border-neutral-200 dark:border-neutral-700 hover:shadow-md'
      }`}
    >
      {/* Drag handle & reorder */}
      <div className="absolute -left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-30"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        </button>
        <span title="Drag to reorder" className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-neutral-400" />
        </span>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-30"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        </button>
      </div>

      <div className="ml-6">
        {/* Top row: type badge + actions */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
            <IconComp className="w-3.5 h-3.5" />
            {meta.label}
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
                className="rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
              />
              Required
            </label>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-danger-50 dark:hover:bg-danger-900/30 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
              title="Delete question"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question label */}
        <input
          type="text"
          value={question.label}
          onChange={(e) => onUpdate({ ...question, label: e.target.value })}
          placeholder="Enter your question..."
          className="w-full text-sm font-medium text-neutral-900 dark:text-neutral-100 bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400 outline-none pb-1 mb-2 placeholder-neutral-400 dark:placeholder-neutral-500"
        />

        {/* Description (optional) */}
        <input
          type="text"
          value={question.description ?? ''}
          onChange={(e) => onUpdate({ ...question, description: e.target.value || undefined })}
          placeholder="Add a description (optional)"
          className="w-full text-xs text-neutral-500 dark:text-neutral-400 bg-transparent border-b border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-primary-400 outline-none pb-1 mb-2 placeholder-neutral-400 dark:placeholder-neutral-500"
        />

        {/* Placeholder for text types */}
        {['short_text', 'long_text', 'number', 'email', 'date'].includes(question.type) && (
          <input
            type="text"
            value={question.placeholder ?? ''}
            onChange={(e) => onUpdate({ ...question, placeholder: e.target.value || undefined })}
            placeholder="Placeholder text..."
            className="w-full text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-700/50 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary-400"
          />
        )}

        {/* Options for multi-option types */}
        {meta.hasOptions && (
          <div className="mt-3 space-y-2">
            {(question.options ?? []).map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                {question.type === 'radio' && (
                  <div className="w-4 h-4 rounded-full border-2 border-neutral-300 dark:border-neutral-600 flex-shrink-0" />
                )}
                {question.type === 'checkbox_group' && (
                  <div className="w-4 h-4 rounded border-2 border-neutral-300 dark:border-neutral-600 flex-shrink-0" />
                )}
                {question.type === 'dropdown' && (
                  <span className="text-xs text-neutral-400 w-4 flex-shrink-0">—</span>
                )}
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(opt.id, e.target.value)}
                  placeholder="Option label"
                  className="flex-1 text-sm text-neutral-700 dark:text-neutral-300 bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-primary-500 outline-none pb-0.5 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
                <button
                  onClick={() => removeOption(opt.id)}
                  className="p-0.5 rounded text-neutral-400 hover:text-danger-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add option
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── API <-> Frontend adapter ─────────────────────────────────────────────────

interface ApiFormSubmission {
  id: string;
  templateId: string | null;
  templateName: string;
  applicantType: string;
  name: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
  status: string;
  createdAt: string;
}

function mapApiApplication(a: ApiFormSubmission): Submission {
  return {
    id: a.id,
    templateId: a.templateId ?? '',
    templateName: a.templateName || 'General Application',
    volunteerName: a.name,
    volunteerEmail: a.email,
    submittedAt: a.createdAt.split('T')[0],
    status: (a.status?.toLowerCase() ?? 'pending') as SubmissionStatus,
    answers: (a.answers ?? {}) as Record<string, string | string[] | boolean>,
  };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Applications() {
  // State
  const [view, setView] = useState<PageView>('templates');
  const [templates, setTemplates] = useState<ApplicationTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [volunteerFormId, setVolunteerFormId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const [creatingDefault, setCreatingDefault] = useState(false);
  const [defaultError, setDefaultError] = useState<string | null>(null);

  // Builder state
  const [editingTemplate, setEditingTemplate] = useState<ApplicationTemplate | null>(null);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Submissions filter state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Submission detail view
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);

  // Share & email modal state
  const [shareTemplate, setShareTemplate] = useState<ApplicationTemplate | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<ApplicationTemplate | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Invite link modal — shown after approving a submission
  const [inviteSubject, setInviteSubject] = useState<{ name: string; email: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Signup forms tab
  const [sfEditing, setSfEditing] = useState<{ type: string; label: string } | null>(null);
  const [sfFieldCounts, setSfFieldCounts] = useState<Record<string, { active: number; total: number }>>({});

  // Fetch templates and groups from backend on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplates(true);
    Promise.allSettled([
      api.get<ApplicationTemplate[]>('/application-templates'),
      api.get<GroupItem[]>('/people/groups'),
      api.get<{ volunteerFormId: string | null }>('/settings/volunteer-form'),
    ])
      .then(([tmplResult, groupResult, volFormResult]) => {
        if (!cancelled) {
          if (tmplResult.status === 'fulfilled') setTemplates(tmplResult.value);
          if (groupResult.status === 'fulfilled') setGroups(groupResult.value);
          if (volFormResult.status === 'fulfilled') setVolunteerFormId(volFormResult.value.volunteerFormId);
        }
      })
      .finally(() => { if (!cancelled) setLoadingTemplates(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch applications from backend on mount; fall back to mock if unreachable
  useEffect(() => {
    let cancelled = false;
    setLoadingSubmissions(true);
    api.get<ApiFormSubmission[]>('/form-submissions')
      .then((data) => {
        if (!cancelled) {
          setSubmissions(data.map(mapApiApplication));
          setUsingMockData(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmissions(MOCK_SUBMISSIONS);
          setUsingMockData(true);
        }
      })
      .finally(() => { if (!cancelled) setLoadingSubmissions(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Builder actions ──────────────────────────────────────────────────────

  const openBuilder = (template?: ApplicationTemplate) => {
    if (template) {
      setEditingTemplate({ ...template, questions: template.questions.map((q) => ({ ...q })) });
    } else {
      setEditingTemplate({
        id: generateId(),
        name: '',
        description: '',
        questions: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        status: 'draft',
        submissionCount: 0,
      });
    }
    setView('builder');
  };

  const handleUseDefault = async () => {
    setCreatingDefault(true);
    setDefaultError(null);
    try {
      const saved = await api.post<ApplicationTemplate>('/application-templates', {
        name: 'Volunteer Application',
        description: 'Standard volunteer application form — customize to match your organization\'s needs.',
        questions: DEFAULT_APPLICATION_QUESTIONS,
        status: 'active',
      });
      setTemplates((prev) => [...prev, saved]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create template';
      setDefaultError(msg);
    } finally {
      setCreatingDefault(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    const payload = {
      name: editingTemplate.name,
      description: editingTemplate.description,
      questions: editingTemplate.questions,
      status: editingTemplate.status,
    };
    try {
      const isNew = !templates.find((t) => t.id === editingTemplate.id);
      let saved: ApplicationTemplate;
      if (isNew) {
        saved = await api.post<ApplicationTemplate>('/application-templates', payload);
        setTemplates((prev) => [...prev, saved]);
      } else {
        saved = await api.put<ApplicationTemplate>(`/application-templates/${editingTemplate.id}`, payload);
        setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      }
    } catch {
      // keep local state if API fails
      const updated = { ...editingTemplate, updatedAt: new Date().toISOString() };
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === updated.id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [...prev, updated];
      });
    }
    setEditingTemplate(null);
    setView('templates');
  };

  const duplicateTemplate = async (t: ApplicationTemplate) => {
    const payload = {
      name: `${t.name} (Copy)`,
      description: t.description,
      questions: t.questions.map((q) => ({ ...q, id: generateId(), options: q.options?.map((o) => ({ ...o, id: generateId() })) })),
      status: 'draft' as const,
    };
    try {
      const dup = await api.post<ApplicationTemplate>('/application-templates', payload);
      setTemplates((prev) => [...prev, dup]);
    } catch {
      setTemplates((prev) => [...prev, { ...payload, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), submissionCount: 0 }]);
    }
  };

  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    api.delete(`/application-templates/${id}`).catch(() => {});
  };

  // Effective groups — includes a synthetic "Volunteers" entry so templates can be linked to the volunteer signup form
  const VOLUNTEERS_ID = '__volunteers__';
  const effectiveGroups = useMemo<GroupItem[]>(() => [
    { id: VOLUNTEERS_ID, name: 'Volunteers', color: '#6366f1', applicationTemplateId: volunteerFormId },
    ...groups,
  ], [groups, volunteerFormId]);

  const linkGroup = (groupId: string, templateId: string) => {
    if (groupId === VOLUNTEERS_ID) {
      setVolunteerFormId(templateId);
      api.put('/settings/volunteer-form', { volunteerFormId: templateId }).catch(() => setVolunteerFormId(null));
      return;
    }
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, applicationTemplateId: templateId } : g));
    api.put(`/people/groups/${groupId}`, { name: g.name, color: g.color, applicationTemplateId: templateId })
      .catch(() => setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, applicationTemplateId: null } : g)));
  };

  const unlinkGroup = (groupId: string) => {
    if (groupId === VOLUNTEERS_ID) {
      setVolunteerFormId(null);
      api.put('/settings/volunteer-form', { volunteerFormId: null }).catch(() => {});
      return;
    }
    const g = groups.find((g) => g.id === groupId);
    if (!g) return;
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, applicationTemplateId: null } : g));
    api.put(`/people/groups/${groupId}`, { name: g.name, color: g.color, applicationTemplateId: null }).catch(() => {});
  };

  const addQuestion = (type: QuestionType) => {
    const meta = QUESTION_TYPES.find((qt) => qt.type === type)!;
    const newQ: Question = {
      id: generateId(),
      type,
      label: '',
      required: false,
      ...(meta.hasOptions
        ? { options: [{ id: generateId(), label: 'Option 1' }, { id: generateId(), label: 'Option 2' }] }
        : {}),
    };
    setEditingTemplate((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: [...prev.questions, newQ] };
    });
    setShowQuestionPicker(false);
  };

  const updateQuestion = (qId: string, updated: Question) => {
    setEditingTemplate((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: prev.questions.map((q) => (q.id === qId ? updated : q)) };
    });
  };

  const deleteQuestion = (qId: string) => {
    setEditingTemplate((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: prev.questions.filter((q) => q.id !== qId) };
    });
  };

  const moveQuestion = (qId: string, dir: 'up' | 'down') => {
    setEditingTemplate((prev) => {
      if (!prev) return prev;
      const qs = [...prev.questions];
      const idx = qs.findIndex((q) => q.id === qId);
      if (dir === 'up' && idx > 0) [qs[idx - 1], qs[idx]] = [qs[idx], qs[idx - 1]];
      if (dir === 'down' && idx < qs.length - 1) [qs[idx], qs[idx + 1]] = [qs[idx + 1], qs[idx]];
      return { ...prev, questions: qs };
    });
  };

  const reorderQuestion = (fromId: string, toId: string) => {
    setEditingTemplate((prev) => {
      if (!prev) return prev;
      const qs = [...prev.questions];
      const fromIdx = qs.findIndex((q) => q.id === fromId);
      const toIdx   = qs.findIndex((q) => q.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const [moved] = qs.splice(fromIdx, 1);
      qs.splice(toIdx, 0, moved);
      return { ...prev, questions: qs };
    });
  };

  // ── Submission actions ───────────────────────────────────────────────────

  const handleStatusChange = async (subId: string, newStatus: SubmissionStatus) => {
    const sub = submissions.find((s) => s.id === subId);
    // Optimistic update
    setSubmissions((prev) => prev.map((s) => (s.id === subId ? { ...s, status: newStatus } : s)));
    if (activeSubmission?.id === subId) {
      setActiveSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    if (!usingMockData) {
      try {
        await api.put(`/form-submissions/${subId}`, { status: newStatus.toUpperCase() });
      } catch {
        // Revert on failure
        setSubmissions((prev) => prev.map((s) => (s.id === subId ? { ...s, status: activeSubmission?.status ?? s.status } : s)));
        return;
      }
    }
    // After approval, surface the account-creation invite link
    if (newStatus === 'approved' && sub) {
      setInviteSubject({ name: sub.volunteerName, email: sub.volunteerEmail });
      setInviteCopied(false);
    }
  };

  // ── Share & email actions ────────────────────────────────────────────────

  const copyLink = (templateId: string) => {
    const url = getApplicationUrl(templateId);
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const openShareModal = (tmpl: ApplicationTemplate) => {
    setShareTemplate(tmpl);
    setLinkCopied(false);
  };

  const openEmailModal = (tmpl: ApplicationTemplate) => {
    setEmailTemplate(tmpl);
    setEmailTo('');
    setEmailMessage(`You're invited to apply: ${tmpl.name}`);
    setEmailSent(false);
  };

  const handleSendEmail = () => {
    if (!emailTemplate || !emailTo.trim()) return;
    // TODO: Replace with real email API call
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      setEmailTemplate(null);
    }, 2500);
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesTemplate = selectedTemplate === 'all' || s.templateId === selectedTemplate;
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      s.volunteerName.toLowerCase().includes(q) ||
      s.volunteerEmail.toLowerCase().includes(q) ||
      s.templateName.toLowerCase().includes(q);
    return matchesTemplate && matchesStatus && matchesSearch;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  };

  // ── Renders ──────────────────────────────────────────────────────────────

  /** TAB BAR (Templates / Submissions / Signup Forms) */
  const renderTabs = () => (
    <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
      <button
        onClick={() => { setView('templates'); setActiveSubmission(null); }}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'templates' || view === 'builder'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" />
          Form Templates
        </span>
      </button>

      <button
        onClick={() => { setView('submissions'); setActiveSubmission(null); }}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'submissions' || view === 'submission_detail'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          Submissions
          {stats.pending > 0 && (
            <span className="ml-1 bg-warning-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {stats.pending}
            </span>
          )}
        </span>
      </button>

      <button
        onClick={() => { setView('signup_forms'); setActiveSubmission(null); refreshSfCounts(); }}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'signup_forms'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <UserCheck className="w-4 h-4" />
          Signup Forms
        </span>
      </button>
    </div>
  );

  /** SIGNUP FORMS VIEW */
  const DEFAULT_SIGNUP_FORM_TYPES = [
    { type: 'volunteer', label: 'Volunteer Signup', icon: UserCheck, desc: 'Fields volunteers fill out when creating their account after approval.' },
    { type: 'employee',  label: 'Staff Signup',     icon: Crown,     desc: 'Fields staff members fill out when creating their account after approval.' },
  ];

  const refreshSfCounts = (groupList?: GroupItem[]) => {
    try {
      const stored = JSON.parse(localStorage.getItem('vf_signup_form_configs') ?? '{}');
      const counts: Record<string, { active: number; total: number }> = {};
      const allTypes = [
        ...DEFAULT_SIGNUP_FORM_TYPES.map((f) => ({ type: f.type })),
        ...(groupList ?? groups).map((g) => ({ type: `group_${g.id}` })),
      ];
      for (const { type } of allTypes) {
        const cfg = stored[type] ?? signupFormConfigs[type];
        const fields: { enabled: boolean }[] = cfg?.fields ?? [];
        counts[type] = { active: fields.filter((f) => f.enabled).length, total: fields.length };
      }
      setSfFieldCounts(counts);
    } catch { /* ignore */ }
  };

  const sfRows = [
    ...DEFAULT_SIGNUP_FORM_TYPES.map(({ type, label, icon, desc }) => ({ type, label, icon, desc })),
    ...groups.map((g) => ({ type: `group_${g.id}`, label: `${g.name} Signup`, icon: Users, desc: `Signup form for members of the ${g.name} group.` })),
  ];

  const renderSignupForms = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Signup Forms"
        subtitle="Configure the profile forms that approved applicants fill out when creating their account"
      />

      {renderTabs()}

      <div className="space-y-3">
        {sfRows.map(({ type, label, desc, icon: Icon }) => {
          const counts = sfFieldCounts[type] ?? { active: 0, total: 0 };
          return (
            <div
              key={type}
              className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {counts.active > 0 ? `${counts.active} of ${counts.total} fields active · ` : ''}{desc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSfEditing({ type, label })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex-shrink-0"
              >
                <Edit className="w-3.5 h-3.5" />
                Customize
              </button>
            </div>
          );
        })}
      </div>

      {sfEditing && (
        <SignupFormBuilder
          type={sfEditing.type}
          label={sfEditing.label}
          onClose={() => { setSfEditing(null); refreshSfCounts(); }}
        />
      )}
    </div>
  );

  /** TEMPLATES LIST VIEW */
  const renderTemplates = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Application Forms"
        subtitle="Create and manage application form templates"
        action={
          <Button onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" />
            New Form
          </Button>
        }
      />

      {renderTabs()}

      {loadingTemplates ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <Card key={i} className="p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="space-y-4">
          {/* Default starter template card */}
          <div className="rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  Volunteer Application <span className="ml-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">Recommended</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                  A ready-to-use application form with 8 standard questions — availability, motivation, experience, emergency contact, and code of conduct. Customize after creating.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {['Availability', 'Motivation', 'Experience', 'Referral source', 'Driver\'s license', 'Emergency contact', 'Code of conduct'].map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-neutral-500 dark:text-neutral-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  variant="primary"
                  onClick={handleUseDefault}
                  disabled={creatingDefault}
                >
                  {creatingDefault ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Use this template
                    </>
                  )}
                </Button>
                {defaultError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{defaultError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Start from scratch */}
          <div className="text-center py-2">
            <button
              type="button"
              onClick={() => openBuilder()}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 underline underline-offset-2 transition-colors"
            >
              Or start from scratch
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tmpl) => {
            const badge = TEMPLATE_STATUS_BADGE[tmpl.status];
            return (
              <Card key={tmpl.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-snug pr-2">
                      {tmpl.name || 'Untitled Form'}
                    </h3>
                    <Badge color={badge.color} bg={badge.bg} label={badge.label} />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">
                    {tmpl.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{tmpl.questions.length} question{tmpl.questions.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{tmpl.submissionCount} submission{tmpl.submissionCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>Updated {formatDate(tmpl.updatedAt)}</span>
                  </div>

                  {/* Linked groups */}
                  {(() => {
                    const linked = effectiveGroups.filter((g) => g.applicationTemplateId === tmpl.id);
                    const unlinked = effectiveGroups.filter((g) => !g.applicationTemplateId);
                    return (
                      <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Users className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          {linked.length === 0 && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">No groups linked</span>
                          )}
                          {linked.map((g) => (
                            <span
                              key={g.id}
                              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ background: g.color }}
                            >
                              {g.name}
                              <button
                                onClick={() => unlinkGroup(g.id)}
                                className="ml-0.5 rounded-full hover:bg-black/20 p-0.5 transition-colors"
                                title="Unlink group"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                          {unlinked.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => { if (e.target.value) linkGroup(e.target.value, tmpl.id); }}
                              className="text-xs border border-dashed border-neutral-300 dark:border-neutral-600 rounded-full px-2 py-0.5 bg-transparent text-neutral-500 dark:text-neutral-400 cursor-pointer hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 outline-none transition-colors"
                            >
                              <option value="">+ Link group</option>
                              {unlinked.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => openBuilder(tmpl)}>
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicateTemplate(tmpl)}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(tmpl.id);
                        setView('submissions');
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Responses
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openShareModal(tmpl)}>
                      <Link2 className="w-3.5 h-3.5 mr-1.5" />
                      Share Link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEmailModal(tmpl)}>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Email
                    </Button>
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      className="ml-auto p-1.5 rounded hover:bg-danger-50 dark:hover:bg-danger-900/30 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                      title="Delete form"
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

  /** FORM BUILDER VIEW */
  const renderBuilder = () => {
    if (!editingTemplate) return null;
    return (
      <div className="space-y-6">
        <SectionHeader
          title={editingTemplate.name || 'Untitled Form'}
          subtitle="Build your application form"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setView('templates');
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveTemplate}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Form
              </Button>
            </div>
          }
        />

        {/* Template metadata */}
        <Card className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Form Name
            </label>
            <input
              type="text"
              value={editingTemplate.name}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              placeholder="e.g. Volunteer Application 2024"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              value={editingTemplate.description}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
              placeholder="Brief description shown to applicants..."
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none placeholder-neutral-400 dark:placeholder-neutral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={editingTemplate.status}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate, status: e.target.value as ApplicationTemplate['status'] })
              }
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Questions ({editingTemplate.questions.length})
            </h2>
          </div>

          {editingTemplate.questions.length === 0 && (
            <Card className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-transparent shadow-none">
              <FileQuestion className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No questions yet — add one below to get started
              </p>
            </Card>
          )}

          {editingTemplate.questions.map((q, idx) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={idx}
              total={editingTemplate.questions.length}
              onUpdate={(updated) => updateQuestion(q.id, updated)}
              onDelete={() => deleteQuestion(q.id)}
              onMove={(dir) => moveQuestion(q.id, dir)}
              isDragging={dragId === q.id}
              isDragOver={dragOverId === q.id}
              onDragStart={() => setDragId(q.id)}
              onDragOver={() => setDragOverId(q.id)}
              onDrop={() => {
                if (dragId && dragId !== q.id) reorderQuestion(dragId, q.id);
                setDragId(null);
                setDragOverId(null);
              }}
            />
          ))}

          {/* Add question */}
          <div>
            <button
              onClick={() => setShowQuestionPicker((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {showQuestionPicker ? 'Cancel' : 'Add Question'}
            </button>

            {showQuestionPicker && (
              <div className="mt-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm p-3">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 px-1">
                  Choose a question type
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1">
                  {QUESTION_TYPES.map((qt) => {
                    const QtIcon = qt.icon;
                    return (
                      <button
                        key={qt.type}
                        onClick={() => addQuestion(qt.type)}
                        className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-colors text-center"
                      >
                        <QtIcon className="w-5 h-5" />
                        {qt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /** SUBMISSIONS LIST VIEW */
  const renderSubmissions = () => (
    <div className="space-y-6">
      <SectionHeader
        title="Submissions"
        subtitle="Review and manage incoming applications"
        action={
          <Button variant="outline" onClick={() => {
            const rows = [
              ['Name', 'Email', 'Form', 'Submitted', 'Status'],
              ...submissions.map((s) => [s.volunteerName, s.volunteerEmail, s.templateName, s.submittedAt, s.status]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = 'submissions.csv';
            a.click();
          }}>
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        }
      />

      {renderTabs()}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning-600 dark:text-warning-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success-600 dark:text-success-400' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-danger-600 dark:text-danger-400' },
        ].map(({ label, value, icon: SIcon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
              <SIcon className={`w-7 h-7 ${color} opacity-60`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search by name, email, or form..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              <option value="all">All Forms</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Offline banner */}
      {usingMockData && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg text-sm text-warning-700 dark:text-warning-400">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Backend offline — showing demo data. Status changes will not be saved.</span>
        </div>
      )}

      {/* Submissions list */}
      <div className="space-y-3">
        {loadingSubmissions ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-500 dark:text-neutral-400">No submissions match your filters</p>
          </Card>
        ) : (
          filteredSubmissions.map((sub) => {
            const badge = STATUS_BADGE[sub.status];
            const BadgeIcon = badge.icon;
            return (
              <Card
                key={sub.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => {
                      setActiveSubmission(sub);
                      setView('submission_detail');
                    }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {sub.volunteerName}
                      </h3>
                      <Badge icon={BadgeIcon} color={badge.color} bg={badge.bg} label={badge.label} />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      {sub.volunteerEmail}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                      <span className="font-medium text-primary-600 dark:text-primary-400">{sub.templateName}</span>
                      <span>·</span>
                      <span>Submitted {formatDate(sub.submittedAt)}</span>
                    </div>
                  </div>

                  {sub.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleStatusChange(sub.id, 'approved')}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(sub.id, 'rejected')}>
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  /** SUBMISSION DETAIL VIEW */
  const renderSubmissionDetail = () => {
    if (!activeSubmission) return null;
    const badge = STATUS_BADGE[activeSubmission.status];
    const BadgeIcon = badge.icon;
    const tmpl = templates.find((t) => t.id === activeSubmission.templateId);

    return (
      <div className="space-y-6">
        <SectionHeader
          title={activeSubmission.volunteerName}
          subtitle={activeSubmission.volunteerEmail}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActiveSubmission(null);
                  setView('submissions');
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {activeSubmission.status === 'pending' && (
                <>
                  <Button onClick={() => handleStatusChange(activeSubmission.id, 'approved')}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant="danger" onClick={() => handleStatusChange(activeSubmission.id, 'rejected')}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Meta bar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Badge icon={BadgeIcon} color={badge.color} bg={badge.bg} label={badge.label} />
            <span className="text-neutral-500 dark:text-neutral-400">
              Form: <span className="font-medium text-neutral-700 dark:text-neutral-300">{activeSubmission.templateName}</span>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              Submitted: <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatDate(activeSubmission.submittedAt)}</span>
            </span>
          </div>
        </Card>

        {/* Answers */}
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {tmpl?.questions.map((q) => {
            const answer = activeSubmission.answers[q.id];
            let display: React.ReactNode;

            if (answer === undefined || answer === '') {
              display = <span className="italic text-neutral-400 dark:text-neutral-500">No answer</span>;
            } else if (typeof answer === 'boolean') {
              display = answer ? (
                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                  <CheckCircle className="w-4 h-4" /> Yes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                  <XCircle className="w-4 h-4" /> No
                </span>
              );
            } else if (Array.isArray(answer)) {
              display = (
                <div className="flex flex-wrap gap-1.5">
                  {answer.map((a) => (
                    <span
                      key={a}
                      className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full font-medium"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              );
            } else {
              display = <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{answer}</p>;
            }

            return (
              <div key={q.id} className="p-4">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">
                  {q.label}
                  {q.required && <span className="text-danger-500 ml-0.5">*</span>}
                </p>
                {display}
              </div>
            );
          })}

          {/* Fallback if template not found — show raw keys */}
          {!tmpl && (
            <div className="p-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                Template no longer exists. Raw answers:
              </p>
              <pre className="mt-2 text-xs bg-neutral-50 dark:bg-neutral-900 rounded p-3 overflow-auto text-neutral-700 dark:text-neutral-300">
                {JSON.stringify(activeSubmission.answers, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ── Page ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Head><title>Applications — VolunteerFlow</title></Head>
      <div className="space-y-6 max-w-6xl mx-auto">
        {view === 'templates' && renderTemplates()}
        {view === 'builder' && renderBuilder()}
        {view === 'submissions' && renderSubmissions()}
        {view === 'submission_detail' && renderSubmissionDetail()}
        {view === 'signup_forms' && renderSignupForms()}
      </div>

      {/* ── Share Link / QR Code Modal ────────────────────────────────────── */}
      {shareTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShareTemplate(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Share Application</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{shareTemplate.name}</p>
              </div>
              <button
                onClick={() => setShareTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl shadow-inner border border-neutral-100">
                  <img
                    src={getQrCodeUrl(getApplicationUrl(shareTemplate.id), 180)}
                    alt="Application QR Code"
                    width={180}
                    height={180}
                    className="rounded"
                  />
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                  Scan to open the application form
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">OR COPY LINK</span>
                <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
              </div>

              {/* Link field */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    readOnly
                    value={getApplicationUrl(shareTemplate.id)}
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 font-mono select-all outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                </div>
                <Button
                  onClick={() => copyLink(shareTemplate.id)}
                  className="flex-shrink-0"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              {/* Download QR button */}
              <a
                href={getQrCodeUrl(getApplicationUrl(shareTemplate.id), 600)}
                download={`${shareTemplate.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-2 border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                Download QR Code (High Res)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Application Modal ───────────────────────────────────────── */}
      {emailTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEmailTemplate(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Email Application</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{emailTemplate.name}</p>
              </div>
              <button
                onClick={() => setEmailTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailSent ? (
              <div className="px-6 pb-8 text-center">
                <div className="w-14 h-14 bg-success-100 dark:bg-success-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-success-600 dark:text-success-400" />
                </div>
                <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Email Sent!</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  The application link has been sent to {emailTo}
                </p>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-4">
                {/* To field */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Recipient Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="volunteer@example.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>

                {/* Preview of link being sent */}
                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 font-medium">Link included in email</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-mono truncate">
                    {getApplicationUrl(emailTemplate.id)}
                  </p>
                </div>

                {/* Send button */}
                <Button
                  onClick={handleSendEmail}
                  disabled={!emailTo.trim()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Application Link
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Invite Link Modal — shown after approving a submission ─────────── */}
      {inviteSubject && (() => {
        const qs = new URLSearchParams({ name: inviteSubject.name, email: inviteSubject.email });
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/create-account?${qs.toString()}`;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setInviteSubject(null)} />
            <div className="relative w-full max-w-sm bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 text-center border-b border-neutral-100 dark:border-neutral-700">
                <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {inviteSubject.name} Approved!
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Share this link so they can create their account and complete their profile.
                </p>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
                  <Link2 className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300 truncate font-mono">{link}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link).then(() => {
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      });
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                      inviteCopied
                        ? 'text-success-600 bg-success-50 dark:bg-success-900/20'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {inviteCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                  They'll set a password and fill out their profile when they open this link.
                </p>
              </div>

              <div className="flex gap-3 p-5 pt-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link).then(() => {
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
                <button
                  onClick={() => setInviteSubject(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white rounded-xl transition-colors"
                >
                  Done <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
