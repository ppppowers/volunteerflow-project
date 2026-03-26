'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  QrCode, Plus, Trash2, Download, Pause, Play,
  Wifi, Mail, Phone, Globe, FileText, User,
  BarChart2, TrendingUp, Smartphone, Monitor, Tablet,
  CheckCircle, Search, Copy, Lock, ChevronLeft,
  Folder, Edit2, X,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  buildQrContent, CAMPAIGN_COLORS,
  type SavedQrCode, type QrType, type QrStyle, type QrAnalyticsData,
  type Campaign, type CampaignStatus,
} from '@/lib/qrManager';
import { api } from '@/lib/api';
import { usePlan } from '@/context/usePlan';
import { PlanGate } from '@/components/PlanGate';

// ─── Dynamic QR component ─────────────────────────────────────────────────────

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="w-full h-full bg-neutral-100 dark:bg-neutral-700 animate-pulse rounded-lg" /> },
);

// ─── Shared constants ─────────────────────────────────────────────────────────

const QR_TYPES: { type: QrType; label: string; Icon: React.ElementType; placeholder: string; fieldLabel: string }[] = [
  { type: 'URL',   label: 'Website',   Icon: Globe,    placeholder: 'https://example.com',    fieldLabel: 'URL' },
  { type: 'TEXT',  label: 'Text',      Icon: FileText, placeholder: 'Your message here…',     fieldLabel: 'Text content' },
  { type: 'EMAIL', label: 'Email',     Icon: Mail,     placeholder: 'contact@example.com',    fieldLabel: 'Email address' },
  { type: 'PHONE', label: 'Phone',     Icon: Phone,    placeholder: '+1 555 000 0000',        fieldLabel: 'Phone number' },
  { type: 'WIFI',  label: 'WiFi',      Icon: Wifi,     placeholder: 'Network name (SSID)',    fieldLabel: 'Network name (SSID)' },
  { type: 'VCARD', label: 'Contact',   Icon: User,     placeholder: 'Full name',              fieldLabel: 'Full name' },
];

const STYLES: { value: QrStyle; label: string }[] = [
  { value: 'square',  label: 'Square'  },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots',    label: 'Dots'    },
];

const STATUS_PILL = {
  active:   'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  paused:   'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  archived: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
};

const inputCls = 'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 transition-colors';

// ─── Campaign Form (create / edit) ────────────────────────────────────────────

