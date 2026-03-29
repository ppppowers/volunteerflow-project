export type PlanId = 'discover' | 'grow' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type AddOnId =
  | 'custom_branding'
  | 'advanced_tracking'
  | 'team_groups'
  | 'verification_workflows'
  | 'api_access'
  | 'extra_admins';

export type FeatureKey =
  | 'admin_users'
  | 'volunteers'
  | 'events'
  | 'email_notifications'
  | 'sms_messaging'
  | 'sms_credits'
  | 'automated_reminders'
  | 'message_templates'
  | 'csv_export'
  | 'mobile_app'
  | 'event_notifications'
  | 'custom_branding'
  | 'group_registration'
  | 'applicant_vetting'
  | 'hours_tracking'
  | 'file_attachments'
  | 'file_library'
  | 'data_import'
  | 'role_permissions'
  | 'leader_user_type'
  | 'job_notifications'
  | 'shift_permissions'
  | 'credentials_badges'
  | 'api_access'
  | 'white_labeling'
  | 'sso_saml'
  | 'audit_logs'
  | 'priority_support'
  | 'custom_integrations'
  | 'sla_guarantee'
  | 'qr_codes'
  | 'qr_analytics'
  | 'locations';

export type FeatureValue = boolean | number | string;

export interface PlanFeatures {
  admin_users: number | 'unlimited';
  volunteers: number | 'unlimited';
  events: number | 'unlimited';
  email_notifications: boolean;
  sms_messaging: boolean;
  sms_credits: number | 'unlimited';
  automated_reminders: boolean;
  message_templates: boolean;
  csv_export: boolean;
  mobile_app: boolean;
  event_notifications: boolean;
  custom_branding: boolean;
  group_registration: boolean;
  applicant_vetting: boolean;
  hours_tracking: boolean;
  file_attachments: boolean;
  file_library: boolean;
  data_import: boolean;
  role_permissions: boolean;
  leader_user_type: boolean;
  job_notifications: boolean;
  shift_permissions: boolean;
  credentials_badges: boolean;
  api_access: boolean;
  white_labeling: boolean;
  sso_saml: boolean;
  audit_logs: boolean;
  priority_support: boolean;
  custom_integrations: boolean;
  sla_guarantee: boolean;
  qr_codes: boolean;
  qr_analytics: boolean;
  locations: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlighted: boolean;
  badge?: string;
  ctaLabel: string;
  ctaVariant: 'outline' | 'primary' | 'dark';
  features: PlanFeatures;
  limits: {
    adminUsers: number | 'unlimited';
    volunteers: number | 'unlimited';
    eventsPerMonth: number | 'unlimited';
    storageGb: number | 'unlimited';
  };
}

export interface AddOn {
  id: AddOnId;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  availableFor: PlanId[];
  lockedAbove?: PlanId;
  featureKey: FeatureKey;
  tooltip: string;
}

// ─── Feature display groups for the comparison table ──────────────────────────

