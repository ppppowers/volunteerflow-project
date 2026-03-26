# Feedback & Suggestions — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Org users can submit feedback or suggestions from a button in the header of the main dashboard (`/`) and the help page (`/help`). Submissions are stored in a `feedback` database table and reviewed by staff on a new `/staff/feedback` page accessible to all staff roles.

---

## Database

### `feedback` table

Added to `SCHEMA_SQL` in `volunteerflow/backend/src/db.js`.

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id          TEXT        PRIMARY KEY,
  org_id      TEXT        NOT NULL,
  org_name    TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL CHECK (type IN ('suggestion', 'feedback')),
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_org_id  ON feedback (org_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status  ON feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);
```

No seed data needed.

---

## Backend

### Org submission endpoint

**In `volunteerflow/backend/src/index.js`:**

```
POST /api/feedback
```

Behind `requireAuth`. Validates:
- `type` must be `'suggestion'` or `'feedback'` — 400 if missing or invalid
- `message` must be non-empty string — 400 if missing

Looks up `org_name` server-side:
```sql
SELECT org_name FROM users WHERE id = $1
```
using `req.orgId` (set by `requireAuth` as `req.user.orgId ?? req.user.sub`).

Inserts into `feedback` using `generateId()` (already available in `index.js`).

Returns `{ success: true }` on success.

### Staff endpoints

**New file: `volunteerflow/backend/src/staff/feedback.js`**

Factory function `staffFeedbackRouter(pool)`. All routes behind `requireStaffAuth(pool)`. No extra permission check — all staff roles can view feedback.

```
GET /
```
Returns all feedback ordered by `created_at DESC`. Response: `{ success: true, data: rows }`.

```
PATCH /:id/status
```
Body: `{ status: 'new' | 'reviewed' }`. Validates status value (400 if invalid). Updates the row, returns 404 if not found. Returns `{ success: true }`.

**Register in `volunteerflow/backend/src/staff/index.js`:**
```js
router.use('/feedback', require('./feedback')(pool));
```

---

## Frontend — `FeedbackModal` component

**File:** `volunteerflow/frontend/src/components/FeedbackModal.tsx`

**Props:**
```ts
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Behaviour:**
- Returns `null` when `isOpen` is false
- Full-screen fixed overlay (`z-50`, `bg-black/50`), centered card (`bg-white`, max-w-md)
- Title: "Share your feedback"
- Two pill toggle buttons to select type: "Suggestion" (default) and "Feedback"
- Textarea for message (min 3 characters client-side validation, placeholder text appropriate to selected type)
- Submit button (disabled while submitting) + Cancel button
- On submit: `POST /api/feedback` via `api.post('/feedback', { type, message })` (uses the org `api` client, not `staffApi`)
- On success: replace form with a brief confirmation message ("Thanks! We've received your feedback."), auto-close after 2 seconds
- On error: show inline error message below the textarea, keep form open
- Resets type/message state when closed

**Styling:** White card, standard org palette — blue primary button, gray cancel button, matching `Button.tsx` patterns.

---

## Frontend — Trigger button placement

A small "Feedback" button with a `MessageSquare` icon placed in the top-right area of:

1. **`volunteerflow/frontend/src/pages/index.tsx`** (main dashboard) — added inline near the page's existing header/title area
2. **`volunteerflow/frontend/src/pages/help.tsx`** — added near the page title

Both locations: import `FeedbackModal` and manage a local `isFeedbackOpen` boolean state. The button style is subtle — secondary/outline variant so it doesn't compete with page content.

---

## Frontend — Staff feedback page

**File:** `volunteerflow/frontend/src/pages/staff/feedback.tsx`

- Wrapped in `<StaffLayout>`
- Loads feedback via `staffApi.get('/feedback')` on mount
- Table columns: **Org** (org_name), **Type** (badge — purple "Suggestion" / blue "Feedback"), **Message** (truncated to ~100 chars; clicking expands the full message inline), **Date** (`created_at` formatted), **Status** (toggle button)
- Status toggle: amber "New" button → clicking PATCHes status to `'reviewed'`; gray "Reviewed" badge → clicking PATCHes back to `'new'`
- Shows unreviewed count in the page title: "Feedback (3 new)"
- Empty state: "No feedback submissions yet."
- Staff dark palette throughout

---

## Sidebar

In `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx`, add a "Feedback" entry to the `NAV_ITEMS` array (no conditional rendering — visible to all staff):

```js
{ href: '/staff/feedback', label: 'Feedback', icon: '💬' }
```

Position it after "Audit Log" and before "Employees".

---

## Files Changed

| File | Change |
|------|--------|
| `volunteerflow/backend/src/db.js` | Add `feedback` table to `SCHEMA_SQL` |
| `volunteerflow/backend/src/staff/feedback.js` | NEW: staff feedback router |
| `volunteerflow/backend/src/staff/index.js` | Register feedback router |
| `volunteerflow/backend/src/index.js` | Add `POST /api/feedback` org endpoint |
| `volunteerflow/frontend/src/components/FeedbackModal.tsx` | NEW: modal component |
| `volunteerflow/frontend/src/pages/index.tsx` | Add Feedback button + modal |
| `volunteerflow/frontend/src/pages/help.tsx` | Add Feedback button + modal |
| `volunteerflow/frontend/src/pages/staff/feedback.tsx` | NEW: staff feedback page |
| `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx` | Add Feedback nav item |

---

## What Is Not Changed

- No authentication changes
- No changes to `staffApi.ts` — the `patch` method already exists
- No per-org scoping on staff view — staff see all feedback across all orgs
