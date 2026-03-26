# Help & Documentation Design

**Goal:** A Help page on the org dashboard displaying FAQs and walkthrough articles, with full CRUD management in the staff portal.

**Architecture:** A single `help_content` DB table stores both FAQs and articles. A backend API exposes a public read endpoint for orgs and protected CRUD endpoints for staff. The org dashboard `/help` page reads published items; the staff portal `/staff/help` page manages all items.

**Tech Stack:** React (Next.js Pages Router), Express.js, PostgreSQL, Tailwind CSS, Lucide icons.

---

## Data Model

**Table: `help_content`**

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| type | VARCHAR(20) | `'faq'` or `'article'` |
| title | TEXT NOT NULL | Question text for FAQs, article title for docs |
| body | TEXT NOT NULL | Answer for FAQs, full content for articles |
| category | TEXT | Optional label for grouping (e.g. "Getting Started", "Events") |
| sort_order | INTEGER | Default 0, controls display order within type |
| published | BOOLEAN | Default false — draft until explicitly published |
| created_at | TIMESTAMPTZ | Default NOW() |
| updated_at | TIMESTAMPTZ | Default NOW() |

No foreign keys — help content is global (not per-org).

---

## Backend API

Staff CRUD routes use `requireStaffAuth` only — no additional permission gate. Help content management is a low-risk content operation available to all authenticated staff members (no new permission entry needed in the roles system).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/help` | `requireAuth` (org) | Returns all published items, ordered by type then sort_order |
| GET | `/api/staff/help` | `requireStaffAuth` | Returns all items (published + drafts) |
| POST | `/api/staff/help` | `requireStaffAuth` | Create a new item |
| PUT | `/api/staff/help/:id` | `requireStaffAuth` | Update an item (explicitly sets `updated_at = NOW()`) |
| DELETE | `/api/staff/help/:id` | `requireStaffAuth` | Delete an item |

**Response envelope:** All routes use `{ success: true, data: [...] }` consistent with the rest of the codebase.

**Server-side validation:** POST and PUT handlers validate `type` is one of `'faq'` or `'article'`; return 400 if invalid.

**GET /api/help response:**
```json
{
  "data": [
    { "id": 1, "type": "faq", "title": "How do I invite volunteers?", "body": "...", "category": "Getting Started", "sort_order": 0 },
    { "id": 2, "type": "article", "title": "Setting up your first event", "body": "...", "category": "Events", "sort_order": 0 }
  ]
}
```

**POST/PUT body fields:** `type`, `title`, `body`, `category` (optional), `sort_order` (optional, default 0), `published` (optional, default false).

---

## Staff Portal Page (`/staff/help`)

**Route:** `/staff/help`
**File:** `volunteerflow/frontend/src/pages/staff/help.tsx`
**Access:** Existing `requireStaffAuth` pattern used on all other staff pages.

**Layout:**
- Header: "Help & Documentation" title + "New Item" button
- Tab bar: "All" | "FAQs" | "Articles" (client-side filter, no re-fetch)
- Table columns: Title, Type (badge), Category, Published (toggle), Sort Order, Actions (Edit / Delete)
- Published toggle updates inline via `PUT /api/staff/help/:id`
- Edit and New open a modal form (same component, different mode)

**Modal form fields:**
- Type: radio/select — FAQ or Article
- Title: text input (question for FAQ, title for article)
- Body: textarea (answer for FAQ, walkthrough content for article)
- Category: text input (optional)
- Sort Order: number input (optional, default 0)
- Published: checkbox

---

## Org Dashboard Page (`/help`)

**Route:** `/help`
**File:** `volunteerflow/frontend/src/pages/help.tsx`
**Access:** Existing `requireAuth` pattern used on all other dashboard pages.

**Layout:**
- Page header: "Help & Documentation"
- If no published items: empty state ("No help content yet — check back soon.")
- **FAQs section** (if any published FAQs exist): accordion list — clicking a question expands the answer inline. Multiple can be open at once.
- **Articles section** (if any published articles exist): card list — each card shows title and category badge. Clicking expands the full body inline (no separate detail page needed).
- If both sections have content, FAQs appear above articles.
- Categories shown as small badges on each item (decorative, no filtering needed on this page).

**Sidebar:** Update `Sidebar.tsx` — change the existing "Help & Documentation" footer link from `href="https://docs.volunteerflow.com"` to `href="/help"` and remove `target="_blank"`.

---

## Files Changed

- **Create:** `volunteerflow/frontend/src/pages/help.tsx`
- **Create:** `volunteerflow/frontend/src/pages/staff/help.tsx`
- **Create:** `volunteerflow/backend/src/staff/help.js` — staff CRUD router (factory function receiving `pool`, same pattern as `support.js`; each route uses `requireStaffAuth(pool)` — called with `pool` as argument, not plain middleware)
- **Modify:** `volunteerflow/frontend/src/components/Sidebar.tsx` — replace the `<a href="https://docs.volunteerflow.com">` footer element with `<Link href="/help">` (Next.js `Link` for client-side routing); remove `target="_blank"` and `rel` attributes
- **Modify:** `volunteerflow/backend/src/db.js` — append `help_content` `CREATE TABLE IF NOT EXISTS` block to `SCHEMA_SQL`
- **Modify:** `volunteerflow/backend/src/index.js` — add 1 org-facing GET route (`GET /api/help`)
- **Modify:** `volunteerflow/backend/src/staff/index.js` — register help router: `router.use('/help', require('./help')(pool))`

---

## Error Handling

- `GET /api/help` fetch failure on org dashboard: show error state ("Couldn't load help content. Try refreshing.") — no crash.
- Staff create/update failures: show inline error message in the modal.
- Delete: confirm dialog before sending DELETE request.
- Empty states handled on both pages.

---

## Out of Scope

- Rich text / markdown rendering (plain text body only for now)
- Search/filtering on the org help page
- Per-org content customization
- Article detail pages (expand inline instead)
