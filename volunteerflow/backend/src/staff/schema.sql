-- Staff roles
CREATE TABLE IF NOT EXISTS staff_roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system   BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Staff users
CREATE TABLE IF NOT EXISTS staff_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  title         TEXT,
  role_id       TEXT NOT NULL REFERENCES staff_roles(id),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ,
  created_by    TEXT REFERENCES staff_users(id)
);

-- Staff sessions
CREATE TABLE IF NOT EXISTS staff_sessions (
  id            TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id),
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true
);

-- Staff audit log
CREATE TABLE IF NOT EXISTS staff_audit_logs (
  id                 TEXT PRIMARY KEY,
  timestamp          TIMESTAMPTZ DEFAULT NOW(),
  staff_user_id      TEXT NOT NULL,
  staff_user_name    TEXT NOT NULL,
  staff_role         TEXT NOT NULL,
  target_org_id      TEXT,
  target_org_name    TEXT,
  category           TEXT NOT NULL,
  action             TEXT NOT NULL,
  resource_type      TEXT,
  resource_id        TEXT,
  field_changes      JSONB,
  reason             TEXT,
  ip_address         TEXT,
  staff_session_id   TEXT REFERENCES staff_sessions(id),
  support_session_id TEXT,
  outcome            TEXT DEFAULT 'success',
  metadata           JSONB
);

CREATE INDEX IF NOT EXISTS idx_staff_audit_timestamp  ON staff_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_staff_audit_staff_user ON staff_audit_logs(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_target_org ON staff_audit_logs(target_org_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_category   ON staff_audit_logs(category);

-- Org notes (with FK to users table as org registry)
CREATE TABLE IF NOT EXISTS org_notes (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by   TEXT NOT NULL REFERENCES staff_users(id),
  content      TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ,
  updated_by   TEXT REFERENCES staff_users(id),
  is_deleted   BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_org_notes_org_id ON org_notes(org_id);

-- Support sessions
CREATE TABLE IF NOT EXISTS support_sessions (
  id            TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id),
  org_id        TEXT NOT NULL,
  mode          TEXT NOT NULL CHECK (mode IN ('view_only', 'support')),
  reason        TEXT NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  pages_visited   JSONB DEFAULT '[]',
  last_heartbeat  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_org    ON support_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_staff  ON support_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_active ON support_sessions(is_active);
