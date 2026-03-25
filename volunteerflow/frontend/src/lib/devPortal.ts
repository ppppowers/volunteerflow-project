// ─── Dev Portal — central data layer ─────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export type DevRole = 'super_admin' | 'admin' | 'dev';

export type DevSection =
  | 'dashboard'
  | 'signup'
  | 'users'
  | 'flags'
  | 'modules'
  | 'logs'
  | 'api'
  | 'config'
  | 'health';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const DEV_STORE = {
  ROLE: 'vf_role',
  FEATURE_FLAGS: 'vf_feature_flags',
  DEV_LOGS: 'vf_dev_logs',
  DEV_CONFIG: 'vf_dev_config',
  MODULES: 'vf_modules',
  USERS: 'vf_dev_users',
} as const;

// ─── Role / Auth ──────────────────────────────────────────────────────────────

export function getDevRole(): DevRole | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(DEV_STORE.ROLE) as DevRole) ?? null;
}

export function setDevRole(role: DevRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.ROLE, role);
}

export function isDevAuthed(): boolean {
  const role = getDevRole();
  return role === 'super_admin' || role === 'admin' || role === 'dev';
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export type FlagCategory = 'core' | 'beta' | 'experimental' | 'deprecated';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: FlagCategory;
  enabled: boolean;
}

export const DEFAULT_FLAGS: FeatureFlag[] = [
  { id: 'volunteer_portal',    name: 'Volunteer Portal',       description: 'Self-service portal for volunteers',          category: 'core',         enabled: true },
  { id: 'member_portal',       name: 'Member Portal',          description: 'Self-service portal for members',             category: 'core',         enabled: true },
  { id: 'employee_portal',     name: 'Employee Portal',        description: 'Staff self-service portal',                   category: 'core',         enabled: true },
  { id: 'training',            name: 'Training & Courses',     description: 'Course builder and completion tracking',      category: 'core',         enabled: true },
  { id: 'vetting',             name: 'Applicant Vetting',      description: 'Background check and vetting workflow',       category: 'beta',         enabled: true },
  { id: 'hours_tracking',      name: 'Hours Tracking',         description: 'Volunteer time and attendance logs',          category: 'core',         enabled: true },
  { id: 'badges',              name: 'Badge System',           description: 'Achievement and certification badges',         category: 'beta',         enabled: true },
  { id: 'file_library',        name: 'File Library',           description: 'Document storage and sharing',                category: 'core',         enabled: true },
  { id: 'messaging',           name: 'Messaging & Alerts',     description: 'Internal comms and sign-in notifications',    category: 'core',         enabled: true },
  { id: 'login_notifications', name: 'Login Notifications',    description: 'Custom alerts shown to volunteers at login',  category: 'experimental', enabled: true },
  { id: 'data_import',         name: 'Data Import',            description: 'Bulk CSV / spreadsheet data import',          category: 'core',         enabled: true },
  { id: 'audit_logs',          name: 'Audit Logs',             description: 'Admin action history for compliance',         category: 'core',         enabled: true },
  { id: 'portal_designer',     name: 'Portal Designer',        description: 'Custom branding for volunteer portals',       category: 'beta',         enabled: true },
  { id: 'signup_forms',        name: 'Custom Signup Forms',    description: 'Editable signup form fields per role',        category: 'experimental', enabled: true },
];

