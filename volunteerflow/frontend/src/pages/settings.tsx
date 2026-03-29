import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useTheme } from '@/context/ThemeContext';
import { usePlan } from '@/context/usePlan';
import { api } from '@/lib/api';
import { PLANS, PlanId, BillingCycle, getYearlySavings, FeatureKey } from '@/lib/pricing.config';
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Users,
  CreditCard,
  Database,
  Upload,
  Save,
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Globe,
  Mail,
  Smartphone,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Paintbrush,
  Puzzle,
  KeyRound,
  CheckCircle2,
  MapPin,
  Lock,
} from 'lucide-react';

import { PlanGate } from '@/components/PlanGate';
import PaymentGatewayModal from '@/components/PaymentGatewayModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsTab =
  | 'organization'
  | 'team'
  | 'roles'
  | 'locations'
  | 'notifications'
  | 'messaging'
  | 'appearance'
  | 'security'
  | 'billing'
  | 'data'
  | 'integrations';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isOwner?: boolean;
  avatar?: string;
  joinedAt: string;
  lastActive: string;
}

interface OrgRole {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, boolean>;
  isSystem: boolean;
  sortOrder: number;
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Australia/Sydney',
];

const LANGUAGES = ['English (US)', 'English (UK)', 'Español', 'Français', 'Deutsch', 'Português'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors';

const selectClass =
  'w-full px-3 py-2.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-primary-600 dark:bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function SaveBanner({ saved, onSave, saving }: { saved: boolean; onSave: () => void; saving?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-700 mt-6">
      {saved && (
        <span className="text-sm text-success-600 dark:text-success-400 flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Saved successfully
        </span>
      )}
      <Button onClick={onSave} disabled={saving}>
        {saving ? (
          <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Saving…</>
        ) : (
          <><Save className="w-4 h-4 mr-2" />Save Changes</>
        )}
      </Button>
    </div>
  );
}

// ─── Tab: Organization ────────────────────────────────────────────────────────