export interface FeatureGroup {
  title: string;
  features: Array<{
    key: FeatureKey;
    label: string;
    tooltip: string;
    formatValue?: (v: FeatureValue) => string;
  }>;
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Platform Limits',
    features: [
      {
        key: 'admin_users',
        label: 'Admin seats',
        tooltip: 'Number of team members who can access the management dashboard',
        formatValue: (v) => (v === 'unlimited' ? 'Unlimited' : `Up to ${v}`),
      },
      {
        key: 'volunteers',
        label: 'Active volunteers',
        tooltip: 'Total number of volunteer profiles you can manage',
        formatValue: (v) => (v === 'unlimited' ? 'Unlimited' : `${v}`),
      },
      {
        key: 'events',
        label: 'Events',
        tooltip: 'Number of active events you can run',
        formatValue: (v) => (v === 'unlimited' ? 'Unlimited' : `${v} events`),
      },
      {
        key: 'sms_credits',
        label: 'SMS credits / year',
        tooltip: 'Annual pool of SMS messages for reminders and notifications',
        formatValue: (v) =>
          v === 'unlimited' ? 'Unlimited' : `${Number(v).toLocaleString()} SMS`,
      },
    ],
  },
  {
    title: 'Core Features',
    features: [
      { key: 'email_notifications', label: 'Email notifications', tooltip: 'Send automated and manual emails to volunteers' },
      { key: 'sms_messaging', label: 'SMS messaging', tooltip: 'Send SMS messages and reminders to volunteers' },
      { key: 'automated_reminders', label: 'Automated reminders', tooltip: 'Scheduled reminders for upcoming events and tasks' },
      { key: 'message_templates', label: 'Message templates', tooltip: 'Reusable email and SMS templates for your communications' },
      { key: 'csv_export', label: 'CSV data export', tooltip: 'Export volunteer and event data to spreadsheets' },
      { key: 'mobile_app', label: 'Mobile-friendly', tooltip: 'Works on any phone or tablet — no app download needed' },
      { key: 'event_notifications', label: 'Event notifications', tooltip: 'Automatic alerts when events are created or updated' },
      { key: 'qr_codes', label: 'QR codes', tooltip: 'Generate QR codes for events and volunteer sign-up links' },
    ],
  },
  {
    title: 'Grow Features',
    features: [
      { key: 'custom_branding', label: 'Custom design & branding', tooltip: 'Apply your logo, brand colors, and custom domain to the volunteer portal' },
      { key: 'group_registration', label: 'Group registration', tooltip: 'Allow volunteers to sign up as a group for events' },
      { key: 'applicant_vetting', label: 'Applicant vetting', tooltip: 'Multi-step screening and approval workflows for new volunteers' },
      { key: 'hours_tracking', label: 'Hours & attendance tracking', tooltip: 'Track and report volunteer hours and event attendance automatically' },
      { key: 'file_attachments', label: 'Email attachments', tooltip: 'Attach files and documents to emails sent to volunteers' },
      { key: 'file_library', label: 'File library', tooltip: 'Central repository for documents, waivers, and training materials' },
      { key: 'data_import', label: 'Import data', tooltip: 'Bulk import volunteers, past events, and hours from CSV or Excel' },
      { key: 'role_permissions', label: 'Job permissions', tooltip: 'Assign granular role-based access to coordinators and staff' },
      { key: 'qr_analytics', label: 'QR code tracking & analytics', tooltip: 'See scan counts, check-in rates, and attendance trends per event' },
    ],
  },
  {
    title: 'Enterprise Power',
    features: [
      { key: 'locations', label: 'Multi-location management', tooltip: 'Separate your volunteers, events, and staff across multiple locations or sites' },
      { key: 'leader_user_type', label: 'Leader / captain user type', tooltip: 'Designate volunteer leaders and captains with elevated permissions' },
      { key: 'job_notifications', label: 'Job notifications', tooltip: 'Notify staff and leaders when specific roles are filled or vacated' },
      { key: 'shift_permissions', label: 'Shift permissions', tooltip: 'Fine-grained controls over who can create, edit, or close shifts' },
      { key: 'credentials_badges', label: 'Credentials & badges', tooltip: 'Issue digital credentials and achievement badges to volunteers' },
      { key: 'api_access', label: 'Full REST API access', tooltip: 'Programmatic access to all data with OAuth2 and webhook support' },
      { key: 'white_labeling', label: 'White-label experience', tooltip: 'Remove all VolunteerFlow branding — fully co-branded as your product' },
      { key: 'sso_saml', label: 'SSO / SAML integration', tooltip: 'Single sign-on via Okta, Azure AD, Google Workspace, or custom SAML IdP' },
      { key: 'audit_logs', label: 'Audit logs & compliance', tooltip: 'Immutable activity log for every action — required for HIPAA / SOC 2' },
      { key: 'custom_integrations', label: 'Custom integrations', tooltip: 'Dedicated engineering support to connect your CRM, HRIS, or database' },
      { key: 'sla_guarantee', label: '99.9% uptime SLA', tooltip: 'Contractual uptime guarantee with incident credit and dedicated response' },
      { key: 'priority_support', label: 'Priority support + CSM', tooltip: 'Dedicated Customer Success Manager plus < 2hr response SLA' },
    ],
  },
];

