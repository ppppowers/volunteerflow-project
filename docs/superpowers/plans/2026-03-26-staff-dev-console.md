# Staff Dev Console — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A production-grade developer console in the staff portal at `/staff/dev`, gated by `FEATURE_FLAGS_MANAGE`. Settings are DB-persisted. Signup toggling is enforced server-side on `POST /api/auth/register`.

**Spec:** `docs/superpowers/specs/2026-03-26-staff-dev-console-design.md`

**Tech Stack:** Express.js, PostgreSQL, React (Next.js Pages Router), TypeScript, Tailwind CSS, Lucide icons.

---

## File Structure

- **Modify:** `volunteerflow/backend/src/db.js` — add `system_settings` table + seed rows in `initDb()`
- **Create:** `volunteerflow/backend/src/staff/settings.js` — staff settings router
- **Modify:** `volunteerflow/backend/src/staff/index.js` — register settings router
- **Modify:** `volunteerflow/backend/src/index.js` — add signup_enabled check to `POST /api/auth/register`
- **Create:** `volunteerflow/frontend/src/pages/staff/dev.tsx` — dev console page
- **Modify:** `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx` — add Dev Console nav link

---

## Task 1: Database — `system_settings` table + seed

**Files:**
- Modify: `volunteerflow/backend/src/db.js`

**Steps:**
- [ ] Read the full file before editing
- [ ] Add `system_settings` table to `SCHEMA_SQL` (inside the backtick string, after the `help_content` block):
  ```sql
  CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT        PRIMARY KEY,
    value       JSONB       NOT NULL,
    updated_by  TEXT        REFERENCES staff_users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- [ ] Add seed inserts in `initDb()`, after the `loadStaffSchema(client)` call (line 858), using `INSERT ... ON CONFLICT (key) DO NOTHING`:
  - `signup_enabled` → `true`
  - `signup_closed_message` → `'Signups are currently closed. Please check back soon.'`
  - `maintenance_mode` → `false`
  - `maintenance_message` → `'We are performing scheduled maintenance. We''ll be back shortly.'`
  - `feature_flags` → a JSONB object with all 14 flag IDs set to `true`:
    ```
    '{"volunteer_portal":true,"member_portal":true,"employee_portal":true,"training":true,"vetting":true,"hours_tracking":true,"badges":true,"file_library":true,"messaging":true,"login_notifications":true,"data_import":true,"audit_logs":true,"portal_designer":true,"signup_forms":true}'::jsonb
    ```
  - All 5 inserts use `ON CONFLICT (key) DO NOTHING` so they never overwrite existing values
- [ ] Commit: `feat: add system_settings table and seed rows`

---

## Task 2: Backend — settings router + registration enforcement

**Files:**
- Create: `volunteerflow/backend/src/staff/settings.js`
- Modify: `volunteerflow/backend/src/staff/index.js`
- Modify: `volunteerflow/backend/src/index.js`

**Steps:**

### settings.js (new file)
- [ ] Read `volunteerflow/backend/src/staff/help.js` for the router factory pattern
- [ ] Create `staffSettingsRouter(pool)` factory with `requireStaffAuth(pool)` on every route
- [ ] Add permission check helper at the top of each handler: if `!req.staff.permissions.includes('feature_flags.manage')` return `res.status(403).json({ error: 'Forbidden' })`
- [ ] `GET /` — query `SELECT key, value FROM system_settings ORDER BY key`; return `{ success: true, data: <key→value map> }` (transform rows array to plain object)
- [ ] `PATCH /:key` — validate `value` is present in body; `UPDATE system_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3 RETURNING key`; return 404 if no row updated; return `{ success: true }`

### staff/index.js
- [ ] Read the file; add `router.use('/settings', require('./settings')(pool));` after the `/help` line

### backend/src/index.js — registration enforcement
- [ ] Read lines 460-505 around `POST /api/auth/register`
- [ ] At the very top of the handler (before body destructuring), add:
  ```js
  const sigRow = await pool.query("SELECT value FROM system_settings WHERE key = 'signup_enabled'");
  if (sigRow.rows.length && sigRow.rows[0].value === false) {
    const msgRow = await pool.query("SELECT value FROM system_settings WHERE key = 'signup_closed_message'");
    const msg = typeof msgRow.rows[0]?.value === 'string' ? msgRow.rows[0].value : 'Signups are currently closed.';
    return res.status(403).json({ success: false, error: msg });
  }
  ```
  Wrap in try/catch — if the query fails (e.g. table not yet created), fail open (allow signup) so startup order issues don't block registration
- [ ] Commit: `feat: settings router and signup enforcement`

---

## Task 3: Frontend — dev console page

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/dev.tsx`