export function getFeatureFlags(): FeatureFlag[] {
  if (typeof window === 'undefined') return DEFAULT_FLAGS;
  try {
    const stored = localStorage.getItem(DEV_STORE.FEATURE_FLAGS);
    if (!stored) return DEFAULT_FLAGS;
    const parsed: FeatureFlag[] = JSON.parse(stored);
    // Merge in any new default flags not yet in storage
    const ids = new Set(parsed.map((f) => f.id));
    DEFAULT_FLAGS.forEach((d) => { if (!ids.has(d.id)) parsed.push(d); });
    return parsed;
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function saveFeatureFlags(flags: FeatureFlag[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.FEATURE_FLAGS, JSON.stringify(flags));
}

export function isFeatureEnabled(id: string): boolean {
  return getFeatureFlags().find((f) => f.id === id)?.enabled ?? true;
}

// ─── System Modules ───────────────────────────────────────────────────────────

export type ModuleStatus = 'active' | 'warning' | 'error' | 'disabled';

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  status: ModuleStatus;
  lastChecked: string;
  dependencies: string[];
}

export const DEFAULT_MODULES: SystemModule[] = [
  { id: 'auth',      name: 'Authentication',     description: 'User auth and session management',          version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: [] },
  { id: 'people',    name: 'People Management',  description: 'Volunteers, members, and employees',        version: '1.2.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['auth'] },
  { id: 'events',    name: 'Events & Scheduling',description: 'Event creation and shift management',       version: '1.1.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'training',  name: 'Training & Courses', description: 'Course builder and progress tracking',      version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'messaging', name: 'Messaging',          description: 'Internal comms and notifications',         version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['auth'] },
  { id: 'portal',    name: 'Portal Designer',    description: 'Volunteer / member / employee portal',      version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'files',     name: 'File Library',       description: 'Document storage and sharing',             version: '0.9.0', enabled: true, status: 'warning', lastChecked: new Date().toISOString(), dependencies: [] },
  { id: 'hours',     name: 'Hours Tracking',     description: 'Time and attendance system',               version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'vetting',   name: 'Applicant Vetting',  description: 'Background check workflow',                version: '0.8.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'audit',     name: 'Audit Log',          description: 'Admin action history',                     version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['auth'] },
  { id: 'import',    name: 'Data Import',        description: 'Bulk import from CSV / Excel',             version: '1.0.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
  { id: 'badges',    name: 'Badge System',       description: 'Achievement and certification badges',      version: '0.7.0', enabled: true, status: 'active',  lastChecked: new Date().toISOString(), dependencies: ['people'] },
];

export function getModules(): SystemModule[] {
  if (typeof window === 'undefined') return DEFAULT_MODULES;
  try {
    const stored = localStorage.getItem(DEV_STORE.MODULES);
    return stored ? JSON.parse(stored) : DEFAULT_MODULES;
  } catch {
    return DEFAULT_MODULES;
  }
}

export function saveModules(modules: SystemModule[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.MODULES, JSON.stringify(modules));
}

// ─── Dev Config ───────────────────────────────────────────────────────────────

export interface DevConfig {
  appName: string;
  orgName: string;
  supportEmail: string;
  signupEnabled: boolean;
  signupClosedMessage: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  debugMode: boolean;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
}

export const DEFAULT_CONFIG: DevConfig = {
  appName: 'VolunteerFlow',
  orgName: 'My Organization',
  supportEmail: 'support@example.com',
  signupEnabled: true,
  signupClosedMessage: 'Signups are currently closed. Please check back soon!',
  maintenanceMode: false,
  maintenanceMessage: 'We are performing scheduled maintenance. We will be back shortly.',
  debugMode: false,
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
};

export function getDevConfig(): DevConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(DEV_STORE.DEV_CONFIG);
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveDevConfig(config: DevConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.DEV_CONFIG, JSON.stringify(config));
}

export function isMaintenanceMode(): boolean {
  return getDevConfig().maintenanceMode;
}

export function isSignupEnabled(): boolean {
  return getDevConfig().signupEnabled;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
  timestamp: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getLogs(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(DEV_STORE.DEV_LOGS) ?? '[]');
  } catch {
    return [];
  }
}

export function addLog(level: LogLevel, source: string, message: string, detail?: string): void {
  if (typeof window === 'undefined') return;
  const entry: LogEntry = { id: uid(), level, source, message, detail, timestamp: new Date().toISOString() };
  const updated = [entry, ...getLogs()].slice(0, 500);
  localStorage.setItem(DEV_STORE.DEV_LOGS, JSON.stringify(updated));
}

export function clearLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.DEV_LOGS, '[]');
}

export function seedLogsIfEmpty(): void {
  if (getLogs().length > 0) return;
  const now = Date.now();
  const seeds: Omit<LogEntry, 'id'>[] = [
    { level: 'success', source: 'auth',     message: 'Admin logged in',                               timestamp: new Date(now - 1000 * 60 * 2).toISOString() },
    { level: 'info',    source: 'people',   message: 'Volunteer profile updated',                     detail: 'Alice Johnson — vol_001',  timestamp: new Date(now - 1000 * 60 * 7).toISOString() },
    { level: 'warn',    source: 'files',    message: 'Upload near size limit (4.8 MB / 5 MB)',        timestamp: new Date(now - 1000 * 60 * 14).toISOString() },
    { level: 'info',    source: 'events',   message: 'New event created: Community Cleanup',          timestamp: new Date(now - 1000 * 60 * 22).toISOString() },
    { level: 'error',   source: 'api',      message: 'Backend connection timeout',                    detail: 'GET /api/volunteers — ECONNREFUSED :3001', timestamp: new Date(now - 1000 * 60 * 35).toISOString() },
    { level: 'info',    source: 'training', message: 'Course completion recorded',                    detail: 'Alice — Child Safety Track', timestamp: new Date(now - 1000 * 60 * 48).toISOString() },
    { level: 'warn',    source: 'auth',     message: 'Failed login attempt (2 / 5)',                  timestamp: new Date(now - 1000 * 60 * 61).toISOString() },
    { level: 'success', source: 'import',   message: 'CSV import completed: 47 records',              timestamp: new Date(now - 1000 * 60 * 75).toISOString() },
    { level: 'info',    source: 'portal',   message: 'Volunteer portal settings updated',             timestamp: new Date(now - 1000 * 60 * 98).toISOString() },
    { level: 'debug',   source: 'system',   message: 'Dev portal initialized',                        timestamp: new Date(now - 1000 * 60 * 120).toISOString() },
  ];
  localStorage.setItem(DEV_STORE.DEV_LOGS, JSON.stringify(seeds.map((s) => ({ ...s, id: uid() }))));
}

// ─── Businesses + Users (multi-tenant model) ─────────────────────────────────

export type UserRole       = 'owner' | 'admin' | 'staff' | 'user';
export type UserStatus     = 'active' | 'banned' | 'suspended';
export type UserType       = 'volunteer' | 'member' | 'employee' | 'admin';
export type BusinessPlan   = 'discover' | 'grow' | 'enterprise';
export type BusinessStatus = 'active' | 'suspended' | 'cancelled';

export interface BusinessUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  type: UserType;
  lastLogin: string;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: BusinessPlan;
  status: BusinessStatus;
  createdAt: string;
  users: BusinessUser[];
}

