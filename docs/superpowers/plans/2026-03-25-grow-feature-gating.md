# Grow Feature Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate all 9 Grow-tier features so Discover plan users see upgrade prompts instead of full access.

**Architecture:** Two-layer gating — backend middleware rejects API calls from Discover users with 403, frontend `PlanGate` component wraps page content with a blurred upgrade banner. The frontend first loads the user's real plan from `/api/billing/plan` on app startup, replacing the current hardcoded `"discover"` value in `PlanProvider`.

**Tech Stack:** Node.js/Express (backend middleware), React/Next.js Pages Router (frontend), existing `PlanGate` + `usePlan` context already in codebase.

---

## File Map

| File | Change |
|------|--------|
| `backend/src/index.js` | Add `requirePlan()` middleware; apply to 12 Grow-feature endpoints |
| `frontend/src/pages/_app.tsx` | Add `PlanLoader` component that fetches real plan and calls `setPlan` |
| `frontend/src/pages/vetting.tsx` | Wrap page body in `PlanGate feature="applicant_vetting"` |
| `frontend/src/pages/hours.tsx` | Wrap page body in `PlanGate feature="hours_tracking"` |
| `frontend/src/pages/files.tsx` | Wrap page body in `PlanGate feature="file_library"` |
| `frontend/src/pages/import.tsx` | Wrap page body in `PlanGate feature="data_import"` |
| `frontend/src/pages/qr.tsx` | Replace partial `canAnalytics` guard with `PlanGate feature="qr_analytics"` around analytics section |
| `frontend/src/pages/settings.tsx` | Wrap BrandingTab content in `PlanGate feature="custom_branding"`; wrap RolesTab content in `PlanGate feature="role_permissions"` |
| `frontend/src/pages/people.tsx` | Wrap group management UI in `PlanGate feature="group_registration"` |

---

## Task 1: Add `requirePlan` middleware to backend

**Files:**
- Modify: `backend/src/index.js` (add after `requireAuth` function, ~line 162)

- [ ] **Step 1: Add the middleware function**

Insert this block immediately after the closing `}` of the `requireAuth` function (around line 162 in `index.js`):

```js
// ─── Plan gate middleware ──────────────────────────────────────────────────────
const PLAN_ORDER = ['discover', 'grow', 'enterprise'];

function requirePlan(...requiredPlans) {
  const minLevel = Math.min(...requiredPlans.map(p => PLAN_ORDER.indexOf(p)));
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.sub]);
      const userPlan = rows[0]?.plan ?? 'discover';
      const userLevel = PLAN_ORDER.indexOf(userPlan);
      if (userLevel >= minLevel) return next();
      return res.status(403).json({
        success: false,
        error: 'This feature requires a higher plan',
        requiredPlan: PLAN_ORDER[minLevel],
      });
    } catch (err) {
      console.error('requirePlan error:', err.message);
      return res.status(500).json({ success: false, error: 'Plan check failed' });
    }
  };
}
```

- [ ] **Step 2: Gate branding endpoints**

Find `app.get('/api/branding'` and `app.put('/api/branding'` and add `requirePlan('grow')` as a second middleware argument after `requireAuth`:

```js
// Before:
app.get('/api/branding', requireAuth, async (req, res) => {
app.put('/api/branding', requireAuth, async (req, res) => {

// After:
app.get('/api/branding', requireAuth, requirePlan('grow'), async (req, res) => {
app.put('/api/branding', requireAuth, requirePlan('grow'), async (req, res) => {
```

- [ ] **Step 3: Gate people groups endpoints**

Find all routes matching `/api/people/groups` (there are ~8 of them: GET list, POST create, PUT update, DELETE, and member sub-routes). Add `requirePlan('grow')` after `requireAuth` on each:

```js
app.get('/api/people/groups', requireAuth, requirePlan('grow'), ...
app.post('/api/people/groups', requireAuth, requirePlan('grow'), ...
app.put('/api/people/groups/:id', requireAuth, requirePlan('grow'), ...
app.delete('/api/people/groups/:id', requireAuth, requirePlan('grow'), ...
app.get('/api/people/groups/:groupId/members', requireAuth, requirePlan('grow'), ...
app.post('/api/people/groups/:groupId/members', requireAuth, requirePlan('grow'), ...
app.put('/api/people/groups/:groupId/members/:memberId', requireAuth, requirePlan('grow'), ...
app.delete('/api/people/groups/:groupId/members/:memberId', requireAuth, requirePlan('grow'), ...
```