**Steps:**
- [ ] Read `volunteerflow/frontend/src/pages/staff/orgs/index.tsx` for staff page patterns
- [ ] Read `volunteerflow/frontend/src/components/staff/PermissionGate.tsx` to confirm `perm` prop
- [ ] Import: `StaffLayout`, `PermissionGate`, `PERMISSIONS`, `staffApi`, `DEFAULT_FLAGS` from `@/lib/devPortal`
- [ ] Load settings on mount via `staffApi.get('/settings')` — cast result as `{ data: Record<string, unknown> }`, store in state
- [ ] **Section 1 — System Toggles** (card with `bg-gray-800 border-gray-700`):
  - Row: "New Organization Signups" — toggle bound to `signup_enabled`. On toggle: `staffApi.patch('/settings/signup_enabled', { value: !current })` then reload settings
  - When signup disabled: show textarea for `signup_closed_message` with a Save button that PATCHes `/settings/signup_closed_message`
  - Status badge: green "Open" / red "Closed"
  - Row: "Maintenance Mode" — toggle bound to `maintenance_mode`. Same pattern
  - When maintenance enabled: textarea for `maintenance_message` with Save
  - Status badge: green "Live" / yellow "Maintenance"
- [ ] **Section 2 — Feature Flags** (card below System Toggles):
  - Read flags enabled state from `settings.feature_flags` (JSONB object)
  - List all 14 flags from `DEFAULT_FLAGS`, grouped by category (Core → Beta → Experimental → Deprecated)
  - Each row: flag name, description, category badge, toggle switch
  - On toggle: build updated flags object (spread existing + flip one key), PATCH `/settings/feature_flags` with full object
- [ ] Wrap entire page in `<StaffLayout><PermissionGate perm={PERMISSIONS.FEATURE_FLAGS_MANAGE}>...</PermissionGate></StaffLayout>`
- [ ] Use staff dark palette: `bg-gray-900` page, `bg-gray-800 border-gray-700` cards, `text-amber-400` headings, `text-gray-300` body text
- [ ] Commit: `feat: staff dev console page`

---

## Task 4: Sidebar — Dev Console nav link

**Files:**
- Modify: `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx`

**Steps:**
- [ ] Read the full file before editing
- [ ] Import `useStaffAuth` from the correct relative path (check existing imports in the file)
- [ ] Import `PERMISSIONS` from `../../lib/staffPermissions`
- [ ] Import `Terminal` from `lucide-react`
- [ ] Inside the component, destructure `permissions` from `useStaffAuth()`
- [ ] Add Dev Console link at the bottom of the nav list (before the closing tag), rendered only when `permissions.includes(PERMISSIONS.FEATURE_FLAGS_MANAGE)`:
  ```tsx
  {permissions.includes(PERMISSIONS.FEATURE_FLAGS_MANAGE) && (
    <Link href="/staff/dev">...</Link>
  )}
  ```
  Match the style of existing nav items exactly
- [ ] Commit: `feat: dev console link in staff sidebar`

---

## Acceptance Criteria

- [ ] Staff owner can see and navigate to "Dev Console" in the sidebar
- [ ] Non-owner staff without `feature_flags.manage` do not see the sidebar link and get PermissionGate blocked if they navigate directly
- [ ] Toggling "New Organization Signups" off persists to DB
- [ ] `POST /api/auth/register` returns 403 with the closed message when signup_enabled is false
- [ ] Toggling signups back on allows registration again
- [ ] Feature flag toggles persist to DB
- [ ] All UI in staff dark palette
