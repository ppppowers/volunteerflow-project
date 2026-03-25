/**
 * PostgreSQL connection pool and schema initialisation.
 *
 * Call initDb() once at server startup. All routes import `pool` directly.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('[DB] Unexpected client error:', err.message);
});

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL DEFAULT '',
    org_name      TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id                TEXT PRIMARY KEY,
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    email             TEXT NOT NULL,
    phone             TEXT NOT NULL DEFAULT '',
    location          TEXT NOT NULL DEFAULT '',
    join_date         TEXT NOT NULL DEFAULT '',
    avatar            TEXT NOT NULL DEFAULT '',
    skills            JSONB NOT NULL DEFAULT '[]',
    hours_contributed INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'PENDING',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS events (
    id                    TEXT PRIMARY KEY,
    title                 TEXT NOT NULL,
    description           TEXT NOT NULL DEFAULT '',
    category              TEXT NOT NULL,
    location              TEXT NOT NULL DEFAULT '',
    address               TEXT NOT NULL DEFAULT '',
    start_date            TEXT,
    end_date              TEXT,
    spots_available       INTEGER NOT NULL DEFAULT 10,
    max_volunteers        INTEGER NOT NULL DEFAULT 10,
    status                TEXT NOT NULL DEFAULT 'DRAFT',
    visibility            TEXT NOT NULL DEFAULT 'PUBLIC',
    tags                  JSONB NOT NULL DEFAULT '[]',
    cover_image           TEXT NOT NULL DEFAULT '',
    images                JSONB NOT NULL DEFAULT '[]',
    contact_name          TEXT NOT NULL DEFAULT '',
    contact_email         TEXT NOT NULL DEFAULT '',
    contact_phone         TEXT NOT NULL DEFAULT '',
    notes                 TEXT NOT NULL DEFAULT '',
    registration_deadline TEXT NOT NULL DEFAULT '',
    shifts                JSONB NOT NULL DEFAULT '[]',
    eligibility           JSONB NOT NULL DEFAULT '{}',
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id            TEXT PRIMARY KEY,
    volunteer_id  TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    message       TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'PENDING',
    vetting_stage TEXT NOT NULL DEFAULT 'applied',
    rating        INTEGER,
    flagged       BOOLEAN NOT NULL DEFAULT false,
    notes         JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS files (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'other',
    size         TEXT NOT NULL DEFAULT '',
    folder_id    TEXT REFERENCES folders(id) ON DELETE SET NULL,
    url          TEXT NOT NULL DEFAULT '',
    storage_path TEXT NOT NULL DEFAULT '',
    uploaded_by  TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT NOT NULL DEFAULT '';

  -- Migrate existing applications rows (no-op if columns already exist)
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS vetting_stage TEXT NOT NULL DEFAULT 'applied';
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS rating INTEGER;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '[]';

  CREATE TABLE IF NOT EXISTS training_courses (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    category          TEXT NOT NULL DEFAULT 'Other',
    color             TEXT NOT NULL DEFAULT '#2563eb',
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    sections          JSONB NOT NULL DEFAULT '[]',
    published         BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS training_modules (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#2563eb',
    course_ids  JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS training_completions (
    id              TEXT PRIMARY KEY,
    course_id       TEXT NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    volunteer_id    TEXT NOT NULL,
    volunteer_name  TEXT NOT NULL DEFAULT '',
    completed_at    TEXT NOT NULL,
    submitted_files JSONB NOT NULL DEFAULT '[]',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS training_assignments (
    id          TEXT PRIMARY KEY,
    course_id   TEXT NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    person_id   TEXT NOT NULL,
    person_name TEXT NOT NULL DEFAULT '',
    person_type TEXT NOT NULL DEFAULT 'volunteer',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date    TEXT,
    UNIQUE(course_id, person_id, person_type)
  );

  CREATE TABLE IF NOT EXISTS members (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL DEFAULT '',
    phone           TEXT NOT NULL DEFAULT '',
    membership_type TEXT NOT NULL DEFAULT 'standard',
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS employees (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    title      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Safe migrations for training_assignments (old installs had volunteer_id / UNIQUE(course_id, volunteer_id))
  ALTER TABLE training_assignments ADD COLUMN IF NOT EXISTS person_id   TEXT NOT NULL DEFAULT '';
  ALTER TABLE training_assignments ADD COLUMN IF NOT EXISTS person_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE training_assignments ADD COLUMN IF NOT EXISTS person_type TEXT NOT NULL DEFAULT 'volunteer';

  CREATE TABLE IF NOT EXISTS people_groups (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL DEFAULT '',
    color      TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id        TEXT PRIMARY KEY,
    group_id  TEXT NOT NULL REFERENCES people_groups(id) ON DELETE CASCADE,
    name      TEXT NOT NULL,
    email     TEXT NOT NULL DEFAULT '',
    phone     TEXT NOT NULL DEFAULT '',
    status    TEXT NOT NULL DEFAULT 'active',
    notes     TEXT NOT NULL DEFAULT '',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Safe migration: add slug if old installs lack it
  ALTER TABLE people_groups ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';

  CREATE TABLE IF NOT EXISTS qr_campaigns (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#3b82f6',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'URL',
    content         TEXT NOT NULL DEFAULT '',
    display_value   TEXT NOT NULL DEFAULT '',
    fg_color        TEXT NOT NULL DEFAULT '#1e3a5f',
    bg_color        TEXT NOT NULL DEFAULT '#ffffff',
    style           TEXT NOT NULL DEFAULT 'rounded',
    size            INTEGER NOT NULL DEFAULT 256,
    include_margin  BOOLEAN NOT NULL DEFAULT true,
    status          TEXT NOT NULL DEFAULT 'active',
    campaign_id     TEXT REFERENCES qr_campaigns(id) ON DELETE SET NULL,
    total_scans     INTEGER NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS qr_scans (
    id          TEXT PRIMARY KEY,
    qr_id       TEXT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash     TEXT NOT NULL DEFAULT '',
    user_agent  TEXT NOT NULL DEFAULT '',
    device_type TEXT NOT NULL DEFAULT 'unknown',
    referrer    TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_id      ON qr_scans(qr_id);
  CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

  CREATE TABLE IF NOT EXISTS message_templates (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    channel    TEXT NOT NULL DEFAULT 'email',
    subject    TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS auto_reminders (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    channel       TEXT NOT NULL DEFAULT 'email',
    trigger_hours NUMERIC NOT NULL DEFAULT 24,
    template_id   TEXT REFERENCES message_templates(id) ON DELETE SET NULL,
    custom_body   TEXT NOT NULL DEFAULT '',
    enabled       BOOLEAN NOT NULL DEFAULT true,
    event_scope   TEXT NOT NULL DEFAULT 'all',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sent_messages (
    id         TEXT PRIMARY KEY,
    channel    TEXT NOT NULL,
    subject    TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    recipients INTEGER NOT NULL DEFAULT 0,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status     TEXT NOT NULL DEFAULT 'delivered'
  );

  CREATE TABLE IF NOT EXISTS login_notifications (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL DEFAULT '',
    type       TEXT NOT NULL DEFAULT 'info',
    active     BOOLEAN NOT NULL DEFAULT true,
    seen_by    JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS job_notif_rules (
    id                TEXT PRIMARY KEY,
    event             TEXT NOT NULL UNIQUE,
    label             TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    grp               TEXT NOT NULL DEFAULT '',
    volunteer_channel TEXT NOT NULL DEFAULT 'email',
    leader_channel    TEXT NOT NULL DEFAULT 'none',
    admin_channel     TEXT NOT NULL DEFAULT 'none'
  );

  -- Tracks which (reminder, event) pairs have already been dispatched
  -- to prevent duplicate auto-reminder delivery on server restart.
  CREATE TABLE IF NOT EXISTS sent_auto_reminders (
    reminder_id TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (reminder_id, event_id)
  );

  -- Per-portal-type designer settings (theme + custom HTML).
  CREATE TABLE IF NOT EXISTS portal_settings (
    portal_type TEXT PRIMARY KEY,           -- 'volunteer' | 'member' | 'employee'
    theme_id    TEXT NOT NULL DEFAULT 'default',
    custom_html TEXT NOT NULL DEFAULT '',
    use_custom  BOOLEAN NOT NULL DEFAULT false,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Single-row table that stores organisation-level settings.
  -- id is always 'default'; use ON CONFLICT DO NOTHING to seed it.
  CREATE TABLE IF NOT EXISTS org_settings (
    id                 TEXT PRIMARY KEY DEFAULT 'default',
    email_from_name    TEXT NOT NULL DEFAULT '',
    email_from_address TEXT NOT NULL DEFAULT '',
    sms_from_name      TEXT NOT NULL DEFAULT '',
    org_name           TEXT NOT NULL DEFAULT '',
    website            TEXT NOT NULL DEFAULT '',
    org_email          TEXT NOT NULL DEFAULT '',
    phone              TEXT NOT NULL DEFAULT '',
    address            TEXT NOT NULL DEFAULT '',
    timezone           TEXT NOT NULL DEFAULT 'America/New_York',
    language           TEXT NOT NULL DEFAULT 'English (US)',
    description        TEXT NOT NULL DEFAULT '',
    tax_id             TEXT NOT NULL DEFAULT '',
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Safe migration for existing installs
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS org_name    TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS website     TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS org_email   TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS phone       TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS address     TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS timezone    TEXT NOT NULL DEFAULT 'America/New_York';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS language    TEXT NOT NULL DEFAULT 'English (US)';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS tax_id      TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS logo_url    TEXT NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS notif_prefs        JSONB    NOT NULL DEFAULT '{}';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS portal_name        TEXT     NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS portal_subdomain   TEXT     NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS brand_primary      TEXT     NOT NULL DEFAULT '#10b981';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS brand_accent       TEXT     NOT NULL DEFAULT '#0d9488';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS welcome_heading    TEXT     NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS welcome_subtext    TEXT     NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS footer_text        TEXT     NOT NULL DEFAULT '';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS show_powered_by    BOOLEAN  NOT NULL DEFAULT TRUE;
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS logo_base64        TEXT     NOT NULL DEFAULT '';

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id     TEXT NOT NULL DEFAULT '',
    user_name   TEXT NOT NULL DEFAULT 'System',
    user_role   TEXT NOT NULL DEFAULT 'system',
    category    TEXT NOT NULL DEFAULT '',
    verb        TEXT NOT NULL DEFAULT '',
    resource    TEXT NOT NULL DEFAULT '',
    detail      TEXT NOT NULL DEFAULT '',
    ip          TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_category  ON audit_logs(category);

  CREATE TABLE IF NOT EXISTS org_roles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT 'bg-gray-500',
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan             TEXT        NOT NULL DEFAULT 'discover';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle    TEXT        NOT NULL DEFAULT 'monthly';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret  TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS session_timeout    TEXT    NOT NULL DEFAULT '8';

  CREATE TABLE IF NOT EXISTS user_sessions (
    id          TEXT        PRIMARY KEY,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent  TEXT        NOT NULL DEFAULT '',
    ip_address  TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Payment / subscription columns (safe migrations)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_provider       TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status    TEXT;

  CREATE TABLE IF NOT EXISTS invoices (
    id           TEXT        PRIMARY KEY,
    user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider     TEXT        NOT NULL DEFAULT 'stripe',
    amount_cents INTEGER     NOT NULL DEFAULT 0,
    currency     TEXT        NOT NULL DEFAULT 'usd',
    status       TEXT        NOT NULL DEFAULT 'paid',
    description  TEXT        NOT NULL DEFAULT '',
    invoice_url  TEXT        NOT NULL DEFAULT '',
    invoice_pdf  TEXT        NOT NULL DEFAULT '',
    period_start TIMESTAMPTZ,
    period_end   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

  -- Data retention settings (safe migrations on org_settings)
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS retention_volunteers   TEXT NOT NULL DEFAULT '12';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS retention_events       TEXT NOT NULL DEFAULT '36';
  ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS retention_applications TEXT NOT NULL DEFAULT '24';
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stringify a value for JSONB columns (pg won't auto-serialize arrays/objects). */
function jsn(v) {
  return v === undefined || v === null ? null : JSON.stringify(v);
}