- [ ] **Step 4: Gate applications/vetting endpoints**

```js
app.get('/api/applications', requireAuth, requirePlan('grow'), ...
app.post('/api/applications', requireAuth, requirePlan('grow'), ...
app.put('/api/applications/:id', requireAuth, requirePlan('grow'), ...
```

- [ ] **Step 5: Gate file and folder endpoints**

```js
app.get('/api/files', requireAuth, requirePlan('grow'), ...
app.post('/api/files', requireAuth, requirePlan('grow'), ...
app.delete('/api/files/:id', requireAuth, requirePlan('grow'), ...
app.get('/api/folders', requireAuth, requirePlan('grow'), ...
app.post('/api/folders', requireAuth, requirePlan('grow'), ...
app.delete('/api/folders/:id', requireAuth, requirePlan('grow'), ...
```

- [ ] **Step 6: Gate roles endpoints**

```js
app.get('/api/roles', requireAuth, requirePlan('grow'), ...
app.post('/api/roles', requireAuth, requirePlan('grow'), ...
app.put('/api/roles/:id', requireAuth, requirePlan('grow'), ...
app.delete('/api/roles/:id', requireAuth, requirePlan('grow'), ...
app.put('/api/team/:id/role', requireAuth, requirePlan('grow'), ...
```

- [ ] **Step 7: Gate QR analytics endpoint**

```js
app.get('/api/qr/codes/:id/analytics', requireAuth, requirePlan('grow'), ...
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: add requirePlan middleware and gate all Grow-tier API endpoints"
```

---

## Task 2: Load real plan in frontend

**Files:**
- Modify: `frontend/src/pages/_app.tsx`

The `PlanProvider` currently receives `initialPlan="discover"` hardcoded. We need to fetch the real plan from `/api/billing/plan` after auth and call `setPlan`. The cleanest way is a `PlanLoader` component rendered inside `PlanProvider` that uses the `usePlan` context.

- [ ] **Step 1: Add `PlanLoader` component to `_app.tsx`**

Add this import at the top of `_app.tsx`:
```tsx
import { api } from '@/lib/api';
import { PlanId } from '@/lib/pricing.config';
import { usePlan } from '@/context/usePlan';
```

Add this component above the `App` function:
```tsx
function PlanLoader() {
  const { setPlan } = usePlan();
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vf_token') : null;
    if (!token) return;
    api.get<{ plan: string }>('/billing/plan')
      .then(res => {
        const plan = res?.plan;
        if (plan === 'discover' || plan === 'grow' || plan === 'enterprise') {
          setPlan(plan as PlanId);
        }
      })
      .catch(() => { /* unauthenticated or network error — stay on discover */ });
  }, [setPlan]);
  return null;
}
```

- [ ] **Step 2: Render `PlanLoader` inside `PlanProvider`**

In the `App` component JSX, render `<PlanLoader />` as the first child inside `<PlanProvider>`:

```tsx
<PlanProvider initialPlan="discover">
  <PlanLoader />   {/* ← add this line */}
  <ErrorBoundary>
    ...
```

- [ ] **Step 3: Verify — open browser devtools, sign in, check that `usePlan().currentPlan` reflects the DB value**

No automated test here — manual check. In the browser console, the `PlanLoader` effect will call `/api/billing/plan` and update the plan context.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/_app.tsx
git commit -m "feat: load real subscription plan from API into PlanProvider on app startup"
```

---

## Task 3: Gate Grow feature pages

**Files:**
- Modify: `frontend/src/pages/vetting.tsx`
- Modify: `frontend/src/pages/hours.tsx`
- Modify: `frontend/src/pages/files.tsx`
- Modify: `frontend/src/pages/import.tsx`

For each page, wrap the main content (everything inside the `<Layout>` or equivalent wrapper, but NOT the layout shell itself) with `<PlanGate>`.

The pattern for each page:

```tsx
import { PlanGate } from '@/components/PlanGate';

// Inside the page component's return, wrap the inner content:
return (
  <Layout>
    <PlanGate feature="FEATURE_KEY">
      {/* existing page content */}
    </PlanGate>
  </Layout>
);
```

- [ ] **Step 1: Gate `vetting.tsx` — wrap inner content with `PlanGate feature="applicant_vetting"`**

Add `import { PlanGate } from '@/components/PlanGate';` to imports.

In the return statement, find the outermost element inside `<Layout>` (or the page root div) and wrap it:
```tsx
<PlanGate feature="applicant_vetting">
  {/* everything that was already here */}
