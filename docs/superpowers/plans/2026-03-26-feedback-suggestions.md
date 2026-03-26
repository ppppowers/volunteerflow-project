# Feedback & Suggestions — Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Org users submit feedback/suggestions via a modal button on the dashboard and help page. Submissions stored in DB, reviewed by staff on `/staff/feedback`.

**Spec:** `docs/superpowers/specs/2026-03-26-feedback-suggestions-design.md`

**Tech Stack:** Express.js, PostgreSQL, React (Next.js Pages Router), TypeScript, Tailwind CSS, Lucide icons.

---

## File Structure

- **Modify:** `volunteerflow/backend/src/db.js` — add `feedback` table to `SCHEMA_SQL`
- **Create:** `volunteerflow/backend/src/staff/feedback.js` — staff feedback router
- **Modify:** `volunteerflow/backend/src/staff/index.js` — register feedback router
- **Modify:** `volunteerflow/backend/src/index.js` — add `POST /api/feedback`
- **Create:** `volunteerflow/frontend/src/components/FeedbackModal.tsx` — modal component
- **Modify:** `volunteerflow/frontend/src/pages/index.tsx` — add Feedback button + modal
- **Modify:** `volunteerflow/frontend/src/pages/help.tsx` — add Feedback button + modal
- **Create:** `volunteerflow/frontend/src/pages/staff/feedback.tsx` — staff feedback page
- **Modify:** `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx` — add Feedback nav item

---

## Task 1: Database — `feedback` table

**Files:**
- Modify: `volunteerflow/backend/src/db.js`

**Steps:**
- [ ] Read the full file before editing
- [ ] Add the `feedback` table to `SCHEMA_SQL` after the `help_content` indexes block and before the `system_settings` section:
  ```sql
  -- ── Feedback & suggestions ────────────────────────────────────────────────────
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
- [ ] No seed data needed
- [ ] Commit: `feat: add feedback table to schema`

---

## Task 2: Backend — staff router + org endpoint

**Files:**
- Create: `volunteerflow/backend/src/staff/feedback.js`
- Modify: `volunteerflow/backend/src/staff/index.js`
- Modify: `volunteerflow/backend/src/index.js`

**Steps:**

### feedback.js (new file)
- [ ] Read `volunteerflow/backend/src/staff/help.js` for the factory pattern
- [ ] Create `staffFeedbackRouter(pool)` factory with `requireStaffAuth(pool)` on every route
- [ ] No extra permission check — all staff roles can access feedback
- [ ] `GET /` — `SELECT * FROM feedback ORDER BY created_at DESC`; return `{ success: true, data: rows }`
- [ ] `PATCH /:id/status` — validate `status` is `'new'` or `'reviewed'` (400 if not); `UPDATE feedback SET status = $1 WHERE id = $2 RETURNING id`; return 404 if no row; return `{ success: true }`

### staff/index.js
- [ ] Read the file; add `router.use('/feedback', require('./feedback')(pool));` after the `/audit` line (before `/employees`)

### backend/src/index.js — org submission endpoint
- [ ] Read lines 460–510 for context on existing route structure
- [ ] Add `POST /api/feedback` after the existing feedback/suggestions area (or after `/api/auth/me` — anywhere logical in the org routes section)
- [ ] Behind `requireAuth` middleware
- [ ] Validate: `type` must be `'suggestion'` or `'feedback'` → 400; `message` must be non-empty string → 400
- [ ] Look up `org_name`: `SELECT org_name FROM users WHERE id = $1` using `req.orgId`; default to `''` if not found
- [ ] Insert: `INSERT INTO feedback (id, org_id, org_name, type, message) VALUES ($1,$2,$3,$4,$5)` using `generateId()` (already defined in `index.js`)
- [ ] Return `{ success: true }`
- [ ] Commit: `feat: feedback staff router and org submission endpoint`

---

## Task 3: Frontend — `FeedbackModal` component

**Files:**
- Create: `volunteerflow/frontend/src/components/FeedbackModal.tsx`

**Steps:**
- [ ] Read `volunteerflow/frontend/src/components/Button.tsx` for button style patterns
- [ ] Props: `isOpen: boolean`, `onClose: () => void`
- [ ] Return `null` when `isOpen` is false
- [ ] State: `type: 'suggestion' | 'feedback'` (default `'suggestion'`), `message: string`, `submitting: boolean`, `error: string | null`, `submitted: boolean`
- [ ] Reset all state when `isOpen` transitions from false → true (use `useEffect`)
- [ ] Structure:
  - Fixed overlay `z-50 bg-black/50` full screen
  - Centered white card `max-w-md w-full bg-white rounded-xl shadow-xl p-6`
  - Title: "Share your feedback"
  - Two pill toggle buttons: "Suggestion" and "Feedback" — active pill is filled (blue), inactive is outline
  - Textarea: 4 rows, placeholder changes by type ("What would make VolunteerFlow better?" for suggestion, "Tell us what's on your mind" for feedback)
  - Inline error message in red below textarea if `error` is set
  - Two action buttons: "Submit" (primary blue, disabled when `submitting` or message < 3 chars) + "Cancel" (ghost)
- [ ] On submit: call `api.post('/feedback', { type, message })` — `api` imported from `@/lib/api`; set `submitted = true` on success; auto-call `onClose` after 2000ms
- [ ] On success: replace form content with confirmation: "Thanks! We've received your feedback." with a checkmark icon
- [ ] On error: set `error` message, keep form open
- [ ] Commit: `feat: FeedbackModal component`

---

## Task 4: Wire modal into dashboard and help page

**Files:**
- Modify: `volunteerflow/frontend/src/pages/index.tsx`
- Modify: `volunteerflow/frontend/src/pages/help.tsx`

**Steps:**

### index.tsx (dashboard)
- [ ] Read the full file before editing
- [ ] Import `FeedbackModal` from `@/components/FeedbackModal`
- [ ] Import `MessageSquare` from `lucide-react` (already imported — check first)
- [ ] Add `isFeedbackOpen` boolean state
- [ ] Change the Welcome Header div (lines ~204–212) from `<div>` to `<div className="flex items-start justify-between">`, wrapping the existing h1+p in a `<div>` and adding a Feedback button on the right:
  ```tsx
  <button
    onClick={() => setIsFeedbackOpen(true)}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
  >
    <MessageSquare size={14} />
    Feedback
  </button>
  ```
- [ ] Render `<FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />` at the bottom of the JSX (inside `<Layout>`)

### help.tsx
- [ ] Read the full file before editing
- [ ] Same pattern: import `FeedbackModal` + `MessageSquare`, add `isFeedbackOpen` state
- [ ] Change the page header div (lines ~161–169) to `flex items-start justify-between`, add Feedback button on the right
- [ ] Render `<FeedbackModal>` at bottom of JSX
- [ ] Commit: `feat: feedback button on dashboard and help page`

---

## Task 5: Staff feedback page + sidebar link

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/feedback.tsx`
- Modify: `volunteerflow/frontend/src/components/staff/StaffSidebar.tsx`

