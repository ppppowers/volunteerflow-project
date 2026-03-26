import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  Globe,
  Palette,
  Code2,
  Eye,
  Check,
  ExternalLink,
  Save,
  RefreshCw,
  AlertCircle,
  Maximize2,
  X,
  ChevronRight,
  Copy,
  Users,
  UserCheck,
  Briefcase,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PortalTab = 'themes' | 'custom' | 'preview';
type PortalType = 'volunteer' | 'member' | 'employee';

const PORTAL_TYPES: { id: PortalType; label: string; icon: React.ComponentType<{ className?: string }>; orgLabel: string; heroHeading: string; heroSubtext: string }[] = [
  { id: 'volunteer', label: 'Volunteer Portal', icon: Users,     orgLabel: 'Volunteer Portal', heroHeading: 'Make a Difference Today',        heroSubtext: 'Browse open volunteer opportunities and sign up in minutes.' },
  { id: 'member',    label: 'Member Portal',    icon: UserCheck, orgLabel: 'Member Portal',    heroHeading: 'Welcome Back, Member',           heroSubtext: 'View your membership, upcoming events, and renewal status.' },
  { id: 'employee',  label: 'Employee Portal',  icon: Briefcase, orgLabel: 'Employee Portal',  heroHeading: 'Your Workplace Hub',             heroSubtext: 'Check your schedule, submit timesheets, and stay connected.' },
];

interface Theme {
  id: string;
  name: string;
  description: string;
  badge?: string;
  colors: {
    bg: string;
    header: string;
    headerText: string;
    accent: string;
    accentText: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    heroGradient?: string;
  };
}

// ─── Theme Definitions ────────────────────────────────────────────────────────

