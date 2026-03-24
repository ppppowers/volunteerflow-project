# Employee Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade internal VolunteerFlow Employee Dashboard at `/staff/*` with separate staff auth, org search/workspace, customer view mode, and full audit logging.

**Architecture:** Integrated staff module inside the existing Next.js 14 + Express.js app. New `/api/staff/*` Express routes live in `backend/src/staff/` and are mounted in `index.js`. New `/staff/*` Next.js pages use a separate `StaffLayout` and `StaffAuthContext` that never touch customer auth state.

**Tech Stack:** Express.js, PostgreSQL (raw SQL via pg), JWT (jsonwebtoken), bcryptjs, Jest + supertest (new, backend tests only), Next.js 14, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-24-employee-dashboard-design.md`

---

## File Map

### Backend — new files
```
volunteerflow/backend/src/
  staff/
    index.js          ← mounts all staff sub-routers
    middleware.js     ← requireStaffAuth, requirePermission, validateSupportSession, logStaffAudit
    auth.js           ← POST /api/staff/auth/login|logout, GET /me
    orgs.js           ← GET /api/staff/orgs, GET|PATCH /api/staff/orgs/:id, activity
    notes.js          ← CRUD /api/staff/orgs/:id/notes
    support.js        ← enter, exit, pages, active
    audit.js          ← GET /api/staff/audit, /export
    employees.js      ← CRUD /api/staff/employees, /disable
    roles.js          ← CRUD /api/staff/roles
    schema.sql        ← all new CREATE TABLE + migration SQL
  __tests__/staff/
    middleware.test.js
    auth.test.js
    orgs.test.js
    support.test.js
    audit.test.js