**Steps:**

### staff/feedback.tsx (new file)
- [ ] Read `volunteerflow/frontend/src/pages/staff/help.tsx` for staff page patterns
- [ ] Interface: `FeedbackItem { id: string; org_id: string; org_name: string; type: 'suggestion' | 'feedback'; message: string; status: 'new' | 'reviewed'; created_at: string }`
- [ ] Load via `staffApi.get('/feedback')` on mount; cast result as `{ data: FeedbackItem[] }`
- [ ] Compute `newCount = items.filter(i => i.status === 'new').length`
- [ ] Page title: `Feedback {newCount > 0 ? \`(${newCount} new)\` : ''}`
- [ ] Table columns: **Org** (org_name), **Type** (badge — purple bg for Suggestion, blue for Feedback), **Message** (truncated 100 chars; clicking the row expands to show full message inline below), **Date** (formatted `created_at`), **Status** (toggle button)
- [ ] Status toggle: amber "New" button when status is `'new'` → clicking PATCHes to `'reviewed'`; gray "Reviewed" badge when `'reviewed'` → clicking PATCHes back to `'new'`; use `staffApi.patch('/feedback/${id}/status', { status: newStatus })` then reload
- [ ] Empty state: centered text "No feedback submissions yet."
- [ ] Error banner: red banner at top if load fails
- [ ] Full staff dark palette: `bg-gray-900` page, `bg-gray-800 border-gray-700` table/cards
- [ ] Wrap in `<StaffLayout>` (no `PermissionGate` — all staff can see feedback)

### StaffSidebar.tsx
- [ ] Read the file; add to `NAV_ITEMS` array after the Audit Log entry and before Employees:
  ```js
  { href: '/staff/feedback', label: 'Feedback', icon: '💬' },
  ```
- [ ] Commit: `feat: staff feedback page and sidebar link`

---

## Acceptance Criteria

- [ ] Feedback button appears on dashboard and help page header
- [ ] Modal opens with Suggestion/Feedback toggle and textarea
- [ ] Submitting saves to DB with correct org_id and org_name
- [ ] Confirmation shown then modal auto-closes
- [ ] Staff can see all submissions at `/staff/feedback`
- [ ] Status toggle persists to DB
- [ ] New count shown in page title
- [ ] "Feedback" link appears in staff sidebar for all staff