// ── Seed data ─────────────────────────────────────────────────────────────────

async function seedData(client) {
  // Seed the default admin account only
  const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 12);
  await client.query(`
    INSERT INTO users (id, email, password_hash, full_name, org_name, role)
    VALUES ('admin-1', 'admin@volunteerflow.com', $1, 'Admin User', 'VolunteerFlow', 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  console.log('[DB] Schema ready. Default admin: admin@volunteerflow.com / admin123');
}

// ── Job notification rules seed ───────────────────────────────────────────────

const JOB_NOTIF_RULES_SEED = [
  { event: 'signup_confirmed',    label: 'Signup confirmed',       description: 'When a volunteer is confirmed for a shift',             grp: 'Signups',      volunteerChannel: 'email', leaderChannel: 'email', adminChannel: 'none' },
  { event: 'signup_waitlisted',   label: 'Added to waitlist',      description: 'When a volunteer is placed on a shift waitlist',        grp: 'Signups',      volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'signup_cancelled',    label: 'Signup cancelled',       description: 'When a volunteer cancels their shift registration',      grp: 'Signups',      volunteerChannel: 'email', leaderChannel: 'email', adminChannel: 'none' },
  { event: 'shift_reminder_24h',  label: '24-hour shift reminder', description: 'Reminder sent 24 hours before the shift starts',        grp: 'Reminders',    volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'shift_reminder_1h',   label: '1-hour shift reminder',  description: 'Reminder sent 1 hour before the shift starts',          grp: 'Reminders',    volunteerChannel: 'sms',   leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'hours_logged',        label: 'Hours logged',           description: 'When hours are logged for a volunteer',                  grp: 'Hours',        volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'hours_approved',      label: 'Hours approved',         description: 'When pending hours are confirmed by an admin/leader',    grp: 'Hours',        volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'badge_issued',        label: 'Badge issued',           description: 'When a credential or badge is awarded to a volunteer',   grp: 'Badges',       volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'application_received',label: 'Application received',   description: 'When a new volunteer application is submitted',          grp: 'Applications', volunteerChannel: 'email', leaderChannel: 'email', adminChannel: 'email' },
  { event: 'application_approved',label: 'Application approved',   description: 'When an application advances to Approved stage',         grp: 'Applications', volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'application_rejected',label: 'Application rejected',   description: 'When an application is rejected',                        grp: 'Applications', volunteerChannel: 'email', leaderChannel: 'none',  adminChannel: 'none' },
  { event: 'event_cancelled',     label: 'Event cancelled',        description: 'When a published event is cancelled',                    grp: 'Events',       volunteerChannel: 'email', leaderChannel: 'email', adminChannel: 'email' },
  { event: 'event_updated',       label: 'Event details changed',  description: 'When date, location, or capacity of an event changes',   grp: 'Events',       volunteerChannel: 'email', leaderChannel: 'email', adminChannel: 'none' },
];

async function seedJobNotifRules(client) {
  for (const r of JOB_NOTIF_RULES_SEED) {
    await client.query(
      `INSERT INTO job_notif_rules (id, event, label, description, grp, volunteer_channel, leader_channel, admin_channel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (event) DO NOTHING`,
      [`jnr_${r.event}`, r.event, r.label, r.description, r.grp, r.volunteerChannel, r.leaderChannel, r.adminChannel]
    );
  }
}

// ── Message template seed ─────────────────────────────────────────────────────

const MESSAGE_TEMPLATES_SEED = [
  {
    id: 'tpl_welcome_volunteer',
    name: 'Welcome New Volunteer',
    channel: 'email',
    subject: 'Welcome to [Organization Name] — We\'re glad you\'re here!',
    body: `Hi [Volunteer Name],

Welcome to [Organization Name]! We're thrilled to have you join our team of dedicated volunteers.

Here's what to expect next:
• You'll receive details about upcoming events and opportunities
• Our team will be in touch to get you started
• Feel free to reach out if you have any questions

We look forward to making a difference together.

Warm regards,
The [Organization Name] Team`,
  },
  {
    id: 'tpl_event_reminder_24h',
    name: 'Event Reminder (24 Hours)',
    channel: 'email',
    subject: 'Reminder: [Event Name] is tomorrow!',
    body: `Hi [Volunteer Name],

Just a friendly reminder that you're signed up to volunteer at [Event Name] tomorrow!

Event Details:
• Date: [Date]
• Time: [Time]
• Location: [Location]

What to bring: [Details]

If you have any last-minute questions, please don't hesitate to contact us. We're looking forward to seeing you there!

Thank you for your commitment,
[Organization Name]`,
  },
  {
    id: 'tpl_application_received',
    name: 'Application Received',
    channel: 'email',
    subject: 'We received your application — [Organization Name]',
    body: `Hi [Volunteer Name],

Thank you for applying to volunteer with [Organization Name]! We've received your application and our team will review it shortly.

What happens next:
1. Our team reviews your application (typically within 3–5 business days)
2. You'll receive an email with our decision
3. If approved, we'll send you onboarding information

In the meantime, if you have any questions please reply to this email.

Thank you for your interest in making a difference!

Best,
[Organization Name] Team`,
  },
  {
    id: 'tpl_application_approved',
    name: 'Application Approved',
    channel: 'email',
    subject: 'You\'re approved! Welcome to the team — [Organization Name]',
    body: `Hi [Volunteer Name],

Great news — your volunteer application has been approved! Welcome to the [Organization Name] family.

Next steps:
• Complete any required training or onboarding materials
• Browse upcoming events and sign up for shifts
• Connect with our volunteer coordinator for any questions

We're excited to have you on board. Together we can make a real difference in our community.

See you soon,
[Organization Name] Team`,
  },
  {
    id: 'tpl_event_cancelled',
    name: 'Event Cancelled',
    channel: 'email',
    subject: 'Important: [Event Name] has been cancelled',
    body: `Hi [Volunteer Name],

We regret to inform you that [Event Name], scheduled for [Date], has been cancelled.

We sincerely apologize for any inconvenience this may cause. Your time and commitment mean a lot to us.

If you had questions about future events or rescheduling opportunities, please don't hesitate to reach out.

Thank you for your understanding and continued support.

Sincerely,
[Organization Name] Team`,
  },
  {
    id: 'tpl_thank_you',
    name: 'Thank You for Volunteering',
    channel: 'email',
    subject: 'Thank you for volunteering at [Event Name]!',
    body: `Hi [Volunteer Name],

Thank you so much for volunteering at [Event Name] on [Date]! Your dedication and hard work made a real impact.

Here's a summary of your contribution:
• Hours volunteered: [Hours]
• Event: [Event Name]

Your service helps us fulfil our mission every single day. We truly couldn't do it without volunteers like you.

We hope to see you again at future events!

With gratitude,
[Organization Name] Team`,
  },
  {
    id: 'tpl_new_event',
    name: 'New Event Announcement',
    channel: 'email',
    subject: 'New opportunity: [Event Name] — Sign up today!',
    body: `Hi [Volunteer Name],

We have an exciting new volunteer opportunity we'd love for you to be part of!

Event: [Event Name]
Date: [Date]
Time: [Time]
Location: [Location]

About this event:
[Event Description]

Spots are limited, so sign up early to secure your place. Visit [Link] to register or log in to your volunteer portal.

Questions? Reply to this email or contact [Contact Name] at [Contact Email].

We hope to see you there!

[Organization Name] Team`,
  },
  {
    id: 'tpl_sms_reminder',
    name: 'Event Reminder (SMS)',
    channel: 'sms',
    subject: '',
    body: 'Hi [Volunteer Name]! Reminder: You\'re volunteering at [Event Name] tomorrow at [Time], [Location]. Questions? Call [Phone]. See you there! — [Organization Name]',
  },
  {
    id: 'tpl_sms_confirmed',
    name: 'Shift Confirmed (SMS)',
    channel: 'sms',
    subject: '',
    body: 'Hi [Volunteer Name]! Your shift at [Event Name] on [Date] at [Time] is confirmed. We\'ll send a reminder the day before. Thanks! — [Organization Name]',
  },
];

// ── Org roles seed ────────────────────────────────────────────────────────────

const ORG_ROLES_SEED = [
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full access except billing and owner-level settings.',
    color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    permissions: {
      manage_volunteers: true, view_volunteers: true, manage_events: true, view_events: true,
      manage_applications: true, manage_hours: true, view_hours: true, manage_messages: true,
      manage_files: true, view_files: true, manage_import: true, manage_badges: true,
      view_audit: true, manage_settings: true, manage_billing: false, manage_team: true,
    },
    is_system: true,
    sort_order: 0,
  },
  {
    id: 'role_member',
    name: 'Member',
    description: 'Can manage events, volunteers, hours, and messages. Cannot access settings or billing.',
    color: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    permissions: {
      manage_volunteers: true, view_volunteers: true, manage_events: true, view_events: true,
      manage_applications: true, manage_hours: true, view_hours: true, manage_messages: true,
      manage_files: false, view_files: true, manage_import: false, manage_badges: true,
      view_audit: false, manage_settings: false, manage_billing: false, manage_team: false,
    },
    is_system: true,
    sort_order: 1,
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access to volunteers, events, hours, and files.',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    permissions: {
      manage_volunteers: false, view_volunteers: true, manage_events: false, view_events: true,
      manage_applications: false, manage_hours: false, view_hours: true, manage_messages: false,
      manage_files: false, view_files: true, manage_import: false, manage_badges: false,
      view_audit: false, manage_settings: false, manage_billing: false, manage_team: false,
    },
    is_system: true,
    sort_order: 2,
  },
];

async function seedOrgRoles(client) {
  for (const r of ORG_ROLES_SEED) {
    await client.query(
      `INSERT INTO org_roles (id, name, description, color, permissions, is_system, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.description, r.color, jsn(r.permissions), r.is_system, r.sort_order]
    );
  }
  console.log('[DB] Org roles seeded.');
}