// ─── Plan Definitions ──────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, Plan> = {
  discover: {
    id: 'discover',
    name: 'Discover',
    tagline: '$600 / year',
    description: 'Everything you need to launch your volunteer program and start making an impact.',
    monthlyPrice: 59,
    yearlyPrice: 600,
    highlighted: false,
    ctaLabel: 'Start free trial',
    ctaVariant: 'outline',
    limits: {
      adminUsers: 5,
      volunteers: 'unlimited',
      eventsPerMonth: 'unlimited',
      storageGb: 5,
    },
    features: {
      admin_users: 5,
      volunteers: 'unlimited',
      events: 'unlimited',
      email_notifications: true,
      sms_messaging: true,
      sms_credits: 10000,
      automated_reminders: true,
      message_templates: true,
      csv_export: true,
      mobile_app: true,
      event_notifications: true,
      custom_branding: false,
      group_registration: false,
      applicant_vetting: false,
      hours_tracking: false,
      file_attachments: false,
      file_library: false,
      data_import: false,
      role_permissions: false,
      leader_user_type: false,
      job_notifications: false,
      shift_permissions: false,
      credentials_badges: false,
      api_access: false,
      white_labeling: false,
      sso_saml: false,
      audit_logs: false,
      priority_support: false,
      custom_integrations: false,
      sla_guarantee: false,
      qr_codes: true,
      qr_analytics: false,
      locations: false,
    },
  },

  grow: {
    id: 'grow',
    name: 'Grow',
    tagline: '$2,500 / year',
    description: 'Advanced tools for growing nonprofits ready to professionalize their volunteer operations.',
    monthlyPrice: 249,
    yearlyPrice: 2500,
    highlighted: true,
    badge: 'Most Popular',
    ctaLabel: 'Start free trial',
    ctaVariant: 'primary',
    limits: {
      adminUsers: 15,
      volunteers: 'unlimited',
      eventsPerMonth: 'unlimited',
      storageGb: 50,
    },
    features: {
      admin_users: 15,
      volunteers: 'unlimited',
      events: 'unlimited',
      email_notifications: true,
      sms_messaging: true,
      sms_credits: 50000,
      automated_reminders: true,
      message_templates: true,
      csv_export: true,
      mobile_app: true,
      event_notifications: true,
      custom_branding: true,
      group_registration: true,
      applicant_vetting: true,
      hours_tracking: true,
      file_attachments: true,
      file_library: true,
      data_import: true,
      role_permissions: true,
      leader_user_type: false,
      job_notifications: false,
      shift_permissions: false,
      credentials_badges: false,
      api_access: false,
      white_labeling: false,
      sso_saml: false,
      audit_logs: false,
      priority_support: false,
      custom_integrations: false,
      sla_guarantee: false,
      qr_codes: true,
      qr_analytics: true,
      locations: false,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large organizations',
    description: 'Maximum power, security, and customization for large-scale volunteer programs.',
    monthlyPrice: null,
    yearlyPrice: null,
    highlighted: false,
    ctaLabel: 'Contact sales',
    ctaVariant: 'dark',
    limits: {
      adminUsers: 50,
      volunteers: 'unlimited',
      eventsPerMonth: 'unlimited',
      storageGb: 'unlimited',
    },
    features: {
      admin_users: 50,
      volunteers: 'unlimited',
      events: 'unlimited',
      email_notifications: true,
      sms_messaging: true,
      sms_credits: 100000,
      automated_reminders: true,
      message_templates: true,
      csv_export: true,
      mobile_app: true,
      event_notifications: true,
      custom_branding: true,
      group_registration: true,
      applicant_vetting: true,
      hours_tracking: true,
      file_attachments: true,
      file_library: true,
      data_import: true,
      role_permissions: true,
      leader_user_type: true,
      job_notifications: true,
      shift_permissions: true,
      credentials_badges: true,
      api_access: true,
      white_labeling: true,
      sso_saml: true,
      audit_logs: true,
      priority_support: true,
      custom_integrations: true,
      sla_guarantee: true,
      qr_codes: true,
      qr_analytics: true,
      locations: true,
    },
  },
};

