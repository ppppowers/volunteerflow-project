-- Customer schema: core tables that staff schema depends on

-- Organizations / customer accounts (referenced as "users" / orgs throughout the system)
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Volunteers belonging to an org
CREATE TABLE IF NOT EXISTS volunteers (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  skills            TEXT[] DEFAULT '{}',
  hours_contributed NUMERIC DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_org_id ON volunteers(org_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_status  ON volunteers(status);

-- Events belonging to an org
CREATE TABLE IF NOT EXISTS events (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  location         TEXT,
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  spots_available  INTEGER DEFAULT 10,
  status           TEXT NOT NULL DEFAULT 'UPCOMING',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_status  ON events(status);

-- Volunteer applications to events
CREATE TABLE IF NOT EXISTS applications (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_org_id       ON applications(org_id);
CREATE INDEX IF NOT EXISTS idx_applications_volunteer_id ON applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_applications_event_id     ON applications(event_id);
CREATE INDEX IF NOT EXISTS idx_applications_status       ON applications(status);