async function seedMessageTemplates(client) {
  for (const t of MESSAGE_TEMPLATES_SEED) {
    await client.query(
      `INSERT INTO message_templates (id, name, channel, subject, body)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [t.id, t.name, t.channel, t.subject, t.body]
    );
  }
  console.log('[DB] Message templates seeded.');
}

// ── Public API ────────────────────────────────────────────────────────────────

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
    // Seed default portal_settings rows for all 3 portal types
    for (const type of ['volunteer', 'member', 'employee']) {
      await client.query(
        "INSERT INTO portal_settings (portal_type) VALUES ($1) ON CONFLICT (portal_type) DO NOTHING",
        [type]
      );
    }
    // Ensure the single-row org_settings record exists
    await client.query(
      "INSERT INTO org_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING"
    );
    const { rows } = await client.query('SELECT COUNT(*) FROM volunteers');
    if (parseInt(rows[0].count, 10) === 0) {
      await seedData(client);
    }
    const { rows: ruleRows } = await client.query('SELECT COUNT(*) FROM job_notif_rules');
    if (parseInt(ruleRows[0].count, 10) === 0) {
      await seedJobNotifRules(client);
    }
    const { rows: tplRows } = await client.query('SELECT COUNT(*) FROM message_templates');
    if (parseInt(tplRows[0].count, 10) === 0) {
      await seedMessageTemplates(client);
    }
    const { rows: roleRows } = await client.query('SELECT COUNT(*) FROM org_roles');
    if (parseInt(roleRows[0].count, 10) === 0) {
      await seedOrgRoles(client);
    }
    // Migrate legacy role values to org_roles IDs
    await client.query(`UPDATE users SET role = 'role_admin'  WHERE role = 'admin'`);
    await client.query(`UPDATE users SET role = 'role_member' WHERE role = 'member'`);
    console.log('[DB] Schema ready.');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