// ─── Add-Ons ──────────────────────────────────────────────────────────────────

export const ADD_ONS: Record<AddOnId, AddOn> = {
  custom_branding: {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your logo, brand colors, and custom domain to the volunteer portal.',
    monthlyPrice: 19,
    yearlyPrice: 14,
    availableFor: ['discover'],
    lockedAbove: 'grow',
    featureKey: 'custom_branding',
    tooltip: 'Included free in Grow and Enterprise plans',
  },
  advanced_tracking: {
    id: 'advanced_tracking',
    name: 'Hours & Attendance Tracking',
    description: 'Track volunteer hours, attendance, and generate detailed reports.',
    monthlyPrice: 29,
    yearlyPrice: 22,
    availableFor: ['discover'],
    lockedAbove: 'grow',
    featureKey: 'hours_tracking',
    tooltip: 'Included free in Grow and Enterprise plans',
  },
  team_groups: {
    id: 'team_groups',
    name: 'Group Registration',
    description: 'Allow volunteers to sign up as groups and manage team-based events.',
    monthlyPrice: 19,
    yearlyPrice: 14,
    availableFor: ['discover'],
    lockedAbove: 'grow',
    featureKey: 'group_registration',
    tooltip: 'Included free in Grow and Enterprise plans',
  },
  verification_workflows: {
    id: 'verification_workflows',
    name: 'Applicant Vetting',
    description: 'Build multi-step screening and approval flows for volunteer onboarding.',
    monthlyPrice: 25,
    yearlyPrice: 19,
    availableFor: ['discover'],
    lockedAbove: 'grow',
    featureKey: 'applicant_vetting',
    tooltip: 'Included free in Grow and Enterprise plans',
  },
  api_access: {
    id: 'api_access',
    name: 'API Access',
    description: 'Integrate with your existing tools using our full REST API and webhooks.',
    monthlyPrice: 49,
    yearlyPrice: 39,
    availableFor: ['grow'],
    lockedAbove: 'enterprise',
    featureKey: 'api_access',
    tooltip: 'Included free in Enterprise plan — or available as an add-on for Grow',
  },
  extra_admins: {
    id: 'extra_admins',
    name: 'Extra Admin Seats',
    description: 'Add 5 additional admin seats beyond your plan limit.',
    monthlyPrice: 15,
    yearlyPrice: 12,
    availableFor: ['discover', 'grow'],
    featureKey: 'admin_users',
    tooltip: 'Each pack adds 5 admin seats. Enterprise has 50 seats included.',
  },
};

// ─── Feature Gate Logic ────────────────────────────────────────────────────────

export function getPlanFeatures(planId: PlanId): PlanFeatures {
  return PLANS[planId].features;
}

export function hasFeature(planId: PlanId, feature: FeatureKey): boolean {
  const features = getPlanFeatures(planId);
  const value = features[feature as keyof PlanFeatures];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (value === 'unlimited') return true;
  return false;
}

export function getFeatureLimit(planId: PlanId, feature: FeatureKey): FeatureValue {
  return getPlanFeatures(planId)[feature as keyof PlanFeatures];
}

export function getUpgradePath(currentPlan: PlanId, requiredFeature: FeatureKey): PlanId | null {
  const order: PlanId[] = ['discover', 'grow', 'enterprise'];
  const currentIndex = order.indexOf(currentPlan);
  for (let i = currentIndex + 1; i < order.length; i++) {
    if (hasFeature(order[i], requiredFeature)) return order[i];
  }
  return null;
}

export function canPurchaseAddOn(planId: PlanId, addOnId: AddOnId): boolean {
  const addOn = ADD_ONS[addOnId];
  return addOn.availableFor.includes(planId);
}

export function getYearlySavings(plan: Plan): number {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
  // Annual price vs paying monthly for 12 months
  const monthlyAnnual = plan.monthlyPrice * 12;
  return Math.round((1 - plan.yearlyPrice / monthlyAnnual) * 100);
}
