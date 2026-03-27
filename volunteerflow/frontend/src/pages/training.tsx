import { useState, useMemo, useEffect, useRef } from 'react';
import Head from 'next/head';
import toastLib from 'react-hot-toast';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/lib/api';
import {
  GraduationCap, Plus, Edit2, Trash2, X, Check, Save,
  PlayCircle, FileUp, AlignLeft, ChevronUp, ChevronDown,
  Eye, EyeOff, Clock, Users, BookOpen, Award,
  Search, Filter, CheckCircle2, ArrowLeft, ExternalLink,
  AlertCircle, UploadCloud, Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionType = 'text' | 'video' | 'file';
type PageTab = 'courses' | 'modules' | 'progress';

interface TrainingSection {
  id: string;
  title: string;
  type: SectionType;
  // text
  content?: string;
  // video
  videoUrl?: string;
  videoCaption?: string;
  // file submission
  filePrompt?: string;
  fileTypes?: string;
  required: boolean;
}

interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  estimatedMinutes: number;
  sections: TrainingSection[];
  published: boolean;
  createdAt: string;
}

interface TrainingCompletion {
  id: string;
  courseId: string;
  volunteerName: string;
  volunteerId: string;
  completedAt: string;
  submittedFiles: string[];
  notes?: string;
}

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  color: string;
  courseIds: string[];
  createdAt: string;
}

type PersonType = string; // 'volunteer' | group id

interface TrainingAssignment {
  id: string;
  courseId: string;
  personId: string;
  personName: string;
  personType: PersonType;
  assignedAt: string;
  dueDate?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytFull = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  const ytEmbed = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (ytFull) return `https://www.youtube.com/embed/${ytFull[1]}`;
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  if (ytEmbed) return url;
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // Direct video
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return url;
  return null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function VideoEmbed({ url, caption, onCompleted }: { url: string; caption?: string; onCompleted?: () => void }) {
  const embed = getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Use a ref so the message handler always has the latest callback without
  // needing to re-register the listener when onCompleted identity changes.
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);

  const isYT = !!embed && embed.includes('youtube.com/embed');
  const isVimeo = !!embed && embed.includes('player.vimeo.com');

  // Global postMessage listener for YouTube / Vimeo end events
  useEffect(() => {
    if (!embed || isDirectVideo(embed) || (!isYT && !isVimeo)) return;

    function handleMessage(evt: MessageEvent) {
      try {
        const d = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
        if (!d) return;
        // YouTube: playerState 0 = ended
        if (isYT && evt.origin.includes('youtube.com') && d.event === 'onStateChange' && d.info === 0) {
          onCompletedRef.current?.();
        }
        // Vimeo: 'finish' event
        if (isVimeo && evt.origin === 'https://player.vimeo.com' && d.event === 'finish') {
          onCompletedRef.current?.();
        }
      } catch { /* ignore non-JSON messages */ }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [embed, isYT, isVimeo]);

  // Called once the iframe DOM has loaded — send API init messages
  function handleIframeLoad() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      if (isYT) {
        // Register as a listener so YouTube sends state-change events back
        win.postMessage(JSON.stringify({ event: 'listening', id: 'ytplayer' }), '*');
      }
      if (isVimeo) {
        // Subscribe to the finish event
        win.postMessage(JSON.stringify({ method: 'addEventListener', value: 'finish' }), '*');
      }
    } catch { /* cross-origin sandbox may block */ }
  }

  if (!embed) return (
    <div className="bg-neutral-100 dark:bg-neutral-700 rounded-xl p-6 text-center text-sm text-neutral-400">
      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
      Invalid or unsupported video URL
    </div>
  );

