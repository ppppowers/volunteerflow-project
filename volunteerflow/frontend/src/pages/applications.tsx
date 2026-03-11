// frontend/src/pages/applications.tsx
import { useState } from 'react';
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
} from 'lucide-react';

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

type PageView = 'templates' | 'builder' | 'submissions' | 'submission_detail';

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

// ─── Mock Data ───────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 10);

const MOCK_TEMPLATES: ApplicationTemplate[] = [
  {
    id: 'tmpl_1',
    name: 'General Volunteer Application',
    description: 'Standard application for new volunteers joining our organization.',
    status: 'active',
    createdAt: '2024-02-15',
    updatedAt: '2024-03-01',
    submissionCount: 24,
    questions: [
      { id: 'q1', type: 'short_text', label: 'Full Name', required: true, placeholder: 'Enter your full name' },
      { id: 'q2', type: 'email', label: 'Email Address', required: true, placeholder: 'you@example.com' },
      { id: 'q3', type: 'long_text', label: 'Why do you want to volunteer?', required: true, placeholder: 'Tell us about your motivation...' },
      {
        id: 'q4',
        type: 'checkbox_group',
        label: 'Areas of Interest',
        required: false,
        options: [
          { id: 'o1', label: 'Community Outreach' },
          { id: 'o2', label: 'Event Planning' },
          { id: 'o3', label: 'Mentorship' },
          { id: 'o4', label: 'Administrative Support' },
        ],
      },
      {
        id: 'q5',
        type: 'radio',
        label: 'Availability',
        required: true,
        options: [
          { id: 'o5', label: 'Weekdays' },
          { id: 'o6', label: 'Weekends' },
          { id: 'o7', label: 'Both' },
        ],
      },
      { id: 'q6', type: 'toggle', label: 'I have volunteered before', required: false },
    ],
  },
  {
    id: 'tmpl_2',
    name: 'Youth Mentorship Program',
    description: 'Application for adults interested in mentoring at-risk youth.',
    status: 'active',
    createdAt: '2024-01-20',
    updatedAt: '2024-02-28',
    submissionCount: 12,
    questions: [
      { id: 'q7', type: 'short_text', label: 'Full Name', required: true },
      { id: 'q8', type: 'number', label: 'Age', required: true, placeholder: '18' },
      { id: 'q9', type: 'long_text', label: 'Relevant experience with youth', required: true },
      { id: 'q10', type: 'checkbox', label: 'I agree to a background check', required: true },
      { id: 'q11', type: 'date', label: 'Earliest available start date', required: true },
    ],
  },
  {
    id: 'tmpl_3',
    name: 'Emergency Response Team',
    description: 'Draft application for the upcoming disaster response volunteer corps.',
    status: 'draft',
    createdAt: '2024-03-05',
    updatedAt: '2024-03-05',
    submissionCount: 0,
    questions: [],
  },
];

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub_1',
    templateId: 'tmpl_1',
    templateName: 'General Volunteer Application',
    volunteerName: 'Sarah Johnson',
    volunteerEmail: 'sarah.j@email.com',
    submittedAt: '2024-03-10',
    status: 'pending',
    answers: {
      q1: 'Sarah Johnson',
      q2: 'sarah.j@email.com',
      q3: 'I have experience organizing community events and would love to help coordinate initiatives in my neighborhood.',
      q4: ['Community Outreach', 'Event Planning'],
      q5: 'Both',
      q6: true,
    },
  },
  {
    id: 'sub_2',
    templateId: 'tmpl_1',
    templateName: 'General Volunteer Application',
    volunteerName: 'Michael Chen',
    volunteerEmail: 'michael.c@email.com',
    submittedAt: '2024-03-08',
    status: 'approved',
    answers: {
      q1: 'Michael Chen',
      q2: 'michael.c@email.com',
      q3: 'Available all day and happy to assist with any tasks needed.',
      q4: ['Administrative Support'],
      q5: 'Weekdays',
      q6: false,
    },
  },
  {
    id: 'sub_3',
    templateId: 'tmpl_2',
    templateName: 'Youth Mentorship Program',
    volunteerName: 'Emily Davis',
    volunteerEmail: 'emily.d@email.com',
    submittedAt: '2024-03-09',
    status: 'rejected',
    answers: {
      q7: 'Emily Davis',
      q8: '28',
      q9: 'I work with children regularly and am passionate about mentorship.',
      q10: true,
      q11: '2024-04-01',
    },
  },
  {
    id: 'sub_4',
    templateId: 'tmpl_1',
    templateName: 'General Volunteer Application',
    volunteerName: 'David Martinez',
    volunteerEmail: 'david.m@email.com',
    submittedAt: '2024-03-11',
    status: 'pending',
    answers: {
      q1: 'David Martinez',
      q2: 'david.m@email.com',
      q3: 'I have medical training and experience working with elderly populations.',
      q4: ['Community Outreach', 'Mentorship'],
      q5: 'Weekends',
      q6: true,
    },
  },
];

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
  return `${base}/apply/${templateId}`;
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
}: {
  question: Question;
  index: number;
  total: number;
  onUpdate: (q: Question) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
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
    <div className="group relative border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 transition-shadow hover:shadow-md">
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
        <GripVertical className="w-4 h-4 text-neutral-400" />
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Applications() {
  // State
  const [view, setView] = useState<PageView>('templates');
  const [templates, setTemplates] = useState<ApplicationTemplate[]>(MOCK_TEMPLATES);
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);

  // Builder state
  const [editingTemplate, setEditingTemplate] = useState<ApplicationTemplate | null>(null);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);

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

  const saveTemplate = () => {
    if (!editingTemplate) return;
    const updated = { ...editingTemplate, updatedAt: new Date().toISOString().split('T')[0] };
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [...prev, updated];
    });
    setEditingTemplate(null);
    setView('templates');
  };

  const duplicateTemplate = (t: ApplicationTemplate) => {
    const dup: ApplicationTemplate = {
      ...t,
      id: generateId(),
      name: `${t.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      submissionCount: 0,
      status: 'draft',
      questions: t.questions.map((q) => ({ ...q, id: generateId(), options: q.options?.map((o) => ({ ...o, id: generateId() })) })),
    };
    setTemplates((prev) => [...prev, dup]);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
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

  // ── Submission actions ───────────────────────────────────────────────────

  const handleStatusChange = (subId: string, newStatus: SubmissionStatus) => {
    setSubmissions((prev) => prev.map((s) => (s.id === subId ? { ...s, status: newStatus } : s)));
    if (activeSubmission?.id === subId) {
      setActiveSubmission((prev) => (prev ? { ...prev, status: newStatus } : null));
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
    // TODO: Replace with real API call
    console.log('Sending application email:', {
      to: emailTo,
      message: emailMessage,
      applicationUrl: getApplicationUrl(emailTemplate.id),
      templateName: emailTemplate.name,
    });
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

  /** TAB BAR (Templates / Submissions) */
  const renderTabs = () => (
    <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 w-fit">
      {(['templates', 'submissions'] as const).map((tab) => {
        const isActive = view === tab || (view === 'submission_detail' && tab === 'submissions');
        return (
          <button
            key={tab}
            onClick={() => {
              setView(tab);
              setActiveSubmission(null);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              isActive
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {tab === 'templates' ? (
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                Form Templates
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Submissions
                {stats.pending > 0 && (
                  <span className="ml-1 bg-warning-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {stats.pending}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
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

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileQuestion className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">No application forms yet</p>
          <Button onClick={() => openBuilder()}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first form
          </Button>
        </Card>
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
          <Button variant="outline">
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

      {/* Submissions list */}
      <div className="space-y-3">
        {filteredSubmissions.length === 0 ? (
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
      <div className="space-y-6 max-w-6xl mx-auto">
        {view === 'templates' && renderTemplates()}
        {view === 'builder' && renderBuilder()}
        {view === 'submissions' && renderSubmissions()}
        {view === 'submission_detail' && renderSubmissionDetail()}
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
    </Layout>
  );
}