const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean white layout with blue accents — works for any organization.',
    badge: 'Default',
    colors: {
      bg: '#f8fafc',
      header: '#2563eb',
      headerText: '#ffffff',
      accent: '#2563eb',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#1e293b',
      subtext: '#64748b',
      border: '#e2e8f0',
    },
  },
  {
    id: 'dark_pro',
    name: 'Dark Pro',
    description: 'Modern dark theme with purple highlights. Great for tech-forward orgs.',
    colors: {
      bg: '#0f172a',
      header: '#1e1b4b',
      headerText: '#e0e7ff',
      accent: '#7c3aed',
      accentText: '#ffffff',
      card: '#1e293b',
      text: '#e2e8f0',
      subtext: '#94a3b8',
      border: '#334155',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calming teal and navy palette. Perfect for environmental or coastal causes.',
    colors: {
      bg: '#f0fdfa',
      header: '#0f766e',
      headerText: '#ffffff',
      accent: '#0d9488',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#134e4a',
      subtext: '#5eead4',
      border: '#ccfbf1',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Earthy greens and warm tones. Ideal for nature and conservation groups.',
    colors: {
      bg: '#f7fee7',
      header: '#3f6212',
      headerText: '#ffffff',
      accent: '#65a30d',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#1a2e05',
      subtext: '#4d7c0f',
      border: '#d9f99d',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges and coral. Energetic and welcoming for community events.',
    colors: {
      bg: '#fff7ed',
      header: '#c2410c',
      headerText: '#ffffff',
      accent: '#ea580c',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#431407',
      subtext: '#9a3412',
      border: '#fed7aa',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purple and pink palette. Welcoming for health, senior, or youth orgs.',
    colors: {
      bg: '#faf5ff',
      header: '#7e22ce',
      headerText: '#ffffff',
      accent: '#9333ea',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#3b0764',
      subtext: '#7c3aed',
      border: '#e9d5ff',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    description: 'Minimal and professional. Works well for corporate volunteer programs.',
    colors: {
      bg: '#f9fafb',
      header: '#111827',
      headerText: '#f9fafb',
      accent: '#374151',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#111827',
      subtext: '#6b7280',
      border: '#e5e7eb',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Warm pink and red for causes focused on compassion and care.',
    colors: {
      bg: '#fff1f2',
      header: '#be123c',
      headerText: '#ffffff',
      accent: '#e11d48',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#4c0519',
      subtext: '#9f1239',
      border: '#fecdd3',
    },
  },
  // ── Gradient themes ──────────────────────────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights gradient on deep navy. Striking for science or environmental orgs.',
    badge: 'Gradient',
    colors: {
      bg: '#030712',
      header: '#0c1445',
      headerText: '#a5f3fc',
      accent: '#06b6d4',
      accentText: '#ffffff',
      card: '#0f172a',
      text: '#e0f2fe',
      subtext: '#7dd3fc',
      border: '#1e3a5f',
      heroGradient: 'linear-gradient(135deg, #0c1445 0%, #064e3b 45%, #0f2d48 100%)',
    },
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    description: 'Amber to rose sunset gradient. Warm and vibrant for community or creative orgs.',
    badge: 'Gradient',
    colors: {
      bg: '#fffbeb',
      header: '#b45309',
      headerText: '#ffffff',
      accent: '#d97706',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#1c1917',
      subtext: '#78350f',
      border: '#fde68a',
      heroGradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 55%, #db2777 100%)',
    },
  },
  {
    id: 'galaxy',
    name: 'Midnight Galaxy',
    description: 'Deep space purples and indigo gradient. Dramatic for tech, arts, or youth programs.',
    badge: 'Gradient',
    colors: {
      bg: '#09090f',
      header: '#150b2e',
      headerText: '#e9d5ff',
      accent: '#a855f7',
      accentText: '#ffffff',
      card: '#130d24',
      text: '#f3e8ff',
      subtext: '#c084fc',
      border: '#2e1065',
      heroGradient: 'linear-gradient(135deg, #150b2e 0%, #4c1d95 50%, #1e1b4b 100%)',
    },
  },
  {
    id: 'coral_reef',
    name: 'Coral Reef',
    description: 'Coral to turquoise gradient. Bright and tropical for environmental or coastal causes.',
    badge: 'Gradient',
    colors: {
      bg: '#f0fdfa',
      header: '#0f766e',
      headerText: '#ffffff',
      accent: '#0d9488',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#0f172a',
      subtext: '#0f766e',
      border: '#b2f5ea',
      heroGradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 42%, #0d9488 100%)',
    },
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'Electric pink to violet on dark. Bold for music, arts, or youth events.',
    badge: 'Gradient',
    colors: {
      bg: '#09090f',
      header: '#18041a',
      headerText: '#fce7f3',
      accent: '#ec4899',
      accentText: '#ffffff',
      card: '#120519',
      text: '#fdf4ff',
      subtext: '#f0abfc',
      border: '#3b0764',
      heroGradient: 'linear-gradient(135deg, #db2777 0%, #7c3aed 50%, #2563eb 100%)',
    },
  },
  {
    id: 'mountain_mist',
    name: 'Mountain Mist',
    description: 'Slate to stone gradient. Calm and professional for wellness or corporate programs.',
    badge: 'Gradient',
    colors: {
      bg: '#f8fafc',
      header: '#334155',
      headerText: '#f1f5f9',
      accent: '#475569',
      accentText: '#ffffff',
      card: '#ffffff',
      text: '#1e293b',
      subtext: '#64748b',
      border: '#e2e8f0',
      heroGradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_CUSTOM_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{org_name}} — Volunteer Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; }

    header {
      background: #2563eb;
      color: white;
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    header h1 { font-size: 22px; font-weight: 700; }
    header p { font-size: 13px; opacity: 0.8; margin-top: 2px; }

    .hero {
      background: linear-gradient(135deg, #1d4ed8, #3b82f6);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }
    .hero h2 { font-size: 32px; font-weight: 800; margin-bottom: 12px; }
    .hero p { font-size: 16px; opacity: 0.85; margin-bottom: 28px; }
    .hero button {
      background: white;
      color: #2563eb;
      border: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .events { padding: 40px; max-width: 900px; margin: 0 auto; }
    .events h3 { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

    .event-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .event-card h4 { font-size: 16px; font-weight: 600; }
    .event-card p { font-size: 13px; color: #64748b; margin-top: 4px; }
    .event-card button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    footer {
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>{{org_name}}</h1>
      <p>Volunteer Portal</p>
    </div>
    <div style="font-size:13px; opacity:0.85;">{{event_count}} open opportunities</div>
  </header>

  <section class="hero">
    <h2>{{hero_heading}}</h2>
    <p>{{hero_subtext}}</p>
    <button>Browse Opportunities</button>
  </section>

  <section class="events">
    <h3>Upcoming Events</h3>

    <div class="event-card">
      <div>
        <h4>Community Clean-up Drive</h4>
        <p>Apr 15, 2026 · Central Park · 25 spots left</p>
      </div>
      <button>Sign Up</button>
    </div>

    <div class="event-card">
      <div>
        <h4>Youth Mentorship Saturday</h4>
        <p>Apr 20, 2026 · Downtown Community Center · 6 spots left</p>
      </div>
      <button>Sign Up</button>
    </div>

    <div class="event-card">
      <div>
        <h4>Food Bank Distribution Day</h4>
        <p>Apr 25, 2026 · Regional Food Bank · 40 spots</p>
      </div>
      <button>Sign Up</button>
    </div>
  </section>

  <footer>Powered by VolunteerFlow &mdash; {{org_name}}</footer>
</body>
</html>`;

// Build preview HTML from a theme
function buildThemeHTML(theme: Theme, orgName: string): string {
  const c = theme.colors;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${orgName} — Volunteer Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: ${c.bg}; color: ${c.text}; }
    header { background: ${c.header}; color: ${c.headerText}; padding: 20px 36px; display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 20px; font-weight: 700; }
    header p { font-size: 12px; opacity: 0.75; margin-top: 2px; }
    .hero { background: ${c.heroGradient ?? c.header}; color: ${c.headerText}; padding: 52px 36px; text-align: center; }
    .hero h2 { font-size: 28px; font-weight: 800; margin-bottom: 10px; }
    .hero p { font-size: 15px; opacity: 0.8; margin-bottom: 24px; }
    .hero button { background: ${c.card}; color: ${c.accent}; border: none; padding: 11px 26px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .events { padding: 36px; max-width: 860px; margin: 0 auto; }
    .events h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: ${c.text}; }
    .event-card { background: ${c.card}; border: 1px solid ${c.border}; border-radius: 12px; padding: 18px 22px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .event-card h4 { font-size: 15px; font-weight: 600; color: ${c.text}; }
    .event-card p { font-size: 12px; color: ${c.subtext}; margin-top: 3px; }
    .event-card button { background: ${c.accent}; color: ${c.accentText}; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    footer { text-align: center; padding: 20px; font-size: 11px; color: ${c.subtext}; border-top: 1px solid ${c.border}; margin-top: 36px; }
  </style>
</head>
<body>
  <header>
    <div><h1>${orgName}</h1><p>Volunteer Portal</p></div>
    <div style="font-size:12px;opacity:0.75;">3 open opportunities</div>
  </header>
  <section class="hero">
    <h2>Make a Difference Today</h2>
    <p>Browse open volunteer opportunities and sign up in minutes.</p>
    <button>Browse Opportunities</button>
  </section>
  <section class="events">
    <h3>Upcoming Events</h3>
    <div class="event-card">
      <div><h4>Community Clean-up Drive</h4><p>Apr 15, 2026 &nbsp;·&nbsp; Central Park &nbsp;·&nbsp; 25 spots left</p></div>
      <button>Sign Up</button>
    </div>
    <div class="event-card">
      <div><h4>Youth Mentorship Saturday</h4><p>Apr 20, 2026 &nbsp;·&nbsp; Downtown Community Center &nbsp;·&nbsp; 6 spots left</p></div>
      <button>Sign Up</button>
    </div>
    <div class="event-card">
      <div><h4>Food Bank Distribution Day</h4><p>Apr 25, 2026 &nbsp;·&nbsp; Regional Food Bank &nbsp;·&nbsp; 40 spots</p></div>
      <button>Sign Up</button>
    </div>
  </section>
  <footer>Powered by VolunteerFlow &mdash; ${orgName}</footer>
</body>
</html>`;
}

// ─── Theme Mini-Preview Card ──────────────────────────────────────────────────

function ThemeMiniPreview({ theme }: { theme: Theme }) {
  const c = theme.colors;
  return (
    <div
      className="w-full rounded-lg overflow-hidden border-2"
      style={{ borderColor: c.border, background: c.bg }}
    >
      {/* Header bar */}
      <div style={{ background: c.header, padding: '8px 10px' }} className="flex items-center justify-between">
        <div>
          <div style={{ color: c.headerText, fontSize: 9, fontWeight: 700 }}>Green Future</div>
          <div style={{ color: c.headerText, fontSize: 7, opacity: 0.7 }}>Volunteer Portal</div>
        </div>
        <div style={{ color: c.headerText, fontSize: 7, opacity: 0.7 }}>3 events</div>
      </div>
      {/* Hero strip */}
      <div style={{ background: c.heroGradient ?? c.header, padding: '10px', textAlign: 'center', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ color: c.headerText, fontSize: 8, fontWeight: 700, marginBottom: 4 }}>Make a Difference Today</div>
        <div style={{ display: 'inline-block', background: c.card, color: c.accent, fontSize: 7, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
          Browse
        </div>
      </div>
      {/* Event cards */}
      <div style={{ padding: '8px' }} className="space-y-1.5">
        {['Community Clean-up', 'Youth Mentorship', 'Food Bank Day'].map((name) => (
          <div
            key={name}
            style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 5, padding: '5px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ color: c.text, fontSize: 7, fontWeight: 600 }}>{name}</div>
            <div style={{ background: c.accent, color: c.accentText, fontSize: 6, padding: '2px 5px', borderRadius: 3 }}>Sign Up</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live Preview iframe ──────────────────────────────────────────────────────

function LivePreview({ html, fullscreen, onFullscreen }: { html: string; fullscreen: boolean; onFullscreen: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-danger-400" />
          <div className="w-3 h-3 rounded-full bg-warning-400" />
          <div className="w-3 h-3 rounded-full bg-success-400" />
        </div>
        <span className="text-xs text-neutral-400 font-mono">yourportal.volunteerflow.com</span>
        <button
          onClick={onFullscreen}
          className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-0"
        title="Portal Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// ─── Variables Reference ──────────────────────────────────────────────────────

const TEMPLATE_VARS = [
  { token: '{{org_name}}', description: 'Your organization name' },
  { token: '{{hero_heading}}', description: 'Portal hero headline' },
  { token: '{{hero_subtext}}', description: 'Hero subheading / tagline' },
  { token: '{{event_count}}', description: 'Number of open events' },
  { token: '{{portal_url}}', description: 'Public portal URL' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

type PortalSettings = { selectedThemeId: string; customHtml: string; useCustom: boolean };

const DEFAULT_SETTINGS: Record<PortalType, PortalSettings> = {
  volunteer: { selectedThemeId: 'default',   customHtml: DEFAULT_CUSTOM_HTML, useCustom: false },
  member:    { selectedThemeId: 'ocean',      customHtml: DEFAULT_CUSTOM_HTML, useCustom: false },
  employee:  { selectedThemeId: 'dark_pro',   customHtml: DEFAULT_CUSTOM_HTML, useCustom: false },
};

export default function PortalDesignerPage() {
  const [activeTab, setActiveTab] = useState<PortalTab>('themes');
  const [portalType, setPortalType] = useState<PortalType>('volunteer');
  const [settings, setSettings] = useState<Record<PortalType, PortalSettings>>(DEFAULT_SETTINGS);
  const loadedRef = useRef<Set<PortalType>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read org name from the stored user object (set at login)
  const orgName = (() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = JSON.parse(localStorage.getItem('vf_user') || '{}');
      return u.orgName || u.name || 'My Organisation';
    } catch { return 'My Organisation'; }
  })();

  // Load settings for a portal type the first time it's viewed
  const loadPortalType = useCallback(async (type: PortalType) => {
    if (loadedRef.current.has(type)) return;
    loadedRef.current.add(type);
    try {
      const data = await api.get<{ themeId: string; customHtml: string; useCustom: boolean }>(
        `/portal/settings/${type}`
      );
      setSettings(prev => ({
        ...prev,
        [type]: {
          selectedThemeId: data.themeId || DEFAULT_SETTINGS[type].selectedThemeId,
          customHtml: data.customHtml || DEFAULT_CUSTOM_HTML,
          useCustom: data.useCustom,
        },
      }));
    } catch {
      // keep defaults on error
    }
  }, []);

  useEffect(() => { loadPortalType(portalType); }, [portalType]);

  const cur = settings[portalType];
  const portalMeta = PORTAL_TYPES.find(p => p.id === portalType)!;
  const selectedThemeId = cur.selectedThemeId;
  const customHtml = cur.customHtml;
  const useCustom = cur.useCustom;

  function updateSettings(patch: Partial<PortalSettings>) {
    setSettings(prev => ({ ...prev, [portalType]: { ...prev[portalType], ...patch } }));
  }
  const setSelectedThemeId = (id: string) => updateSettings({ selectedThemeId: id });
  const setCustomHtml = (html: string) => updateSettings({ customHtml: html });
  const setUseCustom = (v: boolean | ((p: boolean) => boolean)) =>
    updateSettings({ useCustom: typeof v === 'function' ? v(cur.useCustom) : v });

  const selectedTheme = THEMES.find(t => t.id === selectedThemeId) ?? THEMES[0];

  const previewHtml = useCustom
    ? customHtml
        .replace(/\{\{org_name\}\}/g, orgName)
        .replace(/\{\{hero_heading\}\}/g, portalMeta.heroHeading)
        .replace(/\{\{hero_subtext\}\}/g, portalMeta.heroSubtext)
        .replace(/\{\{event_count\}\}/g, '3')
        .replace(/\{\{portal_url\}\}/g, `${typeof window !== 'undefined' ? window.location.origin : ''}/volunteerportal`)
    : buildThemeHTML(selectedTheme, orgName);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/portal/settings/${portalType}`, {
        themeId: selectedThemeId,
        customHtml,
        useCustom,
      });
      toast.success(useCustom
        ? `${portalMeta.label} custom design published!`
        : `"${selectedTheme.name}" theme published to ${portalMeta.label}`
      );
    } catch {
      toast.error('Failed to save portal settings');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(customHtml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function insertVar(token: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = customHtml.slice(0, start);
    const after = customHtml.slice(end);
    const next = before + token + after;
    setCustomHtml(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  const TABS: { id: PortalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'custom', label: 'Custom HTML', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  return (
    <Layout>
      <Head><title>Portal Designer — VolunteerFlow</title></Head>
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Portal Designer</h1>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Choose a theme or write custom HTML for your public volunteer portal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/volunteerportal"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open live portal
            </a>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />Publishing…</>
                : <><Save className="w-4 h-4 mr-2" />Publish Changes</>
              }
            </Button>
          </div>
        </div>

        {/* Portal type selector */}
        <div className="flex gap-2 flex-wrap">
          {PORTAL_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPortalType(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                portalType === id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Active mode badge */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Active design:</span>
          {useCustom ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-semibold">
              <Code2 className="w-3 h-3" /> Custom HTML
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold">
              <Palette className="w-3 h-3" /> {selectedTheme.name} theme
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── THEMES TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'themes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Theme grid */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {THEMES.map(theme => {
                const isSelected = selectedThemeId === theme.id && !useCustom;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setSelectedThemeId(theme.id); setUseCustom(false); }}
                    className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                      isSelected
                        ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center z-10">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {/* Badge */}
                    {theme.badge && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-neutral-800 text-white text-[10px] font-semibold rounded z-10">
                        {theme.badge}
                      </div>
                    )}
                    <ThemeMiniPreview theme={theme} />
                    <div className="mt-2.5">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{theme.name}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 line-clamp-2">{theme.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live preview panel */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Live Preview</p>
                <button
                  onClick={() => setActiveTab('preview')}
                  className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                >
                  Full preview <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 h-[480px] bg-white dark:bg-neutral-800">
                <LivePreview
                  html={buildThemeHTML(selectedTheme, orgName)}
                  fullscreen={false}
                  onFullscreen={() => { setActiveTab('preview'); }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM HTML TAB ──────────────────────────────────────────────── */}
        {activeTab === 'custom' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">HTML Editor</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Write full HTML + CSS. Use template variables below to inject live data.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyHtml}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-600 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setCustomHtml(DEFAULT_CUSTOM_HTML)}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-600 transition-colors"
                    title="Reset to default template"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={customHtml}
                onChange={e => setCustomHtml(e.target.value)}
                spellCheck={false}
                className="flex-1 font-mono text-xs bg-neutral-900 text-green-300 border border-neutral-700 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
                style={{ minHeight: 460, tabSize: 2 }}
              />

              {/* Template vars */}
              <Card className="p-4">
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-primary-500" />
                  Template variables — click to insert at cursor
                </p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_VARS.map(v => (
                    <button
                      key={v.token}
                      onClick={() => insertVar(v.token)}
                      title={v.description}
                      className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600 transition-colors"
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Use custom toggle */}
              <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Use this custom design</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">Overrides the theme selection for your live portal</p>
                </div>
                <button
                  onClick={() => setUseCustom(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    useCustom ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${useCustom ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            {/* Live preview of custom HTML */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Live Preview</p>
              <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 flex-1" style={{ minHeight: 560 }}>
                <LivePreview
                  html={customHtml
                    .replace(/\{\{org_name\}\}/g, orgName)
                    .replace(/\{\{hero_heading\}\}/g, 'Make a Difference Today')
                    .replace(/\{\{hero_subtext\}\}/g, 'Browse open volunteer opportunities and sign up in minutes.')
                    .replace(/\{\{event_count\}\}/g, '3')
                    .replace(/\{\{portal_url\}\}/g, 'yourportal.volunteerflow.com')}
                  fullscreen={false}
                  onFullscreen={() => setFullscreen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Previewing:{' '}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {useCustom ? 'Custom HTML design' : `${selectedTheme.name} theme`}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Maximize2 className="w-4 h-4" /> Fullscreen
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700" style={{ height: 640 }}>
              <LivePreview
                html={previewHtml}
                fullscreen={false}
                onFullscreen={() => setFullscreen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-900 flex flex-col">
          <LivePreview
            html={previewHtml}
            fullscreen
            onFullscreen={() => setFullscreen(false)}
          />
        </div>
      )}

    </Layout>
  );
}