function CampaignForm({
  initial, onSave, onCancel,
}: {
  initial?: Campaign;
  onSave: (c: Omit<Campaign, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [description, setDesc]  = useState(initial?.description ?? '');
  const [color, setColor]       = useState(initial?.color ?? CAMPAIGN_COLORS[0]);
  const [status, setStatus]     = useState<CampaignStatus>(initial?.status ?? 'active');

  return (
    <Card className="p-6 space-y-4 border-2 border-primary-200 dark:border-primary-800">
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
        {initial ? 'Edit Campaign' : 'New Campaign'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Campaign Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Volunteer Drive" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Description</label>
          <input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description…" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)} className={inputCls}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Color</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CAMPAIGN_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-neutral-500 scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={() => name.trim() && onSave({ name: name.trim(), description: description.trim() || undefined, color, status })} variant="primary" disabled={!name.trim()}>
          {initial ? 'Save Changes' : 'Create Campaign'}
        </Button>
        <Button onClick={onCancel} variant="outline">Cancel</Button>
      </div>
    </Card>
  );
}

// ─── QR Creator ───────────────────────────────────────────────────────────────

function QrCreator({
  campaigns, initialCampaignId, onCreated,
}: {
  campaigns: Campaign[];
  initialCampaignId?: string;
  onCreated: (qr: SavedQrCode) => void;
}) {
  const [name, setName]             = useState('');
  const [type, setType]             = useState<QrType>('URL');
  const [destination, setDest]      = useState('');
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const [fgColor, setFg]            = useState('#1e3a5f');
  const [bgColor, setBg]            = useState('#ffffff');
  const [style, setStyle]           = useState<QrStyle>('rounded');
  // Extra fields
  const [emailSubject, setEmailSubject] = useState('');
  const [wifiPw, setWifiPw]             = useState('');
  const [wifiEnc, setWifiEnc]           = useState('WPA');
  const [vcardPhone, setVcardPhone]     = useState('');
  const [vcardEmail, setVcardEmail]     = useState('');
  const [vcardOrg, setVcardOrg]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  const typeInfo = QR_TYPES.find((t) => t.type === type)!;
  const meta: Record<string, string> = {};
  if (type === 'EMAIL' && emailSubject) meta.subject = emailSubject;
  if (type === 'WIFI') { meta.password = wifiPw; meta.encryption = wifiEnc; }
  if (type === 'VCARD') { if (vcardPhone) meta.phone = vcardPhone; if (vcardEmail) meta.email = vcardEmail; if (vcardOrg) meta.org = vcardOrg; }

  const content = destination ? buildQrContent(type, destination, meta) : 'https://volunteerflow.app';

  async function handleSave() {
    if (!destination.trim() || saving) return;
    setSaving(true);
    try {
      const qr = await api.post<SavedQrCode>('/qr/codes', {
        name: name.trim() || `${typeInfo.label} QR`,
        type, content, displayValue: destination,
        fgColor, bgColor, style, size: 256,
        includeMargin: true, status: 'active',
        campaignId: campaignId || undefined,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onCreated(qr); }, 700);
    } catch {
      toast.error('Failed to save QR code');
    } finally {
      setSaving(false);
    }
  }

  function downloadSvg() {
    const el = document.getElementById('qr-creator-svg');
    if (!el) return;
    const blob = new Blob([el.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${name || 'qr'}.svg`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: form */}
      <div className="space-y-5">
        {/* Name + Campaign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Event Check-in" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Campaign</label>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputCls}>
              <option value="">No campaign</option>
              {campaigns.filter((c) => c.status !== 'archived').map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 uppercase tracking-wide">Content Type</label>
          <div className="grid grid-cols-3 gap-2">
            {QR_TYPES.map(({ type: t, label, Icon }) => (
              <button key={t} onClick={() => { setType(t); setDest(''); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                  type === t
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">{typeInfo.fieldLabel}</label>
            <input value={destination} onChange={(e) => setDest(e.target.value)} placeholder={typeInfo.placeholder} className={inputCls} />
          </div>
          {type === 'EMAIL' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Subject (optional)</label>
              <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" className={inputCls} />
            </div>
          )}
          {type === 'WIFI' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Password</label>
                <input value={wifiPw} onChange={(e) => setWifiPw(e.target.value)} type="password" placeholder="WiFi password" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Encryption</label>
                <select value={wifiEnc} onChange={(e) => setWifiEnc(e.target.value)} className={inputCls}>
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None</option>
                </select>
              </div>
            </div>
          )}
          {type === 'VCARD' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1 uppercase tracking-wide">Phone</label>
                <input value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1 uppercase tracking-wide">Email</label>
                <input value={vcardEmail} onChange={(e) => setVcardEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1 uppercase tracking-wide">Organization</label>
                <input value={vcardOrg} onChange={(e) => setVcardOrg(e.target.value)} placeholder="Organization name" className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Style */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2 uppercase tracking-wide">Style</label>
          <div className="flex gap-2">
            {STYLES.map(({ value, label }) => (
              <button key={value} onClick={() => setStyle(value)}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  style === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Foreground</label>
            <div className="flex items-center gap-2">
              <input type="color" value={fgColor} onChange={(e) => setFg(e.target.value)} className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer p-0.5 flex-shrink-0" />
              <input value={fgColor} onChange={(e) => setFg(e.target.value)} className={inputCls + ' font-mono'} maxLength={7} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wide">Background</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => setBg(e.target.value)} className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer p-0.5 flex-shrink-0" />
              <input value={bgColor} onChange={(e) => setBg(e.target.value)} className={inputCls + ' font-mono'} maxLength={7} />
            </div>
          </div>
        </div>

        {type === 'URL' && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 flex-shrink-0" />
            URL codes use a tracking redirect — scans are recorded automatically.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={!destination.trim() || saving || saved} variant="primary">
            {saved ? <><CheckCircle className="w-4 h-4 mr-1.5" />Saved!</> : saving ? 'Saving…' : 'Save QR Code'}
          </Button>
          <Button onClick={downloadSvg} variant="outline" disabled={!destination.trim()}>
            <Download className="w-4 h-4 mr-1.5" /> Preview SVG
          </Button>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Live Preview</p>
        <div className="p-6 rounded-2xl shadow-md" style={{ backgroundColor: bgColor }}>
          <QRCodeSVG id="qr-creator-svg" value={content} size={200} fgColor={fgColor} bgColor={bgColor} level="M" includeMargin={false} />
        </div>
        {destination && <p className="text-xs text-neutral-400 max-w-xs text-center break-all">{content}</p>}
      </div>
    </div>
  );
}

// ─── Analytics Panel ─────────────────────────────────────────────────────────

function AnalyticsPanel({ qr }: { qr: SavedQrCode }) {
  const [data, setData] = useState<QrAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<QrAnalyticsData>(`/qr/codes/${qr.id}/analytics`)
      .then(setData)
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [qr.id]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="h-14 bg-neutral-100 dark:bg-neutral-700 rounded-lg animate-pulse" />
            </Card>
          ))}
        </div>
        <Card className="p-5"><div className="h-40 bg-neutral-100 dark:bg-neutral-700 rounded-lg animate-pulse" /></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-12 text-center">
        <BarChart2 className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-500 dark:text-neutral-400">{error ?? 'No analytics available.'}</p>
      </Card>
    );
  }

  const DEVICE_ICONS = { Mobile: Smartphone, Desktop: Monitor, Tablet: Tablet };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans',  value: data.totalScans,    color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/20', Icon: QrCode },
          { label: 'Unique',       value: data.uniqueScans,   color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/20', Icon: CheckCircle },
          { label: 'Today',        value: data.scansToday,    color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/20', Icon: TrendingUp },
          { label: 'This Week',    value: data.scansThisWeek, color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-900/20',   Icon: BarChart2 },
        ].map(({ label, value, color, bg, Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">{value.toLocaleString()}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Scans — last 30 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data.timeline}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip formatter={(v: number) => [v, 'Scans']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Devices</p>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width={120} height={120}>
              <PieChart><Pie data={data.devices} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                {data.devices.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {data.devices.map((d) => {
                const Icon = DEVICE_ICONS[d.name as keyof typeof DEVICE_ICONS] ?? Smartphone;
                const total = data.devices.reduce((a, x) => a + x.value, 0);
                return (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <Icon className="w-3 h-3 text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Top Sources</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data.topReferrers} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="source" type="category" tick={{ fontSize: 10 }} width={90} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Bar dataKey="scans" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ─── QR Code card ─────────────────────────────────────────────────────────────

function QrCard({ qr, campaigns, canAnalytics, onDelete, onToggle, onAnalytics }: {
  qr: SavedQrCode;
  campaigns: Campaign[];
  canAnalytics: boolean;
  onDelete: () => void;
  onToggle: () => void;
  onAnalytics: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const dlId = `qr-dl-${qr.id}`;
  const campaign = campaigns.find((c) => c.id === qr.campaignId);
  const TypeIcon = QR_TYPES.find((t) => t.type === qr.type)?.Icon ?? QrCode;

  function copy() {
    // Copy the destination URL (displayValue) — more useful than the tracking URL
    navigator.clipboard.writeText(qr.displayValue || qr.content)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  function downloadSvg() {
    const el = document.getElementById(dlId);
    if (!el) return;
    const blob = new Blob([el.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${qr.name.replace(/\s+/g, '-')}.svg`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 flex gap-4 hover:shadow-md transition-shadow">
      {/* Hidden full-size SVG for download (uses actual content = tracking URL) */}
      <div className="hidden">
        <QRCodeSVG id={dlId} value={qr.content} size={512} fgColor={qr.fgColor} bgColor={qr.bgColor} level="M" includeMargin />
      </div>

      <div className="flex-shrink-0 p-2 rounded-xl" style={{ backgroundColor: qr.bgColor }}>
        <QRCodeSVG value={qr.content} size={64} fgColor={qr.fgColor} bgColor={qr.bgColor} level="M" includeMargin={false} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{qr.name}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_PILL[qr.status]}`}>{qr.status}</span>
              {campaign && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: campaign.color + '20', color: campaign.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: campaign.color }} />{campaign.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <TypeIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-500 truncate">{qr.displayValue}</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-neutral-400 flex-shrink-0">{qr.totalScans.toLocaleString()} scans</span>
        </div>
        <div className="flex items-center gap-1 mt-3 flex-wrap">
          <button onClick={copy} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy URL'}
          </button>
          <button onClick={downloadSvg} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> SVG
          </button>
          <button onClick={onToggle} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            {qr.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {qr.status === 'active' ? 'Pause' : 'Activate'}
          </button>
          <button onClick={onAnalytics} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${canAnalytics ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'text-neutral-400 cursor-not-allowed'}`}>
            {!canAnalytics && <Lock className="w-3 h-3" />}
            <BarChart2 className="w-3.5 h-3.5" /> Analytics
            {!canAnalytics && <span className="text-[10px] bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-1.5 rounded ml-0.5">Grow</span>}
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors ml-auto">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Campaign detail view ─────────────────────────────────────────────────────

function CampaignDetail({ campaign, allCodes, campaigns, onBack, onRefresh }: {
  campaign: Campaign;
  allCodes: SavedQrCode[];
  campaigns: Campaign[];
  onBack: () => void;
  onRefresh: () => void;
}) {
  const { can } = usePlan();
  const [showCreator, setShowCreator] = useState(false);
  const [analyticsQr, setAnalyticsQr] = useState<SavedQrCode | null>(null);
  const codes = allCodes.filter((q) => q.campaignId === campaign.id);
  const totalScans = codes.reduce((a, q) => a + q.totalScans, 0);

  function handleDelete(id: string) {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete this QR code?</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            try {
              await api.delete(`/qr/codes/${id}`);
              onRefresh();
              if (analyticsQr?.id === id) setAnalyticsQr(null);
            } catch { toast.error('Failed to delete QR code'); }
            toast.dismiss(t.id);
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  function handleToggle(qr: SavedQrCode) {
    api.patch(`/qr/codes/${qr.id}`, { status: qr.status === 'active' ? 'paused' : 'active' })
      .then(() => onRefresh())
      .catch(() => toast.error('Failed to update QR code'));
  }

  if (analyticsQr) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setAnalyticsQr(null)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            <ChevronLeft className="w-4 h-4" /> Back to campaign
          </button>
          <span className="text-neutral-300 dark:text-neutral-600">·</span>
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{analyticsQr.name}</span>
        </div>
        <PlanGate feature="qr_analytics">
          <AnalyticsPanel qr={analyticsQr} />
        </PlanGate>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> All Campaigns
        </button>
      </div>

      {/* Campaign header card */}
      <div className="rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap" style={{ backgroundColor: campaign.color + '15', border: `2px solid ${campaign.color}30` }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: campaign.color + '25' }}>
            <Folder className="w-6 h-6" style={{ color: campaign.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{campaign.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_PILL[campaign.status]}`}>{campaign.status}</span>
            </div>
            {campaign.description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{campaign.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span><strong className="text-neutral-700 dark:text-neutral-200">{codes.length}</strong> QR codes</span>
              <span><strong className="text-neutral-700 dark:text-neutral-200">{totalScans.toLocaleString()}</strong> total scans</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreator(!showCreator)} variant="primary">
          <Plus className="w-4 h-4 mr-1.5" /> Add QR Code
        </Button>
      </div>

      {/* Inline creator */}
      {showCreator && (
        <Card className="p-6 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Create QR Code in this Campaign</h3>
            <button onClick={() => setShowCreator(false)}><X className="w-5 h-5 text-neutral-400 hover:text-neutral-600" /></button>
          </div>
          <QrCreator campaigns={campaigns} initialCampaignId={campaign.id} onCreated={() => { setShowCreator(false); onRefresh(); }} />
        </Card>
      )}

      {/* QR codes in this campaign */}
      {codes.length === 0 && !showCreator ? (
        <Card className="p-12 text-center">
          <QrCode className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">No QR codes in this campaign yet.</p>
          <div className="mt-4"><Button onClick={() => setShowCreator(true)} variant="primary"><Plus className="w-4 h-4 mr-1.5" /> Add First QR Code</Button></div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {codes.map((qr) => (
            <QrCard key={qr.id} qr={qr} campaigns={campaigns} canAnalytics={can('qr_analytics')}
              onDelete={() => handleDelete(qr.id)}
              onToggle={() => handleToggle(qr)}
              onAnalytics={() => setAnalyticsQr(qr)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'all_codes' | 'create' | 'analytics';

export default function QrPage() {
  const { can } = usePlan();
  const canAnalytics = can('qr_analytics');

  const [tab, setTab] = useState<Tab>('campaigns');
  const [codes, setCodes] = useState<SavedQrCode[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [analyticsQr, setAnalyticsQr] = useState<SavedQrCode | null>(null);
  const [search, setSearch] = useState('');

  // Campaign form state
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  async function load() {
    try {
      const [camps, qrs] = await Promise.all([
        api.get<Campaign[]>('/qr/campaigns'),
        api.get<SavedQrCode[]>('/qr/codes'),
      ]);
      setCampaigns(camps);
      setCodes(qrs);
    } catch {
      // silently fail — user sees empty state
    }
  }

  useEffect(() => { load(); }, []);

  // ── Campaign actions ──────────────────────────────────────────────────────

  async function handleSaveCampaign(data: Omit<Campaign, 'id' | 'createdAt'>) {
    try {
      if (editingCampaign) {
        await api.put(`/qr/campaigns/${editingCampaign.id}`, data);
      } else {
        await api.post('/qr/campaigns', data);
      }
      await load();
      setShowCampaignForm(false);
      setEditingCampaign(null);
      toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created');
    } catch {
      toast.error('Failed to save campaign');
    }
  }

  function handleDeleteCampaign(c: Campaign) {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete campaign <strong>{c.name}</strong>?</p>
        <p className="text-xs text-neutral-500">Its QR codes will become unassigned.</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            try {
              await api.delete(`/qr/campaigns/${c.id}`);
              await load();
              if (selectedCampaign?.id === c.id) setSelectedCampaign(null);
            } catch { toast.error('Failed to delete campaign'); }
            toast.dismiss(t.id);
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  // ── QR actions (All Codes tab) ────────────────────────────────────────────

  function handleDeleteQr(id: string) {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete this QR code?</p>
        <div className="flex gap-2 mt-1">
          <button onClick={async () => {
            try {
              await api.delete(`/qr/codes/${id}`);
              await load();
              if (analyticsQr?.id === id) setAnalyticsQr(null);
            } catch { toast.error('Failed to delete QR code'); }
            toast.dismiss(t.id);
          }} className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white text-xs font-medium rounded-md transition-colors">Delete</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    ), { duration: 8000 });
  }

  function handleToggleQr(qr: SavedQrCode) {
    api.patch(`/qr/codes/${qr.id}`, { status: qr.status === 'active' ? 'paused' : 'active' })
      .then(() => load())
      .catch(() => toast.error('Failed to update QR code'));
  }

  const TABS: { key: Tab; label: string; Icon: React.ElementType; locked?: boolean }[] = [
    { key: 'campaigns',  label: 'Campaigns',                     Icon: Folder   },
    { key: 'all_codes',  label: `All QR Codes (${codes.length})`, Icon: QrCode   },
    { key: 'create',     label: 'Create New',                    Icon: Plus     },
    { key: 'analytics',  label: 'Analytics',                     Icon: BarChart2, locked: !canAnalytics },
  ];

  const filteredCodes = codes.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.displayValue.toLowerCase().includes(q);
  });

  return (
    <Layout>
      <Head><title>QR Codes — VolunteerFlow</title></Head>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">QR Codes</h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {campaigns.length} campaigns · {codes.length} QR codes
            </p>
          </div>
          <div className="flex gap-2">
            {tab === 'campaigns' && !selectedCampaign && (
              <Button onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); }} variant="primary">
                <Plus className="w-4 h-4 mr-1.5" /> New Campaign
              </Button>
            )}
            {tab === 'all_codes' && (
              <Button onClick={() => setTab('create')} variant="primary">
                <Plus className="w-4 h-4 mr-1.5" /> New QR Code
              </Button>
            )}
          </div>
        </div>

        {/* Tabs — pill style matching the rest of the app */}
        <div
          role="tablist"
          aria-label="QR Code sections"
          className="flex flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit max-w-full"
        >
          {TABS.map(({ key, label, Icon, locked }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => { if (!locked) { setTab(key); setSelectedCampaign(null); } }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === key
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
              {locked && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 rounded-full">Grow+</span>}
            </button>
          ))}
        </div>

        {/* ── Campaigns tab ────────────────────────────────────────────────── */}
        {tab === 'campaigns' && (
          selectedCampaign ? (
            <CampaignDetail
              campaign={selectedCampaign}
              allCodes={codes}
              campaigns={campaigns}
              onBack={() => setSelectedCampaign(null)}
              onRefresh={load}
            />
          ) : (
            <div className="space-y-5">
              {/* Campaign form */}
              {showCampaignForm && (
                <CampaignForm
                  initial={editingCampaign ?? undefined}
                  onSave={handleSaveCampaign}
                  onCancel={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
                />
              )}

              {campaigns.length === 0 && !showCampaignForm ? (
                <Card className="p-12 text-center">
                  <Folder className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="font-medium text-neutral-500 dark:text-neutral-400">No campaigns yet</p>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Group your QR codes into campaigns for better organization.</p>
                  <div className="mt-4"><Button onClick={() => setShowCampaignForm(true)} variant="primary"><Plus className="w-4 h-4 mr-1.5" /> Create First Campaign</Button></div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((c) => {
                    const campaignCodes = codes.filter((q) => q.campaignId === c.id);
                    const totalScans = campaignCodes.reduce((a, q) => a + q.totalScans, 0);
                    return (
                      <div key={c.id} className="group relative">
                        <button
                          onClick={() => setSelectedCampaign(c)}
                          className="w-full text-left"
                        >
                          <Card className="p-5 hover:shadow-md transition-all cursor-pointer group-hover:border-neutral-300 dark:group-hover:border-neutral-600">
                            {/* Color bar */}
                            <div className="w-full h-1.5 rounded-full mb-4" style={{ backgroundColor: c.color }} />
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_PILL[c.status]}`}>{c.status}</span>
                                </div>
                                {c.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{c.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                              <div className="text-center">
                                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{campaignCodes.length}</p>
                                <p className="text-[11px] text-neutral-400">QR Codes</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{totalScans.toLocaleString()}</p>
                                <p className="text-[11px] text-neutral-400">Total Scans</p>
                              </div>
                              <div className="ml-auto text-xs text-neutral-400">
                                {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </Card>
                        </button>
                        {/* Edit / delete on hover */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCampaign(c); setShowCampaignForm(true); }}
                            className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
                          ><Edit2 className="w-3.5 h-3.5" /></button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c); }}
                            className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow text-neutral-400 hover:text-danger-500 border border-neutral-200 dark:border-neutral-700"
                          ><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* ── All QR Codes tab ─────────────────────────────────────────────── */}
        {tab === 'all_codes' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search QR codes…" className={inputCls + ' pl-9'} />
            </div>
            {filteredCodes.length === 0 ? (
              <Card className="p-12 text-center">
                <QrCode className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400">No QR codes found.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCodes.map((qr) => (
                  <QrCard key={qr.id} qr={qr} campaigns={campaigns} canAnalytics={canAnalytics}
                    onDelete={() => handleDeleteQr(qr.id)}
                    onToggle={() => handleToggleQr(qr)}
                    onAnalytics={() => { setAnalyticsQr(qr); setTab('analytics'); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Create tab ───────────────────────────────────────────────────── */}
        {tab === 'create' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-5">Create New QR Code</h2>
            <QrCreator campaigns={campaigns} onCreated={() => { load(); setTab('all_codes'); }} />
          </Card>
        )}

        {/* ── Analytics tab ────────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <PlanGate feature="qr_analytics">
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Viewing:</span>
                <select value={analyticsQr?.id ?? ''} onChange={(e) => setAnalyticsQr(codes.find((c) => c.id === e.target.value) ?? null)} className={inputCls + ' w-auto'}>
                  <option value="">Select a QR code…</option>
                  {codes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {analyticsQr ? <AnalyticsPanel qr={analyticsQr} />
                : <Card className="p-12 text-center"><BarChart2 className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" /><p className="text-neutral-500 dark:text-neutral-400">Select a QR code above to view analytics.</p></Card>}
            </div>
          </PlanGate>
        )}
      </div>
    </Layout>
  );
}