  // Append JS API params so the embeds can send events to us
  let finalSrc = embed;
  if (isYT) {
    const u = new URL(embed);
    u.searchParams.set('enablejsapi', '1');
    finalSrc = u.toString();
  }
  if (isVimeo) {
    const u = new URL(embed);
    u.searchParams.set('api', '1');
    finalSrc = u.toString();
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        {isDirectVideo(embed) ? (
          <video
            src={embed}
            controls
            className="absolute inset-0 w-full h-full"
            onEnded={() => onCompletedRef.current?.()}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={finalSrc}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={caption || 'Video'}
            onLoad={handleIframeLoad}
          />
        )}
      </div>
      {caption && <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">{caption}</p>}
    </div>
  );
}

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiCourse {
  id: string; title: string; description: string; category: string;
  color: string; estimatedMinutes: number; sections: TrainingSection[];
  published: boolean; createdAt: string;
}
interface ApiModule {
  id: string; name: string; description: string; color: string;
  courseIds: string[]; createdAt: string;
}
interface ApiCompletion {
  id: string; courseId: string; volunteerName: string; volunteerId: string;
  completedAt: string; submittedFiles: string[]; notes: string;
}
interface ApiVolunteer { id: string; firstName: string; lastName: string; }
interface ApiAssignment {
  id: string; courseId: string; personId: string;
  personName: string; personType: string; assignedAt: string; dueDate: string | null;
}
interface ApiGroup { id: string; name: string; slug: string; color: string; }

function mapCourse(a: ApiCourse): TrainingCourse {
  return { ...a, estimatedMinutes: Number(a.estimatedMinutes) };
}
function mapCompletion(a: ApiCompletion): TrainingCompletion {
  return { ...a, notes: a.notes || undefined };
}

// ─── Course color presets ─────────────────────────────────────────────────────

const COLOR_PRESETS = ['#2563eb', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#be185d', '#374151'];
const CATEGORIES = ['Onboarding', 'Safety', 'Compliance', 'Skills', 'Leadership', 'Health', 'Technical', 'Other'];

// ─── Section Editor ───────────────────────────────────────────────────────────

function SectionEditor({
  section,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  section: TrainingSection;
  index: number;
  total: number;
  onChange: (s: TrainingSection) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const [previewVideo, setPreviewVideo] = useState(false);
  const ic = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';

  const TYPE_OPTIONS: { value: SectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'text', label: 'Text / Instructions', icon: AlignLeft },
    { value: 'video', label: 'Video', icon: PlayCircle },
    { value: 'file', label: 'File Submission', icon: FileUp },
  ];

  return (
    <div className="border-2 border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-xs font-bold text-neutral-400 w-5 text-center">{index + 1}</span>
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Section title..."
          className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-primary-500 outline-none pb-0.5 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
        />
        {/* Type selector */}
        <div className="flex gap-1">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ ...section, type: value })}
              title={label}
              className={`p-1.5 rounded-lg transition-colors text-xs ${
                section.type === value
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        {/* Required toggle */}
        <label className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer select-none">
          <input type="checkbox" checked={section.required} onChange={e => onChange({ ...section, required: e.target.checked })} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
          Required
        </label>
        {/* Move / delete */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => onMove('up')} disabled={index === 0} className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => onMove('down')} disabled={index === total - 1} className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1 rounded text-neutral-400 hover:text-danger-500 transition-colors ml-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section body */}
      <div className="p-4 space-y-3">
        {section.type === 'text' && (
          <textarea
            value={section.content ?? ''}
            onChange={e => onChange({ ...section, content: e.target.value })}
            placeholder="Enter instructions, markdown text, links, or any content for this section..."
            rows={6}
            className={ic + ' resize-y font-mono text-xs'}
          />
        )}

        {section.type === 'video' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={section.videoUrl ?? ''}
                onChange={e => onChange({ ...section, videoUrl: e.target.value })}
                placeholder="YouTube, Vimeo, or direct video URL (mp4, webm)..."
                className={ic + ' flex-1'}
              />
              <button
                onClick={() => setPreviewVideo(v => !v)}
                disabled={!section.videoUrl}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {previewVideo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {previewVideo ? 'Hide' : 'Preview'}
              </button>
            </div>
            <input
              value={section.videoCaption ?? ''}
              onChange={e => onChange({ ...section, videoCaption: e.target.value })}
              placeholder="Caption / description (optional)..."
              className={ic}
            />
            {previewVideo && section.videoUrl && (
              <VideoEmbed url={section.videoUrl} caption={section.videoCaption} />
            )}
          </div>
        )}

        {section.type === 'file' && (
          <div className="space-y-3">
            <textarea
              value={section.filePrompt ?? ''}
              onChange={e => onChange({ ...section, filePrompt: e.target.value })}
              placeholder="Instructions for the volunteer, e.g. 'Download, sign, and re-upload the waiver form below.'"
              rows={3}
              className={ic + ' resize-none'}
            />
            <input
              value={section.fileTypes ?? ''}
              onChange={e => onChange({ ...section, fileTypes: e.target.value })}
              placeholder="Accepted file types, e.g. PDF, JPG, PNG (optional)..."
              className={ic}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Course Builder Modal ─────────────────────────────────────────────────────

function CourseBuilderModal({
  initial,
  onSave,
  onClose,
}: {
  initial: TrainingCourse | null;
  onSave: (c: TrainingCourse) => void;
  onClose: () => void;
}) {
  const blank: TrainingCourse = {
    id: uid(), title: '', description: '', category: 'Onboarding', color: '#2563eb',
    estimatedMinutes: 30, sections: [], published: false, createdAt: new Date().toISOString().slice(0, 10),
  };
  const [course, setCourse] = useState<TrainingCourse>(initial ? JSON.parse(JSON.stringify(initial)) : blank);
  const [activeBuilderTab, setActiveBuilderTab] = useState<'info' | 'sections'>('info');

  const ic = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';

  function addSection(type: SectionType) {
    const s: TrainingSection = { id: uid(), title: `New ${type} section`, type, required: false };
    setCourse(c => ({ ...c, sections: [...c.sections, s] }));
  }

  function updateSection(id: string, updated: TrainingSection) {
    setCourse(c => ({ ...c, sections: c.sections.map(s => s.id === id ? updated : s) }));
  }

  function deleteSection(id: string) {
    setCourse(c => ({ ...c, sections: c.sections.filter(s => s.id !== id) }));
  }

  function moveSection(index: number, dir: 'up' | 'down') {
    setCourse(c => {
      const secs = [...c.sections];
      const target = dir === 'up' ? index - 1 : index + 1;
      [secs[index], secs[target]] = [secs[target], secs[index]];
      return { ...c, sections: secs };
    });
  }

  const canSave = course.title.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[9999]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-neutral-200 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: course.color + '22', border: `2px solid ${course.color}44` }}>
              <GraduationCap className="w-4 h-4" style={{ color: course.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {initial ? 'Edit Course' : 'New Training Course'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{course.sections.length} section{course.sections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Builder tab bar */}
        <div className="flex gap-1 px-6 pt-3 flex-shrink-0">
          {([{ id: 'info', label: 'Course Info' }, { id: 'sections', label: `Sections (${course.sections.length})` }] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveBuilderTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeBuilderTab === t.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Builder content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeBuilderTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Course Title *</label>
                <input value={course.title} onChange={e => setCourse(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Volunteer Orientation, Food Safety..." className={ic} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Description</label>
                <textarea value={course.description} onChange={e => setCourse(c => ({ ...c, description: e.target.value }))} placeholder="Brief overview shown on the course card..." rows={3} className={ic + ' resize-none'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Category</label>
                  <select value={course.category} onChange={e => setCourse(c => ({ ...c, category: e.target.value }))} className={ic}>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Estimated Duration (min)</label>
                  <input type="number" min={1} value={course.estimatedMinutes} onChange={e => setCourse(c => ({ ...c, estimatedMinutes: parseInt(e.target.value) || 30 }))} className={ic} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Course Color</label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map(col => (
                      <button key={col} onClick={() => setCourse(c => ({ ...c, color: col }))} className={`w-7 h-7 rounded-full transition-all ${course.color === col ? 'ring-2 ring-offset-2 ring-neutral-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: col }} />
                    ))}
                  </div>
                  <input type="color" value={course.color} onChange={e => setCourse(c => ({ ...c, color: e.target.value }))} className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-600 cursor-pointer p-0.5 bg-transparent" title="Custom color" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Published</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Visible and assignable to volunteers</p>
                </div>
                <button
                  onClick={() => setCourse(c => ({ ...c, published: !c.published }))}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${course.published ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${course.published ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {activeBuilderTab === 'sections' && (
            <div className="space-y-3">
              {course.sections.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">No sections yet</p>
                  <p className="text-xs text-neutral-400">Add a section below to get started</p>
                </div>
              )}
              {course.sections.map((s, i) => (
                <SectionEditor
                  key={s.id}
                  section={s}
                  index={i}
                  total={course.sections.length}
                  onChange={updated => updateSection(s.id, updated)}
                  onDelete={() => deleteSection(s.id)}
                  onMove={dir => moveSection(i, dir)}
                />
              ))}

              {/* Add section buttons */}
              <div className="flex gap-2 pt-2">
                {([
                  { type: 'text' as const, label: 'Text', icon: AlignLeft },
                  { type: 'video' as const, label: 'Video', icon: PlayCircle },
                  { type: 'file' as const, label: 'File Submission', icon: FileUp },
                ]).map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => addSection(type)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(course)} disabled={!canSave}>
            <Save className="w-4 h-4 mr-2" />
            {initial ? 'Save Changes' : 'Create Course'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Course Viewer Modal ──────────────────────────────────────────────────────

// Section progress is persisted in localStorage keyed by course id.
// Shape: Record<sectionId, isoTimestamp>
function loadProgress(courseId: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(`vf_sp_${courseId}`) ?? '{}');
  } catch { return {}; }
}
function saveProgress(courseId: string, progress: Record<string, string>) {
  localStorage.setItem(`vf_sp_${courseId}`, JSON.stringify(progress));
}

function CourseViewerModal({ course, onClose, isPreview = false }: { course: TrainingCourse; onClose: () => void; isPreview?: boolean }) {
  const [activeSection, setActiveSection] = useState(0);
  // sectionProgress maps sectionId → ISO timestamp when completed.
  // In preview mode we use ephemeral state only (no localStorage read/write).
  const [sectionProgress, setSectionProgress] = useState<Record<string, string>>(
    () => isPreview ? {} : loadProgress(course.id)
  );
  const [fileUploads, setFileUploads] = useState<Record<string, string>>({});
  const section = course.sections[activeSection];

  function markDone(id: string) {
    setSectionProgress(prev => {
      if (prev[id]) return prev; // already done
      const next = { ...prev, [id]: new Date().toISOString() };
      if (!isPreview) saveProgress(course.id, next);
      return next;
    });
  }

  const completedCount = Object.keys(sectionProgress).length;
  const totalCount = course.sections.length;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[9999]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-neutral-200 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: course.color + '22', border: `2px solid ${course.color}55` }}>
              <GraduationCap className="w-5 h-5" style={{ color: course.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{course.title}</h2>
              <p className="text-xs text-neutral-500">{course.sections.length} sections · ~{course.estimatedMinutes} min</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <div className="w-24 h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                  <div className="h-full bg-success-500 rounded-full transition-all" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
                </div>
                <span>{completedCount}/{totalCount}</span>
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar nav */}
          <div className="w-56 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 overflow-y-auto p-3 space-y-1">
            {course.sections.map((s, i) => {
              const doneAt = sectionProgress[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2 ${
                    i === activeSection ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${doneAt ? 'bg-success-500' : 'bg-neutral-200 dark:bg-neutral-600'}`}>
                    {doneAt ? <Check className="w-2.5 h-2.5 text-white" /> : <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-300">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="leading-snug font-medium block truncate">{s.title}</span>
                    {doneAt && (
                      <span className="text-[10px] text-success-600 dark:text-success-400 leading-tight">
                        {new Date(doneAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {section ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{section.title}</h3>
                  <div className="flex items-center gap-2">
                    {sectionProgress[section.id] && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-success-600 dark:text-success-400">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {section.required && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400">Required</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      section.type === 'video' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      section.type === 'file'  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                  'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                    }`}>
                      {section.type === 'video' ? 'Video' : section.type === 'file' ? 'File submission' : 'Reading'}
                    </span>
                  </div>
                </div>

                {section.type === 'video' && section.videoUrl && (
                  <>
                    <VideoEmbed
                      url={section.videoUrl}
                      caption={section.videoCaption}
                      onCompleted={() => markDone(section.id)}
                    />
                    {!sectionProgress[section.id] && (
                      <p className="text-xs text-neutral-400 text-center">Watch the video to the end to mark this section complete.</p>
                    )}
                  </>
                )}

                {section.type === 'text' && section.content && (
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-5 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </div>
                )}

                {section.type === 'file' && (
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-6 space-y-4">
                    {section.filePrompt && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{section.filePrompt}</p>
                    )}
                    {section.fileTypes && (
                      <p className="text-xs text-neutral-400">Accepted formats: <span className="font-semibold">{section.fileTypes}</span></p>
                    )}
                    {fileUploads[section.id] ? (
                      <div className="flex items-center gap-3 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                        <Check className="w-4 h-4 text-success-600 dark:text-success-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-success-700 dark:text-success-300">{fileUploads[section.id]}</span>
                        <button onClick={() => setFileUploads(f => { const n = { ...f }; delete n[section.id]; return n; })} className="ml-auto text-neutral-400 hover:text-danger-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer p-4 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors">
                        <UploadCloud className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Click to upload</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) { setFileUploads(f => ({ ...f, [section.id]: file.name })); markDone(section.id); }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Mark complete / navigate */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700">
                  <button
                    onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                    disabled={activeSection === 0}
                    className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {/* Manual completion — text always, video as fallback if auto-detect fails */}
                    {!sectionProgress[section.id] && (section.type === 'text' || section.type === 'video') && (
                      <Button size="sm" variant="outline" onClick={() => markDone(section.id)}>
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        {section.type === 'video' ? 'Mark as watched' : 'Mark complete'}
                      </Button>
                    )}
                    {activeSection < course.sections.length - 1 && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (section.type !== 'file') markDone(section.id);
                          setActiveSection(activeSection + 1);
                        }}
                      >
                        Next section
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-neutral-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sections in this course yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Module Builder Modal ─────────────────────────────────────────────────────

function ModuleBuilderModal({
  initial,
  courses,
  onSave,
  onClose,
}: {
  initial: TrainingModule | null;
  courses: TrainingCourse[];
  onSave: (m: TrainingModule) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? '#2563eb');
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.courseIds ?? []);
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = courses.filter(c =>
    !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  function toggleCourse(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      description: description.trim(),
      color,
      courseIds: selectedIds,
      createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
    });
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[9999]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
              <Layers className="w-5 h-5" style={{ color }} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{initial ? 'Edit Module' : 'New Module'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Module Name <span className="text-danger-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Volunteer Onboarding" className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What this module covers and who it's for..." rows={3} className={inputCls + ' resize-none'} />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-neutral-900 dark:border-neutral-100 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded-full border-2 border-neutral-200 dark:border-neutral-600 cursor-pointer overflow-hidden p-0" title="Custom color" />
            </div>
          </div>

          {/* Course selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Courses in this module
              <span className="ml-2 font-normal text-neutral-400">({selectedIds.length} selected)</span>
            </label>

            {courses.length === 0 ? (
              <p className="text-sm text-neutral-400 italic py-2">No courses available. Create courses first.</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)} placeholder="Filter courses..." className={inputCls + ' pl-8 py-1.5'} />
                </div>
                <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-700 max-h-52 overflow-y-auto">
                  {filteredCourses.map(course => {
                    const checked = selectedIds.includes(course.id);
                    return (
                      <button
                        key={course.id}
                        onClick={() => toggleCourse(course.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${checked ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-500'}`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{course.title}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{course.category} · {course.sections.length} section{course.sections.length !== 1 ? 's' : ''} · {course.estimatedMinutes} min</p>
                        </div>
                        {course.published
                          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 flex-shrink-0">Published</span>
                          : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 flex-shrink-0">Draft</span>
                        }
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-100 dark:border-neutral-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="w-4 h-4 mr-2" />{initial ? 'Save Changes' : 'Create Module'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Completion Modal ──────────────────────────────────────────────────

function RecordCompletionModal({
  courses,
  volunteers,
  onSave,
  onClose,
}: {
  courses: TrainingCourse[];
  volunteers: { id: string; name: string }[];
  onSave: (c: TrainingCompletion) => void;
  onClose: () => void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [volunteerId, setVolunteerId] = useState('');
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const ic = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';

  const vol = volunteers.find(v => v.id === volunteerId);
  const canSave = courseId && volunteerId && completedAt;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[9999]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Record Completion</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"><X className="w-5 h-5 text-neutral-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Course</label>
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className={ic}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Volunteer</label>
            <select value={volunteerId} onChange={e => setVolunteerId(e.target.value)} className={ic}>
              <option value="">— Select volunteer —</option>
              {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Completion Date</label>
            <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)} className={ic} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. completed via external certification..." className={ic} />
          </div>
        </div>
        <div className="flex justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave} onClick={() => onSave({ id: uid(), courseId, volunteerName: vol?.name ?? '', volunteerId, completedAt, submittedFiles: [], notes: notes || undefined })}>
            <Check className="w-4 h-4 mr-2" />Save Completion
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign People Modal ──────────────────────────────────────────────────────

function AssignVolunteersModal({
  course,
  volunteers,
  groups,
  existingAssignments,
  onSave,
  onRemove,
  onClose,
}: {
  course: TrainingCourse;
  volunteers: { id: string; name: string }[];
  groups: ApiGroup[];
  existingAssignments: TrainingAssignment[];
  onSave:   (courseId: string, toAdd: { id: string; name: string; type: string }[], dueDate: string) => Promise<void>;
  onRemove: (courseId: string, personId: string, personType: string) => Promise<void>;
  onClose:  () => void;
}) {
  // Tabs: volunteers fixed + one per group
  const allTabs = [
    { type: 'volunteer', label: 'Volunteers' },
    ...groups.map(g => ({ type: g.id, label: g.name })),
  ];

  const [activeTab, setActiveTab] = useState<string>('volunteer');
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loadingGroups, setLoadingGroups] = useState(groups.length > 0);

  // Fetch group members on open
  useEffect(() => {
    if (groups.length === 0) { setLoadingGroups(false); return; }
    Promise.all(groups.map(g => api.get<{ id: string; name: string }[]>(`/people/groups/${g.id}/members`)))
      .then(results => {
        const map: Record<string, { id: string; name: string }[]> = {};
        groups.forEach((g, i) => { map[g.id] = (results[i] as { id: string; name: string }[]) ?? []; });
        setGroupMembersMap(map);
      })
      .finally(() => setLoadingGroups(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialSelected = new Set(existingAssignments.map(a => `${a.personType}:${a.personId}`));
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  function listByTab(type: string): { id: string; name: string }[] {
    if (type === 'volunteer') return volunteers;
    return groupMembersMap[type] ?? [];
  }

  function key(type: string, id: string) { return `${type}:${id}`; }

  function toggle(type: string, id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      const k = key(type, id);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function selectAll(type: string) {
    setSelected(prev => {
      const next = new Set(prev);
      listByTab(type).forEach(p => next.add(key(type, p.id)));
      return next;
    });
  }

  function clearAll(type: string) {
    setSelected(prev => {
      const next = new Set(prev);
      listByTab(type).forEach(p => next.delete(key(type, p.id)));
      return next;
    });
  }

  const toAdd = allTabs.flatMap(({ type }) =>
    listByTab(type)
      .filter(p => selected.has(key(type, p.id)) && !initialSelected.has(key(type, p.id)))
      .map(p => ({ ...p, type }))
  );
  const toRemove = existingAssignments.filter(a => !selected.has(key(a.personType, a.personId)));

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      toAdd.length > 0 ? onSave(course.id, toAdd, dueDate) : Promise.resolve(),
      ...toRemove.map(a => onRemove(course.id, a.personId, a.personType)),
    ]);
    setSaving(false);
    onClose();
  }

  const ic = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500';
  const totalSelected = selected.size;
  const activeLabel = allTabs.find(t => t.type === activeTab)?.label ?? '';
  const currentList = listByTab(activeTab).filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[9999]" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-neutral-200 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Assign Training</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-xs">{course.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Due date */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Due date <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={ic} />
        </div>

        {/* Tabs: Volunteers + custom groups */}
        {allTabs.length > 1 && (
          <div className="px-6 pt-4 flex-shrink-0 overflow-x-auto">
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1 min-w-max">
              {allTabs.map(({ type, label }) => {
                const count = listByTab(type).filter(p => selected.has(key(type, p.id))).length;
                return (
                  <button
                    key={type}
                    onClick={() => { setActiveTab(type); setSearch(''); }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      activeTab === type
                        ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + Select All */}
        <div className="px-6 pt-3 pb-2 flex-shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeLabel.toLowerCase()}…`}
              className={ic + ' pl-9 py-1.5'}
            />
          </div>
          <button
            onClick={() => {
              const allSel = listByTab(activeTab).every(p => selected.has(key(activeTab, p.id)));
              allSel ? clearAll(activeTab) : selectAll(activeTab);
            }}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
          >
            {listByTab(activeTab).length > 0 && listByTab(activeTab).every(p => selected.has(key(activeTab, p.id)))
              ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* People list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loadingGroups && activeTab !== 'volunteer' ? (
            <div className="py-10 text-center text-sm text-neutral-400">Loading…</div>
          ) : listByTab(activeTab).length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-400 italic">
              No {activeLabel.toLowerCase()} yet.
            </div>
          ) : (
            <div className="border border-neutral-200 dark:border-neutral-600 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-700 overflow-hidden">
              {currentList.map(person => {
                const k = key(activeTab, person.id);
                const checked = selected.has(k);
                const wasAssigned = initialSelected.has(k);
                return (
                  <button
                    key={person.id}
                    onClick={() => toggle(activeTab, person.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${checked ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-500'}`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <p className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{person.name}</p>
                    {wasAssigned && checked && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 flex-shrink-0">Assigned</span>
                    )}
                    {wasAssigned && !checked && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 flex-shrink-0">Remove</span>
                    )}
                  </button>
                );
              })}
              {currentList.length === 0 && (
                <div className="py-8 text-center text-sm text-neutral-400">No matches</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 space-x-2">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{totalSelected} selected</span>
            {toAdd.length > 0 && <span className="text-success-600 dark:text-success-400">+{toAdd.length} to add</span>}
            {toRemove.length > 0 && <span className="text-danger-600 dark:text-danger-400">−{toRemove.length} to remove</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || (toAdd.length === 0 && toRemove.length === 0)}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [tab, setTab] = useState<PageTab>('courses');
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [volunteers, setVolunteers] = useState<{ id: string; name: string }[]>([]);
  const [groups,     setGroups]     = useState<ApiGroup[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [viewingCourse, setViewingCourse] = useState<TrainingCourse | null>(null);
  const [assigningCourse, setAssigningCourse] = useState<TrainingCourse | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [moduleBuilderOpen, setModuleBuilderOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);

  const [courseSearch, setCourseSearch] = useState('');
  const [progressSearch, setProgressSearch] = useState('');
  const [progressFilter, setProgressFilter] = useState('');

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    Promise.all([
      api.get<ApiCourse[]>('/training/courses'),
      api.get<ApiModule[]>('/training/modules'),
      api.get<ApiCompletion[]>('/training/completions'),
      api.get<ApiVolunteer[]>('/volunteers?limit=100'),
      api.get<ApiAssignment[]>('/training/assignments'),
      api.get<ApiGroup[]>('/people/groups').catch(() => [] as ApiGroup[]),
    ]).then(([cs, ms, cmps, vols, asgns, grps]) => {
      setCourses((cs as ApiCourse[]).map(mapCourse));
      setModules(ms as ApiModule[]);
      setCompletions((cmps as ApiCompletion[]).map(mapCompletion));
      setVolunteers((vols as ApiVolunteer[]).map(v => ({ id: v.id, name: `${v.firstName} ${v.lastName}` })));
      setAssignments(asgns as TrainingAssignment[]);
      setGroups(grps as ApiGroup[]);
    }).catch(() => {
      setUsingMockData(true);
    }).finally(() => setLoading(false));
  }, []);

  async function saveCourse(c: TrainingCourse) {
    const isEdit = courses.some(x => x.id === c.id);
    try {
      if (isEdit) {
        const updated = await api.put<ApiCourse>(`/training/courses/${c.id}`, c);
        setCourses(prev => prev.map(x => x.id === c.id ? mapCourse(updated) : x));
      } else {
        const created = await api.post<ApiCourse>('/training/courses', c);
        setCourses(prev => [...prev, mapCourse(created)]);
      }
      showToast(isEdit ? `"${c.title}" updated` : `"${c.title}" created`);
    } catch {
      toastLib.error('Failed to save course');
    }
    setBuilderOpen(false); setEditingCourse(null);
  }

  function deleteCourse(id: string) {
    const target = courses.find(c => c.id === id);
    if (!target) return;
    toastLib((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete <strong>{target.title}</strong>?</p>
        <p className="text-xs text-neutral-500">Completion records will remain.</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            toastLib.dismiss(t.id);
            try {
              await api.delete(`/training/courses/${id}`);
              setCourses(prev => prev.filter(c => c.id !== id));
              showToast('Course deleted');
            } catch { toastLib.error('Failed to delete course'); }
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toastLib.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  async function togglePublish(id: string) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    const next = !course.published;
    setCourses(prev => prev.map(c => c.id === id ? { ...c, published: next } : c));
    try {
      await api.put(`/training/courses/${id}`, { ...course, published: next });
    } catch {
      setCourses(prev => prev.map(c => c.id === id ? { ...c, published: !next } : c));
      toastLib.error('Failed to update publish status');
    }
  }

  async function saveModule(m: TrainingModule) {
    const isEdit = modules.some(x => x.id === m.id);
    try {
      if (isEdit) {
        const updated = await api.put<ApiModule>(`/training/modules/${m.id}`, m);
        setModules(prev => prev.map(x => x.id === m.id ? (updated as TrainingModule) : x));
      } else {
        const created = await api.post<ApiModule>('/training/modules', m);
        setModules(prev => [...prev, created as TrainingModule]);
      }
      showToast(isEdit ? `"${m.name}" updated` : `"${m.name}" created`);
    } catch {
      toastLib.error('Failed to save module');
    }
    setModuleBuilderOpen(false); setEditingModule(null);
  }

  function deleteModule(id: string) {
    const target = modules.find(m => m.id === id);
    if (!target) return;
    toastLib((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete module <strong>{target.name}</strong>?</p>
        <p className="text-xs text-neutral-500">Courses will not be deleted.</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            toastLib.dismiss(t.id);
            try {
              await api.delete(`/training/modules/${id}`);
              setModules(prev => prev.filter(m => m.id !== id));
              showToast('Module deleted');
            } catch { toastLib.error('Failed to delete module'); }
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toastLib.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  async function saveCompletion(comp: TrainingCompletion) {
    try {
      const created = await api.post<ApiCompletion>('/training/completions', comp);
      setCompletions(prev => [...prev, mapCompletion(created)]);
      showToast(`Completion recorded for ${comp.volunteerName}`);
    } catch {
      toastLib.error('Failed to save completion');
    }
    setRecordOpen(false);
  }

  async function handleAssign(courseId: string, toAdd: { id: string; name: string; type: PersonType }[], dueDate: string) {
    const created = await api.post<ApiAssignment[]>('/training/assignments', {
      courseId, people: toAdd, dueDate: dueDate || null,
    });
    setAssignments(prev => {
      const newKeys = new Set((created as ApiAssignment[]).map(a => `${a.courseId}:${a.personId}:${a.personType}`));
      return [
        ...prev.filter(a => !newKeys.has(`${a.courseId}:${a.personId}:${a.personType}`)),
        ...(created as TrainingAssignment[]),
      ];
    });
    showToast(`${toAdd.length} person${toAdd.length !== 1 ? 's' : ''} assigned`);
  }

  async function handleUnassign(courseId: string, personId: string, personType: PersonType) {
    const assignment = assignments.find(a => a.courseId === courseId && a.personId === personId && a.personType === personType);
    if (!assignment) return;
    await api.delete(`/training/assignments/${assignment.id}`);
    setAssignments(prev => prev.filter(a => a.id !== assignment.id));
  }

  const filteredCourses = useMemo(() =>
    courses.filter(c => !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase()) || c.category.toLowerCase().includes(courseSearch.toLowerCase())),
    [courses, courseSearch]
  );

  const filteredCompletions = useMemo(() =>
    completions.filter(c => {
      if (progressFilter && c.courseId !== progressFilter) return false;
      if (progressSearch && !c.volunteerName.toLowerCase().includes(progressSearch.toLowerCase())) return false;
      return true;
    }),
    [completions, progressSearch, progressFilter]
  );

  if (loading) {
    return (
      <Layout>
        <Head><title>Training — VolunteerFlow</title></Head>
        <div className="p-6 space-y-5 max-w-7xl mx-auto animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Training — VolunteerFlow</title></Head>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {usingMockData && (
          <div className="flex items-center gap-3 px-4 py-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl text-sm text-warning-800 dark:text-warning-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Could not reach the backend — showing empty state. Changes will not be saved.
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Training</h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Build courses, assign content, and track volunteer completions.</p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'progress' && (
              <Button variant="outline" onClick={() => setRecordOpen(true)}>
                <CheckCircle2 className="w-4 h-4 mr-2" />Record Completion
              </Button>
            )}
            {tab === 'modules' && (
              <Button onClick={() => { setEditingModule(null); setModuleBuilderOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />New Module
              </Button>
            )}
            {tab === 'courses' && (
              <Button onClick={() => { setEditingCourse(null); setBuilderOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />New Course
              </Button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20' },
            { label: 'Modules', value: modules.length, icon: Layers, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Published', value: courses.filter(c => c.published).length, icon: Eye, color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/20' },
            { label: 'Completions', value: completions.length, icon: Award, color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20' },
            { label: 'Volunteers Trained', value: new Set(completions.map(c => c.volunteerId)).size, icon: Users, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
          {([{ id: 'modules', label: 'Modules' }, { id: 'courses', label: 'Courses' }, { id: 'progress', label: 'Progress' }] as { id: PageTab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── COURSES TAB ──────────────────────────────────────────────────── */}
        {tab === 'courses' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input value={courseSearch} onChange={e => setCourseSearch(e.target.value)} placeholder="Search courses..." className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            {filteredCourses.length === 0 ? (
              <Card className="p-16 text-center">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-neutral-500 dark:text-neutral-400">No courses yet — create your first one.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredCourses.map(course => {
                  const count = completions.filter(c => c.courseId === course.id).length;
                  const assignedCount = assignments.filter(a => a.courseId === course.id).length;
                  return (
                    <Card key={course.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {/* Color bar */}
                      <div className="h-2" style={{ backgroundColor: course.color }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">{course.category}</span>
                            {course.published
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">Published</span>
                              : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">Draft</span>
                            }
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingCourse(course)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Preview"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingCourse(course); setBuilderOpen(true); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteCourse(course.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">{course.title}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">{course.description}</p>

                        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.sections.length} section{course.sections.length !== 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.estimatedMinutes} min</span>
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />{count} completion{count !== 1 ? 's' : ''}</span>
                          {assignedCount > 0 && (
                            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium"><Users className="w-3.5 h-3.5" />{assignedCount} assigned</span>
                          )}
                        </div>

                        {/* Section type chips */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {Array.from(new Set(course.sections.map(s => s.type))).map(type => (
                            <span key={type} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                              {type === 'video' ? <PlayCircle className="w-3 h-3" /> : type === 'file' ? <FileUp className="w-3 h-3" /> : <AlignLeft className="w-3 h-3" />}
                              {type === 'video' ? 'Video' : type === 'file' ? 'File upload' : 'Text'}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewingCourse(course)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                            <Eye className="w-4 h-4" /> Preview
                          </button>
                          <button onClick={() => setAssigningCourse(course)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-primary-200 dark:border-primary-700 rounded-lg text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                            <Users className="w-4 h-4" /> Assign
                          </button>
                          <button onClick={() => togglePublish(course.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${course.published ? 'border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700' : 'border-success-300 dark:border-success-700 text-success-700 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20'}`}>
                            {course.published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODULES TAB ───────────────────────────────────────────────────── */}
        {tab === 'modules' && (
          <div className="space-y-4">
            {modules.length === 0 ? (
              <Card className="p-16 text-center">
                <Layers className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <p className="text-neutral-500 dark:text-neutral-400 mb-1">No modules yet.</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">Group courses into a module to create a learning path for your volunteers.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {modules.map(mod => {
                  const modCourses = courses.filter(c => mod.courseIds.includes(c.id));
                  const totalCompletions = completions.filter(comp => mod.courseIds.includes(comp.courseId)).length;
                  const uniqueVolunteers = new Set(
                    completions.filter(comp => mod.courseIds.includes(comp.courseId)).map(c => c.volunteerId)
                  ).size;
                  const totalMinutes = modCourses.reduce((sum, c) => sum + c.estimatedMinutes, 0);

                  return (
                    <Card key={mod.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {/* Color bar */}
                      <div className="h-2" style={{ backgroundColor: mod.color }} />
                      <div className="p-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: mod.color + '22' }}>
                              <Layers className="w-4 h-4" style={{ color: mod.color }} />
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                              {modCourses.length} course{modCourses.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingModule(mod); setModuleBuilderOpen(true); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteModule(mod.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">{mod.name}</h3>
                        {mod.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4">{mod.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{totalMinutes} min total</span>
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />{totalCompletions} completion{totalCompletions !== 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{uniqueVolunteers} volunteer{uniqueVolunteers !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Course list */}
                        {modCourses.length === 0 ? (
                          <p className="text-xs text-neutral-400 italic mb-4">No courses added yet.</p>
                        ) : (
                          <div className="space-y-2 mb-4">
                            {modCourses.map((course, idx) => {
                              const courseCompletions = completions.filter(c => c.courseId === course.id).length;
                              return (
                                <div key={course.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700">
                                  <span className="text-xs font-bold text-neutral-400 w-4 flex-shrink-0">{idx + 1}</span>
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                                  <p className="flex-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{course.title}</p>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-[10px] text-neutral-400">{course.estimatedMinutes}m</span>
                                    {course.published
                                      ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">Published</span>
                                      : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500">Draft</span>
                                    }
                                    {courseCompletions > 0 && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">{courseCompletions}✓</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Edit button */}
                        <button
                          onClick={() => { setEditingModule(mod); setModuleBuilderOpen(true); }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Module
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PROGRESS TAB ──────────────────────────────────────────────────── */}
        {tab === 'progress' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input value={progressSearch} onChange={e => setProgressSearch(e.target.value)} placeholder="Search volunteer..." className="pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 w-56" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select value={progressFilter} onChange={e => setProgressFilter(e.target.value)} className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-2 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">All courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center">{filteredCompletions.length} record{filteredCompletions.length !== 1 ? 's' : ''}</span>
            </div>

            <Card className="overflow-hidden">
              {filteredCompletions.length === 0 ? (
                <div className="py-16 text-center text-neutral-400">
                  <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No completions match your filters</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-100 dark:border-neutral-700">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Volunteer</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400">Course</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden sm:table-cell">Completed</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden md:table-cell">Files</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-neutral-400 hidden lg:table-cell">Notes</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/50">
                    {filteredCompletions.map(comp => {
                      const course = courses.find(c => c.id === comp.courseId);
                      return (
                        <tr key={comp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                                {comp.volunteerName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">{comp.volunteerName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {course ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                                <span className="text-neutral-800 dark:text-neutral-200">{course.title}</span>
                              </div>
                            ) : <span className="text-neutral-400 italic">Deleted course</span>}
                          </td>
                          <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">
                            {new Date(comp.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            {comp.submittedFiles.length > 0
                              ? <span className="text-xs text-primary-600 dark:text-primary-400">{comp.submittedFiles.length} file{comp.submittedFiles.length !== 1 ? 's' : ''}</span>
                              : <span className="text-xs text-neutral-400">—</span>
                            }
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell text-xs text-neutral-500 dark:text-neutral-400 max-w-[160px] truncate">{comp.notes || '—'}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => setCompletions(p => p.filter(c => c.id !== comp.id))} className="p-1.5 rounded text-neutral-300 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors" title="Remove record">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      {builderOpen && (
        <CourseBuilderModal initial={editingCourse} onSave={saveCourse} onClose={() => { setBuilderOpen(false); setEditingCourse(null); }} />
      )}
      {viewingCourse && (
        <CourseViewerModal course={viewingCourse} onClose={() => setViewingCourse(null)} isPreview />
      )}
      {recordOpen && (
        <RecordCompletionModal courses={courses.filter(c => c.published)} volunteers={volunteers} onSave={saveCompletion} onClose={() => setRecordOpen(false)} />
      )}
      {moduleBuilderOpen && (
        <ModuleBuilderModal initial={editingModule} courses={courses} onSave={saveModule} onClose={() => { setModuleBuilderOpen(false); setEditingModule(null); }} />
      )}
      {assigningCourse && (
        <AssignVolunteersModal
          course={assigningCourse}
          volunteers={volunteers}
          groups={groups}
          existingAssignments={assignments.filter(a => a.courseId === assigningCourse.id)}
          onSave={handleAssign}
          onRemove={handleUnassign}
          onClose={() => setAssigningCourse(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl shadow-lg text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 dark:text-success-600" />
          {toast}
        </div>
      )}
    </Layout>
  );
}
