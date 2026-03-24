# VolunteerFlow Internal Employee Dashboard — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Internal staff operations dashboard for VolunteerFlow employees

---

## 1. Purpose

This document specifies the design for the VolunteerFlow Internal Employee Dashboard — a secure, auditable internal tool used exclusively by VolunteerFlow staff (support agents, managers, onboarding specialists, billing staff, admins, and owners) to manage customer organizations, provide support, and monitor team activity.

This is not a customer-facing feature. It is a premium internal SaaS operations platform.

---

## 2. Context & Constraints

### Existing stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, custom component library (Button, Card, Layout, Sidebar)
- **Backend:** Express.js REST API (`src/index.js`), raw SQL via `pg`, PostgreSQL 15
- **Auth:** JWT-based (`jsonwebtoken`), `requireAuth` middleware pattern, bcryptjs password hashing
- **Existing audit system:** `audit_logs` table with `user_id`, `user_name`, `user_role`, `category`, `verb`, `resource`, `detail`, `ip`
- **Existing RBAC:** `org_roles` table with `permissions JSONB` pattern — reused as the model for staff RBAC
- **Dev portal precedent:** `/dev/*` route namespace already demonstrates internal-only sections in this codebase

### Key constraints
- **Single-tenant data → multi-tenant migration required:** `volunteers`, `events`, `applications`, and related tables currently have no `org_id` column. A migration adds `org_id` (= the customer's `users.id`) to all org-scoped tables.
- **Staff identity is completely separate from customer identity.** Staff use a separate table, separate JWT secret, separate login page. Zero overlap with customer auth.
- **Everything meaningful must be logged.** The staff member is always the actor in every log entry — even during customer view mode.

---

## 3. Architecture: Integrated Staff Module (Approach 1)

The staff dashboard lives at `/staff/*` inside the existing Next.js app, with backend routes at `/api/staff/*`. It shares the existing database, Tailwind components, and design system — but has fully separate auth, routing, layout, and API surface.

### Why this approach
- Customer View Mode works naturally — same app, same components
- No code duplication (reuse Button, Card, charts)
- One deployment, one Docker Compose
- Dev portal (`/dev/*`) already proves the pattern

### Auth separation

| | Customer auth | Staff auth |
|---|---|---|
| Token localStorage key | `vf_token` | `vf_staff_token` |
| User localStorage key | `vf_user` | `vf_staff_user` |
| DB table | `users` | `staff_users` |
| Backend middleware | `requireAuth` | `requireStaffAuth` |
| Login page | `/auth` | `/staff/login` |
| JWT secret env var | `JWT_SECRET` | `STAFF_JWT_SECRET` |
| Token expiry | 7 days | 8 hours |

---

## 4. Database Schema

### New tables

```sql
-- Staff roles (RBAC)
CREATE TABLE staff_roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system   BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Staff users (VolunteerFlow internal employees only)
CREATE TABLE staff_users (
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
CREATE TABLE staff_sessions (
  id            TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id),
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true
);

-- Staff audit log (separate from customer audit_logs)
CREATE TABLE staff_audit_logs (
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

CREATE INDEX idx_staff_audit_timestamp  ON staff_audit_logs(timestamp DESC);
CREATE INDEX idx_staff_audit_staff_user ON staff_audit_logs(staff_user_id);
CREATE INDEX idx_staff_audit_target_org ON staff_audit_logs(target_org_id);
CREATE INDEX idx_staff_audit_category   ON staff_audit_logs(category);

-- Internal notes on customer orgs
CREATE TABLE org_notes (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  created_by   TEXT NOT NULL REFERENCES staff_users(id),
  content      TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ,
  updated_by   TEXT REFERENCES staff_users(id),
  is_deleted   BOOLEAN DEFAULT false
);

CREATE INDEX idx_org_notes_org_id ON org_notes(org_id);

-- Support / customer view sessions
CREATE TABLE support_sessions (
  id            TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id),
  org_id        TEXT NOT NULL,
  mode          TEXT NOT NULL,
  reason        TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  pages_visited JSONB DEFAULT '[]'
);

CREATE INDEX idx_support_sessions_org    ON support_sessions(org_id);
CREATE INDEX idx_support_sessions_staff  ON support_sessions(staff_user_id);
CREATE INDEX idx_support_sessions_active ON support_sessions(is_active);
```

### Multi-tenancy migration on existing tables

**Tables that require `org_id`** (org-scoped data):
- `volunteers`, `events`, `applications`, `members`, `employees`, `files`, `folders`
- `training_courses`, `training_assignments`, `training_completions`
- `audit_logs` (plus two new columns for support-view tracking)
- `org_settings` — change primary key strategy from `id='default'` to `id = users.id` (org owner's user ID)
- `portal_settings` — add `org_id` column (currently uses `portal_type` only)
- `qr_campaigns`, `qr_codes`, `people_groups`, `group_members`
- `message_templates`, `auto_reminders`, `sent_messages`
- `login_notifications`, `invoices`

**Tables intentionally global** (not org-scoped):
- `staff_users`, `staff_roles`, `staff_sessions`, `staff_audit_logs`, `org_notes`, `support_sessions` — these are VolunteerFlow-internal
- `job_notif_rules` — platform-level configuration

```sql
-- PRE-FLIGHT ASSERTION: abort if more than one user (org) exists.
-- This backfill is only safe for single-org deployments.
-- Multi-org environments must perform a manual data mapping before running.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users) > 1 THEN
    RAISE EXCEPTION 'Multi-org backfill not supported. Map org_id manually before migrating.';
  END IF;
END $$;

-- Add org_id columns
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

-- Backfill all existing rows to the single org
-- (safe only after the pre-flight assertion above passes)
UPDATE volunteers           SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE events               SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE applications         SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE members              SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE employees            SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE files                SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE folders              SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE training_courses     SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE training_assignments SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE training_completions SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE qr_campaigns         SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE qr_codes             SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE people_groups        SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE group_members        SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE message_templates    SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE auto_reminders       SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE sent_messages        SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE login_notifications  SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE invoices             SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE portal_settings      SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;
UPDATE audit_logs           SET org_id = (SELECT id FROM users LIMIT 1) WHERE org_id IS NULL;

-- org_settings: update the existing 'default' row to use the org's user ID
UPDATE org_settings SET id = (SELECT id FROM users LIMIT 1) WHERE id = 'default';
```

### Staff roles seed data

| Role ID | Name | Key permissions |
|---|---|---|
| `role_owner` | Owner | All permissions including `roles.manage`, `employees.disable`, `support.impersonation`, `notes.delete` |
| `role_super_admin` | Super Admin | All except `roles.manage`, `employees.disable` — includes `support.impersonation`, `notes.delete` |
| `role_admin` | Admin | `orgs.*` (no plan/billing edit), `notes.*` (including `notes.delete`), `audit.view_org`, `audit.view_all`, `support.view_mode`, `dashboard.view_management_metrics`, `employees.view`, `roles.view` |
| `role_manager` | Manager | `orgs.view`, `orgs.edit_basic`, `notes.view`, `notes.create`, `notes.edit_own`, `audit.view_org`, `employees.view`, `dashboard.view_management_metrics` |
| `role_senior_support` | Senior Support | `orgs.view`, `orgs.view_sensitive`, `orgs.edit_basic`, `orgs.edit_contact`, `notes.view`, `notes.create`, `notes.edit_own`, `audit.view_org`, `support.view_mode` |
| `role_support_agent` | Support Agent | `orgs.view`, `orgs.edit_basic`, `notes.view`, `notes.create`, `notes.edit_own`, `support.view_mode` |
| `role_onboarding` | Onboarding Specialist | `orgs.view`, `notes.view`, `notes.create`, `notes.edit_own`, `support.view_mode` |
| `role_billing` | Billing Specialist | `orgs.view`, `orgs.view_sensitive`, `orgs.edit_billing`, `notes.view` |
| `role_read_only` | Read Only | `orgs.view`, `notes.view`, `audit.view_org` |

### Full permission key list

```
orgs.view                   orgs.view_sensitive
orgs.edit_basic             orgs.edit_contact
orgs.edit_plan              orgs.edit_status
orgs.edit_billing           orgs.assign_rep
notes.view                  notes.create
notes.edit_own              notes.edit_any
notes.delete                audit.view_org
audit.view_all              audit.export
support.view_mode           support.impersonation
employees.view              employees.create
employees.edit              employees.disable
roles.view                  roles.manage
feature_flags.manage        dashboard.view_management_metrics
```

---

## 5. Backend Middleware

### `requireStaffAuth`

- Reads `Authorization: Bearer <token>` header
- Verifies against `STAFF_JWT_SECRET` (separate from `JWT_SECRET`)
- Validates `staff_sessions` record is active
- Attaches `req.staff = { staffId, email, name, roleId, permissions, sessionId }`
- Updates `staff_sessions.last_seen` non-blocking

### `requirePermission(perm)`

- Stacks after `requireStaffAuth`
- Checks `req.staff.permissions.includes(perm)`
- Returns `403` with `{ error, required: perm }` if denied
- Logs denied attempts to `staff_audit_logs` non-blocking

### `logStaffAudit(fields)`

Non-blocking helper matching the existing `logAudit()` pattern. Called at the end of every handler that modifies state. Fields: `staffUserId`, `staffUserName`, `staffRole`, `targetOrgId`, `targetOrgName`, `category`, `action`, `resourceType`, `resourceId`, `fieldChanges`, `reason`, `ipAddress`, `staffSessionId`, `supportSessionId`, `outcome`, `metadata`.

### Staff JWT payload

```typescript
interface StaffJWTPayload {
  staffId:     string;
  email:       string;
  name:        string;
  roleId:      string;
  permissions: string[];
  sessionId:   string;
  iat:         number;
  exp:         number;   // 8h
}
```

Permissions baked into token — zero extra DB round-trips per request. Permission changes take effect on next login (documented behavior).

---

## 6. Frontend Architecture

### New files

```
src/pages/staff/
  login.tsx
  index.tsx                    ← home: search + recent orgs + management widgets
  orgs/
    index.tsx                  ← org search & browse
    [id].tsx                   ← org workspace
  support/
    [orgId].tsx                ← customer view mode shell
    [orgId]/volunteers.tsx
    [orgId]/events.tsx
    [orgId]/applications.tsx
    [orgId]/hours.tsx
    [orgId]/settings.tsx
  audit.tsx
  employees/
    index.tsx
    [id].tsx
  roles.tsx

src/components/staff/
  StaffLayout.tsx              ← wraps all /staff/* pages, redirects if unauthenticated
  StaffSidebar.tsx
  StaffHeader.tsx
  PermissionGate.tsx           ← mirrors PlanGate: mode 'hide' | 'disable'
  SupportBanner.tsx            ← fixed amber banner during support view
  OrgSearchTable.tsx
  OrgWorkspaceTabs.tsx
  NoteEditor.tsx
  AuditLogTable.tsx

src/context/
  StaffAuthContext.tsx         ← staff JWT session management
  SupportViewContext.tsx       ← active support session state (reads sessionStorage)

src/lib/
  staffApi.ts                  ← fetch wrapper for /api/staff/* with vf_staff_token
  staffPermissions.ts          ← canDo() helper + permission constants
```

### `staffApi.ts` — key behaviors

- Reads `vf_staff_token` from `localStorage` and sends as `Authorization: Bearer <token>`
- On `401` response: clears `vf_staff_token` and `vf_staff_user` from `localStorage` (not `vf_token` or `vf_user` — never touch customer auth state), then redirects to `/staff/login`
- Automatically injects `X-Support-Session-Id` header when a support session is active. Reads the session ID from `sessionStorage.getItem('vf_support_session')` (parsed JSON, field `sessionId`) on every request. This keeps `staffApi.ts` self-contained without requiring callers to pass the header manually.
- Base URL: `/api/staff` (same origin — no CORS concerns)

### `StaffAuthContext`

```typescript
interface StaffUser {
  staffId:     string;
  email:       string;
  name:        string;
  roleId:      string;
  permissions: string[];
  sessionId:   string;
}

interface StaffAuthContextValue {
  staffUser:       StaffUser | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  canDo:           (perm: string) => boolean;
  logout:          () => Promise<void>;
}
```

- Reads `vf_staff_token` from localStorage on mount
- `canDo(perm)` returns `staffUser.permissions.includes(perm)`
- `logout()` calls `POST /api/staff/auth/logout`, clears storage, redirects to `/staff/login`

### `PermissionGate`

```typescript
interface Props {
  perm:      string;
  mode?:     'hide' | 'disable';   // default: 'hide'
  fallback?: React.ReactNode;
  children:  React.ReactNode;
}
```

Mirrors the existing `PlanGate` component exactly. Used throughout the workspace and audit pages to show/hide/disable UI based on staff permissions.

### `StaffLayout`

Wraps every `/staff/*` page. Redirects to `/staff/login` if unauthenticated. Accepts optional `requiredPerm` prop — shows `StaffAccessDenied` if staff lacks it.

---

## 7. Backend API Routes

All routes require `requireStaffAuth`. Permission middleware stacks per route.

### Auth
```
POST /api/staff/auth/login         ← no auth required
POST /api/staff/auth/logout        ← requireStaffAuth
GET  /api/staff/auth/me            ← requireStaffAuth
```

### Organizations
```
GET    /api/staff/orgs             ← requirePermission('orgs.view')
GET    /api/staff/orgs/:id         ← requirePermission('orgs.view')
PATCH  /api/staff/orgs/:id         ← requirePermission('orgs.edit_basic'), field-level checks inside

GET    /api/staff/orgs/:id/notes         ← requirePermission('notes.view')
POST   /api/staff/orgs/:id/notes         ← requirePermission('notes.create')
PATCH  /api/staff/orgs/:id/notes/:nid    ← requirePermission('notes.edit_own'), edit_any check inside
DELETE /api/staff/orgs/:id/notes/:nid    ← requirePermission('notes.delete')

GET    /api/staff/orgs/:id/audit         ← requirePermission('audit.view_org')
GET    /api/staff/orgs/:id/activity      ← requirePermission('orgs.view')
```

### Support view data endpoints (used by /staff/support/[orgId] pages)
```
GET /api/staff/orgs/:id/dashboard-stats  ← requirePermission('orgs.view') + validateSupportSession
GET /api/staff/orgs/:id/volunteers       ← requirePermission('orgs.view') + validateSupportSession
GET /api/staff/orgs/:id/events           ← requirePermission('orgs.view') + validateSupportSession
GET /api/staff/orgs/:id/applications     ← requirePermission('orgs.view') + validateSupportSession
GET /api/staff/orgs/:id/hours            ← requirePermission('orgs.view') + validateSupportSession
GET /api/staff/orgs/:id/settings         ← requirePermission('orgs.view') + validateSupportSession
```

**`validateSupportSession` middleware** — required on all support view data endpoints to prevent IDOR. Checks that an active `support_sessions` record exists where `staff_user_id = req.staff.staffId AND org_id = req.params.id AND is_active = true`. Returns `403` if no matching session exists. This ensures a staff member cannot read Org B's data by crafting a URL while holding an open session for Org A.

### Support sessions
```
POST /api/staff/support/enter       ← requirePermission('support.view_mode')
POST /api/staff/support/exit        ← requireStaffAuth
PATCH /api/staff/support/:id/pages  ← requireStaffAuth (page visit log)
GET  /api/staff/support/active      ← requirePermission('audit.view_all')
```

### Audit
```
GET /api/staff/audit           ← requirePermission('audit.view_all')
GET /api/staff/audit/export    ← requirePermission('audit.export')
```

### Staff management
```
GET   /api/staff/employees      ← requirePermission('employees.view')
POST  /api/staff/employees      ← requirePermission('employees.create')
GET   /api/staff/employees/:id  ← requirePermission('employees.view')
PATCH /api/staff/employees/:id  ← requirePermission('employees.edit')

GET   /api/staff/roles          ← requirePermission('roles.view')
POST  /api/staff/roles          ← requirePermission('roles.manage')
PATCH /api/staff/roles/:id      ← requirePermission('roles.manage')
```

---

## 8. Phase A — Org Search (`/staff/orgs`)

### Search behavior
- Debounced text search (300ms) across `org_name`, `email`, `full_name`, `id`
- Filter controls: Plan (Discover / Grow / Enterprise), Status (Active / Trialing / Past Due / Cancelled)
- Sortable columns: org name, joined date, plan, status
- Paginated: 25 per page, max 100
- Search action logged to `staff_audit_logs` when `q` param is present

### Result table columns
`Organization` (name + ID chip) · `Owner` (name + email) · `Plan` (colored badge) · `Status` (colored badge) · `Volunteers` · `Events` · `Joined` (relative) · `Last Activity` · `Open` (action button)

### Recently viewed orgs
Stored in `localStorage` as `vf_staff_recent_orgs` — max 10 entries `{ id, name, plan, status, viewedAt }`. Written on every workspace open. Shown above results when search is empty.

---

## 9. Phase B — Org Workspace (`/staff/orgs/[id]`)

### Header (always visible)
- Org name, plan badge, status badge
- Owner name, email, account ID, joined date, last login
- Action bar: `[Open Customer View]` (if `support.view_mode`) · `[Edit Org]` (if `orgs.edit_basic`) · `[⋯ More]` (permission-filtered)

### Tabs

**Overview** — Stats row (volunteers, events, pending apps, hours) · account health indicators · recent notes preview (2) · recent customer activity (5 entries)

**Account** — Org info (editable if `orgs.edit_basic`) · owner info (read-only) · plan/subscription (editable if `orgs.edit_plan`) · account status controls (editable if `orgs.edit_status`). Fields staff cannot edit render as read-only with a lock icon — never hidden, always visible.

**Notes** — Notes list (newest first, important pinned) · create/edit/delete with permission gates · tag filtering · important flag

**Activity** — Combined timeline: staff actions from `staff_audit_logs WHERE target_org_id = :id` plus customer actions from `audit_logs WHERE org_id = :id`. Source-labeled (Staff / Org). Filterable by type, date range.

**Billing** — Gated behind `PermissionGate perm="orgs.view_sensitive"`. Shows plan, cycle, Stripe IDs, subscription status, invoice history. Editing fields requires `orgs.edit_billing`.

**Sessions** — History of support sessions for this org: staff member, mode, duration, pages visited.

### Editing behavior
- Confirmation modal required for any action tagged as high-risk (status change, plan change)
- Reason field required on confirmation modal for those actions
- Field-level `before`/`after` values written to `staff_audit_logs.field_changes`

---

## 10. Phase C — Customer View Mode

### Core principle
**The staff member is always the actor.** No customer token is ever issued. All API calls during support view use the staff JWT. `req.staff.staffId` is the logged actor on every request.

### Entry flow
1. Staff clicks "Open Customer View" on org workspace header
2. Modal: select mode (`view_only` default, `support` if `canDo('support.impersonation')`), enter required reason
3. `POST /api/staff/support/enter` → creates `support_sessions` record → returns `{ sessionId }`
4. Frontend stores `{ sessionId, orgId, orgName, mode, startedAt }` in `sessionStorage` (tab-scoped)
5. Navigate to `/staff/support/[orgId]`

### Support banner
Fixed amber bar at top of screen throughout the session. Cannot be dismissed.

```
🛟  SUPPORT VIEW  ·  [Org Name]  ·  [Mode]
    [Staff Name] ([Title])  ·  Started [N] min ago
                                              [Exit Support View]
```

### Support view shell (`/staff/support/[orgId]/*`)
- Left nav mirrors customer Sidebar — links point to `/staff/support/[orgId]/[page]`
- Data fetched from `/api/staff/orgs/:id/*` (staff endpoints) — never from customer endpoints
- Frontend sends `X-Support-Session-Id` header on every request; backend appends page visit to `support_sessions.pages_visited`
- In `view_only` mode: all edit/create/delete buttons hidden
- In `support` mode with `support.impersonation`: controlled edits allowed; every action logs to both `staff_audit_logs` (with `support_session_id`) and `audit_logs` (with `is_support_view = true`)

### Exit flow
1. Staff clicks "Exit Support View"
2. `POST /api/staff/support/exit` → marks session inactive, sets `ended_at`, logs to `staff_audit_logs`
3. Clear `sessionStorage` support data
4. Navigate back to `/staff/orgs/[orgId]`

### Support session lifecycle — tab close handling

Closing the browser tab clears `sessionStorage` but does **not** automatically close the DB record. To prevent orphaned sessions appearing as active indefinitely:

- **Heartbeat:** `SupportViewContext` sends `PATCH /api/staff/support/:id/pages` every 60 seconds while the session is active (this endpoint already exists for page visit logging — the heartbeat sends an empty page visit with `type: 'heartbeat'`)
- **Stale session expiry:** The backend marks `support_sessions.is_active = false` for any session whose last heartbeat (`pages_visited` last entry timestamp) is more than 5 minutes old. This check runs inside `GET /api/staff/support/active` before returning results — stale sessions are closed inline on read
- **Maximum session duration:** Sessions older than 4 hours are automatically marked inactive regardless of heartbeat, enforced in the same stale-check logic
- **`beforeunload`:** `SupportViewContext` registers a `beforeunload` handler that fires `POST /api/staff/support/exit` as a best-effort synchronous `navigator.sendBeacon` call. This closes the session cleanly on normal tab/browser close but is not guaranteed (e.g., on crash or force-kill)

### Security properties

| Property | Mechanism |
|---|---|
| Staff is always the actor | All API calls use staff JWT; `req.staff.staffId` logged on every request |
| Customer never appears to act | No customer token issued; customer routes not called |
| Entry logged | `POST /support/enter` writes audit log before session opens |
| Exit logged | `POST /support/exit` writes audit log on close |
| Pages logged | `X-Support-Session-Id` header triggers page visit append |
| Reason required | Backend rejects `enter` without `reason` field |
| Impersonation doubly gated | Middleware permission check + explicit mode check in handler |
| Session tab-scoped (visual) | `sessionStorage` — closing tab clears the support banner |
| Orphaned session prevention | 60s heartbeat + 5min stale expiry + 4h max duration + `sendBeacon` on unload |
| IDOR prevented on data endpoints | `validateSupportSession` middleware checks active session matches `:id` param |
| Session DB-authoritative | `support_sessions` table is the source of truth, not a token |

---

## 11. Phase D — Audit & Oversight

### Staff audit log page (`/staff/audit`)
- Requires `audit.view_all`
- Filters: staff member, target org, category, outcome, date range, free text
- Table columns: timestamp, staff member, action description, target org, outcome badge, diff expander
- Field changes render as `"before" → "after"` inline diffs
- Outcome badges: ✓ Success (green) · ✗ Denied (red) · ⚠ Error (amber)
- CSV export button (requires `audit.export`) — logs the export itself to `staff_audit_logs`

### Management oversight panel (on `/staff` home)
Visible to roles with `dashboard.view_management_metrics`.

- Total staff actions (7d), orgs accessed, denied attempts
- Active support sessions right now (links to specific session)
- Recent high-risk actions (plan changes, billing edits, status changes, impersonation sessions)
- Most active staff members (7d action count)

### High-risk action flagging
Actions with `metadata.high_risk = true` in `staff_audit_logs`:
- `org_edit` where `field_changes` includes `plan`, `subscription_status`, or `billing_*`
- Any `role` category action
- `employee.disabled`
- `support_view.entered` with `mode = 'support'`
- Any `access_denied` outcome

### Active session monitoring
`GET /api/staff/support/active` — returns open sessions with staff name, org name, mode, duration. Used by the management panel widget.

---

## 12. Build Phases & Order

| Phase | Deliverable |
|---|---|
| **P1: Foundation** | DB migration, `staff_roles`/`staff_users` seed, `requireStaffAuth`, `requirePermission`, `logStaffAudit`, staff login page, `StaffAuthContext`, `StaffLayout`, `PermissionGate`, `StaffSidebar` |
| **P2: Org Search (A)** | `/api/staff/orgs` search endpoint, `/staff/orgs` page with table + filters + recently viewed |
| **P3: Org Workspace (B)** | `/api/staff/orgs/:id` detail endpoint, `/staff/orgs/[id]` with all tabs (Overview, Account, Notes, Activity, Billing, Sessions) |
| **P4: Customer View (C)** | Support session enter/exit endpoints, staff data endpoints, `/staff/support/[orgId]/*` shell, `SupportBanner`, `SupportViewContext` |
| **P5: Audit & Oversight (D)** | `/api/staff/audit` endpoint, `/staff/audit` page, management panel on home, CSV export |
| **P6: Staff Management** | `/staff/employees/*`, `/staff/roles`, employee create/edit/disable, role permission editor |

Each phase is independently deployable. P1 is a hard prerequisite. P2–P5 can proceed in order. P6 is additive.

---

## 13. Security Checklist

- [ ] `STAFF_JWT_SECRET` is a separate env var from `JWT_SECRET`, minimum 64 chars
- [ ] All `/api/staff/*` routes require `requireStaffAuth` — no exceptions
- [ ] `requirePermission` stacks on every route that touches sensitive data or mutations
- [ ] `validateSupportSession` middleware applied to all six support view data endpoints
- [ ] Field-level billing data stripped server-side when `orgs.view_sensitive` is absent
- [ ] No customer token is ever issued during support view
- [ ] Support session `reason` field enforced as non-empty on backend (not just frontend)
- [ ] `support.impersonation` permission checked twice: once in middleware, once in handler
- [ ] All mutations write to `staff_audit_logs` before returning a response
- [ ] Denied access attempts are logged, not silently dropped
- [ ] `org_id` added to all customer-facing queries (no cross-org data leakage after migration)
- [ ] Multi-org pre-flight assertion in migration script — aborts if `COUNT(users) > 1`
- [ ] Staff login rate-limited separately from customer login
- [ ] Staff sessions expire at 8h; no sliding expiry without re-auth
- [ ] `staffApi.ts` 401 handler clears only `vf_staff_*` keys — never touches `vf_token` or `vf_user`
- [ ] Support sessions closed by heartbeat timeout (5min stale) and max duration (4h)
- [ ] `notes.delete` permission assigned to `role_owner`, `role_super_admin`, `role_admin` in seed
- [ ] `support.impersonation` permission assigned to `role_owner` and `role_super_admin` in seed
