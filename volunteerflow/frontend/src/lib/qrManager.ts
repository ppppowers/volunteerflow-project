// ─── QR Code Manager — data layer ─────────────────────────────────────────────

export type QrType = 'URL' | 'TEXT' | 'EMAIL' | 'PHONE' | 'WIFI' | 'VCARD';
export type QrStyle = 'square' | 'rounded' | 'dots';
export type QrStatus = 'active' | 'paused' | 'archived';
export type CampaignStatus = 'active' | 'paused' | 'archived';

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  color: string;      // hex accent color
  status: CampaignStatus;
  createdAt: string;
}

export const CAMPAIGN_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

const CAMPAIGNS_KEY = 'vf_qr_campaigns';

export function getCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return SEED_CAMPAIGNS;
  try {
    const stored = localStorage.getItem(CAMPAIGNS_KEY);
    return stored ? JSON.parse(stored) : SEED_CAMPAIGNS;
  } catch {
    return SEED_CAMPAIGNS;
  }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function addCampaign(c: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  const next: Campaign = { ...c, id: 'cmp_' + Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() };
  saveCampaigns([next, ...getCampaigns()]);
  return next;
}

export function updateCampaign(id: string, patch: Partial<Campaign>): void {
  saveCampaigns(getCampaigns().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function deleteCampaign(id: string): void {
  saveCampaigns(getCampaigns().filter((c) => c.id !== id));
  // Unlink QR codes from this campaign
  saveQrCodes(getQrCodes().map((q) => q.campaignId === id ? { ...q, campaignId: undefined } : q));
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface SavedQrCode {
  id: string;
  name: string;
  type: QrType;
  content: string;        // Final encoded content embedded in QR
  displayValue: string;   // Human-readable destination
  fgColor: string;
  bgColor: string;
  style: QrStyle;
  size: number;
  includeMargin: boolean;
  status: QrStatus;
  createdAt: string;
  totalScans: number;
  lastScannedAt?: string;
  campaignId?: string;
}

export interface ScanDataPoint {
  date: string;    // YYYY-MM-DD
  scans: number;
}

export interface DeviceBreakdown {
  name: string;
  value: number;
  fill: string;
}

export interface QrAnalyticsData {
  qrId: string;
  totalScans: number;
  uniqueScans: number;
  scansToday: number;
  scansThisWeek: number;
  timeline: ScanDataPoint[];       // Last 30 days
  devices: DeviceBreakdown[];
  topLocations: { city: string; country: string; scans: number }[];
  topReferrers: { source: string; scans: number }[];
  hourlyHeatmap: number[];         // 24 values (hour 0–23)
}

const STORAGE_KEY = 'vf_qr_codes';

// ─── Unique ID ────────────────────────────────────────────────────────────────

function uid(): string {
  return 'qr_' + Math.random().toString(36).slice(2, 10);
}

// ─── Content builder (mirrors qr-platform logic.ts) ──────────────────────────

export function buildQrContent(type: QrType, destination: string, meta: Record<string, string> = {}): string {
  switch (type) {
    case 'URL':
      return destination;
    case 'TEXT':
      return destination;
    case 'EMAIL':
      return `mailto:${destination}${meta.subject ? `?subject=${encodeURIComponent(meta.subject)}` : ''}`;
    case 'PHONE':
      return `tel:${destination}`;
    case 'WIFI':
      return `WIFI:T:${meta.encryption ?? 'WPA'};S:${destination};P:${meta.password ?? ''};;`;
    case 'VCARD':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${destination}`,
        meta.phone ? `TEL:${meta.phone}` : '',
        meta.email ? `EMAIL:${meta.email}` : '',
        meta.org   ? `ORG:${meta.org}`   : '',
        meta.url   ? `URL:${meta.url}`   : '',
        'END:VCARD',
      ].filter(Boolean).join('\n');
    default:
      return destination;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getQrCodes(): SavedQrCode[] {
  if (typeof window === 'undefined') return SEED_QR_CODES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : SEED_QR_CODES;
  } catch {
    return SEED_QR_CODES;
  }
}

export function saveQrCodes(codes: SavedQrCode[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function addQrCode(code: Omit<SavedQrCode, 'id' | 'createdAt' | 'totalScans'>): SavedQrCode {
  const next: SavedQrCode = {
    ...code,
    id: uid(),
    createdAt: new Date().toISOString(),
    totalScans: 0,
  };
  saveQrCodes([next, ...getQrCodes()]);
  return next;
}

export function updateQrCode(id: string, patch: Partial<SavedQrCode>): void {
  saveQrCodes(getQrCodes().map((q) => (q.id === id ? { ...q, ...patch } : q)));
}

export function deleteQrCode(id: string): void {
  saveQrCodes(getQrCodes().filter((q) => q.id !== id));
}

// ─── Mock analytics generator ─────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockAnalytics(qr: SavedQrCode): QrAnalyticsData {
  // Deterministic-ish seed from qr id so same QR always shows same data
  const seed = qr.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (min: number, max: number, offset = 0) => {
    const s = Math.sin(seed + offset) * 10000;
    return Math.floor((s - Math.floor(s)) * (max - min + 1)) + min;
  };

  // Timeline: 30 days
  const timeline: ScanDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    timeline.push({ date: dateStr, scans: rng(0, 40, i) });
  }

  const totalScans = qr.totalScans || timeline.reduce((a, p) => a + p.scans, 0);
  const today = timeline[timeline.length - 1]?.scans ?? 0;
  const weekScans = timeline.slice(-7).reduce((a, p) => a + p.scans, 0);

  const devices: DeviceBreakdown[] = [
    { name: 'Mobile',  value: rng(50, 75, 1), fill: '#3b82f6' },
    { name: 'Desktop', value: rng(15, 30, 2), fill: '#8b5cf6' },
    { name: 'Tablet',  value: rng(5, 15, 3),  fill: '#10b981' },
  ];

  const topLocations = [
    { city: 'New York',    country: 'US', scans: rng(20, 80, 10) },
    { city: 'Los Angeles', country: 'US', scans: rng(10, 50, 11) },
    { city: 'Chicago',     country: 'US', scans: rng(8, 40,  12) },
    { city: 'Houston',     country: 'US', scans: rng(5, 30,  13) },
    { city: 'London',      country: 'GB', scans: rng(3, 25,  14) },
  ];

  const topReferrers = [
    { source: 'Direct scan',  scans: rng(30, 60, 20) },
    { source: 'instagram.com',scans: rng(10, 40, 21) },
    { source: 'facebook.com', scans: rng(5, 30,  22) },
    { source: 'twitter.com',  scans: rng(2, 20,  23) },
  ];

  const hourlyHeatmap = Array.from({ length: 24 }, (_, h) => rng(0, 20, h + 30));

  return {
    qrId: qr.id,
    totalScans,
    uniqueScans: Math.floor(totalScans * 0.75),
    scansToday: today,
    scansThisWeek: weekScans,
    timeline,
    devices,
    topLocations,
    topReferrers,
    hourlyHeatmap,
  };
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const _now = Date.now();

export const SEED_CAMPAIGNS: Campaign[] = [
  { id: 'cmp_seed01', name: 'Volunteer Recruitment Drive', description: 'Spring 2025 outreach to grow our volunteer base', color: '#3b82f6', status: 'active',   createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 20).toISOString() },
  { id: 'cmp_seed02', name: 'Spring Cleanup Events',        description: 'QR codes for all April cleanup event check-ins',   color: '#10b981', status: 'active',   createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 10).toISOString() },
  { id: 'cmp_seed03', name: 'Fundraising Q2',               description: 'Donation pages and awareness materials',            color: '#f59e0b', status: 'paused',   createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 65).toISOString() },
];

export const SEED_QR_CODES: SavedQrCode[] = [
  {
    id: 'qr_seed001',
    name: 'Volunteer Sign-up Form',
    type: 'URL',
    content: 'https://volunteerflow.app/apply?type=volunteer',
    displayValue: 'https://volunteerflow.app/apply?type=volunteer',
    fgColor: '#1e3a5f',
    bgColor: '#ffffff',
    style: 'rounded',
    size: 256,
    includeMargin: true,
    status: 'active',
    createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 14).toISOString(),
    totalScans: 142,
    lastScannedAt: new Date(_now - 1000 * 60 * 30).toISOString(),
    campaignId: 'cmp_seed01',
  },
  {
    id: 'qr_seed002',
    name: 'Spring Cleanup Event Check-in',
    type: 'URL',
    content: 'https://volunteerflow.app/events/spring-cleanup',
    displayValue: 'https://volunteerflow.app/events/spring-cleanup',
    fgColor: '#064e3b',
    bgColor: '#ffffff',
    style: 'square',
    size: 256,
    includeMargin: true,
    status: 'active',
    createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 7).toISOString(),
    totalScans: 89,
    lastScannedAt: new Date(_now - 1000 * 60 * 60 * 2).toISOString(),
    campaignId: 'cmp_seed02',
  },
  {
    id: 'qr_seed003',
    name: 'Office WiFi — Lobby',
    type: 'WIFI',
    content: 'WIFI:T:WPA;S:GreenOrg_Guest;P:welcome2024;;',
    displayValue: 'GreenOrg_Guest',
    fgColor: '#4c1d95',
    bgColor: '#ffffff',
    style: 'dots',
    size: 256,
    includeMargin: true,
    status: 'active',
    createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 30).toISOString(),
    totalScans: 310,
    lastScannedAt: new Date(_now - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'qr_seed004',
    name: 'Donation Landing Page',
    type: 'URL',
    content: 'https://donate.greenvalleyfoodbank.org',
    displayValue: 'https://donate.greenvalleyfoodbank.org',
    fgColor: '#7f1d1d',
    bgColor: '#fff7ed',
    style: 'rounded',
    size: 256,
    includeMargin: true,
    status: 'paused',
    createdAt: new Date(_now - 1000 * 60 * 60 * 24 * 60).toISOString(),
    totalScans: 54,
    lastScannedAt: new Date(_now - 1000 * 60 * 60 * 24 * 5).toISOString(),
    campaignId: 'cmp_seed03',
  },
];