</PlanGate>
```

- [ ] **Step 2: Gate `hours.tsx` — wrap inner content with `PlanGate feature="hours_tracking"`**

Same pattern as above with `feature="hours_tracking"`.

- [ ] **Step 3: Gate `files.tsx` — wrap inner content with `PlanGate feature="file_library"`**

Same pattern with `feature="file_library"`.

- [ ] **Step 4: Gate `import.tsx` — wrap inner content with `PlanGate feature="data_import"`**

Same pattern with `feature="data_import"`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/vetting.tsx frontend/src/pages/hours.tsx frontend/src/pages/files.tsx frontend/src/pages/import.tsx
git commit -m "feat: gate vetting, hours, files, and import pages behind Grow plan"
```

---

## Task 4: Gate settings tabs and people groups

**Files:**
- Modify: `frontend/src/pages/settings.tsx`
- Modify: `frontend/src/pages/people.tsx`

- [ ] **Step 1: Add PlanGate import to `settings.tsx`**

```tsx
import { PlanGate } from '@/components/PlanGate';
```

- [ ] **Step 2: Gate BrandingTab content**

In `settings.tsx`, find the `BrandingTab` component (or wherever the branding tab panel content renders). Wrap the content:

```tsx
function BrandingTab() {
  return (
    <PlanGate feature="custom_branding">
      {/* existing branding form content */}
    </PlanGate>
  );
}
```

- [ ] **Step 3: Gate RolesTab content**

Find the `RolesTab` component (or roles tab panel) and wrap its content:

```tsx
function RolesTab() {  // or wherever roles content renders
  return (
    <PlanGate feature="role_permissions">
      {/* existing roles content */}
    </PlanGate>
  );
}
```

- [ ] **Step 4: Gate group management in `people.tsx`**

Add `import { PlanGate } from '@/components/PlanGate';` to `people.tsx`.

Find the groups section (sidebar item, panel, or modal that shows group management) and wrap it:

```tsx
<PlanGate feature="group_registration">
  {/* groups UI */}
</PlanGate>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/settings.tsx frontend/src/pages/people.tsx
git commit -m "feat: gate branding, roles, and group management behind Grow plan"
```

---

## Task 5: Fix QR analytics gate

**Files:**
- Modify: `frontend/src/pages/qr.tsx`

The existing partial attempt uses `const canAnalytics = can('qr_analytics')` (line ~660) to conditionally show UI, but it's inconsistent and doesn't use `PlanGate`. Replace with the standard `PlanGate` component.

- [ ] **Step 1: Add PlanGate import to `qr.tsx`**

```tsx
import { PlanGate } from '@/components/PlanGate';
```

- [ ] **Step 2: Remove the ad-hoc `canAnalytics` check**

Find `const canAnalytics = can('qr_analytics')` and the conditional rendering that uses it. Remove the raw check and replace with a `PlanGate` wrapper around the analytics section:

```tsx
<PlanGate feature="qr_analytics">
  {/* analytics dashboard content (charts, stats, heatmap) */}
</PlanGate>
```

- [ ] **Step 3: Remove unused `can` import if it's no longer used elsewhere in qr.tsx**

Check if `can` is used for anything else in the file. If not, remove it from the `usePlan()` destructure.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/qr.tsx
git commit -m "feat: replace ad-hoc qr_analytics gate with PlanGate component"
```

---

## Task 6: Verify end-to-end

- [ ] **Step 1: Test as Discover plan user**

Sign in as a user with `plan = 'discover'` in the DB. Navigate to:
- `/vetting` — should see upgrade banner
- `/hours` — should see upgrade banner
- `/files` — should see upgrade banner
- `/import` — should see upgrade banner
- Settings → Branding tab — should see upgrade banner
- Settings → Roles tab — should see upgrade banner
- People → Groups — should see upgrade banner or locked state
- QR → Analytics section — should see upgrade banner

Also verify API is blocked: `curl -H "Authorization: Bearer <discover_token>" http://localhost:3001/api/branding` should return `403 { "error": "This feature requires a higher plan" }`.

- [ ] **Step 2: Test as Grow plan user**

Sign in as a user with `plan = 'grow'` in the DB. All pages above should be fully accessible.

- [ ] **Step 3: Commit if any fixes needed**

```bash
git add -p
git commit -m "fix: adjust plan gating after verification"
```