```

### Backend — modified files
```
volunteerflow/backend/src/index.js     ← mount staff router at /api/staff
volunteerflow/backend/package.json     ← add jest, supertest dev deps
volunteerflow/backend/.env.example    ← add STAFF_JWT_SECRET
```

### Frontend — new files
```
volunteerflow/frontend/src/
  lib/
    staffApi.ts           ← fetch wrapper for /api/staff/* with staff JWT
    staffPermissions.ts   ← PERMISSIONS constant + canDo helper
  context/
    StaffAuthContext.tsx  ← staff JWT session, canDo(), logout()
    SupportViewContext.tsx← active support session from sessionStorage
  components/staff/
    StaffLayout.tsx       ← auth guard + shell wrapper
    StaffSidebar.tsx      ← staff nav links
    StaffHeader.tsx       ← staff top bar
    PermissionGate.tsx    ← hide/disable by permission
    SupportBanner.tsx     ← fixed amber support-mode banner
    OrgSearchTable.tsx    ← org search result table
    OrgWorkspaceTabs.tsx  ← tab controller for org workspace
    NoteEditor.tsx        ← create/edit note form
    AuditLogTable.tsx     ← reusable filtered audit table
  pages/staff/
    login.tsx
    index.tsx             ← home: search bar + recent orgs + mgmt panel
    orgs/
      index.tsx           ← org search page
      [id].tsx            ← org workspace
    support/
      [orgId]/
        index.tsx         ← support view: dashboard
        volunteers.tsx
        events.tsx
        applications.tsx
        hours.tsx
        settings.tsx
    audit.tsx
    employees/
      index.tsx
      [id].tsx
    roles.tsx
```

---

## Phase P1 — Foundation

### Task 1: Backend test infrastructure

**Files:**
- Modify: `volunteerflow/backend/package.json`
- Create: `volunteerflow/backend/jest.config.js`
- Create: `volunteerflow/backend/src/__tests__/staff/helpers.js`

- [ ] Install dev dependencies
```bash
cd volunteerflow/backend
npm install --save-dev jest supertest
```

- [ ] Add test script to `package.json`
```json
"scripts": {
  "test": "jest --testPathPattern=__tests__",
  "test:watch": "jest --watch"
},
"jest": {
  "testEnvironment": "node"
}
```

- [ ] Create test helper that builds an Express app instance without starting a server
```javascript
// volunteerflow/backend/src/__tests__/staff/helpers.js
const express = require('express');
const { Pool } = require('pg');

// In-process test pool — uses TEST_DATABASE_URL env var
// Set TEST_DATABASE_URL in your shell or .env.test before running tests
// Example: TEST_DATABASE_URL=postgresql://localhost/volunteerflow_test
function createTestPool() {
  return new Pool({ connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL });
}

function buildTestApp(router, pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff', router(pool));
  return app;
}

module.exports = { createTestPool, buildTestApp };
```

- [ ] Verify jest runs (no tests yet — expect "no test files found" or 0 suites)
```bash
cd volunteerflow/backend && npm test
```

- [ ] Commit
```bash
git add volunteerflow/backend/package.json volunteerflow/backend/src/__tests__/staff/helpers.js
git commit -m "chore: add jest + supertest for backend staff tests"
```

---

### Task 2: Staff database schema

**Files:**
- Create: `volunteerflow/backend/src/staff/schema.sql`
- Modify: `volunteerflow/backend/src/db.js` (add schema execution call)

- [ ] Create `volunteerflow/backend/src/staff/schema.sql` with all new tables (copy exactly from spec §4):

```sql
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

-- Org notes (with FK to users)
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
  pages_visited JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_org    ON support_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_staff  ON support_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_active ON support_sessions(is_active);
```

- [ ] In `volunteerflow/backend/src/db.js`, after the existing schema execution, add a call to execute the staff schema file:
```javascript
// After existing schema setup, near the bottom of the initializeDatabase function:
const staffSchema = fs.readFileSync(path.join(__dirname, 'staff/schema.sql'), 'utf8');
await pool.query(staffSchema);
```
Also add `const fs = require('fs'); const path = require('path');` at the top if not present.

- [ ] Run the app and verify tables are created (check Docker logs or psql)
```bash
cd volunteerflow && docker-compose up -d
docker-compose exec db psql -U volunteerflow -d volunteerflow -c "\dt staff_*"
# Expected: staff_audit_logs, staff_roles, staff_sessions, staff_users
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/schema.sql volunteerflow/backend/src/db.js
git commit -m "feat: add staff tables schema (staff_roles, staff_users, staff_sessions, staff_audit_logs, org_notes, support_sessions)"
```

---

### Task 3: Multi-tenancy migration

**Files:**
- Create: `volunteerflow/backend/src/staff/migration.sql`

- [ ] Create `volunteerflow/backend/src/staff/migration.sql`:

```sql
-- PRE-FLIGHT: abort if more than one org exists
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users) > 1 THEN
    RAISE EXCEPTION 'Multi-org detected. Map org_id manually before running this migration.';
  END IF;
END $$;

-- Add org_id to all org-scoped tables
ALTER TABLE volunteers           ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE events               ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE applications         ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE members              ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE employees            ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE files                ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE folders              ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_courses     ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_assignments ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_completions ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE qr_campaigns         ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE qr_codes             ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE people_groups        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE group_members        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE message_templates    ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE auto_reminders       ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE sent_messages        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE login_notifications  ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE invoices             ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE portal_settings      ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS staff_session_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS is_support_view BOOLEAN DEFAULT false;

-- Backfill
DO $$
DECLARE org_id_val TEXT;
BEGIN
  SELECT id INTO org_id_val FROM users LIMIT 1;
  UPDATE volunteers           SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE events               SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE applications         SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE members              SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE employees            SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE files                SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE folders              SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_courses     SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_assignments SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_completions SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE qr_campaigns         SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE qr_codes             SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE people_groups        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE group_members        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE message_templates    SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE auto_reminders       SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE sent_messages        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE login_notifications  SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE invoices             SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE portal_settings      SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE audit_logs           SET org_id = org_id_val WHERE org_id IS NULL;
  -- org_settings: swap PK from 'default' to org user ID
  UPDATE org_settings SET id = org_id_val WHERE id = 'default';
END $$;
```

- [ ] Add a one-time migration runner endpoint (dev-only, remove after use) OR run it directly:
```bash
docker-compose exec db psql -U volunteerflow -d volunteerflow -f /dev/stdin < volunteerflow/backend/src/staff/migration.sql
# Verify:
docker-compose exec db psql -U volunteerflow -d volunteerflow -c "\d volunteers" | grep org_id
# Expected: org_id | text
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/migration.sql
git commit -m "feat: add multi-tenancy migration (org_id columns + backfill)"
```

---

### Task 4: Staff middleware

**Files:**
- Create: `volunteerflow/backend/src/staff/middleware.js`
- Create: `volunteerflow/backend/src/__tests__/staff/middleware.test.js`

- [ ] Write failing tests first
```javascript
// volunteerflow/backend/src/__tests__/staff/middleware.test.js
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const { requireStaffAuth, requirePermission } = require('../../staff/middleware');

function buildApp(middleware) {
  const app = express();
  app.use(express.json());
  app.get('/test', ...middleware, (req, res) => res.json({ ok: true, staff: req.staff }));
  return app;
}

function makeToken(payload, secret = process.env.STAFF_JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '8h' });
}

describe('requireStaffAuth', () => {
  test('rejects missing token', async () => {
    const app = buildApp([requireStaffAuth(() => Promise.resolve(null))]);
    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
  });

  test('rejects token signed with wrong secret', async () => {
    const token = makeToken({ staffId: '1' }, 'wrong-secret');
    const app = buildApp([requireStaffAuth(() => Promise.resolve(null))]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('rejects when session is not active', async () => {
    const token = makeToken({ staffId: 'su1', sessionId: 'sess1', permissions: [] });
    // pool mock: stale check updates nothing, session lookup returns null
    const mockPool = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [] })   // stale-check UPDATE
      .mockResolvedValueOnce({ rows: [] })   // session SELECT returns no active row
    };
    const app = buildApp([requireStaffAuth(mockPool)]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('attaches req.staff and calls next when valid', async () => {
    const token = makeToken({ staffId: 'su1', email: 'a@b.com', name: 'A', roleId: 'role_owner', permissions: ['orgs.view'], sessionId: 'sess1' });
    const mockPool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })                  // stale UPDATE
        .mockResolvedValueOnce({ rows: [{ is_active: true }] }) // session SELECT
        .mockResolvedValueOnce({ rows: [] })                  // last_seen UPDATE
    };
    const app = buildApp([requireStaffAuth(mockPool)]);
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.staff.staffId).toBe('su1');
  });
});

describe('requirePermission', () => {
  test('returns 403 when permission missing', async () => {
    const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const token = makeToken({ staffId: 'su1', name: 'A', roleId: 'r', permissions: ['notes.view'], sessionId: 's1' });
    const app = buildApp([requireStaffAuth(mockPool), requirePermission('orgs.edit_plan', mockPool)]);
    // need active session for requireStaffAuth
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ is_active: true }] })
      .mockResolvedValueOnce({ rows: [] }); // last_seen
    const res = await request(app).get('/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.required).toBe('orgs.edit_plan');
  });
});
```

- [ ] Run to verify tests fail
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=middleware
# Expected: FAIL — middleware.js not found
```

- [ ] Implement `volunteerflow/backend/src/staff/middleware.js`:

```javascript
'use strict';
const jwt = require('jsonwebtoken');

const STAFF_JWT_SECRET = process.env.STAFF_JWT_SECRET;
const STALE_MINUTES = 5;
const MAX_SESSION_HOURS = 4;

// requireStaffAuth(pool) — call as requireStaffAuth(pool) to get middleware fn
function requireStaffAuth(pool) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No staff token' });

    let payload;
    try {
      payload = jwt.verify(token, STAFF_JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired staff token' });
    }

    // Step 1: Synchronous stale-check — commits before is_active gate
    await pool.query(`
      UPDATE staff_sessions SET is_active = false
      WHERE is_active = true AND (
        last_seen < NOW() - INTERVAL '${STALE_MINUTES} minutes'
        OR started_at < NOW() - INTERVAL '${MAX_SESSION_HOURS} hours'
      )
    `);

    // Step 2: Validate session is still active
    const sessionRes = await pool.query(
      'SELECT is_active FROM staff_sessions WHERE id = $1 AND staff_user_id = $2 AND is_active = true',
      [payload.sessionId, payload.staffId]
    );
    if (!sessionRes.rows[0]) {
      return res.status(401).json({ error: 'Staff session expired or invalid' });
    }

    // Step 3: Attach staff context
    req.staff = payload;

    // Step 4: Update last_seen (non-blocking)
    pool.query('UPDATE staff_sessions SET last_seen = NOW() WHERE id = $1', [payload.sessionId]).catch(() => {});

    next();
  };
}

function requirePermission(perm, pool) {
  return (req, res, next) => {
    if (!req.staff?.permissions?.includes(perm)) {
      // Log denial non-blocking
      if (pool) {
        logStaffAudit(pool, {
          staffUserId: req.staff?.staffId || 'unknown',
          staffUserName: req.staff?.name || 'unknown',
          staffRole: req.staff?.roleId || 'unknown',
          category: 'access_denied',
          action: 'denied',
          outcome: 'denied',
          metadata: { requiredPermission: perm, path: req.path },
          ipAddress: req.ip,
          staffSessionId: req.staff?.sessionId,
        }).catch(() => {});
      }
      return res.status(403).json({ error: 'Insufficient permissions', required: perm });
    }
    next();
  };
}

function validateSupportSession(pool) {
  return async (req, res, next) => {
    const orgId = req.params.id;
    const sessionRes = await pool.query(
      'SELECT id FROM support_sessions WHERE staff_user_id = $1 AND org_id = $2 AND is_active = true',
      [req.staff.staffId, orgId]
    );
    if (!sessionRes.rows[0]) {
      return res.status(403).json({ error: 'No active support session for this org' });
    }
    req.supportSessionId = sessionRes.rows[0].id;
    next();
  };
}

async function logStaffAudit(pool, {
  staffUserId, staffUserName, staffRole,
  targetOrgId, targetOrgName,
  category, action,
  resourceType, resourceId,
  fieldChanges, reason,
  ipAddress, staffSessionId, supportSessionId,
  outcome = 'success', metadata,
}) {
  const id = `sal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(`
    INSERT INTO staff_audit_logs
      (id, staff_user_id, staff_user_name, staff_role,
       target_org_id, target_org_name, category, action,
       resource_type, resource_id, field_changes, reason,
       ip_address, staff_session_id, support_session_id, outcome, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
  `, [
    id, staffUserId, staffUserName, staffRole,
    targetOrgId || null, targetOrgName || null, category, action,
    resourceType || null, resourceId || null,
    fieldChanges ? JSON.stringify(fieldChanges) : null,
    reason || null, ipAddress || null, staffSessionId || null,
    supportSessionId || null, outcome,
    metadata ? JSON.stringify(metadata) : null,
  ]);
}

module.exports = { requireStaffAuth, requirePermission, validateSupportSession, logStaffAudit };
```

- [ ] Run tests — verify they pass
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=middleware
# Expected: PASS — 4 tests passing
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/middleware.js volunteerflow/backend/src/__tests__/staff/middleware.test.js
git commit -m "feat: staff auth middleware (requireStaffAuth, requirePermission, validateSupportSession, logStaffAudit)"
```

---

### Task 5: Staff roles seed + auth routes

**Files:**
- Create: `volunteerflow/backend/src/staff/auth.js`
- Create: `volunteerflow/backend/src/__tests__/staff/auth.test.js`
- Modify: `volunteerflow/backend/src/db.js` (add seed call)

- [ ] Add role seed to `db.js` inside `initializeDatabase` after the staff schema runs:

```javascript
// Seed staff roles (ON CONFLICT DO NOTHING — safe to run on every startup)
await pool.query(`
  INSERT INTO staff_roles (id, name, description, permissions, is_system, sort_order) VALUES
  ('role_owner', 'Owner', 'Full access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_plan":true,"orgs.edit_status":true,"orgs.edit_billing":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"audit.export":true,"support.view_mode":true,"support.impersonation":true,"employees.view":true,"employees.create":true,"employees.edit":true,"employees.disable":true,"roles.view":true,"roles.manage":true,"feature_flags.manage":true,"dashboard.view_management_metrics":true}', true, 0),
  ('role_super_admin', 'Super Admin', 'All except role/employee management', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_plan":true,"orgs.edit_status":true,"orgs.edit_billing":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"audit.export":true,"support.view_mode":true,"support.impersonation":true,"employees.view":true,"employees.create":true,"employees.edit":true,"roles.view":true,"dashboard.view_management_metrics":true}', true, 1),
  ('role_admin', 'Admin', 'Broad org access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"orgs.edit_status":true,"orgs.assign_rep":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"notes.edit_any":true,"notes.delete":true,"audit.view_org":true,"audit.view_all":true,"support.view_mode":true,"employees.view":true,"roles.view":true,"dashboard.view_management_metrics":true}', true, 2),
  ('role_manager', 'Manager', 'Team oversight', '{"orgs.view":true,"orgs.edit_basic":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"audit.view_org":true,"employees.view":true,"dashboard.view_management_metrics":true}', true, 3),
  ('role_senior_support', 'Senior Support', 'Full support access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_basic":true,"orgs.edit_contact":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"audit.view_org":true,"support.view_mode":true}', true, 4),
  ('role_support_agent', 'Support Agent', 'Basic support', '{"orgs.view":true,"orgs.edit_basic":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"support.view_mode":true}', true, 5),
  ('role_onboarding', 'Onboarding Specialist', 'Onboarding support', '{"orgs.view":true,"notes.view":true,"notes.create":true,"notes.edit_own":true,"support.view_mode":true}', true, 6),
  ('role_billing', 'Billing Specialist', 'Billing access', '{"orgs.view":true,"orgs.view_sensitive":true,"orgs.edit_billing":true,"notes.view":true}', true, 7),
  ('role_read_only', 'Read Only', 'View only', '{"orgs.view":true,"notes.view":true,"audit.view_org":true}', true, 8)
  ON CONFLICT (id) DO NOTHING
`);
```

- [ ] Write failing auth tests:

```javascript
// volunteerflow/backend/src/__tests__/staff/auth.test.js
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

function buildAuthApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/auth', require('../../staff/auth')(pool));
  return app;
}

describe('POST /api/staff/auth/login', () => {
  test('returns 401 for unknown email', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'nobody@example.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 12);
    const pool = { query: jest.fn().mockResolvedValue({
      rows: [{ id: 'su1', full_name: 'A', role_id: 'role_owner', is_active: true,
               password_hash: hash, permissions: {} }]
    })};
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('returns 403 for inactive account', async () => {
    const hash = await bcrypt.hash('pass', 12);
    const pool = { query: jest.fn().mockResolvedValue({
      rows: [{ id: 'su1', full_name: 'A', role_id: 'role_owner', is_active: false,
               password_hash: hash, permissions: {} }]
    })};
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'pass' });
    expect(res.status).toBe(403);
  });

  test('returns token on valid credentials', async () => {
    const hash = await bcrypt.hash('correct', 12);
    const pool = { query: jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'su1', full_name: 'A', email: 'a@b.com',
               role_id: 'role_owner', is_active: true, password_hash: hash,
               permissions: { 'orgs.view': true } }] })
      .mockResolvedValueOnce({ rows: [] }) // INSERT session
      .mockResolvedValueOnce({ rows: [] }) // UPDATE last_login
    };
    const res = await request(buildAuthApp(pool)).post('/api/staff/auth/login')
      .send({ email: 'a@b.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@b.com');
  });
});
```

- [ ] Run to verify they fail
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=auth.test
# Expected: FAIL — auth.js not found
```

- [ ] Implement `volunteerflow/backend/src/staff/auth.js`:

```javascript
'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { requireStaffAuth, logStaffAudit } = require('./middleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

module.exports = function staffAuthRouter(pool) {
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query(`
      SELECT su.id, su.email, su.full_name, su.role_id, su.is_active,
             su.password_hash, sr.permissions
      FROM staff_users su
      JOIN staff_roles sr ON sr.id = su.role_id
      WHERE su.email = $1
    `, [email.toLowerCase()]);

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const perms = Object.keys(user.permissions || {}).filter(k => user.permissions[k]);
    const sessionId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO staff_sessions (id, staff_user_id, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)',
      [sessionId, user.id, req.ip, req.headers['user-agent'] || '', expiresAt]
    );
    pool.query('UPDATE staff_users SET last_login = NOW() WHERE id = $1', [user.id]).catch(() => {});

    const payload = {
      staffId: user.id, email: user.email, name: user.full_name,
      roleId: user.role_id, permissions: perms, sessionId,
    };
    const token = jwt.sign(payload, process.env.STAFF_JWT_SECRET, { expiresIn: '8h' });

    logStaffAudit(pool, {
      staffUserId: user.id, staffUserName: user.full_name, staffRole: user.role_id,
      category: 'auth', action: 'login', ipAddress: req.ip, staffSessionId: sessionId,
    }).catch(() => {});

    res.json({ token, user: { staffId: user.id, email: user.email, name: user.full_name, roleId: user.role_id, permissions: perms, sessionId } });
  });

  router.post('/logout', requireStaffAuth(pool), async (req, res) => {
    await pool.query('UPDATE staff_sessions SET is_active = false WHERE id = $1', [req.staff.sessionId]);
    logStaffAudit(pool, {
      staffUserId: req.staff.staffId, staffUserName: req.staff.name, staffRole: req.staff.roleId,
      category: 'auth', action: 'logout', ipAddress: req.ip, staffSessionId: req.staff.sessionId,
    }).catch(() => {});
    res.json({ ok: true });
  });

  router.get('/me', requireStaffAuth(pool), (req, res) => {
    res.json({ user: req.staff });
  });

  return router;
};
```

- [ ] Run tests — verify they pass
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=auth.test
# Expected: PASS — 4 tests
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/auth.js volunteerflow/backend/src/__tests__/staff/auth.test.js volunteerflow/backend/src/db.js
git commit -m "feat: staff auth routes (login, logout, me) + role seed data"
```

---

### Task 6: Mount staff router in Express app

**Files:**
- Create: `volunteerflow/backend/src/staff/index.js`
- Modify: `volunteerflow/backend/src/index.js`
- Modify: `volunteerflow/backend/.env.example`

- [ ] Create `volunteerflow/backend/src/staff/index.js`:

```javascript
'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth',      require('./auth')(pool));
  router.use('/orgs',      require('./orgs')(pool));
  router.use('/support',   require('./support')(pool));
  router.use('/audit',     require('./audit')(pool));
  router.use('/employees', require('./employees')(pool));
  router.use('/roles',     require('./roles')(pool));
  return router;
};
```

- [ ] In `volunteerflow/backend/src/index.js`, after existing routes are mounted, add:
```javascript
const createStaffRouter = require('./staff/index');
app.use('/api/staff', createStaffRouter(pool));
```

- [ ] Add to `volunteerflow/backend/.env.example`:
```
# Staff Dashboard (internal employee access)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
STAFF_JWT_SECRET=replace-with-64-char-random-hex-string
```

- [ ] Restart backend and verify `/api/staff/auth/login` responds (even with 401):
```bash
curl -s -X POST http://localhost:3001/api/staff/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"x","password":"y"}' | jq .
# Expected: {"error":"Invalid credentials"}
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/index.js volunteerflow/backend/src/index.js volunteerflow/backend/.env.example
git commit -m "feat: mount staff router at /api/staff"
```

---

### Task 7: Frontend — staffApi.ts + staffPermissions.ts

**Files:**
- Create: `volunteerflow/frontend/src/lib/staffApi.ts`
- Create: `volunteerflow/frontend/src/lib/staffPermissions.ts`

- [ ] Create `volunteerflow/frontend/src/lib/staffPermissions.ts`:

```typescript
export const PERMISSIONS = {
  ORGS_VIEW:            'orgs.view',
  ORGS_VIEW_SENSITIVE:  'orgs.view_sensitive',
  ORGS_EDIT_BASIC:      'orgs.edit_basic',
  ORGS_EDIT_CONTACT:    'orgs.edit_contact',
  ORGS_EDIT_PLAN:       'orgs.edit_plan',
  ORGS_EDIT_STATUS:     'orgs.edit_status',
  ORGS_EDIT_BILLING:    'orgs.edit_billing',
  ORGS_ASSIGN_REP:      'orgs.assign_rep',
  NOTES_VIEW:           'notes.view',
  NOTES_CREATE:         'notes.create',
  NOTES_EDIT_OWN:       'notes.edit_own',
  NOTES_EDIT_ANY:       'notes.edit_any',
  NOTES_DELETE:         'notes.delete',
  AUDIT_VIEW_ORG:       'audit.view_org',
  AUDIT_VIEW_ALL:       'audit.view_all',
  AUDIT_EXPORT:         'audit.export',
  SUPPORT_VIEW_MODE:    'support.view_mode',
  SUPPORT_IMPERSONATION:'support.impersonation',
  EMPLOYEES_VIEW:       'employees.view',
  EMPLOYEES_CREATE:     'employees.create',
  EMPLOYEES_EDIT:       'employees.edit',
  EMPLOYEES_DISABLE:    'employees.disable',
  ROLES_VIEW:           'roles.view',
  ROLES_MANAGE:         'roles.manage',
  FEATURE_FLAGS_MANAGE: 'feature_flags.manage',
  DASHBOARD_MGMT:       'dashboard.view_management_metrics',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function canDo(permissions: string[], perm: Permission): boolean {
  return permissions.includes(perm);
}
```

- [ ] Create `volunteerflow/frontend/src/lib/staffApi.ts`:

```typescript
const BASE = '/api/staff';

export class StaffApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getStaffToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vf_staff_token');
}

function getSupportSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('vf_support_session');
    if (!raw) return null;
    return JSON.parse(raw).sessionId ?? null;
  } catch {
    return null;
  }
}

async function staffFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = getStaffToken();
  const supportSessionId = getSupportSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(supportSessionId ? { 'X-Support-Session-Id': supportSessionId } : {}),
    ...(init.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Clear ONLY staff auth state — never touch vf_token or vf_user
    localStorage.removeItem('vf_staff_token');
    localStorage.removeItem('vf_staff_user');
    window.location.href = '/staff/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StaffApiError(data?.error ?? 'Request failed', res.status, data);
  return data;
}

export const staffApi = {
  get:    (path: string)                    => staffFetch(path),
  post:   (path: string, body: unknown)     => staffFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown)     => staffFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string)                    => staffFetch(path, { method: 'DELETE' }),
};
```

- [ ] Commit
```bash
git add volunteerflow/frontend/src/lib/staffApi.ts volunteerflow/frontend/src/lib/staffPermissions.ts
git commit -m "feat: staffApi.ts fetch wrapper + staffPermissions constants"
```

---

### Task 8: StaffAuthContext + SupportViewContext

**Files:**
- Create: `volunteerflow/frontend/src/context/StaffAuthContext.tsx`
- Create: `volunteerflow/frontend/src/context/SupportViewContext.tsx`

- [ ] Create `volunteerflow/frontend/src/context/StaffAuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { staffApi } from '../lib/staffApi';
import { canDo, Permission } from '../lib/staffPermissions';

interface StaffUser {
  staffId: string; email: string; name: string;
  roleId: string; permissions: string[]; sessionId: string;
}

interface StaffAuthCtx {
  staffUser: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  canDo: (perm: Permission) => boolean;
  logout: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthCtx | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vf_staff_user');
    if (raw) {
      try { setStaffUser(JSON.parse(raw)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const logout = async () => {
    await staffApi.post('/auth/logout', {}).catch(() => {});
    localStorage.removeItem('vf_staff_token');
    localStorage.removeItem('vf_staff_user');
    setStaffUser(null);
    window.location.href = '/staff/login';
  };

  return (
    <StaffAuthContext.Provider value={{
      staffUser,
      isAuthenticated: !!staffUser,
      isLoading,
      canDo: (perm) => canDo(staffUser?.permissions ?? [], perm),
      logout,
    }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be inside StaffAuthProvider');
  return ctx;
}
```

- [ ] Create `volunteerflow/frontend/src/context/SupportViewContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { staffApi } from '../lib/staffApi';

interface SupportSession {
  sessionId: string; orgId: string; orgName: string;
  mode: 'view_only' | 'support'; startedAt: string;
}

interface SupportViewCtx {
  session: SupportSession | null;
  isInSupportView: boolean;
  exitSupportView: () => Promise<void>;
}

const SupportViewContext = createContext<SupportViewCtx | null>(null);

export function SupportViewProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SupportSession | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('vf_support_session');
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch {}
    }
  }, []);

  // Heartbeat every 60s
  useEffect(() => {
    if (!session) return;
    heartbeatRef.current = setInterval(() => {
      staffApi.patch(`/support/${session.sessionId}/pages`, { type: 'heartbeat' }).catch(() => {});
    }, 60_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [session]);

  // sendBeacon on tab close
  useEffect(() => {
    if (!session) return;
    const handler = () => {
      navigator.sendBeacon(`/api/staff/support/exit`, JSON.stringify({ sessionId: session.sessionId }));
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [session]);

  const exitSupportView = async () => {
    if (!session) return;
    await staffApi.post('/support/exit', { sessionId: session.sessionId }).catch(() => {});
    sessionStorage.removeItem('vf_support_session');
    setSession(null);
    window.location.href = `/staff/orgs/${session.orgId}`;
  };

  return (
    <SupportViewContext.Provider value={{ session, isInSupportView: !!session, exitSupportView }}>
      {children}
    </SupportViewContext.Provider>
  );
}

export function useSupportView() {
  const ctx = useContext(SupportViewContext);
  if (!ctx) throw new Error('useSupportView must be inside SupportViewProvider');
  return ctx;
}
```

- [ ] Commit
```bash
git add volunteerflow/frontend/src/context/StaffAuthContext.tsx volunteerflow/frontend/src/context/SupportViewContext.tsx
git commit -m "feat: StaffAuthContext + SupportViewContext"
```

---

### Task 9: Staff UI shell components

**Files:**
- Create: `volunteerflow/frontend/src/components/staff/PermissionGate.tsx`
- Create: `volunteerflow/frontend/src/components/staff/SupportBanner.tsx`
- Create: `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx`
- Create: `volunteerflow/frontend/src/components/staff/StaffHeader.tsx`
- Create: `volunteerflow/frontend/src/components/staff/StaffLayout.tsx`

- [ ] Create `PermissionGate.tsx`:
```typescript
import { useStaffAuth } from '../../context/StaffAuthContext';
import { Permission } from '../../lib/staffPermissions';

interface Props {
  perm: Permission;
  mode?: 'hide' | 'disable';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ perm, mode = 'hide', fallback = null, children }: Props) {
  const { canDo } = useStaffAuth();
  if (canDo(perm)) return <>{children}</>;
  if (mode === 'disable') return (
    <div className="opacity-50 pointer-events-none cursor-not-allowed" title={`Requires: ${perm}`}>
      {children}
    </div>
  );
  return <>{fallback}</>;
}
```

- [ ] Create `SupportBanner.tsx`:
```typescript
import { useSupportView } from '../../context/SupportViewContext';

export function SupportBanner() {
  const { session, isInSupportView, exitSupportView } = useSupportView();
  if (!isInSupportView || !session) return null;

  const minutesAgo = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">🛟</span>
        <span>
          SUPPORT VIEW — <strong>{session.orgName}</strong>
          {' '}· {session.mode === 'view_only' ? 'View Only' : 'Support Mode'}
          {' '}· Started {minutesAgo}m ago
        </span>
      </div>
      <button
        onClick={exitSupportView}
        className="bg-amber-800 text-white px-3 py-1 rounded text-xs hover:bg-amber-900 transition"
      >
        Exit Support View
      </button>
    </div>
  );
}
```

- [ ] Create `StaffSidebar.tsx` with nav links for: Home, Organizations, Audit Log, Employees, Roles.

- [ ] Create `StaffHeader.tsx` with: staff user name/role display + logout button.

- [ ] Create `StaffLayout.tsx`:
```typescript
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { SupportBanner } from './SupportBanner';
import { StaffSidebar } from './StaffSidebar';
import { StaffHeader } from './StaffHeader';
import { Permission } from '../../lib/staffPermissions';

interface Props {
  children: React.ReactNode;
  requiredPerm?: Permission;
}

export function StaffLayout({ children, requiredPerm }: Props) {
  const { isAuthenticated, isLoading, canDo } = useStaffAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/staff/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return null;
  if (requiredPerm && !canDo(requiredPerm)) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm mt-1">You need <code>{requiredPerm}</code> to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SupportBanner />
      <StaffSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <StaffHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] Commit
```bash
git add volunteerflow/frontend/src/components/staff/
git commit -m "feat: staff shell components (StaffLayout, SupportBanner, PermissionGate, Sidebar, Header)"
```

---

### Task 10: Staff login page + providers in _app.tsx

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/login.tsx`
- Modify: `volunteerflow/frontend/src/pages/_app.tsx`

- [ ] Create `volunteerflow/frontend/src/pages/staff/login.tsx` — standalone page (no StaffLayout):

```typescript
import { useState } from 'react';
import { useRouter } from 'next/router';
import { staffApi } from '../../lib/staffApi';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await staffApi.post('/auth/login', { email, password }) as any;
      localStorage.setItem('vf_staff_token', res.token);
      localStorage.setItem('vf_staff_user', JSON.stringify(res.user));
      router.replace('/staff');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 shadow-2xl">
        <h1 className="text-white text-xl font-bold mb-1">VolunteerFlow Staff</h1>
        <p className="text-gray-400 text-sm mb-6">Internal access only</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Staff email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] In `volunteerflow/frontend/src/pages/_app.tsx`, wrap the app with `StaffAuthProvider` and `SupportViewProvider` (they render nothing for non-staff routes):
```typescript
import { StaffAuthProvider } from '../context/StaffAuthContext';
import { SupportViewProvider } from '../context/SupportViewContext';
// wrap existing providers: <StaffAuthProvider><SupportViewProvider>...<SupportBanner />
```
Also add `<SupportBanner />` as a sibling of the main content so it renders on any page during support view.

- [ ] Start dev server and manually verify `/staff/login` renders without errors:
```bash
cd volunteerflow/frontend && npm run dev
# Open http://localhost:3000/staff/login
# Expected: dark login form with "VolunteerFlow Staff" heading
```

- [ ] Commit
```bash
git add volunteerflow/frontend/src/pages/staff/login.tsx volunteerflow/frontend/src/pages/_app.tsx
git commit -m "feat: staff login page + providers in _app.tsx"
```

---

## Phase P2 — Org Search

### Task 11: Backend org search endpoint

**Files:**
- Create: `volunteerflow/backend/src/staff/orgs.js`
- Create: `volunteerflow/backend/src/__tests__/staff/orgs.test.js`

- [ ] Write failing test:
```javascript
// volunteerflow/backend/src/__tests__/staff/orgs.test.js
const request = require('supertest');
const express = require('express');
process.env.STAFF_JWT_SECRET = 'test-staff-secret-minimum-64-chars-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const jwt = require('jsonwebtoken');

function buildOrgsApp(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/staff/orgs', require('../../staff/orgs')(pool));
  return app;
}

function makeToken(permissions = ['orgs.view']) {
  return jwt.sign(
    { staffId: 'su1', email: 'a@b.com', name: 'A', roleId: 'role_owner', permissions, sessionId: 'sess1' },
    process.env.STAFF_JWT_SECRET, { expiresIn: '8h' }
  );
}

function activeSessionPool(extraQueryResults = []) {
  const pool = { query: jest.fn() };
  // stale UPDATE, session SELECT, last_seen UPDATE, then extra results
  pool.query
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ is_active: true }] })
    .mockResolvedValueOnce({ rows: [] });
  extraQueryResults.forEach(r => pool.query.mockResolvedValueOnce(r));
  return pool;
}

describe('GET /api/staff/orgs', () => {
  test('rejects unauthenticated', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const res = await request(buildOrgsApp(pool)).get('/api/staff/orgs');
    expect(res.status).toBe(401);
  });

  test('returns org list', async () => {
    const pool = activeSessionPool([
      { rows: [{ id: 'u1', org_name: 'Habitat', plan: 'grow', volunteer_count: 5, event_count: 2 }] },
      { rows: [{ total: 1 }] },
    ]);
    const res = await request(buildOrgsApp(pool))
      .get('/api/staff/orgs')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.orgs).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});
```

- [ ] Run to verify fail, then implement `volunteerflow/backend/src/staff/orgs.js` with:
  - `GET /` — search with `q`, `plan`, `status` filters, pagination, `logStaffAudit` on search
  - `GET /:id` — full org detail (strips sensitive fields if no `orgs.view_sensitive`), logs view
  - `PATCH /:id` — permission-gated field updates with field-level `before/after` diff logging
  - `GET /:id/notes` — paginated notes (`WHERE is_deleted = false`)
  - `POST /:id/notes` — create note, log
  - `PATCH /:id/notes/:nid` — edit own/any, log
  - `DELETE /:id/notes/:nid` — soft delete (`SET is_deleted = true, updated_by, updated_at`), log
  - `GET /:id/activity` — union of `staff_audit_logs` + `audit_logs` for that org, last 50

- [ ] Run tests:
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=orgs.test
# Expected: PASS
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/orgs.js volunteerflow/backend/src/__tests__/staff/orgs.test.js
git commit -m "feat: staff org search, detail, edit, notes, activity endpoints"
```

---

### Task 12: Frontend org search page

**Files:**
- Create: `volunteerflow/frontend/src/components/staff/OrgSearchTable.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/orgs/index.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/index.tsx`

- [ ] Create `OrgSearchTable.tsx` — renders a table with columns: Org name + ID chip, Owner, Plan badge (colored), Status badge (colored), Volunteers, Events, Joined, Last Activity, Open button. Each row's "Open" navigates to `/staff/orgs/[id]` and writes to `vf_staff_recent_orgs` in localStorage (max 10).

- [ ] Create `/staff/orgs/index.tsx`:
  - `StaffLayout` wrapper with `requiredPerm="orgs.view"`
  - Debounced search input (300ms) + filter row (Plan, Status dropdowns)
  - On empty search: show "Recently Viewed" section from localStorage
  - `OrgSearchTable` with pagination

- [ ] Create `/staff/index.tsx` (staff home):
  - `StaffLayout` wrapper
  - Large search bar that navigates to `/staff/orgs?q=<query>`
  - Recently viewed orgs list
  - Management metrics panel (only if `canDo('dashboard.view_management_metrics')`) — fetch from `/api/staff/audit?limit=5&category=support_view` and `/api/staff/support/active`

- [ ] Manually test: log in, navigate to `/staff/orgs`, search for an org, verify table renders.

- [ ] Commit
```bash
git add volunteerflow/frontend/src/components/staff/OrgSearchTable.tsx volunteerflow/frontend/src/pages/staff/
git commit -m "feat: staff org search page + staff home dashboard"
```

---

## Phase P3 — Org Workspace

### Task 13: Frontend org workspace page

**Files:**
- Create: `volunteerflow/frontend/src/components/staff/OrgWorkspaceTabs.tsx`
- Create: `volunteerflow/frontend/src/components/staff/NoteEditor.tsx`
- Create: `volunteerflow/frontend/src/components/staff/AuditLogTable.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/orgs/[id].tsx`

- [ ] Create `AuditLogTable.tsx` — generic filterable table for audit entries. Props: `entries`, `loading`. Renders: timestamp, actor, action description, target, outcome badge. Outcome badges: green ✓ for success, red ✗ for denied, amber ⚠ for error.

- [ ] Create `NoteEditor.tsx` — form with content textarea, important toggle, tags input (comma-separated). Props: `orgId`, `existingNote` (for edit mode), `onSave`, `onCancel`.

- [ ] Create `OrgWorkspaceTabs.tsx` — tab controller with tabs: Overview, Account, Notes, Activity, Billing, Sessions. Each tab only renders its content when active.

- [ ] Create `/staff/orgs/[id].tsx`:

  **Header:** Org name, plan badge, status badge, owner name/email, account ID chip, joined date, last login. Action bar with `[Open Customer View]` (PermissionGate: `support.view_mode`), `[Edit Org]` (PermissionGate: `orgs.edit_basic`).

  **Overview tab:** Stats row (volunteers, events, pending apps, hours). Account health row (subscription status, last login). Recent notes (2, with "View all" to Notes tab). Recent customer activity (5 entries from audit_logs).

  **Account tab:** Editable form sections (org info, owner info read-only, plan, status). Fields without edit permission show lock icon. Confirmation modal for status/plan changes with required reason field.

  **Notes tab:** Paginated notes list. `[+ New Note]` button. `NoteEditor` in modal. Edit/delete buttons gated by `notes.edit_own`/`notes.edit_any`/`notes.delete`.

  **Activity tab:** Combined timeline from `/api/staff/orgs/:id/activity`. Source label (Staff / Org). Date range filter.

  **Billing tab:** `PermissionGate perm="orgs.view_sensitive"` wrapper. Stripe IDs (copyable), invoice history. Edit controls gated by `orgs.edit_billing`.

  **Sessions tab:** List of past support sessions from `GET /api/staff/orgs/:id/activity`.

- [ ] Manually navigate to an org workspace and verify all tabs render. Verify notes create/edit works.

- [ ] Commit
```bash
git add volunteerflow/frontend/src/components/staff/OrgWorkspaceTabs.tsx volunteerflow/frontend/src/components/staff/NoteEditor.tsx volunteerflow/frontend/src/components/staff/AuditLogTable.tsx volunteerflow/frontend/src/pages/staff/orgs/[id].tsx
git commit -m "feat: org workspace page with Overview, Account, Notes, Activity, Billing, Sessions tabs"
```

---

## Phase P4 — Customer View Mode

### Task 14: Backend support session endpoints

**Files:**
- Create: `volunteerflow/backend/src/staff/support.js`
- Create: `volunteerflow/backend/src/__tests__/staff/support.test.js`

- [ ] Write failing tests:
```javascript
// key tests to include:
// - POST /enter rejects without reason field
// - POST /enter rejects support mode without support.impersonation permission
// - POST /enter creates session and returns sessionId
// - POST /exit marks session inactive
// - GET /active requires audit.view_all
// - GET /active expires stale sessions before returning
```

- [ ] Run to verify fail, then implement `volunteerflow/backend/src/staff/support.js`:

```javascript
// POST /enter
router.post('/enter', requireStaffAuth(pool), requirePermission('support.view_mode', pool), async (req, res) => {
  const { orgId, mode = 'view_only', reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'reason is required' });
  if (mode === 'support' && !req.staff.permissions.includes('support.impersonation')) {
    return res.status(403).json({ error: 'support.impersonation permission required' });
  }
  const org = await pool.query('SELECT id, org_name FROM users WHERE id = $1', [orgId]);
  if (!org.rows[0]) return res.status(404).json({ error: 'Org not found' });
  const sessionId = `supsess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  await pool.query(
    'INSERT INTO support_sessions (id, staff_user_id, org_id, mode, reason) VALUES ($1,$2,$3,$4,$5)',
    [sessionId, req.staff.staffId, orgId, mode, reason.trim()]
  );
  logStaffAudit(pool, { ...req.staff fields..., category: 'support_view', action: 'entered',
    targetOrgId: orgId, targetOrgName: org.rows[0].org_name, resourceType: 'support_session',
    resourceId: sessionId, reason: reason.trim(), metadata: { mode } }).catch(() => {});
  res.json({ sessionId, orgId, orgName: org.rows[0].org_name, mode });
});

// POST /exit — marks inactive, logs exit
// PATCH /:id/pages — appends page visit or heartbeat to pages_visited JSONB array
// GET /active — runs stale expiry then returns active sessions (requires audit.view_all)
```

- [ ] Run tests:
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=support.test
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/support.js volunteerflow/backend/src/__tests__/staff/support.test.js
git commit -m "feat: support session enter/exit/pages/active endpoints"
```

---

### Task 15: Backend support view data endpoints

**Files:**
- Modify: `volunteerflow/backend/src/staff/orgs.js` (add 6 support view GET routes)

- [ ] Add to `orgs.js` — all six endpoints use `requireStaffAuth + requirePermission('orgs.view') + validateSupportSession`:

```javascript
// GET /:id/dashboard-stats  — volunteer/event/app/hours counts for org
// GET /:id/volunteers        — SELECT * FROM volunteers WHERE org_id = $1
// GET /:id/events            — SELECT * FROM events WHERE org_id = $1
// GET /:id/applications      — SELECT * FROM applications WHERE org_id = $1
// GET /:id/hours             — SELECT * FROM hours_log WHERE org_id = $1 (if table exists)
// GET /:id/settings          — SELECT * FROM org_settings WHERE id = $1

// Each endpoint appends page visit to support session:
// if req.headers['x-support-session-id']:
//   pool.query("UPDATE support_sessions SET pages_visited = pages_visited || $1::jsonb WHERE id = $2",
//     [JSON.stringify([{path: req.path, timestamp: new Date()}]), sessionId]).catch(()=>{})
```

- [ ] Manually test: enter a support session, then `curl /api/staff/orgs/:id/volunteers` without the session header → expect 403. With valid session header → expect data.

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/orgs.js
git commit -m "feat: support view data endpoints with validateSupportSession IDOR guard"
```

---

### Task 16: Frontend support view shell

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/index.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/volunteers.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/events.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/applications.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/hours.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/support/[orgId]/settings.tsx`

- [ ] On the org workspace page (`/staff/orgs/[id].tsx`), implement the "Open Customer View" button:
  - Clicking opens a modal: mode selector (view_only default, support if `canDo('support.impersonation')`), required reason textarea, confirm button
  - On confirm: `POST /api/staff/support/enter` → store result in `sessionStorage` as `vf_support_session` → navigate to `/staff/support/[orgId]`

- [ ] Create `/staff/support/[orgId]/index.tsx` — the support view dashboard:
  - Reads `sessionStorage` for `vf_support_session`; if absent, redirects to `/staff/orgs`
  - Fetches from `/api/staff/orgs/[orgId]/dashboard-stats`
  - Renders the same stats/chart layout as the customer dashboard (`/index.tsx`) but feeding it org data
  - Left nav mirrors the customer `Sidebar.tsx` — links point to `/staff/support/[orgId]/[page]`
  - `SupportBanner` is already rendered globally via `_app.tsx`

- [ ] Create the remaining 5 sub-pages — each fetches from the appropriate `/api/staff/orgs/:id/[resource]` endpoint and renders the same components as the equivalent customer page, with all edit controls hidden in `view_only` mode (check `session.mode` from `SupportViewContext`).

- [ ] Manually test the full support view flow: enter, navigate pages, verify banner always shows, exit returns to org workspace.

- [ ] Commit
```bash
git add volunteerflow/frontend/src/pages/staff/support/
git commit -m "feat: customer view mode shell pages with support banner"
```

---

## Phase P5 — Audit & Oversight

### Task 17: Backend audit endpoint + export

**Files:**
- Create: `volunteerflow/backend/src/staff/audit.js`
- Create: `volunteerflow/backend/src/__tests__/staff/audit.test.js`

- [ ] Write failing tests (key cases: requires `audit.view_all`, filters work, export requires `audit.export`).

- [ ] Implement `volunteerflow/backend/src/staff/audit.js`:
  - `GET /` — filtered paginated query on `staff_audit_logs` with params: `staffUserId`, `targetOrgId`, `category`, `outcome`, `from`, `to`, `q`, `page`, `limit`
  - `GET /export` — same query, streams CSV response. Columns: `timestamp, staff_user_name, staff_role, target_org_name, category, action, resource_type, outcome, reason, field_changes`. Logs the export itself before streaming.
  - CSV streaming: use `res.setHeader('Content-Type', 'text/csv')`, write header row first, then iterate rows writing comma-separated values with proper escaping (wrap fields containing commas/newlines in quotes).

- [ ] Run tests:
```bash
cd volunteerflow/backend && npm test -- --testPathPattern=audit.test
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/audit.js volunteerflow/backend/src/__tests__/staff/audit.test.js
git commit -m "feat: staff audit log endpoint + CSV export"
```

---

### Task 18: Frontend audit page + management panel

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/audit.tsx`
- Modify: `volunteerflow/frontend/src/pages/staff/index.tsx` (add management panel)

- [ ] Create `/staff/audit.tsx`:
  - `StaffLayout` with `requiredPerm="audit.view_all"`
  - Filter row: staff member select, org search, category select, outcome select, date range pickers, text search
  - `AuditLogTable` fed from `/api/staff/audit`
  - Field change diffs rendered as `"before" → "after"` inline (expandable JSON for complex objects)
  - Export button (PermissionGate: `audit.export`) triggers `GET /api/staff/audit/export` download

- [ ] Update `/staff/index.tsx` management panel (renders only if `canDo('dashboard.view_management_metrics')`):
  - Fetch from `/api/staff/audit?limit=10` for recent high-risk actions
  - Fetch from `/api/staff/support/active` for active sessions widget
  - Fetch from `/api/staff/audit?category=auth&action=denied&from=[7daysago]` for denial count
  - Render: total actions (7d), orgs accessed, denied attempts, active sessions now, recent high-risk list, top 3 most active staff

- [ ] Manually verify: visit `/staff/audit`, apply filters, verify export download works.

- [ ] Commit
```bash
git add volunteerflow/frontend/src/pages/staff/audit.tsx volunteerflow/frontend/src/pages/staff/index.tsx
git commit -m "feat: staff audit log page + management oversight panel"
```

---

## Phase P6 — Staff Management

### Task 19: Backend employees + roles endpoints

**Files:**
- Create: `volunteerflow/backend/src/staff/employees.js`
- Create: `volunteerflow/backend/src/staff/roles.js`
- Create: `volunteerflow/backend/src/__tests__/staff/employees.test.js`

- [ ] Write tests for employees: list requires `employees.view`, create requires `employees.create`, disable requires `employees.disable` (not just `employees.edit`).

- [ ] Implement `volunteerflow/backend/src/staff/employees.js`:
  - `GET /` — list all staff_users with role name joined
  - `POST /` — create staff user (bcrypt hash password, assign role, log)
  - `GET /:id` — single staff user detail
  - `PATCH /:id` — update name/title/role (log field changes)
  - `PATCH /:id/disable` — set `is_active = false`, log with `employees.disable` permission

- [ ] Implement `volunteerflow/backend/src/staff/roles.js`:
  - `GET /` — list all staff roles with permissions
  - `POST /` — create custom role (non-system)
  - `PATCH /:id` — update role name/description/permissions (system roles cannot have permissions removed below their minimum set — enforce server-side)

- [ ] Run tests:
```bash
cd volunteerflow/backend && npm test
# All tests should pass
```

- [ ] Commit
```bash
git add volunteerflow/backend/src/staff/employees.js volunteerflow/backend/src/staff/roles.js volunteerflow/backend/src/__tests__/staff/employees.test.js
git commit -m "feat: staff employee management + role management endpoints"
```

---

### Task 20: Frontend employee + role pages

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/employees/index.tsx`
- Create: `volunteerflow/frontend/src/pages/staff/employees/[id].tsx`
- Create: `volunteerflow/frontend/src/pages/staff/roles.tsx`

- [ ] Create `/staff/employees/index.tsx`:
  - `StaffLayout requiredPerm="employees.view"`
  - Table: name, email, title, role badge, status (active/disabled), last login, actions
  - `[+ Add Employee]` button (PermissionGate: `employees.create`) opens a create modal

- [ ] Create `/staff/employees/[id].tsx`:
  - Staff member detail: name, email, title, role, status, created by, last login
  - Edit form (PermissionGate: `employees.edit`)
  - Disable button (PermissionGate: `employees.disable`) with confirmation modal

- [ ] Create `/staff/roles.tsx`:
  - `StaffLayout requiredPerm="roles.view"`
  - Roles list with permission badges
  - `[Edit]` button (PermissionGate: `roles.manage`) expands an inline permission editor (checkbox grid of all PERMISSIONS constants)

- [ ] Commit
```bash
git add volunteerflow/frontend/src/pages/staff/employees/ volunteerflow/frontend/src/pages/staff/roles.tsx
git commit -m "feat: staff employee directory + role management pages"
```

---

## Final: Create first staff owner account

- [ ] Add a one-time admin script to create the initial staff owner:

```javascript
// volunteerflow/backend/scripts/create-staff-owner.js
// Usage: node scripts/create-staff-owner.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = process.env.STAFF_EMAIL || 'owner@volunteerflow.internal';
  const password = process.env.STAFF_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(password, 12);
  const id = `su_${Date.now()}`;
  await pool.query(
    'INSERT INTO staff_users (id, email, password_hash, full_name, role_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING',
    [id, email, hash, 'VolunteerFlow Owner', 'role_owner']
  );
  console.log(`Staff owner created: ${email} / ${password}`);
  console.log('Change this password immediately after first login.');
  await pool.end();
}
main().catch(console.error);
```

- [ ] Run the script:
```bash
cd volunteerflow/backend && node scripts/create-staff-owner.js
```

- [ ] Log in at `/staff/login` with the owner credentials, verify the full dashboard loads.

- [ ] Commit
```bash
git add volunteerflow/backend/scripts/create-staff-owner.js
git commit -m "chore: add create-staff-owner bootstrap script"
```

---

## Security Checklist (verify before declaring done)

- [ ] `STAFF_JWT_SECRET` is in `.env.example` with generation command, 64+ chars in actual `.env`
- [ ] All `/api/staff/*` routes require `requireStaffAuth(pool)` — no unprotected routes
- [ ] All data-access routes have `requirePermission(perm, pool)` stacked
- [ ] `validateSupportSession` is on all 6 support view data endpoints
- [ ] `staffApi.ts` 401 handler only clears `vf_staff_*` keys
- [ ] `reason` field rejected if empty/missing on `POST /support/enter` (backend check, not just frontend)
- [ ] `support` mode is double-checked: `requirePermission('support.view_mode')` + explicit `support.impersonation` check in handler body
- [ ] `notes.delete` soft-deletes (sets `is_deleted = true`) — rows are never physically deleted
- [ ] All note list queries filter `WHERE is_deleted = false`
- [ ] Stale session expiry runs in `requireStaffAuth` (non-blocking fire-and-forget on every request)
- [ ] `PATCH /employees/:id/disable` uses `requirePermission('employees.disable')` — separate from edit
- [ ] Staff login has its own `express-rate-limit` (10 attempts / 15 min per IP)
