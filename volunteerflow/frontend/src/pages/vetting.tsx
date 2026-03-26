import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { PlanGate } from '@/components/PlanGate';
import { api } from '@/lib/api';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  UserCheck,
  UserX,
  Clock,
  Search,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  FileText,
  Star,
  Filter,
  ArrowRight,
  ChevronDown,
  Flag,
  Eye,
  Edit2,
  Phone,
  Mail,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type VettingStage = 'applied' | 'screening' | 'background' | 'interview' | 'approved' | 'rejected';

interface VettingNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

interface VettingApplicant {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedFor: string;
  appliedAt: string;
  stage: VettingStage;
  rating: number | null;
  flagged: boolean;
  notes: VettingNote[];
  answers: { question: string; answer: string }[];
}

// ─── API adapter ──────────────────────────────────────────────────────────────

interface ApiApplication {
  id: string;
  volunteerId: string;
  eventId: string;
  message: string;
  status: string;
  vettingStage?: string;
  rating?: number | null;
  flagged?: boolean;
  notes?: VettingNote[];
  createdAt: string;
  volunteer?: { id: string; firstName: string; lastName: string; email: string };
  event?: { id: string; title: string };
}

function mapApiApplication(a: ApiApplication): VettingApplicant {
  const name = a.volunteer
    ? `${a.volunteer.firstName} ${a.volunteer.lastName}`.trim()
    : a.volunteerId;

  // Build notes: API notes first, then prepend the applicant message if not already there
  const apiNotes: VettingNote[] = Array.isArray(a.notes) ? a.notes : [];
  const hasMessage = a.message && !apiNotes.some((n) => n.id === 'msg-applicant');
  const notes: VettingNote[] = hasMessage
    ? [{ id: 'msg-applicant', author: 'Applicant', body: a.message, createdAt: a.createdAt.split('T')[0] }, ...apiNotes]
    : apiNotes;

  return {
    id: a.id,
    name,
    email: a.volunteer?.email ?? '',
    phone: '',
    appliedFor: a.event?.title ?? a.eventId,
    appliedAt: a.createdAt.split('T')[0],
    stage: (a.vettingStage as VettingStage) ?? 'applied',
    rating: a.rating ?? null,
    flagged: a.flagged ?? false,
    notes,
    answers: [],
  };
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES: { id: VettingStage; label: string; color: string; bg: string; next?: VettingStage }[] = [
  { id: 'applied',    label: 'Applied',      color: 'text-neutral-600 dark:text-neutral-400',    bg: 'bg-neutral-100 dark:bg-neutral-800',          next: 'screening' },
  { id: 'screening',  label: 'Screening',    color: 'text-primary-700 dark:text-primary-400',    bg: 'bg-primary-100 dark:bg-primary-900/40',       next: 'background' },
  { id: 'background', label: 'Background',   color: 'text-violet-700 dark:text-violet-400',      bg: 'bg-violet-100 dark:bg-violet-900/40',         next: 'interview' },
  { id: 'interview',  label: 'Interview',    color: 'text-warning-700 dark:text-warning-400',    bg: 'bg-warning-100 dark:bg-warning-900/40',       next: 'approved' },
  { id: 'approved',   label: 'Approved',     color: 'text-success-700 dark:text-success-400',    bg: 'bg-success-100 dark:bg-success-900/40' },
  { id: 'rejected',   label: 'Rejected',     color: 'text-danger-700 dark:text-danger-400',      bg: 'bg-danger-100 dark:bg-danger-900/40' },
];

function stageCfg(stage: VettingStage) {
  return STAGES.find((s) => s.id === stage)!;
}

function StageBadge({ stage }: { stage: VettingStage }) {
  const cfg = stageCfg(stage);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onChange?.(s)}
          disabled={!onChange}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={`w-4 h-4 ${value !== null && s <= value ? 'text-warning-400 fill-warning-400' : 'text-neutral-300 dark:text-neutral-600'}`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Applicant Detail Panel ───────────────────────────────────────────────────

function DetailPanel({
  applicant,
  onUpdate,
  onClose,
}: {
  applicant: VettingApplicant;
  onUpdate: (updated: VettingApplicant) => void;
  onClose: () => void;
}) {
  const [noteText, setNoteText] = useState('');
  const cfg = stageCfg(applicant.stage);

  const advance = () => {
    if (!cfg.next) return;
    onUpdate({ ...applicant, stage: cfg.next });
  };

  const reject = () => onUpdate({ ...applicant, stage: 'rejected' });
  const approve = () => onUpdate({ ...applicant, stage: 'approved' });
  const toggleFlag = () => onUpdate({ ...applicant, flagged: !applicant.flagged });
  const setRating = (r: number) => onUpdate({ ...applicant, rating: r });

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: VettingNote = {
      id: `n${Date.now()}`,
      author: 'You',
      body: noteText.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    onUpdate({ ...applicant, notes: [...applicant.notes, note] });
    setNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full bg-white dark:bg-neutral-900 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{applicant.name}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{applicant.appliedFor}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact + Stage */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> {applicant.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Phone className="w-3.5 h-3.5 text-neutral-400" /> {applicant.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Clock className="w-3.5 h-3.5" /> Applied {applicant.appliedAt}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StageBadge stage={applicant.stage} />
              <StarRating value={applicant.rating} onChange={setRating} />
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1 text-xs font-semibold ${applicant.flagged ? 'text-danger-500' : 'text-neutral-400 hover:text-danger-400'}`}
              >
                <Flag className="w-3.5 h-3.5" /> {applicant.flagged ? 'Flagged' : 'Flag'}
              </button>
            </div>
          </div>

          {/* Actions */}
          {applicant.stage !== 'approved' && applicant.stage !== 'rejected' && (
            <div className="flex gap-2">
              {cfg.next && (
                <Button onClick={advance} className="flex-1 flex items-center justify-center gap-2 text-sm">
                  Move to {stageCfg(cfg.next).label} <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={approve} variant="secondary" className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
                <Check className="w-4 h-4" /> Approve
              </Button>
              <Button onClick={reject} variant="secondary" className="flex items-center gap-1.5 text-sm text-danger-600 dark:text-danger-400">
                <X className="w-4 h-4" /> Reject
              </Button>
            </div>
          )}

          {applicant.stage === 'approved' && (
            <div className="flex items-center gap-2 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl text-sm text-success-700 dark:text-success-400 font-semibold">
              <Check className="w-4 h-4" /> Applicant approved
            </div>
          )}
          {applicant.stage === 'rejected' && (
            <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl text-sm text-danger-700 dark:text-danger-400 font-semibold">
              <X className="w-4 h-4" /> Application rejected
            </div>
          )}

          {/* Application answers */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Application Responses</p>
            <div className="space-y-3">
              {applicant.answers.map((a, i) => (
                <div key={i} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">{a.question}</p>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">{a.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">Internal Notes</p>
            <div className="space-y-2 mb-3">
              {applicant.notes.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No notes yet.</p>
              ) : applicant.notes.map((n) => (
                <div key={n.id} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">{n.author} · {n.createdAt}</p>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">{n.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Add a note…"
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button onClick={addNote} disabled={!noteText.trim()} className="text-sm">Add</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VettingPage() {
  const [applicants, setApplicants] = useState<VettingApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<VettingStage | ''>('');
  const [selected, setSelected] = useState<VettingApplicant | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<ApiApplication[]>('/applications?limit=100')
      .then((data) => {
        if (!cancelled) {
          setApplicants(data.map(mapApiApplication));
          setUsingMockData(false);
        }
      })
      .catch(() => {
        if (!cancelled) setUsingMockData(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.appliedFor.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStage && a.stage !== filterStage) return false;
      return true;
    });
  }, [applicants, search, filterStage]);

  const updateApplicant = async (updated: VettingApplicant) => {
    setApplicants((p) => p.map((a) => a.id === updated.id ? updated : a));
    setSelected(updated);
    if (!usingMockData) {
      try {
        // Derive the canonical status from stage for the status column
        const statusFromStage = updated.stage === 'approved' ? 'APPROVED'
          : updated.stage === 'rejected' ? 'REJECTED'
          : 'PENDING';
        await api.put(`/applications/${updated.id}`, {
          status: statusFromStage,
          vettingStage: updated.stage,
          rating: updated.rating,
          flagged: updated.flagged,
          // Exclude the synthetic applicant message note from stored notes
          notes: updated.notes.filter((n) => n.id !== 'msg-applicant'),
        });
      } catch {
        // Non-critical: UI already reflects the change
      }
    }
  };

  const counts = useMemo(() => {
    const map: Partial<Record<VettingStage, number>> = {};
    applicants.forEach((a) => { map[a.stage] = (map[a.stage] || 0) + 1; });
    return map;
  }, [applicants]);

  const pending = applicants.filter((a) => !['approved', 'rejected'].includes(a.stage)).length;

  return (
    <Layout>
      <Head><title>Vetting — VolunteerFlow</title></Head>
      <PlanGate feature="applicant_vetting">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Applicant Vetting</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Screen and approve new volunteer applicants through your vetting workflow.
            </p>
          </div>
          {pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-warning-500" />
              <span className="text-sm font-semibold text-warning-700 dark:text-warning-400">{pending} applicants need review</span>
            </div>
          )}
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setFilterStage(filterStage === stage.id ? '' : stage.id)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                filterStage === stage.id
                  ? `${stage.bg} border-current ${stage.color}`
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <p className={`text-2xl font-bold ${filterStage === stage.id ? stage.color : 'text-neutral-900 dark:text-neutral-100'}`}>
                {counts[stage.id] || 0}
              </p>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">{stage.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search applicants or events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {filterStage && (
            <button
              onClick={() => setFilterStage('')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <X className="w-3.5 h-3.5" /> Clear filter
            </button>
          )}
        </div>

        {/* Offline banner */}
        {usingMockData && (
          <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-lg text-sm text-warning-700 dark:text-warning-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Backend unavailable — showing cached data. Changes will not be saved.
          </div>
        )}

        {/* Applicant list */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-400 dark:text-neutral-500">
              <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{applicants.length === 0 ? 'No applications yet.' : 'No applicants match your filters.'}</p>
            </div>
          ) : filtered.map((applicant) => (
            <div
              key={applicant.id}
              className="cursor-pointer"
              onClick={() => setSelected(applicant)}
            >
            <Card
              className="flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {applicant.name.split(' ').map((n) => n[0]).join('')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{applicant.name}</p>
                  {applicant.flagged && <Flag className="w-3.5 h-3.5 text-danger-500 flex-shrink-0" />}
                  <StageBadge stage={applicant.stage} />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {applicant.appliedFor} · Applied {applicant.appliedAt}
                </p>
                {applicant.notes.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    {applicant.notes[applicant.notes.length - 1].body}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {applicant.rating !== null && <StarRating value={applicant.rating} />}
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
              </div>
            </Card>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <DetailPanel
          applicant={selected}
          onUpdate={updateApplicant}
          onClose={() => setSelected(null)}
        />
      )}
      </PlanGate>
    </Layout>
  );
}
