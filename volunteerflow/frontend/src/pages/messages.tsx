import { useState, useEffect } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Mail,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Users,
  Bell,
  Search,
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  ShieldCheck,
  UserCog,
  Megaphone,
  Info,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = 'email' | 'sms';
type TabId = 'compose' | 'templates' | 'reminders' | 'history' | 'job_notifications' | 'login_notifications';
type LoginNotifType = 'info' | 'success' | 'warning' | 'urgent';

interface LoginNotification {
  id: string;
  title: string;
  message: string;
  type: LoginNotifType;
  active: boolean;
  createdAt: string;
  seenBy: string[];
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: Channel;
  subject: string;
  body: string;
  createdAt: string;
}

interface AutoReminder {
  id: string;
  name: string;
  channel: Channel;
  triggerHours: number;
  templateId: string | null;
  customBody: string;
  enabled: boolean;
  eventScope: 'all' | 'specific';
}

interface SentMessage {
  id: string;
  channel: Channel;
  subject: string;
  body: string;
  recipients: number;
  sentAt: string;
  status: 'delivered' | 'partial' | 'failed';
}

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Event {
  id: string;
  title: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TYPE_CONFIG: Record<LoginNotifType, {
  label: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  info:    { label: 'Info',    color: '#2563eb', bg: 'bg-primary-50 dark:bg-primary-900/20',  text: 'text-primary-700 dark:text-primary-300',  border: 'border-primary-200 dark:border-primary-700',  Icon: Info },
  success: { label: 'Success', color: '#059669', bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-300', border: 'border-success-200 dark:border-success-700', Icon: Check },
  warning: { label: 'Warning', color: '#d97706', bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-300', border: 'border-warning-200 dark:border-warning-700', Icon: AlertTriangle },
  urgent:  { label: 'Urgent',  color: '#dc2626', bg: 'bg-danger-50 dark:bg-danger-900/20',   text: 'text-danger-700 dark:text-danger-300',   border: 'border-danger-200 dark:border-danger-700',   Icon: AlertCircle },
};

const inputCls = 'w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500';

// ─── Helper components ────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: Channel }) {
  return channel === 'sms' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400">
      <MessageSquare className="w-3 h-3" /> SMS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400">
      <Mail className="w-3 h-3" /> Email
    </span>
  );
}

function StatusBadge({ status }: { status: SentMessage['status'] }) {
  const styles = {
    delivered: 'bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-400',
    partial: 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400',
    failed: 'bg-danger-100 dark:bg-danger-900/40 text-danger-700 dark:text-danger-400',
  };
  const labels = { delivered: 'Delivered', partial: 'Partial', failed: 'Failed' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Compose Tab ──────────────────────────────────────────────────────────────

function ComposeTab({
  templates,
  volunteers,
  events,
  onSend,
}: {
  templates: MessageTemplate[];
  volunteers: Volunteer[];
  events: Event[];
  onSend: (msg: SentMessage) => void;
}) {
  const [channel, setChannel] = useState<Channel>('email');
  const [recipientMode, setRecipientMode] = useState<'all' | 'event' | 'select'>('all');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventVolCount, setEventVolCount] = useState<number | null>(null);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (recipientMode !== 'event' || !selectedEvent) {
      setEventVolCount(null);
      return;
    }
    api.get<{ count: number }>(`/events/${selectedEvent}/volunteer-count`)
      .then((d) => setEventVolCount(d.count))
      .catch(() => setEventVolCount(null));
  }, [selectedEvent, recipientMode]);

  const filtered = volunteers.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVolunteer = (id: string) =>
    setSelectedVolunteers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const applyTemplate = (tid: string) => {
    const t = templates.find((t) => t.id === tid);
    if (!t) return;
    setTemplateId(tid);
    setChannel(t.channel);
    setSubject(t.subject);
    setBody(t.body);
  };

  const recipientCount =
    recipientMode === 'all' ? volunteers.length :
    recipientMode === 'event' ? (eventVolCount ?? 0) :
    selectedVolunteers.length;

  const handleSend = async () => {
    if (!body.trim()) return;
    if (recipientMode === 'select' && selectedVolunteers.length === 0) return;
    setSending(true);
    try {
      const result = await api.post<SentMessage & { recipientsFound?: number; errors?: string[] }>('/messages/send', {
        channel,
        subject: channel === 'email' ? subject : body.slice(0, 60),
        body,
        recipientMode,
        eventId: recipientMode === 'event' ? selectedEvent : undefined,
        volunteerIds: recipientMode === 'select' ? selectedVolunteers : undefined,
      });
      if (result.recipientsFound === 0) {
        toast.error('No recipients found — volunteer may have no email/phone on record');
      } else if (result.errors && result.errors.length > 0) {
        toast.error(`Send failed: ${result.errors[0]}`);
      } else {
        onSend(result);
        setSubject('');
        setBody('');
        setTemplateId('');
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: settings */}
      <div className="space-y-5">
        {/* Channel */}
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Channel</p>
          <div className="flex gap-2">
            {(['email', 'sms'] as Channel[]).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  channel === c
                    ? c === 'sms'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                      : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                {c === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                {c === 'sms' ? 'SMS' : 'Email'}
              </button>
            ))}
          </div>
        </Card>

        {/* Template */}
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Use Template</p>
          <select
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select template —</option>
            {templates.filter((t) => t.channel === channel).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-400 mt-2">Selecting a template pre-fills subject & body</p>
        </Card>

        {/* Recipients */}
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">Recipients</p>
          <div className="space-y-2 mb-3">
            {[
              { value: 'all', label: 'All volunteers', count: volunteers.length },
              { value: 'event', label: 'By event', count: null },
              { value: 'select', label: 'Select individually', count: null },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRecipientMode(opt.value as typeof recipientMode)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border-2 transition-colors ${
                  recipientMode === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.count !== null && (
                  <span className="text-[11px] font-bold bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">
                    {opt.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {recipientMode === 'event' && (
            <div>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className={inputCls}
              >
                <option value="">— Pick an event —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              {selectedEvent && eventVolCount !== null && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                  {eventVolCount} registered volunteer{eventVolCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {recipientMode === 'select' && (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search volunteers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filtered.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggleVolunteer(v.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      selectedVolunteers.includes(v.id)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedVolunteers.includes(v.id) ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {selectedVolunteers.includes(v.id) && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="flex-1 text-left truncate">{v.name}</span>
                  </button>
                ))}
              </div>
              {selectedVolunteers.length > 0 && (
                <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 mt-2">
                  {selectedVolunteers.length} selected
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Right: compose */}
      <div className="lg:col-span-2">
        <Card className="p-5 h-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Compose Message</p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <Users className="w-3.5 h-3.5" />
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </div>
          </div>

          {channel === 'email' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Reminder: {{event_name}} is coming up!"
                className={inputCls}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Message Body
              {channel === 'sms' && (
                <span className={`ml-2 font-normal ${body.length > 160 ? 'text-warning-500' : 'text-neutral-400'}`}>
                  {body.length}/160 chars
                </span>
              )}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                channel === 'sms'
                  ? 'Hi {{first_name}}! Your event starts soon…'
                  : 'Dear {{first_name}},\n\nYour message here…'
              }
              rows={channel === 'email' ? 10 : 5}
              className={`flex-1 ${inputCls} resize-none font-mono`}
            />
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
            <p className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {['{{first_name}}', '{{last_name}}', '{{event_name}}', '{{event_date}}', '{{event_location}}', '{{org_name}}'].map((v) => (
                <button
                  key={v}
                  onClick={() => setBody((b) => b + v)}
                  className="px-2 py-0.5 text-[11px] font-mono bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-600 dark:text-neutral-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={!body.trim() || sending || (recipientMode === 'select' && selectedVolunteers.length === 0)}
              className="flex items-center gap-2"
            >
              {sending ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending…</>
              ) : (
                <><Send className="w-4 h-4" />Send to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab({
  templates,
  setTemplates,
}: {
  templates: MessageTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
}) {
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = (): MessageTemplate => ({
    id: '',
    name: '',
    channel: 'email',
    subject: '',
    body: '',
    createdAt: '',
  });

  const openNew = () => { setEditing(blank()); setIsNew(true); };
  const openEdit = (t: MessageTemplate) => { setEditing({ ...t }); setIsNew(false); };

  const save = async () => {
    if (!editing || !editing.name.trim() || !editing.body.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const saved = await api.post<MessageTemplate>('/messages/templates', {
          name: editing.name, channel: editing.channel, subject: editing.subject, body: editing.body,
        });
        setTemplates((p) => [...p, saved]);
        toast.success('Template created');
      } else {
        const saved = await api.put<MessageTemplate>(`/messages/templates/${editing.id}`, {
          name: editing.name, channel: editing.channel, subject: editing.subject, body: editing.body,
        });
        setTemplates((p) => p.map((t) => t.id === editing.id ? saved : t));
        toast.success('Template saved');
      }
      setEditing(null);
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/messages/templates/${id}`);
      setTemplates((p) => p.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
          <Button variant="primary" onClick={openNew} className="flex items-center gap-1.5 text-sm px-3 py-1.5">
            <Plus className="w-4 h-4" /> New template
          </Button>
        </div>
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ChannelBadge channel={t.channel} />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{t.name}</span>
                    {t.name === 'Application Approved' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 whitespace-nowrap">
                        Auto-sent on approval
                      </span>
                    )}
                  </div>
                  {t.subject && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-1">{t.subject}</p>
                  )}
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No templates yet. Create your first one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {editing ? (
        <Card className="p-5">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {isNew ? 'New Template' : 'Edit Template'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Template name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Event Reminder"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Channel</label>
              <div className="flex gap-2">
                {(['email', 'sms'] as Channel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, channel: c })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      editing.channel === c
                        ? c === 'sms'
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                          : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {c === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    {c === 'sms' ? 'SMS' : 'Email'}
                  </button>
                ))}
              </div>
            </div>
            {editing.channel === 'email' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Subject line</label>
                <input
                  type="text"
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  placeholder="e.g. Reminder: {{event_name}}"
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Body
                {editing.channel === 'sms' && (
                  <span className={`ml-2 font-normal ${editing.body.length > 160 ? 'text-warning-500' : 'text-neutral-400'}`}>
                    {editing.body.length}/160
                  </span>
                )}
              </label>
              <textarea
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={6}
                className={`${inputCls} resize-none font-mono`}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={!editing.name.trim() || !editing.body.trim() || saving}>
                {saving ? 'Saving…' : 'Save template'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-center text-center text-neutral-300 dark:text-neutral-600 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 p-12">
          <div>
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Select a template to edit<br />or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminders Tab ────────────────────────────────────────────────────────────

function RemindersTab({
  reminders,
  setReminders,
  templates,
}: {
  reminders: AutoReminder[];
  setReminders: React.Dispatch<React.SetStateAction<AutoReminder[]>>;
  templates: MessageTemplate[];
}) {
  const [editing, setEditing] = useState<AutoReminder | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = (): AutoReminder => ({
    id: '',
    name: '',
    channel: 'email',
    triggerHours: 24,
    templateId: null,
    customBody: '',
    enabled: true,
    eventScope: 'all',
  });

  const toggleEnabled = async (r: AutoReminder) => {
    try {
      const updated = await api.put<AutoReminder>(`/messages/reminders/${r.id}`, { ...r, enabled: !r.enabled });
      setReminders((p) => p.map((x) => x.id === r.id ? updated : x));
    } catch {
      toast.error('Failed to update reminder');
    }
  };

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const saved = await api.post<AutoReminder>('/messages/reminders', editing);
        setReminders((p) => [...p, saved]);
        toast.success('Reminder created');
      } else {
        const saved = await api.put<AutoReminder>(`/messages/reminders/${editing.id}`, editing);
        setReminders((p) => p.map((r) => r.id === editing.id ? saved : r));
        toast.success('Reminder saved');
      }
      setEditing(null);
    } catch {
      toast.error('Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/messages/reminders/${id}`);
      setReminders((p) => p.filter((r) => r.id !== id));
      toast.success('Reminder deleted');
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

  const triggerLabel = (hours: number) => {
    if (hours < 1) return `${hours * 60} minutes`;
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    if (hours === 24) return '1 day';
    return `${hours / 24} days`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {reminders.length} automated reminder{reminders.length !== 1 ? 's' : ''}
          </p>
          <Button variant="primary" onClick={() => { setEditing(blank()); setIsNew(true); }} className="flex items-center gap-1.5 text-sm px-3 py-1.5">
            <Plus className="w-4 h-4" /> New reminder
          </Button>
        </div>
        <div className="space-y-3">
          {reminders.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleEnabled(r)} className="mt-0.5 flex-shrink-0">
                  {r.enabled
                    ? <ToggleRight className="w-8 h-5 text-primary-500" />
                    : <ToggleLeft className="w-8 h-5 text-neutral-300 dark:text-neutral-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelBadge channel={r.channel} />
                    <span className={`text-sm font-semibold ${r.enabled ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
                      {r.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{triggerLabel(r.triggerHours)} before event</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.eventScope === 'all' ? 'All events' : 'Specific events'}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setEditing({ ...r }); setIsNew(false); }} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-500 hover:text-danger-600 dark:hover:text-danger-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {reminders.length === 0 && (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reminders yet. Set one up to automate your outreach.</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      {editing ? (
        <Card className="p-5">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {isNew ? 'New Reminder' : 'Edit Reminder'}
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Reminder name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. 24-hour email reminder"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Channel</label>
              <div className="flex gap-2">
                {(['email', 'sms'] as Channel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, channel: c, templateId: null })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      editing.channel === c
                        ? c === 'sms'
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                          : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {c === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    {c === 'sms' ? 'SMS' : 'Email'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Send how long before event?</label>
              <select
                value={editing.triggerHours}
                onChange={(e) => setEditing({ ...editing, triggerHours: Number(e.target.value) })}
                className={inputCls}
              >
                {[0.5, 1, 2, 4, 6, 12, 24, 48, 72, 168].map((h) => (
                  <option key={h} value={h}>{triggerLabel(h)} before event</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Template (optional)</label>
              <select
                value={editing.templateId ?? ''}
                onChange={(e) => setEditing({ ...editing, templateId: e.target.value || null })}
                className={inputCls}
              >
                <option value="">— Use custom body below —</option>
                {templates.filter((t) => t.channel === editing.channel).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {!editing.templateId && (
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Custom message body</label>
                <textarea
                  value={editing.customBody}
                  onChange={(e) => setEditing({ ...editing, customBody: e.target.value })}
                  rows={4}
                  placeholder="Hi {{first_name}}, your event is coming up…"
                  className={`${inputCls} resize-none font-mono`}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Apply to</label>
              <div className="flex gap-2">
                {(['all', 'specific'] as const).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setEditing({ ...editing, eventScope: scope })}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      editing.eventScope === scope
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {scope === 'all' ? 'All events' : 'Specific events'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={!editing.name.trim() || saving}>
                {saving ? 'Saving…' : 'Save reminder'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex items-center justify-center text-center rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 p-12">
          <div>
            <Bell className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Select a reminder to edit<br />or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ history }: { history: SentMessage[] }) {
  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div>
      {history.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 dark:text-neutral-500">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No messages sent yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((m) => (
            <Card key={m.id} className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                m.channel === 'sms'
                  ? 'bg-violet-100 dark:bg-violet-900/40'
                  : 'bg-primary-100 dark:bg-primary-900/40'
              }`}>
                {m.channel === 'sms'
                  ? <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  : <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <ChannelBadge channel={m.channel} />
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{m.subject}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  <Users className="w-3 h-3 inline mr-1" />{m.recipients} recipients · {fmt(m.sentAt)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job Notifications Tab ────────────────────────────────────────────────────

type NotifEvent =
  | 'signup_confirmed' | 'signup_waitlisted' | 'signup_cancelled'
  | 'shift_reminder_24h' | 'shift_reminder_1h'
  | 'hours_logged' | 'hours_approved'
  | 'badge_issued'
  | 'application_received' | 'application_approved' | 'application_rejected'
  | 'event_cancelled' | 'event_updated';

type NotifChannel = 'email' | 'sms' | 'none';

interface JobNotifRule {
  id: string;
  event: NotifEvent;
  label: string;
  description: string;
  group: string;
  volunteerChannel: NotifChannel;
  leaderChannel: NotifChannel;
  adminChannel: NotifChannel;
}

const NOTIF_CHANNEL_OPTIONS: { value: NotifChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms',   label: 'SMS' },
  { value: 'none',  label: 'Off' },
];

function ChannelSelect({ value, onChange }: { value: NotifChannel; onChange: (v: NotifChannel) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as NotifChannel)}
      className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
        value === 'none'
          ? 'border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-400'
          : value === 'sms'
          ? 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
          : 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
      }`}
    >
      {NOTIF_CHANNEL_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function JobNotificationsTab() {
  const [rules, setRules] = useState<JobNotifRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<JobNotifRule[]>('/messages/notif-rules').then(setRules).catch(() => {});
  }, []);

  function updateRule(event: NotifEvent, field: keyof JobNotifRule, value: NotifChannel) {
    setRules(prev => prev.map(r => r.event === event ? { ...r, [field]: value } : r));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/messages/notif-rules', rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  }

  const groups = Array.from(new Set(rules.map(r => r.group)));

  if (!rules.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Job Notifications
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Configure which notifications are sent automatically for each event type, per recipient role.
            </p>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2 mb-1 border-b border-neutral-100 dark:border-neutral-700">
          <div className="flex-1" />
          <div className="flex gap-6">
            <div className="w-20 text-center">
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <UserCog className="w-3.5 h-3.5" /> Volunteer
              </div>
            </div>
            <div className="w-20 text-center">
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Leader
              </div>
            </div>
            <div className="w-20 text-center">
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" /> Admin
              </div>
            </div>
          </div>
        </div>

        {/* Rules grouped */}
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">{group}</p>
              <div className="space-y-1">
                {rules.filter(r => r.group === group).map(rule => (
                  <div
                    key={rule.event}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{rule.label}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{rule.description}</p>
                    </div>
                    <div className="flex gap-6">
                      <div className="w-20 flex justify-center">
                        <ChannelSelect value={rule.volunteerChannel} onChange={v => updateRule(rule.event, 'volunteerChannel', v)} />
                      </div>
                      <div className="w-20 flex justify-center">
                        <ChannelSelect value={rule.leaderChannel} onChange={v => updateRule(rule.event, 'leaderChannel', v)} />
                      </div>
                      <div className="w-20 flex justify-center">
                        <ChannelSelect value={rule.adminChannel} onChange={v => updateRule(rule.event, 'adminChannel', v)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-700 mt-6">
          {saved && (
            <span className="text-sm text-success-600 dark:text-success-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Bell className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save Notification Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Login Notifications Tab ─────────────────────────────────────────────────

function NotifPreviewOverlay({ notif, onClose }: { notif: LoginNotification; onClose: () => void }) {
  const cfg = NOTIF_TYPE_CONFIG[notif.type];
  const Icon = cfg.Icon;
  return (
    <div className="fixed inset-0 bg-black/70 dark:bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-semibold tracking-wider">
        <Eye className="w-3.5 h-3.5" /> PREVIEW — How volunteers see this
      </div>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: cfg.color }} />
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mx-auto mb-5`}>
            <Icon className={`w-8 h-8 ${cfg.text}`} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: cfg.color }}>{cfg.label}</p>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 leading-snug">{notif.title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{notif.message}</p>
          <button
            onClick={onClose}
            className="mt-8 w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: cfg.color }}
          >
            Got it
          </button>
          <p className="text-[11px] text-neutral-400 mt-3">Volunteers only see this once after it is published.</p>
        </div>
      </div>
    </div>
  );
}

function LoginNotificationsTab({ totalVolunteers }: { totalVolunteers: number }) {
  const [notifications, setNotifications] = useState<LoginNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewNotif, setPreviewNotif] = useState<LoginNotification | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<LoginNotifType>('info');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<LoginNotification[]>('/messages/login-notifications')
      .then(setNotifications)
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormTitle('');
    setFormMessage('');
    setFormType('info');
    setShowForm(true);
  }

  function openEdit(notif: LoginNotification) {
    setEditingId(notif.id);
    setFormTitle(notif.title);
    setFormMessage(notif.message);
    setFormType(notif.type);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formMessage.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.put<LoginNotification>(`/messages/login-notifications/${editingId}`, {
          title: formTitle.trim(), message: formMessage.trim(), type: formType,
        });
        setNotifications(prev => prev.map(n => n.id === editingId ? updated : n));
        toast.success('Notification updated');
      } else {
        const created = await api.post<LoginNotification>('/messages/login-notifications', {
          title: formTitle.trim(), message: formMessage.trim(), type: formType,
        });
        setNotifications(prev => [created, ...prev]);
        toast.success('Notification created');
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      toast.error('Failed to save notification');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(notif: LoginNotification) {
    try {
      const updated = await api.patch<LoginNotification>(`/messages/login-notifications/${notif.id}/toggle`, {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? updated : n));
    } catch {
      toast.error('Failed to update notification');
    }
  }

  async function deleteNotif(id: string) {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete this notification?</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            try {
              await api.delete(`/messages/login-notifications/${id}`);
              setNotifications(prev => prev.filter(n => n.id !== id));
              toast.dismiss(t.id);
            } catch {
              toast.error('Failed to delete');
              toast.dismiss(t.id);
            }
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sign-in Notifications</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Active notifications appear once to each volunteer the first time they sign in after the notification is created.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />New Notification
        </Button>
      </div>

      {/* Builder form */}
      {showForm && (
        <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            {editingId ? 'Edit Notification' : 'Create Sign-in Notification'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Type</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(NOTIF_TYPE_CONFIG) as LoginNotifType[]).map(t => {
                  const cfg = NOTIF_TYPE_CONFIG[t];
                  const Icon = cfg.Icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        formType === t
                          ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                          : 'border-neutral-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Title <span className="text-danger-500">*</span></label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. New Safety Protocol — Action Required" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">Message <span className="text-danger-500">*</span></label>
              <textarea value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder="Write the message volunteers will see when they sign in..." rows={4} className={`${inputCls} resize-none`} />
            </div>
            {(formTitle || formMessage) && (() => {
              const cfg = NOTIF_TYPE_CONFIG[formType];
              const Icon = cfg.Icon;
              return (
                <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4 flex gap-3`}>
                  <div className={`w-9 h-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${cfg.text}`}>{formTitle || 'Notification title'}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">{formMessage || 'Message body...'}</p>
                  </div>
                </div>
              );
            })()}
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={!formTitle.trim() || !formMessage.trim() || saving}>
                <Check className="w-4 h-4 mr-2" />{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create & Activate'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              {(formTitle || formMessage) && (
                <button
                  onClick={() => formTitle && formMessage && setPreviewNotif({ id: 'preview', title: formTitle, message: formMessage, type: formType, active: true, createdAt: '', seenBy: [] })}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Full preview
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <Card className="p-16 text-center">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="text-neutral-500 dark:text-neutral-400">No sign-in notifications yet.</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Create one to show a message to volunteers the next time they log in.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const cfg = NOTIF_TYPE_CONFIG[notif.type];
            const Icon = cfg.Icon;
            const seenCount = notif.seenBy.length;
            const unseenCount = totalVolunteers - seenCount;
            const pct = totalVolunteers > 0 ? Math.round((seenCount / totalVolunteers) * 100) : 0;

            return (
              <Card key={notif.id} className={`overflow-hidden ${!notif.active ? 'opacity-60' : ''}`}>
                <div className="flex">
                  <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: notif.active ? cfg.color : '#9ca3af' }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon className={`w-5 h-5 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {notif.active
                            ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">Active</span>
                            : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">Inactive</span>
                          }
                          <span className="text-[11px] text-neutral-400 ml-auto">Created {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">{notif.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{notif.message}</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-success-500 dark:bg-success-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex items-center gap-1">
                            <LogIn className="w-3 h-3" />
                            {seenCount} seen · {unseenCount} pending
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setPreviewNotif(notif)} className="p-2 rounded-lg text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(notif)} className="p-2 rounded-lg text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(notif)}
                          className={`p-2 rounded-lg transition-colors ${notif.active ? 'text-success-600 dark:text-success-400 hover:bg-success-50 dark:hover:bg-success-900/20' : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                          title={notif.active ? 'Deactivate' : 'Activate'}
                        >
                          {notif.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteNotif(notif.id)} className="p-2 rounded-lg text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {previewNotif && <NotifPreviewOverlay notif={previewNotif} onClose={() => setPreviewNotif(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof Mail }[] = [
  { id: 'compose',            label: 'Compose',           icon: Send },
  { id: 'templates',          label: 'Templates',          icon: FileText },
  { id: 'reminders',          label: 'Auto Reminders',     icon: Bell },
  { id: 'job_notifications',  label: 'Job Notifications',  icon: Briefcase },
  { id: 'login_notifications',label: 'Sign-in Alerts',     icon: Megaphone },
  { id: 'history',            label: 'Sent History',       icon: Clock },
];

export default function MessagesPage() {
  const [tab, setTab] = useState<TabId>('compose');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [reminders, setReminders] = useState<AutoReminder[]>([]);
  const [history, setHistory] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ id: string; firstName: string; lastName: string; email: string; phone: string }[]>('/volunteers?limit=500'),
      api.get<{ id: string; title: string }[]>('/events?limit=500'),
      api.get<MessageTemplate[]>('/messages/templates'),
      api.get<AutoReminder[]>('/messages/reminders'),
      api.get<SentMessage[]>('/messages/history'),
    ]).then(([vols, evts, tmpls, rems, hist]) => {
      setVolunteers(vols.map((v) => ({
        id: v.id,
        name: `${v.firstName} ${v.lastName}`.trim(),
        email: v.email,
        phone: v.phone,
      })));
      setEvents(evts.map((e) => ({ id: e.id, title: e.title })));
      setTemplates(tmpls);
      setReminders(rems);
      setHistory(hist);
    }).catch(() => {
      toast.error('Failed to load messages data');
    }).finally(() => setLoading(false));
  }, []);

  const handleSend = (msg: SentMessage) => {
    setHistory((p) => [msg, ...p]);
    toast.success(`Message sent to ${msg.recipients} recipient${msg.recipients !== 1 ? 's' : ''}`);
    setTab('history');
  };

  const smsUsed = history.filter((m) => m.channel === 'sms').reduce((sum, m) => sum + m.recipients, 0);
  const smsLimit = 10000;
  const smsPct = Math.min(100, Math.round((smsUsed / smsLimit) * 100));

  return (
    <Layout>
      <Head><title>Messages — VolunteerFlow</title></Head>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Messages</h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Send emails and SMS, manage templates, and set up automated reminders.
            </p>
          </div>
          {/* SMS usage indicator */}
          <div className="flex-shrink-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-right min-w-[160px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">SMS credits</p>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {smsUsed.toLocaleString()} <span className="font-normal text-neutral-400">/ {smsLimit.toLocaleString()}</span>
            </p>
            <div className="mt-1.5 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${smsPct > 80 ? 'bg-warning-500' : 'bg-violet-500'}`}
                style={{ width: `${smsPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Messages sections"
          className="flex flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit max-w-full"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'history' && history.length > 0 && (
                <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
              {id === 'reminders' && reminders.filter((r) => r.enabled).length > 0 && (
                <span className="text-[10px] font-bold bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-400 px-1.5 py-0.5 rounded-full">
                  {reminders.filter((r) => r.enabled).length} active
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'compose' && <ComposeTab templates={templates} volunteers={volunteers} events={events} onSend={handleSend} />}
            {tab === 'templates' && <TemplatesTab templates={templates} setTemplates={setTemplates} />}
            {tab === 'reminders' && <RemindersTab reminders={reminders} setReminders={setReminders} templates={templates} />}
            {tab === 'job_notifications' && <JobNotificationsTab />}
            {tab === 'login_notifications' && <LoginNotificationsTab totalVolunteers={volunteers.length} />}
            {tab === 'history' && <HistoryTab history={history} />}
          </>
        )}
      </div>
    </Layout>
  );
}
