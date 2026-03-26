# Help & Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Help & Documentation feature with a staff portal management page and an org dashboard read page, backed by a `help_content` database table.

**Architecture:** A single `help_content` table stores both FAQs and articles. A new `backend/src/staff/help.js` router handles CRUD for staff; a single `GET /api/help` route in `index.js` serves published items to org users. Two new frontend pages: `/staff/help` (manage) and `/help` (read). The existing sidebar "Help & Documentation" link is updated from an external URL to the internal `/help` route.

**Tech Stack:** Express.js, PostgreSQL, React (Next.js Pages Router), Tailwind CSS, Lucide icons, `staffApi` for staff calls, `api` for org calls.

---

## File Structure

- **Create:** `volunteerflow/backend/src/staff/help.js` — staff CRUD router
- **Modify:** `volunteerflow/backend/src/staff/index.js` — register help router
- **Modify:** `volunteerflow/backend/src/db.js` — add `help_content` table to `SCHEMA_SQL`
- **Modify:** `volunteerflow/backend/src/index.js` — add `GET /api/help` org route
- **Modify:** `volunteerflow/frontend/src/lib/staffApi.ts` — add `put` method
- **Create:** `volunteerflow/frontend/src/pages/staff/help.tsx` — staff management page
- **Create:** `volunteerflow/frontend/src/pages/help.tsx` — org dashboard help page
- **Modify:** `volunteerflow/frontend/src/components/Sidebar.tsx` — update help link

---

## Task 1: DB Migration

**Files:**
- Modify: `volunteerflow/backend/src/db.js`

- [ ] **Step 1: Add `help_content` table to `SCHEMA_SQL`**

