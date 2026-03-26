# Staff Dev Console — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

A production-grade developer console in the staff portal at `/staff/dev`. Gated by the existing `FEATURE_FLAGS_MANAGE` permission (owner has it by default; granting it to other roles is done via the existing Roles page — no code change needed). Provides two sections: **System Toggles** (signup control, maintenance mode) and **Feature Flags**. Settings are persisted in a new `system_settings` database table and enforced server-side where applicable.

The existing `volunteerflow/frontend/src/pages/dev/index.tsx` dev portal (localhost-only, localStorage-based) is left in place — it is a separate development tool and is not modified by this feature.

---

## Database

### `system_settings` table

Added to `SCHEMA_SQL` in `volunteerflow/backend/src/db.js`.

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  updated_by  TEXT        REFERENCES staff_users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Seed rows** — inserted via `INSERT ... ON CONFLICT (key) DO NOTHING` inside `initializeDatabase()` in `db.js`, so they are set once and never overwritten by restarts:

| key | default value |
|-----|---------------|
| `signup_enabled` | `true` |
| `signup_closed_message` | `"Signups are currently closed. Please check back soon."` |
| `maintenance_mode` | `false` |
| `maintenance_message` | `"We are performing scheduled maintenance. We'll be back shortly."` |
| `feature_flags` | JSON object: all 14 flags from `DEFAULT_FLAGS` in `devPortal.ts`, each `true` by default |

The `feature_flags` row stores a single JSONB object of shape `{ [flagId]: boolean }` — e.g. `{ "volunteer_portal": true, "badges": true, ... }`.

---

## Backend

### New staff route: `volunteerflow/backend/src/staff/settings.js`

Factory function `staffSettingsRouter(pool)` — registered in `staff/index.js` as `router.use('/settings', require('./settings')(pool))`.

All routes gated by `requireStaffAuth(pool)` + permission check for `feature_flags.manage`.

**Routes:**

```
GET  /api/staff/settings
```
Returns all rows as a flat key→value map: `{ success: true, data: { signup_enabled: true, signup_closed_message: "...", ... } }`. Values are the raw JSONB values (boolean, string, object).

```
PATCH /api/staff/settings/:key
```
Body: `{ value: <any> }`. Updates `system_settings` set `value = $1, updated_by = $2, updated_at = NOW()` where `key = $3`. Returns 404 if key does not exist (prevents creating arbitrary keys). Returns `{ success: true }`.

**Permission check:** both routes check that `req.staff.permissions` includes `'feature_flags.manage'`. Return 403 if not.

### Registration enforcement

In `volunteerflow/backend/src/index.js`, at the top of `POST /api/auth/register` (before validation), add:

```js
const settingRow = await pool.query(
  "SELECT value FROM system_settings WHERE key = 'signup_enabled'",
);
if (settingRow.rows.length && settingRow.rows[0].value === false) {
  const msgRow = await pool.query(
    "SELECT value FROM system_settings WHERE key = 'signup_closed_message'",
  );
  const msg = msgRow.rows[0]?.value || 'Signups are currently closed.';
  return res.status(403).json({ success: false, error: msg });
}
```

No other endpoint changes are needed for this feature.

---

## Frontend

### New page: `volunteerflow/frontend/src/pages/staff/dev.tsx`

- Wraps in `<StaffLayout>` + `<PermissionGate requiredPerm={PERMISSIONS.FEATURE_FLAGS_MANAGE}>`
- Loads all settings via `staffApi.get('/settings')` on mount
- Two sections, described below

**Section 1 — System Toggles**

A card with two toggle rows:

1. **New Organization Signups**
   - Toggle: `signup_enabled` (boolean)
   - When disabled: shows a textarea for `signup_closed_message`
   - Save button on the message textarea (PATCH `/settings/signup_closed_message`)
   - Toggle immediately PATCHes `/settings/signup_enabled`

2. **Maintenance Mode**
   - Toggle: `maintenance_mode` (boolean)
   - When enabled: shows a textarea for `maintenance_message`
   - Save button on the message textarea (PATCH `/settings/maintenance_message`)
   - Toggle immediately PATCHes `/settings/maintenance_mode`

Each toggle shows a status badge ("Open" / "Closed" for signups; "Live" / "Maintenance" for maintenance mode).

**Section 2 — Feature Flags**

A card listing all 14 flags from `DEFAULT_FLAGS` in `devPortal.ts`. The enabled state for each flag is read from the `feature_flags` JSONB object in `system_settings`.

Each flag row: flag name, description, category badge, toggle switch. Toggling a flag PATCHes `/settings/feature_flags` with the full updated flags object (read-modify-write on the frontend).

Flags are grouped by category: Core → Beta → Experimental → Deprecated.

**Styling:** Dark staff palette — `bg-gray-900`, `text-amber-400`, `border-gray-700/800`. Matches existing staff pages.

---

## Sidebar

In `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx`, add a "Dev Console" link at the bottom of the nav list (above or below Help, if present), rendered only when `canDo(permissions, PERMISSIONS.FEATURE_FLAGS_MANAGE)` is true. Uses `<Link href="/staff/dev">` with an appropriate Lucide icon (e.g. `Terminal` or `Wrench`).

---

## Files Changed

| File | Change |
|------|--------|
| `volunteerflow/backend/src/db.js` | Add `system_settings` table to `SCHEMA_SQL`; seed default rows in `initializeDatabase()` |
| `volunteerflow/backend/src/staff/settings.js` | NEW: settings router |
| `volunteerflow/backend/src/staff/index.js` | Register settings router |
| `volunteerflow/backend/src/index.js` | Add signup_enabled check to `POST /api/auth/register` |
| `volunteerflow/frontend/src/pages/staff/dev.tsx` | NEW: dev console page |
| `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx` | Add Dev Console nav link |

---

## What Is Not Changed

- `volunteerflow/frontend/src/pages/dev/index.tsx` — existing dev portal left as-is
- `volunteerflow/frontend/src/lib/devPortal.ts` — left as-is; `DEFAULT_FLAGS` is imported by the new page as the source of flag metadata (id, name, description, category)
- No new staff roles; access is controlled entirely by the `FEATURE_FLAGS_MANAGE` permission