const _now = Date.now();

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_001',
    name: 'Green Valley Food Bank',
    ownerName: 'Sarah Mitchell',
    ownerEmail: 'sarah@greenvalleyfoodbank.org',
    plan: 'grow',
    status: 'active',
    createdAt: '2024-01-15T00:00:00Z',
    users: [
      { id: 'u_001_1', name: 'Sarah Mitchell',  email: 'sarah@greenvalleyfoodbank.org', role: 'owner', status: 'active',    type: 'admin',     lastLogin: new Date(_now - 1000 * 60 * 20).toISOString(),         createdAt: '2024-01-15T00:00:00Z' },
      { id: 'u_001_2', name: 'James Torres',    email: 'james@greenvalleyfoodbank.org', role: 'admin', status: 'active',    type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 3).toISOString(),     createdAt: '2024-01-20T00:00:00Z' },
      { id: 'u_001_3', name: 'Priya Nair',      email: 'priya@greenvalleyfoodbank.org', role: 'staff', status: 'active',    type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 8).toISOString(),     createdAt: '2024-02-01T00:00:00Z' },
      { id: 'u_001_4', name: 'Marcus Webb',     email: 'marcus@example.com',           role: 'user',  status: 'active',    type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 26).toISOString(),    createdAt: '2024-03-10T00:00:00Z' },
      { id: 'u_001_5', name: 'Linda Okafor',    email: 'linda@example.com',            role: 'user',  status: 'suspended', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 72).toISOString(),    createdAt: '2024-04-05T00:00:00Z' },
    ],
  },
  {
    id: 'biz_002',
    name: 'Riverside Animal Rescue',
    ownerName: 'Tom Hendricks',
    ownerEmail: 'tom@riversideanimalrescue.com',
    plan: 'discover',
    status: 'active',
    createdAt: '2024-03-02T00:00:00Z',
    users: [
      { id: 'u_002_1', name: 'Tom Hendricks',   email: 'tom@riversideanimalrescue.com',  role: 'owner', status: 'active', type: 'admin',     lastLogin: new Date(_now - 1000 * 60 * 45).toISOString(),         createdAt: '2024-03-02T00:00:00Z' },
      { id: 'u_002_2', name: 'Amy Chang',       email: 'amy@riversideanimalrescue.com',  role: 'admin', status: 'active', type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 5).toISOString(),     createdAt: '2024-03-05T00:00:00Z' },
      { id: 'u_002_3', name: 'Derek Hall',      email: 'derek@example.com',             role: 'user',  status: 'active', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 12).toISOString(),    createdAt: '2024-04-20T00:00:00Z' },
      { id: 'u_002_4', name: 'Nora Fleming',    email: 'nora@example.com',              role: 'user',  status: 'banned', type: 'member',    lastLogin: new Date(_now - 1000 * 60 * 60 * 96).toISOString(),    createdAt: '2024-05-01T00:00:00Z' },
    ],
  },
  {
    id: 'biz_003',
    name: 'Sunrise Youth Center',
    ownerName: 'Diana Reeves',
    ownerEmail: 'diana@sunriseyouth.org',
    plan: 'enterprise',
    status: 'active',
    createdAt: '2023-11-10T00:00:00Z',
    users: [
      { id: 'u_003_1', name: 'Diana Reeves',    email: 'diana@sunriseyouth.org',   role: 'owner', status: 'active', type: 'admin',     lastLogin: new Date(_now - 1000 * 60 * 10).toISOString(),         createdAt: '2023-11-10T00:00:00Z' },
      { id: 'u_003_2', name: 'Carlos Mendez',   email: 'carlos@sunriseyouth.org',  role: 'admin', status: 'active', type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 2).toISOString(),     createdAt: '2023-11-15T00:00:00Z' },
      { id: 'u_003_3', name: 'Faith Osei',      email: 'faith@sunriseyouth.org',   role: 'staff', status: 'active', type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 4).toISOString(),     createdAt: '2023-12-01T00:00:00Z' },
      { id: 'u_003_4', name: 'Ryan Brooks',     email: 'ryan@example.com',         role: 'user',  status: 'active', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 18).toISOString(),    createdAt: '2024-01-08T00:00:00Z' },
      { id: 'u_003_5', name: 'Keisha Thomas',   email: 'keisha@example.com',       role: 'user',  status: 'active', type: 'member',    lastLogin: new Date(_now - 1000 * 60 * 60 * 6).toISOString(),     createdAt: '2024-02-14T00:00:00Z' },
      { id: 'u_003_6', name: 'Ben Ashworth',    email: 'ben@example.com',          role: 'user',  status: 'active', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 30).toISOString(),    createdAt: '2024-03-20T00:00:00Z' },
    ],
  },
  {
    id: 'biz_004',
    name: 'Metro Community Gardens',
    ownerName: 'Patrick Lowe',
    ownerEmail: 'patrick@metrogardens.org',
    plan: 'grow',
    status: 'suspended',
    createdAt: '2024-02-18T00:00:00Z',
    users: [
      { id: 'u_004_1', name: 'Patrick Lowe',    email: 'patrick@metrogardens.org', role: 'owner', status: 'suspended', type: 'admin',     lastLogin: new Date(_now - 1000 * 60 * 60 * 120).toISOString(),   createdAt: '2024-02-18T00:00:00Z' },
      { id: 'u_004_2', name: 'Elena Vasquez',   email: 'elena@metrogardens.org',   role: 'admin', status: 'suspended', type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 120).toISOString(),   createdAt: '2024-02-20T00:00:00Z' },
      { id: 'u_004_3', name: 'Raj Patel',       email: 'raj@example.com',          role: 'user',  status: 'suspended', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 120).toISOString(),   createdAt: '2024-03-01T00:00:00Z' },
    ],
  },
  {
    id: 'biz_005',
    name: 'Harbor Homeless Outreach',
    ownerName: 'Grace Kim',
    ownerEmail: 'grace@harboroutreach.org',
    plan: 'discover',
    status: 'active',
    createdAt: '2024-05-07T00:00:00Z',
    users: [
      { id: 'u_005_1', name: 'Grace Kim',       email: 'grace@harboroutreach.org',  role: 'owner', status: 'active', type: 'admin',     lastLogin: new Date(_now - 1000 * 60 * 90).toISOString(),         createdAt: '2024-05-07T00:00:00Z' },
      { id: 'u_005_2', name: 'Trevor Mills',    email: 'trevor@harboroutreach.org', role: 'staff', status: 'active', type: 'employee',  lastLogin: new Date(_now - 1000 * 60 * 60 * 7).toISOString(),     createdAt: '2024-05-10T00:00:00Z' },
      { id: 'u_005_3', name: 'Sandra Obinna',   email: 'sandra@example.com',        role: 'user',  status: 'active', type: 'volunteer', lastLogin: new Date(_now - 1000 * 60 * 60 * 14).toISOString(),    createdAt: '2024-06-01T00:00:00Z' },
    ],
  },
];