In `volunteerflow/backend/src/db.js`, find the closing backtick of the `SCHEMA_SQL` string (line ~521, after the last `CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id` line). Insert the following block immediately before the closing `` `; ``:

```sql
  CREATE TABLE IF NOT EXISTS help_content (
    id         SERIAL       PRIMARY KEY,
    type       VARCHAR(20)  NOT NULL CHECK (type IN ('faq', 'article')),
    title      TEXT         NOT NULL,
    body       TEXT         NOT NULL DEFAULT '',
    category   TEXT,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    published  BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_help_content_type      ON help_content(type);
  CREATE INDEX IF NOT EXISTS idx_help_content_published ON help_content(published);
  CREATE INDEX IF NOT EXISTS idx_help_content_order     ON help_content(type, sort_order);
```

The exact insertion point is after this line:
```sql
  CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id    ON audit_logs(org_id);
```

- [ ] **Step 2: Verify the schema runs without error**

With the backend running (or restart it): check the console for `[DB] Schema ready.` with no errors. The `CREATE TABLE IF NOT EXISTS` is idempotent — safe on an existing DB.

- [ ] **Step 3: Confirm table exists**

```bash
# If you have psql access:
psql $DATABASE_URL -c "\d help_content"
```

Expected: table with columns id, type, title, body, category, sort_order, published, created_at, updated_at.

- [ ] **Step 4: Commit**

```bash
git add volunteerflow/backend/src/db.js
git commit -m "feat: add help_content table to schema"
```

---

## Task 2: Backend — Staff Router + Registration + Org GET Route

**Files:**
- Create: `volunteerflow/backend/src/staff/help.js`
- Modify: `volunteerflow/backend/src/staff/index.js`
- Modify: `volunteerflow/backend/src/index.js`

- [ ] **Step 1: Create `volunteerflow/backend/src/staff/help.js`**

```js
'use strict';
const { requireStaffAuth } = require('./middleware');

function staffHelpRouter(pool) {
  const router = require('express').Router();

  // GET / — list all items (drafts + published), staff only
  router.get('/', requireStaffAuth(pool), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM help_content ORDER BY type, sort_order, created_at'
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('[staff/help] GET error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST / — create a new item
  router.post('/', requireStaffAuth(pool), async (req, res) => {
    try {
      const { type, title, body, category, sort_order, published } = req.body;
      if (!['faq', 'article'].includes(type)) {
        return res.status(400).json({ error: 'type must be faq or article' });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const result = await pool.query(
        `INSERT INTO help_content (type, title, body, category, sort_order, published)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          type,
          title.trim(),
          (body || '').trim(),
          (category || '').trim() || null,
          sort_order ?? 0,
          published ?? false,
        ]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('[staff/help] POST error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /:id — update an item (client always sends all fields)
  router.put('/:id', requireStaffAuth(pool), async (req, res) => {
    try {
      const { id } = req.params;
      const { type, title, body, category, sort_order, published } = req.body;
      if (type !== undefined && !['faq', 'article'].includes(type)) {
        return res.status(400).json({ error: 'type must be faq or article' });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'title is required' });
      }
      const result = await pool.query(
        `UPDATE help_content
         SET type       = $2,
             title      = $3,
             body       = $4,
             category   = $5,
             sort_order = $6,
             published  = $7,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          type,
          (title || '').trim(),
          (body || '').trim(),
          (category || '').trim() || null,
          sort_order ?? 0,
          published ?? false,
        ]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error('[staff/help] PUT error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /:id — delete an item
  router.delete('/:id', requireStaffAuth(pool), async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM help_content WHERE id = $1',
        [req.params.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[staff/help] DELETE error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = staffHelpRouter;
```

- [ ] **Step 2: Register the help router in `volunteerflow/backend/src/staff/index.js`**

Add one line after the existing `router.use('/roles', ...)` line:

```js
  router.use('/help', require('./help')(pool));
```

The complete file should look like:

```js
'use strict';
const express = require('express');

module.exports = function createStaffRouter(pool) {
  const router = express.Router();
  router.use('/auth', require('./auth')(pool));
  router.use('/orgs', require('./orgs')(pool));
  router.use('/support', require('./support')(pool));
  router.use('/audit', require('./audit')(pool));
  router.use('/employees', require('./employees')(pool));
  router.use('/roles', require('./roles')(pool));
  router.use('/help', require('./help')(pool));
  return router;
};
```

- [ ] **Step 3: Add `GET /api/help` org route to `volunteerflow/backend/src/index.js`**

Find the block of `app.get` / `app.put` routes near the settings section (around `app.get('/api/settings', ...)`). Add the following route anywhere in that region (it just needs to be after `requireAuth` is defined):

```js
// ── Help & Documentation ──────────────────────────────────────────────────────
app.get('/api/help', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, body, category, sort_order
       FROM help_content
       WHERE published = true
       ORDER BY type, sort_order, created_at`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /api/help error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 4: Verify all 5 routes work**

With the backend running (`cd volunteerflow/backend && node src/index.js`), use curl to test. You need a valid staff token for the staff routes. Get one by logging into the staff portal, then:

```bash
# Replace <STAFF_TOKEN> with your vf_staff_token from localStorage

# List (should return empty data array on fresh DB)
curl -H "Authorization: Bearer <STAFF_TOKEN>" http://localhost:3001/api/staff/help

# Create a FAQ
curl -X POST http://localhost:3001/api/staff/help \
  -H "Authorization: Bearer <STAFF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type":"faq","title":"How do I invite volunteers?","body":"Go to People and click Invite.","published":true}'

# Expected: { "success": true, "data": { "id": 1, "type": "faq", ... } }

# List again — should show the new item
curl -H "Authorization: Bearer <STAFF_TOKEN>" http://localhost:3001/api/staff/help

# Test org GET (needs org token in vf_token)
curl -H "Authorization: Bearer <ORG_TOKEN>" http://localhost:3001/api/help
# Expected: { "success": true, "data": [{ "id": 1, "type": "faq", ... }] }
```

- [ ] **Step 5: Add `put` method to `volunteerflow/frontend/src/lib/staffApi.ts`**

The `staffApi` object (around line 55) currently has `get`, `post`, `patch`, `delete` but no `put`. The staff help page uses `PUT` to update items. Add `put` to the object:

```ts
export const staffApi = {
  get:    (path: string)                    => staffFetch(path),
  post:   (path: string, body: unknown)     => staffFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path: string, body: unknown)     => staffFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown)     => staffFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path: string)                    => staffFetch(path, { method: 'DELETE' }),
};
```

- [ ] **Step 6: Commit**

```bash
git add volunteerflow/backend/src/staff/help.js \
        volunteerflow/backend/src/staff/index.js \
        volunteerflow/backend/src/index.js \
        volunteerflow/frontend/src/lib/staffApi.ts
git commit -m "feat: help content API — staff CRUD + org read route"
```

---

## Task 3: Staff Portal Management Page

**Files:**
- Create: `volunteerflow/frontend/src/pages/staff/help.tsx`

- [ ] **Step 1: Create `volunteerflow/frontend/src/pages/staff/help.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { staffApi, StaffApiError } from '@/lib/staffApi';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpItem {
  id: number;
  type: 'faq' | 'article';
  title: string;
  body: string;
  category: string | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'faq' | 'article';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  item?: HelpItem;
  onClose: () => void;
  onSaved: (item: HelpItem) => void;
}

function HelpItemModal({ item, onClose, onSaved }: ModalProps) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    type: item?.type ?? 'faq' as 'faq' | 'article',
    title: item?.title ?? '',
    body: item?.body ?? '',
    category: item?.category ?? '',
    sort_order: item?.sort_order ?? 0,
    published: item?.published ?? false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      let result: HelpItem;
      if (isEdit) {
        result = (await staffApi.put(`/help/${item!.id}`, form) as { data: HelpItem }).data;
      } else {
        result = (await staffApi.post('/help', form) as { data: HelpItem }).data;
      }
      onSaved(result);
    } catch (err) {
      setError(err instanceof StaffApiError ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-base font-bold text-white">
            {isEdit ? 'Edit Item' : 'New Help Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Type</label>
            <div className="flex gap-3">
              {(['faq', 'article'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {t === 'faq' ? 'FAQ' : 'Article / Walkthrough'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              {form.type === 'faq' ? 'Question' : 'Title'}
            </label>
            <input
              id="help-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={form.type === 'faq' ? 'How do I invite volunteers?' : 'Setting up your first event'}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">
              {form.type === 'faq' ? 'Answer' : 'Content'}
            </label>
            <textarea
              id="help-body"
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder={form.type === 'faq' ? 'Go to People and click Invite.' : 'Step-by-step walkthrough...'}
              rows={5}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-vertical"
            />
          </div>

          {/* Category + Sort Order */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Category (optional)</label>
              <input
                id="help-category"
                type="text"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="Getting Started"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Sort Order</label>
              <input
                id="help-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => set('sort_order', Number(e.target.value))}
                min={0}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Published */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              id="help-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-gray-300">Published (visible to orgs)</span>
          </label>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffHelpPage() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [modal, setModal] = useState<{ open: boolean; item?: HelpItem }>({ open: false });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const res = await staffApi.get('/help') as { data: HelpItem[] };
      setItems(res.data ?? []);
    } catch {
      setError('Failed to load help content.');
    } finally {
      setLoading(false);
    }
  }

  async function togglePublished(item: HelpItem) {
    setTogglingId(item.id);
    try {
      const res = await staffApi.put(`/help/${item.id}`, { ...item, published: !item.published }) as { data: HelpItem };
      setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
    } catch {
      // Toggle failed — reload to show true state
      loadItems();
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete(id: number) {
    try {
      await staffApi.delete(`/help/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
      setError('Failed to delete item. Please try again.');
    }
  }

  function onSaved(saved: HelpItem) {
    setItems(prev => {
      const exists = prev.find(i => i.id === saved.id);
      return exists
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved];
    });
    setModal({ open: false });
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  return (
    <StaffLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Help & Documentation</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage FAQs and walkthroughs shown on the org dashboard.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-xl p-1 w-fit">
          {(['all', 'faq', 'article'] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'faq' ? 'FAQs' : 'Articles'}
              <span className="ml-1.5 text-xs text-gray-500">
                {f === 'all' ? items.length : items.filter(i => i.type === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-gray-500 text-sm">No items yet. Click "New Item" to add the first one.</p>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-center">Published</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-center">Order</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-200 font-medium">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.type === 'faq'
                          ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
                          : 'bg-purple-900/60 text-purple-300 border border-purple-700'
                      }`}>
                        {item.type === 'faq' ? 'FAQ' : 'Article'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{item.category ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublished(item)}
                        disabled={togglingId === item.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          item.published ? 'bg-amber-500' : 'bg-gray-700'
                        }`}
                        aria-label={item.published ? 'Unpublish' : 'Publish'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            item.published ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{item.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ open: true, item })}
                          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal.open && (
        <HelpItemModal
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSaved={onSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete item?</h3>
            <p className="text-sm text-gray-400 mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deleteId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
```

- [ ] **Step 2: Verify the page renders**

With `cd volunteerflow/frontend && npm run dev` running, go to `http://localhost:3000/staff/help`. Log in as a staff user if needed. Expected:
- "Help & Documentation" heading
- "New Item" button
- Three filter tabs (All / FAQs / Articles) with counts
- Empty state: "No items yet. Click 'New Item' to add the first one."

- [ ] **Step 3: Test create flow**

1. Click "New Item" → modal opens with FAQ/Article type buttons
2. Select FAQ, fill in a question and answer, check Published → click Create
3. Modal closes, item appears in the table with blue FAQ badge and amber toggle ON
4. Click Edit → modal opens pre-filled → change category → Save Changes → table updates
5. Click the publish toggle → toggle turns off (grey), refresh page → toggle still off
6. Click Delete → confirm dialog → item removed

- [ ] **Step 4: Commit**

```bash
git add volunteerflow/frontend/src/pages/staff/help.tsx
git commit -m "feat: staff help content management page"
```

---

## Task 4: Org Dashboard Help Page + Sidebar Link

**Files:**
- Create: `volunteerflow/frontend/src/pages/help.tsx`
- Modify: `volunteerflow/frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create `volunteerflow/frontend/src/pages/help.tsx`**

```tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { BookOpen, HelpCircle, ChevronDown, ChevronUp, Tag } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpItem {
  id: number;
  type: 'faq' | 'article';
  title: string;
  body: string;
  category: string | null;
  sort_order: number;
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function FaqSection({ items }: { items: HelpItem[] }) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Frequently Asked Questions</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          return (
            <div
              key={item.id}
              className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 pr-4">
                  {item.title}
                </span>
                <span className="shrink-0 text-neutral-400">
                  {isOpen
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3 whitespace-pre-wrap">
                  {item.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Article Cards ────────────────────────────────────────────────────────────

function ArticlesSection({ items }: { items: HelpItem[] }) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Walkthroughs & Guides</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          return (
            <div
              key={item.id}
              className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </span>
                  {item.category && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-neutral-400">
                  {isOpen
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                  {item.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [items, setItems] = useState<HelpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // api.get already unwraps { success, data } — returns HelpItem[] directly
    api.get<HelpItem[]>('/help')
      .then((items) => setItems(items ?? []))
      .catch(() => setError("Couldn't load help content. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  const faqs = items.filter(i => i.type === 'faq');
  const articles = items.filter(i => i.type === 'article');

  return (
    <Layout>
      <Head><title>Help & Documentation — VolunteerFlow</title></Head>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Help & Documentation
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Guides and answers to help you get the most out of VolunteerFlow.
          </p>
        </div>

        {/* States */}
        {loading && (
          <p className="text-sm text-neutral-400">Loading…</p>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">No help content yet — check back soon.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-10">
            {faqs.length > 0 && <FaqSection items={faqs} />}
            {articles.length > 0 && <ArticlesSection items={articles} />}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Update `Sidebar.tsx` — replace the footer help link**

In `volunteerflow/frontend/src/components/Sidebar.tsx`, find the footer `<a>` tag (around line 124):

```tsx
        <a
          href="https://docs.volunteerflow.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-xs font-medium"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          Help & Documentation
        </a>
```

Replace with a Next.js `Link` (the `Link` import is already present at the top of the file):

```tsx
        <Link
          href="/help"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-xs font-medium"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          Help & Documentation
        </Link>
```

- [ ] **Step 3: Verify the org help page**

With the dev server running:
1. Log in as an org user, go to `http://localhost:3000/help`
2. If no published items: "No help content yet — check back soon." empty state appears
3. Go to the staff portal, create and publish a FAQ and an article
4. Reload `/help` — FAQ appears under "Frequently Asked Questions", article under "Walkthroughs & Guides"
5. Click a FAQ question → answer expands; click again → collapses
6. Click "Help & Documentation" in the sidebar → navigates to `/help` (client-side, no full page reload)

- [ ] **Step 4: TypeScript check**

```bash
cd volunteerflow/frontend && npx tsc --noEmit 2>&1 | grep "help"
```

Expected: no output (no errors in the new files).

- [ ] **Step 5: Commit**

```bash
git add volunteerflow/frontend/src/pages/help.tsx \
        volunteerflow/frontend/src/components/Sidebar.tsx
git commit -m "feat: org help page + sidebar link update"
```