function OrganizationTab() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    orgName: '',
    website: '',
    orgEmail: '',
    phone: '',
    address: '',
    timezone: 'America/New_York',
    language: 'English (US)',
    description: '',
    taxId: '',
  });

  // Logo & identity (moved from Branding tab)
  const [logoPreview, setLogoPreview] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const [brandingForm, setBrandingForm] = useState({
    portalName: '', subdomain: '',
    primaryColor: '#10b981', accentColor: '#0d9488',
    welcomeHeading: '', welcomeSubtext: '', footerText: '', showPoweredBy: true,
  });

  useEffect(() => {
    Promise.allSettled([
      api.get<Record<string, string>>('/settings'),
      api.get<{
        portalName: string; subdomain: string; primaryColor: string; accentColor: string;
        welcomeHeading: string; welcomeSubtext: string; footerText: string;
        showPoweredBy: boolean; logoBase64: string;
      }>('/branding'),
    ]).then(([settingsResult, brandingResult]) => {
      if (settingsResult.status === 'fulfilled') {
        const data = settingsResult.value;
        setForm((f) => ({
          ...f,
          orgName:     data.orgName     || '',
          website:     data.website     || '',
          orgEmail:    data.orgEmail    || '',
          phone:       data.phone       || '',
          address:     data.address     || '',
          timezone:    data.timezone    || 'America/New_York',
          language:    data.language    || 'English (US)',
          description: data.description || '',
          taxId:       data.taxId       || '',
        }));
      }
      if (brandingResult.status === 'fulfilled') {
        const d = brandingResult.value;
        setBrandingForm({
          portalName: d.portalName, subdomain: d.subdomain, primaryColor: d.primaryColor,
          accentColor: d.accentColor, welcomeHeading: d.welcomeHeading,
          welcomeSubtext: d.welcomeSubtext, footerText: d.footerText, showPoweredBy: d.showPoweredBy,
        });
        if (d.logoBase64) setLogoPreview(d.logoBase64);
      }
    }).finally(() => setLoading(false));
  }, []);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 512;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setLogoPreview(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = objectUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put('/settings', form);
      // Branding save is best-effort; silently ignored on plans without branding access
      await api.put('/branding', { ...brandingForm, logoBase64: logoPreview }).catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionTitle title="Organization Identity" subtitle="Your organization's basic information." />
        <div className="space-y-4 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-700">
          <Field label="Organization Name">
            <input type="text" value={form.orgName} onChange={(e) => set('orgName')(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set('description')(e.target.value)}
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="url" value={form.website} onChange={(e) => set('website')(e.target.value)} className={inputClass + ' !pl-9'} />
            </div>
          </Field>
          <Field label="Contact Email">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="email" value={form.orgEmail} onChange={(e) => set('orgEmail')(e.target.value)} className={inputClass + ' !pl-9'} />
            </div>
          </Field>
          <Field label="Phone Number">
            <input type="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Tax ID / EIN" hint="Used for donation receipts and legal documents">
            <input type="text" value={form.taxId} onChange={(e) => set('taxId')(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Address" hint="Shown on event listings and volunteer communications">
            <input type="text" value={form.address} onChange={(e) => set('address')(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </Card>

      <PlanGate feature="custom_branding">
        <Card className="p-6">
          <SectionTitle title="Logo & Identity" subtitle="Customize how your organization appears in the volunteer portal" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Organization Logo</label>
              <div
                onClick={() => logoRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl p-6 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-h-20 object-contain mb-2" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Upload logo</p>
                    <p className="text-xs text-neutral-400 mt-1">PNG or SVG · 400×100px recommended</p>
                  </>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              {logoPreview && (
                <button onClick={() => setLogoPreview('')} className="mt-2 text-xs text-danger-500 dark:text-danger-400 hover:underline flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove logo
                </button>
              )}
            </div>
            <div className="space-y-4">
              <Field label="Portal Name">
                <input
                  type="text"
                  value={brandingForm.portalName}
                  placeholder="e.g. Green Future Volunteer Hub"
                  onChange={(e) => setBrandingForm((b) => ({ ...b, portalName: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Portal URL Subdomain" hint={brandingForm.subdomain ? `Volunteers will visit: ${brandingForm.subdomain}.volunteerflow.app` : 'Choose a unique subdomain for your volunteer portal'}>
                <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden bg-white dark:bg-neutral-700">
                  <span className="px-3 py-2.5 text-sm text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-600 whitespace-nowrap">https://</span>
                  <input
                    type="text"
                    value={brandingForm.subdomain}
                    placeholder="your-org-name"
                    onChange={(e) => setBrandingForm((b) => ({ ...b, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                  <span className="px-3 py-2.5 text-sm text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-600 whitespace-nowrap">.volunteerflow.app</span>
                </div>
              </Field>
            </div>
          </div>
        </Card>
      </PlanGate>

      <Card className="p-6">
        <SectionTitle title="Regional Settings" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Timezone">
            <select value={form.timezone} onChange={(e) => set('timezone')(e.target.value)} className={selectClass}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select value={form.language} onChange={(e) => set('language')(e.target.value)} className={selectClass}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}
      <SaveBanner saved={saved} saving={saving} onSave={handleSave} />
    </div>
  );
}

// ─── Tab: Team ────────────────────────────────────────────────────────────────

function TeamTab() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [orgRoles, setOrgRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('role_member');
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get<Array<{ id: string; name: string; email: string; role: string; isOwner: boolean; joinedAt: string }>>('/team'),
      api.get<OrgRole[]>('/roles'),
    ]).then(([teamResult, rolesResult]) => {
      if (teamResult.status === 'fulfilled') {
        setTeam(teamResult.value.map((u) => ({
          id: u.id, name: u.name || u.email, email: u.email,
          role: u.role, isOwner: u.isOwner,
          joinedAt: u.joinedAt || '', lastActive: u.joinedAt || '',
        })));
      }
      if (rolesResult.status === 'fulfilled') {
        setOrgRoles(rolesResult.value);
        if (rolesResult.value.length) setInviteRoleId(rolesResult.value[0].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  const roleMap = Object.fromEntries(orgRoles.map((r) => [r.id, r]));

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setShowInvite(false);
      setInviteEmail('');
    }, 2000);
  };

  const handleRemove = (id: string) => {
    api.delete(`/team/${id}`)
      .then(() => setTeam((t) => t.filter((m) => m.id !== id)))
      .catch(() => {});
  };

  const handleRoleChange = (id: string, roleId: string) => {
    api.put(`/team/${id}/role`, { role: roleId })
      .then(() => setTeam((t) => t.map((m) => (m.id === id ? { ...m, role: roleId } : m))))
      .catch(() => {});
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <SectionTitle title="Team Members" subtitle={`${team.length} member${team.length !== 1 ? 's' : ''} with access to your organization`} />
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {showInvite && (
          <div className="mb-5 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Invite a team member</h3>
              <button onClick={() => setShowInvite(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {inviteSent ? (
              <div className="flex items-center gap-2 text-success-600 dark:text-success-400 text-sm font-medium">
                <Check className="w-4 h-4" />
                Invitation sent to {inviteEmail}
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Field label="Email Address">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="w-44">
                  <Field label="Role">
                    <select value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)} className={selectClass}>
                      {orgRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()}>
                  Send Invite
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {team.map((member) => {
            const memberRole = roleMap[member.role];
            return (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {member.avatar ? (
                    <img src={member.avatar} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(member.name)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{member.name}</p>
                    {member.isOwner && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        Owner
                      </span>
                    )}
                    {!member.isOwner && memberRole && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${memberRole.color}`}>
                        {memberRole.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</p>
                  {member.joinedAt && (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!member.isOwner && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="text-xs px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-primary-500 outline-none"
                      >
                        {orgRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-1.5 rounded hover:bg-danger-50 dark:hover:bg-danger-900/30 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {orgRoles.length > 0 && (
        <Card className="p-6">
          <SectionTitle title="Role Permissions" subtitle="What each role can access — configure in the Roles tab" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left py-2 pr-4 font-semibold text-neutral-700 dark:text-neutral-300">Permission</th>
                  {orgRoles.map((r) => (
                    <th key={r.id} className={`text-center py-2 px-3 font-semibold text-xs ${r.color.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Object.entries(DEFAULT_PERMISSIONS).map(([key, label]) => (
                  <tr key={key}>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400 text-xs">{label}</td>
                    {orgRoles.map((r) => (
                      <td key={r.id} className="py-2 px-3 text-center">
                        {r.permissions[key] ? (
                          <Check className="w-3.5 h-3.5 text-success-600 dark:text-success-400 mx-auto" />
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600 text-base leading-none">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

const NOTIF_DEFAULTS = {
  email_new_app: true, email_app_approved: true, email_app_rejected: false,
  email_event_reminder: true, email_new_volunteer: true, email_weekly_digest: true,
  email_billing: true,
  push_new_app: false, push_event_reminder: true, push_new_volunteer: false,
  digest_frequency: 'weekly',
  quiet_hours_enabled: false, quiet_start: '22:00', quiet_end: '08:00',
};

function NotificationsTab() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(NOTIF_DEFAULTS);

  useEffect(() => {
    api.get<typeof NOTIF_DEFAULTS>('/notifications')
      .then((data) => setPrefs({ ...NOTIF_DEFAULTS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (k: string) => setPrefs((p) => ({ ...p, [k]: !p[k as keyof typeof p] }));
  const set = (k: string) => (v: string) => setPrefs((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put('/notifications', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const notifGroups = [
    {
      icon: Mail, title: 'Email Notifications', subtitle: 'Receive updates in your inbox',
      items: [
        { key: 'email_new_app', label: 'New volunteer application', desc: 'When someone submits an application form' },
        { key: 'email_app_approved', label: 'Application approved', desc: 'Confirmation when you approve an applicant' },
        { key: 'email_app_rejected', label: 'Application rejected', desc: 'Confirmation when you reject an applicant' },
        { key: 'email_event_reminder', label: 'Event reminders', desc: '24 hours before an event starts' },
        { key: 'email_new_volunteer', label: 'New volunteer joins', desc: 'When a volunteer completes onboarding' },
        { key: 'email_weekly_digest', label: 'Weekly digest', desc: 'Summary of activity and metrics' },
        { key: 'email_billing', label: 'Billing notifications', desc: 'Invoices, renewals, and payment issues' },
      ],
    },
    {
      icon: Smartphone, title: 'Push Notifications', subtitle: 'In-app and browser notifications',
      items: [
        { key: 'push_new_app', label: 'New application alert', desc: 'Instant notification for new submissions' },
        { key: 'push_event_reminder', label: 'Event reminders', desc: 'Alert before events you\'re coordinating' },
        { key: 'push_new_volunteer', label: 'Volunteer activity', desc: 'When volunteers complete check-in steps' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {notifGroups.map((group) => {
        const GroupIcon = group.icon;
        return (
          <Card key={group.title} className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <GroupIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{group.title}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{group.subtitle}</p>
              </div>
            </div>
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.desc}</p>
                  </div>
                  <Toggle
                    checked={prefs[item.key as keyof typeof prefs] as boolean}
                    onChange={() => toggle(item.key)}
                  />
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card className="p-6">
        <SectionTitle title="Digest Settings" subtitle="Control how and when you receive summaries" />
        <div className="space-y-4">
          <Field label="Digest Frequency">
            <select value={prefs.digest_frequency} onChange={(e) => set('digest_frequency')(e.target.value)} className={selectClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Monday)</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="never">Never</option>
            </select>
          </Field>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Quiet Hours</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Suppress non-critical notifications during these hours</p>
            </div>
            <Toggle checked={prefs.quiet_hours_enabled} onChange={() => toggle('quiet_hours_enabled')} />
          </div>
          {prefs.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
              <Field label="From">
                <input type="time" value={prefs.quiet_start} onChange={(e) => set('quiet_start')(e.target.value)} className={inputClass} />
              </Field>
              <Field label="To">
                <input type="time" value={prefs.quiet_end} onChange={(e) => set('quiet_end')(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}
        </div>
      </Card>

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}
      <SaveBanner saved={saved} onSave={handleSave} saving={saving} />
    </div>
  );
}

// ─── Tab: Appearance ─────────────────────────────────────────────────────────

// RGB channel values (space-separated) for each accent color — used to set CSS vars at runtime
const ACCENT_PALETTES: Record<string, Record<string, string>> = {
  // ── Classic solid colors ──────────────────────────────────────────────────
  blue:     { '50':'239 246 255','100':'219 234 254','200':'191 219 254','300':'147 197 253','400':'96 165 250', '500':'59 130 246', '600':'37 99 235',  '700':'29 78 216',  '800':'30 64 175',  '900':'30 58 138'  },
  purple:   { '50':'245 243 255','100':'237 233 254','200':'221 214 254','300':'196 181 253','400':'167 139 250','500':'139 92 246', '600':'124 58 237', '700':'109 40 217', '800':'91 33 182',  '900':'76 29 149'  },
  green:    { '50':'240 253 244','100':'220 252 231','200':'187 247 208','300':'134 239 172','400':'74 222 128', '500':'34 197 94',  '600':'22 163 74',  '700':'21 128 61',  '800':'22 101 52',  '900':'20 83 45'   },
  orange:   { '50':'255 247 237','100':'255 237 213','200':'254 215 170','300':'253 186 116','400':'251 146 60', '500':'249 115 22', '600':'234 88 12',  '700':'194 65 12',  '800':'154 52 18',  '900':'124 45 18'  },
  red:      { '50':'254 242 242','100':'254 226 226','200':'254 202 202','300':'252 165 165','400':'248 113 113','500':'239 68 68',  '600':'220 38 38',  '700':'185 28 28',  '800':'153 27 27',  '900':'127 29 29'  },
  teal:     { '50':'240 253 250','100':'204 251 241','200':'153 246 228','300':'94 234 212', '400':'45 212 191', '500':'20 184 166', '600':'13 148 136', '700':'15 118 110', '800':'17 94 89',   '900':'19 78 74'   },
  // ── Signature themes (hue shifts across light→dark scale) ─────────────────
  // Sunset: golden peachy tints → orange-red buttons → deep wine darks
  sunset:   { '50':'255 247 237','100':'255 237 208','200':'255 212 160','300':'255 175 108','400':'255 137 55','500':'245 90 40',  '600':'218 58 35',  '700':'182 36 58',  '800':'148 22 66',  '900':'112 14 54'  },
  // Ocean: pale sky-blue tints → cerulean buttons → deep navy darks
  ocean:    { '50':'240 249 255','100':'214 240 253','200':'170 222 250','300':'108 196 240','400':'52 164 224','500':'8 136 204',  '600':'4 108 172',  '700':'3 86 140',   '800':'4 66 108',   '900':'5 50 80'    },
  // Aurora: teal-mint tints → indigo buttons → deep violet darks (biggest hue shift)
  aurora:   { '50':'237 255 252','100':'207 252 244','200':'162 244 232','300':'110 226 210','400':'90 178 236','500':'99 102 241', '600':'79 70 229',  '700':'67 56 202',  '800':'58 46 172',  '900':'49 38 148'  },
  // Ember: warm golden tints → deep amber buttons → rich brown darks
  ember:    { '50':'255 252 232','100':'255 243 198','200':'255 228 152','300':'252 204 82', '400':'240 170 28','500':'215 133 8',  '600':'182 102 4',  '700':'146 74 4',   '800':'114 54 4',   '900':'86 38 4'    },
  // Rose: blush-pink tints → warm rose buttons → deep berry darks
  rose:     { '50':'255 241 244','100':'255 215 223','200':'255 182 200','300':'252 145 172','400':'244 106 146','500':'230 68 114','600':'208 45 91',  '700':'176 31 72',  '800':'145 24 57',  '900':'116 18 44'  },
  // Midnight: dusty lavender tints → rich indigo buttons → deep midnight darks
  midnight: { '50':'245 244 255','100':'230 228 252','200':'206 203 245','300':'172 168 236','400':'134 128 218','500':'100 96 198','600':'80 74 178',  '700':'63 56 152',  '800':'48 40 126',  '900':'36 28 100'  },
};

function applyAccentColor(color: string) {
  const palette = ACCENT_PALETTES[color];
  if (!palette || typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(palette).forEach(([shade, channels]) => {
    root.style.setProperty(`--primary-${shade}`, channels);
  });
}

function applyDensity(density: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', density);
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  // ── Admin UI appearance (localStorage) ──────────────────────────────────────
  const [saved, setSaved]             = useState(false);
  const [accentColor, setAccentColor] = useState('blue');
  const [density, setDensity]         = useState('comfortable');
  const [dateFormat, setDateFormat]   = useState('MMM D, YYYY');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vf_appearance');
      if (stored) {
        const p = JSON.parse(stored);
        if (p.accentColor && ACCENT_PALETTES[p.accentColor]) {
          setAccentColor(p.accentColor);
          applyAccentColor(p.accentColor);
        }
        if (p.density) { setDensity(p.density); applyDensity(p.density); }
        if (p.dateFormat) setDateFormat(p.dateFormat);
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // ── Portal content (API) ─────────────────────────────────────────────────────
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingSaving, setBrandingSaving]   = useState(false);
  const [brandingError, setBrandingError]     = useState('');
  const [logoPreview, setLogoPreview]         = useState('');
  const [brandingForm, setBrandingForm] = useState({
    portalName: '', subdomain: '',
    primaryColor: '#10b981', accentColor: '#0d9488', // hidden — preserved on save, edited in Portal Designer
    welcomeHeading: '', welcomeSubtext: '', footerText: '', showPoweredBy: true,
  });

  useEffect(() => {
    api.get<{
      portalName: string; subdomain: string; primaryColor: string; accentColor: string;
      welcomeHeading: string; welcomeSubtext: string; footerText: string;
      showPoweredBy: boolean; logoBase64: string;
    }>('/branding').then((d) => {
      setBrandingForm({
        portalName: d.portalName ?? '', subdomain: d.subdomain ?? '',
        primaryColor: d.primaryColor ?? '#10b981', accentColor: d.accentColor ?? '#0d9488',
        welcomeHeading: d.welcomeHeading ?? '', welcomeSubtext: d.welcomeSubtext ?? '',
        footerText: d.footerText ?? '', showPoweredBy: d.showPoweredBy ?? true,
      });
      if (d.logoBase64) setLogoPreview(d.logoBase64);
    }).catch(() => {}).finally(() => setBrandingLoading(false));
  }, []);

  const setBranding = (k: string) => (v: string | boolean) =>
    setBrandingForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    localStorage.setItem('vf_appearance', JSON.stringify({ accentColor, density, dateFormat }));
    setBrandingSaving(true);
    setBrandingError('');
    try {
      await api.put('/branding', { ...brandingForm, logoBase64: logoPreview });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setBrandingError(err instanceof Error ? err.message : 'Failed to save branding settings');
    } finally {
      setBrandingSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light'  as const, icon: Sun,     label: 'Light',  desc: 'Clean white interface' },
    { value: 'dark'   as const, icon: Moon,    label: 'Dark',   desc: 'Easy on the eyes'      },
    { value: 'system' as const, icon: Monitor, label: 'System', desc: 'Follows OS setting'    },
  ];

  const solidColors = [
    { value: 'blue',   color: 'bg-blue-500',   ring: 'ring-blue-500',   label: 'Blue'   },
    { value: 'purple', color: 'bg-purple-500',  ring: 'ring-purple-500', label: 'Purple' },
    { value: 'green',  color: 'bg-green-500',   ring: 'ring-green-500',  label: 'Green'  },
    { value: 'orange', color: 'bg-orange-500',  ring: 'ring-orange-500', label: 'Orange' },
    { value: 'red',    color: 'bg-red-500',     ring: 'ring-red-500',    label: 'Red'    },
    { value: 'teal',   color: 'bg-teal-500',    ring: 'ring-teal-500',   label: 'Teal'   },
  ];

  const signatureThemes = [
    { value: 'sunset',   label: 'Sunset',   desc: 'Golden orange to deep crimson', gradient: 'linear-gradient(135deg, #ff8937 0%, #da3a23 55%, #700e36 100%)' },
    { value: 'ocean',    label: 'Ocean',    desc: 'Sky blue to deep navy',          gradient: 'linear-gradient(135deg, #6cc4f0 0%, #0888cc 55%, #053250 100%)' },
    { value: 'aurora',   label: 'Aurora',   desc: 'Teal haze to deep indigo',       gradient: 'linear-gradient(135deg, #a2f4e8 0%, #6366f1 55%, #312694 100%)' },
    { value: 'ember',    label: 'Ember',    desc: 'Warm gold to rich brown',        gradient: 'linear-gradient(135deg, #fccc52 0%, #d78508 55%, #562604 100%)' },
    { value: 'rose',     label: 'Rose',     desc: 'Blush pink to deep berry',       gradient: 'linear-gradient(135deg, #fc91ac 0%, #e64472 55%, #74122c 100%)' },
    { value: 'midnight', label: 'Midnight', desc: 'Dusty lavender to deep indigo',  gradient: 'linear-gradient(135deg, #aca8ec 0%, #6460c6 55%, #241c64 100%)' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Theme ─────────────────────────────────────────────────────────── */}
      <Card className="p-6">
        <SectionTitle title="Theme" subtitle="Choose how VolunteerFlow looks for you" />
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-semibold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>{opt.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</p>
                </div>
                {isActive && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Accent Color (admin dashboard only) ───────────────────────────── */}
      <Card className="p-6">
        <SectionTitle title="Accent Color" subtitle="Personalize the primary color used across the admin dashboard" />
        <div className="flex items-center gap-1.5 mb-4 px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <Paintbrush className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            These colors apply to this admin dashboard only. Volunteer portal colors are configured in{' '}
            <strong className="text-neutral-600 dark:text-neutral-300">Portal Designer</strong>.
          </p>
        </div>
        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Classic</p>
        <div className="flex flex-wrap gap-3 mb-5">
          {solidColors.map((c) => (
            <button
              key={c.value}
              onClick={() => { setAccentColor(c.value); applyAccentColor(c.value); }}
              className={`w-9 h-9 rounded-full ${c.color} transition-all ${
                accentColor === c.value
                  ? `ring-2 ring-offset-2 ${c.ring} ring-offset-white dark:ring-offset-neutral-900 scale-110`
                  : 'hover:scale-105'
              }`}
              title={c.label}
            />
          ))}
        </div>
        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Signature Themes</p>
        <div className="grid grid-cols-3 gap-2.5">
          {signatureThemes.map((t) => {
            const isActive = accentColor === t.value;
            return (
              <button
                key={t.value}
                onClick={() => { setAccentColor(t.value); applyAccentColor(t.value); }}
                className={`relative overflow-hidden rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? 'border-neutral-800 dark:border-neutral-200 shadow-md scale-[1.03]'
                    : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm'
                }`}
              >
                <div className="h-10 w-full" style={{ background: t.gradient }} />
                <div className="px-2.5 py-2 bg-white dark:bg-neutral-800">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">{t.label}</p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight mt-0.5">{t.desc}</p>
                </div>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/90 dark:bg-neutral-900/90 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-neutral-800 dark:text-neutral-100" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Display Preferences ───────────────────────────────────────────── */}
      <Card className="p-6">
        <SectionTitle title="Display Preferences" />
        <div className="space-y-4">
          <Field label="Interface Density">
            <div className="grid grid-cols-3 gap-2">
              {['compact', 'comfortable', 'spacious'].map((d) => (
                <button
                  key={d}
                  onClick={() => { setDensity(d); applyDensity(d); }}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    density === d
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Date Format">
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={selectClass}>
              <option value="MMM D, YYYY">Mar 18, 2024</option>
              <option value="MM/DD/YYYY">03/18/2024</option>
              <option value="DD/MM/YYYY">18/03/2024</option>
              <option value="YYYY-MM-DD">2024-03-18</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* ── Portal Branding (plan-gated) ───────────────────────────────────── */}
      <PlanGate feature="custom_branding">
        {brandingLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => <div key={i} className="h-40 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />)}
          </div>
        ) : (
          <>
            {brandingError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {brandingError}
              </div>
            )}

            {/* Volunteer Portal Link */}
            <Card className="p-6">
              <SectionTitle title="Volunteer Portal Link" subtitle="Share this link with volunteers to access their portal" />
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                  <ExternalLink className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <a
                    href="/volunteerportal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 dark:text-primary-400 font-mono truncate hover:underline"
                  >
                    {typeof window !== 'undefined' ? `${window.location.origin}/volunteerportal` : '/volunteerportal'}
                  </a>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/volunteerportal`)}>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy
                </Button>
              </div>
            </Card>

            {/* Portal Content */}
            <Card className="p-6">
              <SectionTitle title="Portal Content" subtitle="Text and labels shown on the volunteer-facing portal" />
              <div className="space-y-4">
                <Field label="Welcome heading">
                  <input type="text" value={brandingForm.welcomeHeading} placeholder="Make a Difference Today" onChange={(e) => setBranding('welcomeHeading')(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Welcome subtext">
                  <textarea
                    value={brandingForm.welcomeSubtext}
                    placeholder="Join our community of passionate volunteers and help create lasting change."
                    onChange={(e) => setBranding('welcomeSubtext')(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
                <Field label="Portal footer text">
                  <input type="text" value={brandingForm.footerText} placeholder={`© ${new Date().getFullYear()} Your Organization · All rights reserved`} onChange={(e) => setBranding('footerText')(e.target.value)} className={inputClass} />
                </Field>
                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Show "Powered by VolunteerFlow"</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Displays a small badge in the footer of the volunteer portal</p>
                  </div>
                  <button
                    onClick={() => setBranding('showPoweredBy')(!brandingForm.showPoweredBy)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${brandingForm.showPoweredBy ? 'bg-primary-600 dark:bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${brandingForm.showPoweredBy ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}
      </PlanGate>

      <SaveBanner saved={saved} saving={brandingSaving} onSave={handleSave} />
    </div>
  );
}

// ─── Tab: Security ────────────────────────────────────────────────────────────

interface ActiveSession {
  id: string;
  device: string;
  ipAddress: string;
  createdAt: string;
  lastSeen: string;
  current: boolean;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Active now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function SecurityTab() {
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');

  const [twoFactor, setTwoFactor] = useState(false);
  const [tfaPhase, setTfaPhase] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [tfaData, setTfaData] = useState<{ secret: string; otpauth: string } | null>(null);
  const [tfaCode, setTfaCode] = useState('');
  const [tfaPassword, setTfaPassword] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);

  const [sessionTimeout, setSessionTimeout] = useState('8');
  const [timeoutSaved, setTimeoutSaved] = useState(false);
  const [timeoutSaving, setTimeoutSaving] = useState(false);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ twoFactorEnabled: boolean; sessionTimeout: string }>('/auth/security-settings').then((d) => {
      setTwoFactor(d.twoFactorEnabled);
      setSessionTimeout(d.sessionTimeout);
    }).catch(() => {});

    api.get<ActiveSession[]>('/auth/sessions').then((d) => {
      setSessions(d);
    }).catch(() => {}).finally(() => setSessionsLoading(false));
  }, []);

  const pwStrength = (p: string) => {
    if (!p) return null;
    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: 'bg-danger-500', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'bg-warning-500', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'bg-primary-500', width: '75%' };
    return { label: 'Strong', color: 'bg-success-500', width: '100%' };
  };

  const strength = pwStrength(passwordForm.next);

  const startTfaSetup = async () => {
    setTfaError('');
    setTfaLoading(true);
    try {
      const d = await api.post<{ secret: string; otpauth: string }>('/auth/2fa/setup', {});
      setTfaData(d);
      setTfaCode('');
      setTfaPhase('setup');
    } catch (err: unknown) {
      setTfaError((err as { message?: string })?.message ?? 'Failed to start setup');
    } finally {
      setTfaLoading(false);
    }
  };

  const verifyTfa = async () => {
    if (!tfaData || tfaCode.replace(/\s/g, '').length < 6) return;
    setTfaError('');
    setTfaLoading(true);
    try {
      await api.post('/auth/2fa/verify', { secret: tfaData.secret, token: tfaCode });
      setTwoFactor(true);
      setTfaPhase('idle');
      setTfaData(null);
      setTfaCode('');
    } catch (err: unknown) {
      setTfaError((err as { message?: string })?.message ?? 'Verification failed');
    } finally {
      setTfaLoading(false);
    }
  };

  const disableTfa = async () => {
    if (!tfaPassword) return;
    setTfaError('');
    setTfaLoading(true);
    try {
      await api.delete('/auth/2fa', { body: { password: tfaPassword } });
      setTwoFactor(false);
      setTfaPhase('idle');
      setTfaPassword('');
    } catch (err: unknown) {
      setTfaError((err as { message?: string })?.message ?? 'Failed to disable 2FA');
    } finally {
      setTfaLoading(false);
    }
  };

  const cancelTfa = () => {
    setTfaPhase('idle');
    setTfaData(null);
    setTfaCode('');
    setTfaPassword('');
    setTfaError('');
  };

  const saveTimeout = async () => {
    setTimeoutSaving(true);
    try {
      await api.put('/auth/security-settings', { sessionTimeout });
      setTimeoutSaved(true);
      setTimeout(() => setTimeoutSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setTimeoutSaving(false);
    }
  };

  const revokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silent — leave session in list
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionTitle title="Change Password" subtitle="Use a strong, unique password for your account" />
        <div className="space-y-4 max-w-md">
          {([
            ['current', 'Current Password', showCurrent, setShowCurrent],
            ['next', 'New Password', showNew, setShowNew],
            ['confirm', 'Confirm New Password', showConfirm, setShowConfirm],
          ] as const).map(([key, label, show, setShow]) => (
            <Field key={key} label={label}>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={passwordForm[key]}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className={inputClass + ' !pr-10'}
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {key === 'next' && passwordForm.next && strength && (
                <div className="mt-2">
                  <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-xs mt-1 text-neutral-500 dark:text-neutral-400">Strength: <span className="font-semibold">{strength.label}</span></p>
                </div>
              )}
            </Field>
          ))}
          {passwordError && (
            <p role="alert" className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {passwordError}
            </p>
          )}
          <Button
            disabled={pwSaving}
            onClick={async () => {
              if (!passwordForm.current) { setPasswordError('Please enter your current password.'); return; }
              if (passwordForm.next.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
              if (passwordForm.next !== passwordForm.confirm) { setPasswordError('New passwords do not match.'); return; }
              setPasswordError('');
              setPwSaving(true);
              try {
                await api.put('/auth/password', { currentPassword: passwordForm.current, newPassword: passwordForm.next });
                setPwSaved(true);
                setPasswordForm({ current: '', next: '', confirm: '' });
                setTimeout(() => setPwSaved(false), 3000);
              } catch (err: unknown) {
                const msg = (err as { message?: string })?.message;
                setPasswordError(msg === 'Current password is incorrect' ? 'Current password is incorrect.' : 'Failed to update password. Please try again.');
              } finally {
                setPwSaving(false);
              }
            }}
          >
            {pwSaving ? (
              <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Updating…</>
            ) : pwSaved ? (
              <><Check className="w-4 h-4 mr-2" />Updated!</>
            ) : 'Update Password'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="Two-Factor Authentication" subtitle="Add an extra layer of security to your account" />
        {/* Status row */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFactor ? 'bg-success-100 dark:bg-success-900/30' : 'bg-neutral-100 dark:bg-neutral-700'}`}>
              <Shield className={`w-5 h-5 ${twoFactor ? 'text-success-600 dark:text-success-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Authenticator App</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {twoFactor ? 'Enabled — using an authenticator app' : 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {twoFactor && <span className="text-xs font-semibold text-success-600 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-2 py-1 rounded-full">Enabled</span>}
            {tfaPhase === 'idle' && (
              <Button
                size="sm"
                variant={twoFactor ? 'outline' : 'primary'}
                disabled={tfaLoading}
                onClick={twoFactor ? () => { setTfaPhase('disable'); setTfaError(''); } : startTfaSetup}
              >
                {tfaLoading
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                  : twoFactor ? 'Disable' : 'Set up'}
              </Button>
            )}
          </div>
        </div>

        {/* Error in idle phase (e.g. API call failed before QR shown) */}
        {tfaPhase === 'idle' && tfaError && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{tfaError}
          </p>
        )}

        {/* Setup phase — QR code + verification */}
        {tfaPhase === 'setup' && tfaData && (
          <div className="mt-4 p-5 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/40 dark:bg-primary-900/10 space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Scan with your authenticator app</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Use Google Authenticator, Authy, or any TOTP-compatible app.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="p-3 bg-white rounded-xl border border-neutral-200 dark:border-neutral-600 shrink-0 shadow-sm">
                <QRCodeSVG value={tfaData.otpauth} size={160} level="M" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Can't scan? Enter this key manually:</p>
                  <code className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-lg block break-all text-neutral-700 dark:text-neutral-300 select-all leading-relaxed">
                    {tfaData.secret.match(/.{1,4}/g)?.join(' ') ?? tfaData.secret}
                  </code>
                </div>
                <Field label="Enter the 6-digit code from your app">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="000 000"
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/[^0-9\s]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyTfa()}
                    className={`${inputClass} tracking-[0.35em] text-center font-mono max-w-[10rem]`}
                    autoFocus
                  />
                </Field>
              </div>
            </div>
            {tfaError && (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />{tfaError}
              </p>
            )}
            <div className="flex gap-3">
              <Button disabled={tfaLoading || tfaCode.replace(/\s/g, '').length < 6} onClick={verifyTfa}>
                {tfaLoading ? <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Verifying…</> : 'Verify & Enable'}
              </Button>
              <Button variant="outline" onClick={cancelTfa} disabled={tfaLoading}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Disable phase — password confirmation */}
        {tfaPhase === 'disable' && (
          <div className="mt-4 p-5 border border-danger-200 dark:border-danger-800 rounded-lg bg-danger-50/40 dark:bg-danger-900/10 space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Confirm your password to disable 2FA</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Your account will no longer require a second factor when signing in.</p>
            </div>
            <div className="max-w-xs">
              <Field label="Current password">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={tfaPassword}
                  onChange={(e) => setTfaPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && disableTfa()}
                  className={inputClass}
                  autoFocus
                />
              </Field>
            </div>
            {tfaError && (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />{tfaError}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="danger" disabled={tfaLoading || !tfaPassword} onClick={disableTfa}>
                {tfaLoading ? <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />Disabling…</> : 'Disable 2FA'}
              </Button>
              <Button variant="outline" onClick={cancelTfa} disabled={tfaLoading}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <SectionTitle title="Active Sessions" subtitle="Devices currently signed in to your account" />
        <div className="space-y-3 mb-5">
          {sessionsLoading ? (
            <div className="py-6 flex justify-center">
              <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">No active sessions found.</p>
          ) : sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.device}</p>
                  {s.current && <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">This device</span>}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {s.ipAddress ? `${s.ipAddress} · ` : ''}{formatRelativeTime(s.lastSeen)}
                </p>
              </div>
              {!s.current && (
                <Button size="sm" variant="outline" disabled={revokingId === s.id} onClick={() => revokeSession(s.id)}>
                  {revokingId === s.id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : 'Revoke'}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Field label="Auto-logout after inactivity">
              <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className={selectClass}>
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="24">24 hours</option>
                <option value="never">Never</option>
              </select>
            </Field>
          </div>
          <Button size="sm" disabled={timeoutSaving} onClick={saveTimeout} className="mb-0.5">
            {timeoutSaving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            ) : timeoutSaved ? (
              <><Check className="w-4 h-4 mr-1.5" />Saved</>
            ) : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Roles & Permissions ─────────────────────────────────────────────────

const DEFAULT_PERMISSIONS: Record<string, string> = {
  manage_volunteers: 'Manage volunteers (add, edit, delete)',
  view_volunteers: 'View volunteer profiles',
  manage_events: 'Manage events (create, edit, delete)',
  view_events: 'View events',
  manage_applications: 'Review & action applications',
  manage_hours: 'Log & approve hours',
  view_hours: 'View hours reports',
  manage_messages: 'Send messages & manage templates',
  manage_files: 'Upload & manage files',
  view_files: 'View files',
  manage_import: 'Import data',
  manage_badges: 'Issue & revoke badges',
  view_audit: 'View audit log',
  manage_settings: 'Change organization settings',
  manage_billing: 'Manage billing & subscription',
  manage_team: 'Invite & manage team members',
};

const PERM_KEYS = Object.keys(DEFAULT_PERMISSIONS);

const ROLE_COLORS = [
  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
];

function RolesTab() {
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<OrgRole[]>('/roles'),
      api.get<Array<{ id: string; name: string; email: string; role: string; joinedAt: string }>>('/team'),
    ]).then(([roleRows, teamRows]) => {
      setRoles(roleRows);
      if (roleRows.length) setSelectedRoleId(roleRows[0].id);
      setTeam(teamRows.map((u) => ({
        id: u.id, name: u.name || u.email, email: u.email,
        role: u.role,
        joinedAt: u.joinedAt || '', lastActive: u.joinedAt || '',
      })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const role = roles.find((r) => r.id === selectedRoleId);

  function togglePerm(key: string) {
    if (!role || role.isSystem) return;
    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRoleId
          ? { ...r, permissions: { ...r.permissions, [key]: !r.permissions[key] } }
          : r
      )
    );
  }

  async function handleSave() {
    if (!role) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.put(`/roles/${role.id}`, {
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRole() {
    if (!newRoleName.trim()) { setAddError('Name is required'); return; }
    setAddError('');
    try {
      const created = await api.post<OrgRole>('/roles', {
        name: newRoleName.trim(),
        color: newRoleColor,
        permissions: Object.fromEntries(PERM_KEYS.map((k) => [k, false])),
      });
      setRoles((prev) => [...prev, created]);
      setSelectedRoleId(created.id);
      setShowAddRole(false);
      setNewRoleName('');
      setNewRoleColor(ROLE_COLORS[0]);
    } catch (err: unknown) {
      setAddError((err as { message?: string })?.message || 'Failed to create role.');
    }
  }

  async function handleDeleteRole(id: string) {
    try {
      await api.delete(`/roles/${id}`);
      setRoles((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (selectedRoleId === id && next.length) setSelectedRoleId(next[0].id);
        return next;
      });
    } catch { /* silent */ }
  }

  async function handleTeamRoleChange(memberId: string, roleId: string) {
    try {
      await api.put(`/team/${memberId}/role`, { role: roleId });
      setTeam((prev) => prev.map((m) => m.id === memberId ? { ...m, role: roleId } : m));
    } catch { /* silent */ }
  }

  const enabledCount = role ? Object.values(role.permissions).filter(Boolean).length : 0;
  const totalCount = PERM_KEYS.length;

  return (
    <PlanGate feature="role_permissions">
    {loading ? (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ) : (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-5">
          <SectionTitle title="Roles & Permissions" subtitle="Configure what each role can access in your organization" />
          <Button onClick={() => setShowAddRole(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        </div>

        {showAddRole && (
          <div className="mb-5 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Create new role</h3>
              <button onClick={() => { setShowAddRole(false); setAddError(''); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Field label="Role Name">
                  <input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Event Leader"
                    className={inputClass}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                  />
                </Field>
              </div>
              <div className="w-48">
                <Field label="Color">
                  <select value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className={selectClass}>
                    {ROLE_COLORS.map((c, i) => (
                      <option key={i} value={c}>{['Blue', 'Amber', 'Green', 'Purple', 'Pink', 'Gray'][i]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button onClick={handleAddRole} disabled={!newRoleName.trim()}>Create</Button>
            </div>
            {addError && <p className="mt-2 text-xs text-danger-600 dark:text-danger-400">{addError}</p>}
          </div>
        )}

        {roles.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">No roles found. Add your first role above.</p>
        ) : (
          <div className="flex gap-4">
            {/* Role list */}
            <div className="w-52 flex-shrink-0 space-y-1">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
                    selectedRoleId === r.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-transparent'
                  }`}
                  onClick={() => setSelectedRoleId(r.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{r.name}</span>
                    {r.isSystem && <span title="System role"><Shield className="w-3 h-3 text-neutral-400 flex-shrink-0" /></span>}
                  </div>
                  {!r.isSystem && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-neutral-400 hover:text-danger-500 dark:hover:text-danger-400 transition-all flex-shrink-0"
                      title="Delete role"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Permission editor */}
            {role && (
              <div className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${role.color}`}>{role.name}</span>
                      {role.isSystem && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> System role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{role.description}</p>
                  </div>
                  <span className="text-xs text-neutral-400">{enabledCount} of {totalCount} permissions</span>
                </div>

                <div className="space-y-1">
                  {PERM_KEYS.map((key) => {
                    const enabled = role.permissions[key] ?? false;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          !role.isSystem ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700' : ''
                        }`}
                        onClick={() => togglePerm(key)}
                      >
                        <span className={`text-sm ${enabled ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`}>
                          {DEFAULT_PERMISSIONS[key]}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          enabled ? 'bg-success-500 border-success-500' : 'border-neutral-300 dark:border-neutral-600'
                        }`}>
                          {enabled && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!role.isSystem && (
                  <div className="mt-4">
                    {saveError && (
                      <p className="mb-2 text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{saveError}
                      </p>
                    )}
                    <SaveBanner saved={saved} onSave={handleSave} saving={saving} />
                  </div>
                )}
                {role.isSystem && (
                  <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500 italic">System roles cannot be modified.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <SectionTitle title="Role Assignment" subtitle="Assign roles to your team members" />
        {team.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No team members found.</p>
        ) : (
          <div className="space-y-3">
            {team.map((member) => {
              const memberRole = roles.find((r) => r.id === member.role);
              return (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400">
                      {member.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{member.name}</p>
                      <p className="text-xs text-neutral-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {memberRole && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${memberRole.color}`}>
                        {memberRole.name}
                      </span>
                    )}
                    <select
                      value={member.role}
                      onChange={(e) => handleTeamRoleChange(member.id, e.target.value)}
                      className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-2 py-1.5 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
    )}
    </PlanGate>
  );
}

// ─── Tab: Branding ────────────────────────────────────────────────────────────


interface BillingData {
  plan: PlanId;
  billingCycle: BillingCycle;
  renewsAt: string;
  subscriptionStatus: string | null;
  billingProvider: string | null;
}

interface Invoice {
  id: string;
  provider: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string;
  invoice_url: string;
  invoice_pdf: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

// ─── Change Plan Modal ────────────────────────────────────────────────────────

function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan,
  currentCycle,
  onSelectPlan,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  currentCycle: BillingCycle;
  onSelectPlan: (plan: PlanId, cycle: BillingCycle) => void;
}) {
  const [cycle, setCycle] = useState<BillingCycle>(currentCycle);

  useEffect(() => {
    if (isOpen) setCycle(currentCycle);
  }, [isOpen, currentCycle]);

  if (!isOpen) return null;

  const plans: PlanId[] = ['discover', 'grow'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Change Plan</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-2 mb-6 mt-4">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-1">Billing:</span>
          {(['monthly', 'yearly'] as BillingCycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                cycle === c
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {c === 'monthly' ? 'Monthly' : (
                <span>Yearly <span className="text-xs opacity-80">save ~{getYearlySavings(PLANS.grow)}%</span></span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((planId) => {
            const p = PLANS[planId];
            const isCurrent = planId === currentPlan;
            const price = cycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
            return (
              <div
                key={planId}
                className={`rounded-xl border-2 p-5 relative ${
                  isCurrent
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
                {p.badge && !isCurrent && (
                  <span className="absolute top-3 right-3 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                    {p.badge}
                  </span>
                )}
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-1">{p.name}</h3>
                <div className="mb-3">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">${price}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">/{cycle === 'yearly' ? 'year' : 'month'}</span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{p.description}</p>
                <ul className="space-y-1.5 mb-5">
                  {[
                    `${p.limits.adminUsers === 'unlimited' ? 'Unlimited' : `Up to ${p.limits.adminUsers}`} admin seats`,
                    'Unlimited volunteers',
                    `${p.limits.storageGb === 'unlimited' ? 'Unlimited' : `${p.limits.storageGb} GB`} storage`,
                    ...(planId === 'grow' ? ['Custom branding & hours tracking', 'Applicant vetting & file library'] : []),
                  ].map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <Check size={12} className="text-success-500 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'outline' : 'primary'}
                  className="w-full"
                  disabled={isCurrent}
                  onClick={() => { if (!isCurrent) onSelectPlan(planId, cycle); }}
                >
                  {isCurrent ? 'Current plan' : planId === 'grow' ? 'Upgrade to Grow' : 'Downgrade to Discover'}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4 text-center">
          Need Enterprise?{' '}
          <a href="mailto:hello@volunteerflow.us" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}

function BillingTab() {
  const { setPlan } = usePlan();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cycleUpdating, setCycleUpdating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ plan: PlanId; billingCycle: BillingCycle } | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<BillingData>('/billing/plan'),
      api.get<Invoice[]>('/billing/invoices'),
    ]).then(([billing, invs]) => {
      setBillingData(billing);
      setPlan(billing.plan);
      setInvoices(invs);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [setPlan]);

  useEffect(() => {
    refresh();
    // Show success message if redirected back from Stripe
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stripe') === 'success') {
      setSuccessMsg('Subscription activated! Your plan is now live.');
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refresh]);

  const plan = billingData ? PLANS[billingData.plan] : null;
  const price = billingData?.billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;
  const isSubscribed = billingData?.subscriptionStatus === 'active';
  const hasPaidPlan = plan?.monthlyPrice != null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

  const switchCycle = async (cycle: BillingCycle) => {
    if (!billingData || billingData.billingCycle === cycle || cycleUpdating) return;
    const prev = billingData;
    setBillingData({ ...billingData, billingCycle: cycle });
    setCycleUpdating(true);
    try {
      await api.put('/billing/plan', { plan: billingData.plan, billingCycle: cycle });
    } catch {
      setBillingData(prev);
    } finally {
      setCycleUpdating(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!billingData) return;
    setCheckoutLoading(true);
    const target = pendingPlan ?? { plan: billingData.plan, billingCycle: billingData.billingCycle };
    try {
      const { url } = await api.post<{ url: string }>('/billing/stripe/checkout', {
        plan: target.plan, billingCycle: target.billingCycle,
      });
      window.location.href = url;
    } catch (err: any) {
      setPaypalError(err?.message || 'Failed to start Stripe checkout');
      setCheckoutLoading(false);
    }
  };

  const handleStripePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>('/billing/stripe/portal', {});
      window.location.href = url;
    } catch (err: any) {
      setPaypalError(err?.message || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handlePayPalApprove = async (data: { subscriptionID: string | null }) => {
    if (!billingData || !data.subscriptionID) return;
    const target = pendingPlan ?? { plan: billingData.plan, billingCycle: billingData.billingCycle };
    try {
      await api.post('/billing/paypal/activate', {
        subscriptionId: data.subscriptionID,
        plan: target.plan,
        billingCycle: target.billingCycle,
      });
      setSuccessMsg('PayPal subscription activated! Your plan is now live.');
      setPendingPlan(null);
      refresh();
    } catch (err: any) {
      setPaypalError(err?.message || 'Failed to activate PayPal subscription');
    }
  };

  const handleSelectPlan = async (newPlan: PlanId, newCycle: BillingCycle) => {
    if (!billingData) return;
    setIsChangePlanOpen(false);
    const planOrder: PlanId[] = ['discover', 'grow', 'enterprise'];
    const isUpgrade = planOrder.indexOf(newPlan) > planOrder.indexOf(billingData.plan as PlanId);
    if (isUpgrade) {
      setPendingPlan({ plan: newPlan, billingCycle: newCycle });
      setIsGatewayOpen(true);
    } else {
      // Downgrade — update via API directly
      try {
        await api.put('/billing/plan', { plan: newPlan, billingCycle: newCycle });
        setSuccessMsg(`Plan changed to ${PLANS[newPlan].name}. Changes take effect at the end of your billing period.`);
        refresh();
      } catch (err: any) {
        setPaypalError(err?.message || 'Failed to change plan');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><span className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl">
          <Check className="w-5 h-5 text-success-600 dark:text-success-400 shrink-0" />
          <p className="text-sm font-medium text-success-800 dark:text-success-200">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-success-600 hover:text-success-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-5">
          <SectionTitle title="Current Plan" />
          <Button size="sm" variant="outline" onClick={() => setIsChangePlanOpen(true)}>Change Plan</Button>
        </div>
        {plan ? (
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{plan.name}</h3>
                  {isSubscribed ? (
                    <span className="text-xs font-bold text-success-600 dark:text-success-400 bg-success-100 dark:bg-success-900/40 px-2 py-0.5 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                      {hasPaidPlan ? 'Unpaid' : 'Free'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {isSubscribed
                    ? `Billed ${billingData!.billingCycle} · Renews ${formatDate(billingData!.renewsAt)}`
                    : plan.description}
                </p>
              </div>
              {price != null ? (
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">${price}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">/{billingData!.billingCycle === 'yearly' ? 'year' : 'month'}</p>
                </div>
              ) : (
                <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Custom pricing</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-primary-200 dark:border-primary-800">
              {([
                ['Admin seats', plan.limits.adminUsers === 'unlimited' ? 'Unlimited' : `Up to ${plan.limits.adminUsers}`],
                ['Volunteers', plan.limits.volunteers === 'unlimited' ? 'Unlimited' : String(plan.limits.volunteers)],
                ['Storage', plan.limits.storageGb === 'unlimited' ? 'Unlimited' : `${plan.limits.storageGb} GB`],
                ['Events', plan.limits.eventsPerMonth === 'unlimited' ? 'Unlimited' : `${plan.limits.eventsPerMonth}/mo`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{k}</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No active plan found.</p>
        )}
      </Card>

      {/* Billing Cycle (only for paid plans) */}
      {hasPaidPlan && (
        <Card className="p-6">
          <SectionTitle title="Billing Cycle" subtitle="Switch between monthly and yearly — yearly saves you money" />
          <div className="flex gap-3 mt-1">
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => {
              const active = billingData?.billingCycle === cycle;
              const savings = cycle === 'yearly' && plan ? getYearlySavings(plan) : 0;
              return (
                <button
                  key={cycle}
                  disabled={cycleUpdating}
                  onClick={() => switchCycle(cycle)}
                  className={`flex-1 max-w-[14rem] p-4 rounded-xl border-2 text-left transition-all ${
                    active
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer'
                  }`}
                >
                  <p className={`text-sm font-semibold ${active ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </p>
                  <p className="text-xs mt-0.5 text-neutral-500 dark:text-neutral-400">
                    {cycle === 'yearly' && savings > 0
                      ? <span className="text-success-600 dark:text-success-400 font-medium">Save {savings}% vs monthly</span>
                      : 'Pay month-to-month'}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Payment / Subscription */}
      {hasPaidPlan && (
        <Card className="p-6">
          <SectionTitle
            title={isSubscribed ? 'Subscription' : 'Subscribe'}
            subtitle={isSubscribed ? 'Manage your payment method and subscription' : 'Choose a payment method to activate your plan'}
          />

          {paypalError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />{paypalError}
              <button onClick={() => setPaypalError('')} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {isSubscribed ? (
            /* ── Manage existing subscription ── */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-success-600 dark:text-success-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Subscription active</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    via {billingData?.billingProvider === 'paypal' ? 'PayPal' : 'Stripe'} · renews {formatDate(billingData!.renewsAt)}
                  </p>
                </div>
              </div>

              {billingData?.billingProvider !== 'paypal' && (
                <Button
                  variant="outline"
                  onClick={handleStripePortal}
                  disabled={portalLoading}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {portalLoading ? 'Opening…' : 'Manage billing & payment method'}
                </Button>
              )}
            </div>
          ) : (
            /* ── Subscribe UI ── */
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Activate your <strong>{plan?.name}</strong> plan for{' '}
                <strong>${price}/{billingData?.billingCycle === 'yearly' ? 'year' : 'month'}</strong>.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsGatewayOpen(true)}
                className="w-full sm:w-auto"
              >
                Subscribe
              </Button>
              <PaymentGatewayModal
                isOpen={isGatewayOpen}
                onClose={() => { setIsGatewayOpen(false); setPendingPlan(null); }}
                planName={pendingPlan ? PLANS[pendingPlan.plan].name : (plan?.name ?? '')}
                billingCycle={pendingPlan?.billingCycle ?? billingData?.billingCycle ?? 'monthly'}
                price={
                  pendingPlan
                    ? (pendingPlan.billingCycle === 'yearly' ? PLANS[pendingPlan.plan].yearlyPrice : PLANS[pendingPlan.plan].monthlyPrice) ?? 0
                    : price ?? 0
                }
                plan={pendingPlan?.plan ?? billingData?.plan ?? ''}
                onStripeClick={handleStripeCheckout}
                onPayPalApprove={handlePayPalApprove}
                onPayPalError={() => setPaypalError('PayPal encountered an error. Please try again or use card payment.')}
                stripeLoading={checkoutLoading}
              />
            </div>
          )}
        </Card>
      )}

      <ChangePlanModal
        isOpen={isChangePlanOpen}
        onClose={() => setIsChangePlanOpen(false)}
        currentPlan={(billingData?.plan ?? 'discover') as PlanId}
        currentCycle={billingData?.billingCycle ?? 'monthly'}
        onSelectPlan={handleSelectPlan}
      />

      {/* Billing History */}
      <Card className="p-6">
        <SectionTitle title="Billing History" />
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No invoices yet</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Your billing history will appear here after your first charge</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  {['Date', 'Description', 'Amount', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{inv.description || `${inv.provider === 'paypal' ? 'PayPal' : 'Stripe'} subscription`}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">{formatAmount(inv.amount_cents, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {inv.status === 'paid' && <Check className="w-3 h-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                          <ExternalLink className="w-3 h-3" />View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Data ────────────────────────────────────────────────────────────────

interface RetentionSettings { volunteers: string; events: string; applications: string; }

type DangerAction = 'applications' | 'account' | null;

const EXPORT_TYPES = [
  { type: 'volunteers',   label: 'Volunteer Data',   desc: 'All volunteer profiles, skills, and contact info', format: 'CSV' },
  { type: 'events',       label: 'Event History',    desc: 'All events, shifts, and participation records',    format: 'CSV' },
  { type: 'applications', label: 'Applications',     desc: 'All submissions joined with volunteer and event',  format: 'CSV' },
  { type: 'hours',        label: 'Hours Logs',       desc: 'Volunteer hours audit — sorted by total hours',   format: 'CSV' },
  { type: 'full',         label: 'Full Data Export', desc: 'Everything — volunteers, events, applications, members, training', format: 'JSON' },
] as const;

const RETENTION_OPTIONS = [
  { value: '6',       label: '6 months' },
  { value: '12',      label: '12 months' },
  { value: '24',      label: '24 months' },
  { value: '36',      label: '36 months' },
  { value: 'forever', label: 'Keep forever' },
];

function DataTab() {
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');

  const [retention, setRetention] = useState<RetentionSettings>({ volunteers: '12', events: '36', applications: '24' });
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionSaved, setRetentionSaved] = useState(false);

  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [dangerConfirm, setDangerConfirm] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerError, setDangerError] = useState('');

  useEffect(() => {
    api.get<RetentionSettings>('/data/retention')
      .then(setRetention)
      .catch(() => {})
      .finally(() => setRetentionLoading(false));
  }, []);

  const handleExport = async (type: string) => {
    setExportingType(type);
    setExportError('');
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('vf_token') : null;
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
      const res = await fetch(`${base}/data/export?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const ext = type === 'full' ? 'json' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err?.message || 'Export failed. Please try again.');
    } finally {
      setExportingType(null);
    }
  };

  const saveRetention = async () => {
    setRetentionSaving(true);
    try {
      await api.put('/data/retention', retention);
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2500);
    } catch { /* silent */ } finally {
      setRetentionSaving(false);
    }
  };

  const openDanger = (action: DangerAction) => {
    setDangerAction(action);
    setDangerConfirm('');
    setDangerError('');
  };

  const executeDanger = async () => {
    if (!dangerAction) return;
    const required = dangerAction === 'account' ? 'DELETE ORGANIZATION' : 'DELETE';
    if (dangerConfirm !== required) {
      setDangerError(`Type "${required}" exactly to confirm`);
      return;
    }
    setDangerLoading(true);
    setDangerError('');
    try {
      await api.delete(`/data/${dangerAction}`);
      setDangerAction(null);
      if (dangerAction === 'account') {
        // Wipe local state and redirect to auth
        sessionStorage.removeItem('vf_token');
        sessionStorage.removeItem('vf_user');
        window.location.href = '/landing';
      }
    } catch (err: any) {
      setDangerError(err?.message || 'Action failed. Please try again.');
    } finally {
      setDangerLoading(false);
    }
  };

  const selectClass = 'text-sm px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 outline-none';

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <Card className="p-6">
        <SectionTitle title="Export Data" subtitle="Download your organization's data — files are generated fresh on demand" />
        {exportError && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />{exportError}
          </div>
        )}
        <div className="space-y-2">
          {EXPORT_TYPES.map(({ type, label, desc, format }) => {
            const isExporting = exportingType === type;
            const anyExporting = exportingType !== null;
            return (
              <div key={type} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{desc} · <span className="font-medium">{format}</span></p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={anyExporting}
                  onClick={() => handleExport(type)}
                >
                  {isExporting ? (
                    <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />Exporting…</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5 mr-1.5" />Export</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data Retention */}
      <Card className="p-6">
        <SectionTitle title="Data Retention" subtitle="Control how long historical records are kept before auto-deletion" />
        {retentionLoading ? (
          <div className="flex justify-center py-6"><span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-4 mt-1">
              {([
                ['volunteers',   'Volunteer records',   'Inactive volunteer profiles and contact info'],
                ['events',       'Completed event data','Event details and participation logs'],
                ['applications', 'Application records', 'Submitted forms and approval decisions'],
              ] as [keyof RetentionSettings, string, string][]).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
                  </div>
                  <select
                    className={selectClass}
                    value={retention[key]}
                    onChange={(e) => setRetention(prev => ({ ...prev, [key]: e.target.value }))}
                  >
                    {RETENTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" variant="primary" onClick={saveRetention} disabled={retentionSaving}>
                {retentionSaving ? 'Saving…' : retentionSaved ? <><Check className="w-3.5 h-3.5 mr-1" />Saved</> : 'Save retention settings'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-2 border-danger-200 dark:border-danger-900">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-danger-700 dark:text-danger-400">Danger Zone</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">These actions are permanent and cannot be undone.</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Reset applications */}
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-900">
            {dangerAction === 'applications' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Confirm: Reset all application records?</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">This deletes every submitted application. Volunteers and events are preserved.</p>
                {dangerError && <p className="text-xs text-danger-600 dark:text-danger-400">{dangerError}</p>}
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Type <strong>DELETE</strong> to confirm</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dangerConfirm}
                    onChange={(e) => setDangerConfirm(e.target.value)}
                    placeholder="DELETE"
                    className={inputClass + ' max-w-[12rem]'}
                    autoFocus
                  />
                  <Button size="sm" variant="danger" onClick={executeDanger} disabled={dangerLoading}>
                    {dangerLoading ? 'Deleting…' : 'Confirm reset'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDangerAction(null)} disabled={dangerLoading}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Reset all application records</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Permanently deletes all submitted applications and vetting data</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => openDanger('applications')}>Reset Applications</Button>
              </div>
            )}
          </div>

          {/* Delete org */}
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-900">
            {dangerAction === 'account' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Confirm: Delete all organization data?</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Wipes volunteers, events, applications, files, training records, and resets your account. You will be logged out.</p>
                {dangerError && <p className="text-xs text-danger-600 dark:text-danger-400">{dangerError}</p>}
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Type <strong>DELETE ORGANIZATION</strong> to confirm</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={dangerConfirm}
                    onChange={(e) => setDangerConfirm(e.target.value)}
                    placeholder="DELETE ORGANIZATION"
                    className={inputClass + ' max-w-[16rem]'}
                    autoFocus
                  />
                  <Button size="sm" variant="danger" onClick={executeDanger} disabled={dangerLoading}>
                    {dangerLoading ? 'Deleting…' : 'Confirm delete'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDangerAction(null)} disabled={dangerLoading}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Delete organization</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Permanently removes all volunteers, events, applications, files, and training data</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => openDanger('account')}>Delete Organization</Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Messaging ───────────────────────────────────────────────────────────

interface OrgSettings {
  emailFromName: string;
  emailFromAddress: string;
  smsFromName: string;
}

function MessagingTab() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<OrgSettings>({
    emailFromName: '',
    emailFromAddress: '',
    smsFromName: '',
  });

  useEffect(() => {
    api.get<OrgSettings>('/settings')
      .then((data) => setForm({
        emailFromName: data.emailFromName || '',
        emailFromAddress: data.emailFromAddress || '',
        smsFromName: data.smsFromName || '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof OrgSettings) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const updated = await api.put<OrgSettings>('/messaging', form);
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || 'Failed to save messaging settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email sender */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Email Sender Identity</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              How your organisation appears in the "From" field of outgoing emails
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Sender Name" hint='The display name recipients see, e.g. "Springfield Animal Shelter"'>
            <input
              type="text"
              value={form.emailFromName}
              onChange={(e) => set('emailFromName')(e.target.value)}
              placeholder="Your Organisation Name"
              className={inputClass}
              maxLength={100}
            />
          </Field>

          <Field
            label="Sender Email Address"
            hint="Auto-generated from your sender name — powered by volunteerflow.us. No domain setup required."
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 font-mono select-all">
              {form.emailFromAddress || 'yourorg@volunteerflow.us'}
            </div>
          </Field>
        </div>
      </Card>

      {/* SMS sender */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">SMS Sender Identity</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Alphanumeric sender ID shown instead of a phone number (where supported)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field
            label="SMS Sender Name"
            hint="Max 11 characters, letters and numbers only. Not supported in the US or Canada — those regions always show your Twilio number."
          >
            <input
              type="text"
              value={form.smsFromName}
              onChange={(e) => set('smsFromName')(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11))}
              placeholder="MyOrg"
              className={inputClass}
              maxLength={11}
            />
          </Field>
          {form.smsFromName && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Preview: recipients in supported regions will see <strong>{form.smsFromName}</strong> as the sender.
            </p>
          )}
        </div>
      </Card>

      {saveError && (
        <div className="flex items-center gap-2 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}
      <SaveBanner saved={saved} onSave={handleSave} saving={saving} />
    </div>
  );
}

// ─── Tab: Integrations ────────────────────────────────────────────────────────

const CHECKR_PACKAGES = [
  { value: 'tasker_standard',   label: 'Tasker Standard — SSN trace, sex offender, national criminal' },
  { value: 'tasker_pro',        label: 'Tasker Pro — Standard + employment verification' },
  { value: 'driver_standard',   label: 'Driver Standard — Includes MVR check' },
  { value: 'volunteer_basic',   label: 'Volunteer Basic — Identity + national criminal' },
];

// ─── Locations Tab ────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  address: string;
  color: string;
  description: string;
  active: boolean;
}

const LOCATION_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
];

const BLANK_LOC = { name: '', address: '', color: '#6366f1', description: '' };

function LocationsTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(BLANK_LOC);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    api.get<{ data: Location[] }>('/locations')
      .then((r) => setLocations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm(BLANK_LOC); setError(''); setShowForm(true); };
  const openEdit = (loc: Location) => { setEditing(loc); setForm({ name: loc.name, address: loc.address, color: loc.color, description: loc.description }); setError(''); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditing(null); setError(''); };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const r = await api.put<{ data: Location }>(`/locations/${editing.id}`, form);
        setLocations((p) => p.map((l) => l.id === editing.id ? r.data : l));
      } else {
        const r = await api.post<{ data: Location }>('/locations', form);
        setLocations((p) => [...p, r.data]);
      }
      cancel();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (loc: Location) => {
    setDeleteError('');
    try {
      await api.delete(`/locations/${loc.id}`);
      setLocations((p) => p.filter((l) => l.id !== loc.id));
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete location');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Create branches or sites within your organization. Assign volunteers and events to locations, and optionally restrict staff members to only see their location&apos;s data.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Location
        </Button>
      </div>

      {deleteError && (
        <div className="flex items-start gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl text-sm text-danger-700 dark:text-danger-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {deleteError}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-2 border-primary-200 dark:border-primary-800 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {editing ? 'Edit Location' : 'New Location'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Downtown Office"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City, ST"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-neutral-400 dark:ring-neutral-500 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Location'}</Button>
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No locations yet. Add your first branch or site.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <Card key={loc.id} className="flex items-center gap-4">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: loc.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{loc.name}</p>
                  {!loc.active && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">Inactive</span>
                  )}
                </div>
                {loc.address && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{loc.address}</p>}
                {loc.description && <p className="text-xs text-neutral-400 truncate">{loc.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(loc)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => remove(loc)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5">
        <p className="font-semibold text-neutral-700 dark:text-neutral-300">How locations work</p>
        <p>1. Create locations here for each branch, site, or office.</p>
        <p>2. Assign volunteers and events to a location when creating or editing them.</p>
        <p>3. In <strong>Team</strong> settings, assign a staff member to a location and enable <strong>Location Restricted</strong> — they will only see data for that location.</p>
        <p>4. Admins can filter the dashboard to any location using the switcher in the sidebar.</p>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [showKey, setShowKey]       = useState(false);
  const [keyIsSet, setKeyIsSet]     = useState(false);
  const [form, setForm] = useState({ checkrApiKey: '', checkrPackage: 'tasker_standard' });

  useEffect(() => {
    api.get<{ checkrApiKeySet: boolean; checkrPackage: string }>('/settings')
      .then((data) => {
        setKeyIsSet(!!data.checkrApiKeySet);
        setForm((f) => ({ ...f, checkrPackage: data.checkrPackage || 'tasker_standard' }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put('/integrations', form);
      if (form.checkrApiKey) setKeyIsSet(true);
      setForm((f) => ({ ...f, checkrApiKey: '' }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Checkr */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Checkr Background Checks</h2>
              {keyIsSet && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Run FCRA-compliant background checks on volunteers directly from their profile. Volunteers receive a secure invite link and enter their own information — you never handle SSNs.
            </p>
          </div>
          <a
            href="https://checkr.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
          >
            Get API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          <Field
            label={keyIsSet ? 'Replace API Key' : 'API Key'}
            hint={keyIsSet ? 'A key is already saved. Enter a new one to replace it, or leave blank to keep the current key.' : 'Find this in your Checkr Dashboard → Developer → API keys. Use a Live key for production.'}
          >
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={form.checkrApiKey}
                onChange={(e) => setForm((f) => ({ ...f, checkrApiKey: e.target.value }))}
                placeholder={keyIsSet ? '••••••••••••••••••••••••' : 'sk_live_...'}
                className={inputClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Default Package" hint="The screening package sent to volunteers when you initiate a check. You can override this per-volunteer.">
            <select
              value={form.checkrPackage}
              onChange={(e) => setForm((f) => ({ ...f, checkrPackage: e.target.value }))}
              className={selectClass}
            >
              {CHECKR_PACKAGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>

          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4 text-sm text-neutral-600 dark:text-neutral-400 space-y-1.5">
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>You click "Run Background Check" on a volunteer's profile</li>
              <li>The volunteer receives an email from Checkr with a secure link</li>
              <li>They enter their own SSN, DOB, and address on Checkr's hosted page</li>
              <li>Checkr runs the check and sends the result back via webhook</li>
              <li>Status updates automatically on the volunteer's profile: <strong>Clear</strong>, <strong>Consider</strong>, or <strong>Suspended</strong></li>
            </ol>
          </div>

          {saveError && (
            <p className="text-sm text-danger-600 dark:text-danger-400">{saveError}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving ? 'Saving…' : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Coming soon placeholder */}
      <Card className="p-6 opacity-60">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
            <Puzzle className="w-5 h-5 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">More integrations coming soon</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Salesforce, Blackbaud, Zapier, and more — email us at integrations@volunteerflow.com to request one</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: SettingsTab; label: string; icon: typeof Building2; featureKey?: FeatureKey }[] = [
  { id: 'organization', label: 'Organization',  icon: Building2     },
  { id: 'team',         label: 'Team',           icon: Users         },
  { id: 'roles',        label: 'Roles & Perms',  icon: Shield        },
  { id: 'locations',    label: 'Locations',      icon: MapPin,        featureKey: 'locations' },
  { id: 'notifications',label: 'Notifications',  icon: Bell          },
  { id: 'messaging',    label: 'Messaging',      icon: Mail          },
  { id: 'appearance',   label: 'Appearance & Branding', icon: Palette   },
  { id: 'security',     label: 'Security',       icon: Shield        },
  { id: 'billing',      label: 'Billing',        icon: CreditCard    },
  { id: 'data',         label: 'Data & Privacy', icon: Database      },
  { id: 'integrations', label: 'Integrations',   icon: Puzzle        },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('organization');
  const { can } = usePlan();

  const renderTab = () => {
    switch (activeTab) {
      case 'organization':  return <OrganizationTab />;
      case 'team':          return <TeamTab />;
      case 'roles':         return <RolesTab />;
      case 'locations':     return <LocationsTab />;
      case 'notifications': return <NotificationsTab />;
      case 'messaging':     return <MessagingTab />;
      case 'appearance':    return <AppearanceTab />;
      case 'security':      return <SecurityTab />;
      case 'billing':       return <BillingTab />;
      case 'data':          return <DataTab />;
      case 'integrations':  return <IntegrationsTab />;
    }
  };

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <Layout>
      <Head><title>Settings — VolunteerFlow</title></Head>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Manage your organization, team, and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Nav */}
          <aside className="w-52 flex-shrink-0">
            <nav className="space-y-1 sticky top-20">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isLocked = !!tab.featureKey && !can(tab.featureKey);
                if (isLocked) {
                  return (
                    <div
                      key={tab.id}
                      title="Upgrade to Enterprise to unlock this feature"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 dark:text-neutral-600 cursor-not-allowed select-none"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {tab.label}
                      <Lock className="w-3 h-3 ml-auto flex-shrink-0" />
                    </div>
                  );
                }
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                    {tab.label}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary-500" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <activeTabMeta.icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{activeTabMeta.label}</h2>
            </div>
            {renderTab()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