export function getBusinesses(): Business[] {
  if (typeof window === 'undefined') return INITIAL_BUSINESSES;
  try {
    const stored = localStorage.getItem(DEV_STORE.USERS);
    return stored ? JSON.parse(stored) : INITIAL_BUSINESSES;
  } catch {
    return INITIAL_BUSINESSES;
  }
}

export function saveBusinesses(businesses: Business[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEV_STORE.USERS, JSON.stringify(businesses));
}

// ─── API Routes (for inspector) ───────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  description: string;
  category: string;
}

export const API_ROUTES: ApiRoute[] = [
  { method: 'GET',    path: '/health',                description: 'Server health check',              category: 'System' },
  { method: 'GET',    path: '/api',                   description: 'API metadata',                     category: 'System' },
  { method: 'GET',    path: '/api/dashboard/stats',   description: 'Aggregated dashboard stats',       category: 'Dashboard' },
  { method: 'GET',    path: '/api/volunteers',        description: 'List volunteers (search, filter, paginate)', category: 'Volunteers' },
  { method: 'GET',    path: '/api/volunteers/:id',    description: 'Get volunteer by ID',              category: 'Volunteers' },
  { method: 'POST',   path: '/api/volunteers',        description: 'Create new volunteer',             category: 'Volunteers' },
  { method: 'PUT',    path: '/api/volunteers/:id',    description: 'Update volunteer by ID',           category: 'Volunteers' },
  { method: 'DELETE', path: '/api/volunteers/:id',    description: 'Delete volunteer',                 category: 'Volunteers' },
  { method: 'GET',    path: '/api/events',            description: 'List events (status, category filter)', category: 'Events' },
  { method: 'GET',    path: '/api/events/:id',        description: 'Get event with applications',      category: 'Events' },
  { method: 'POST',   path: '/api/events',            description: 'Create new event',                 category: 'Events' },
  { method: 'PUT',    path: '/api/events/:id',        description: 'Update event',                     category: 'Events' },
  { method: 'DELETE', path: '/api/events/:id',        description: 'Delete event',                     category: 'Events' },
  { method: 'GET',    path: '/api/applications',      description: 'List applications (status, volunteer, event filter)', category: 'Applications' },
  { method: 'POST',   path: '/api/applications',      description: 'Submit application',               category: 'Applications' },
  { method: 'PUT',    path: '/api/applications/:id',  description: 'Update application status',        category: 'Applications' },
];
