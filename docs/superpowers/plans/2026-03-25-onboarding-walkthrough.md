# Onboarding Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-signup success screen with a 3-step wizard that collects org profile data (org name, description, website, email, phone, tax ID, address) and saves it to org_settings on finish.

**Architecture:** All changes are in `signup.tsx`. The existing `success === true` branch currently shows a "You're all set!" card and auto-redirects after 2 seconds — both are replaced by a wizard. The wizard uses existing inline CSS classes (`.sp-step-dot`, `.sp-step-line`) already defined in `signup.tsx`. On finish it calls `PUT /api/settings` via raw `fetch` (not `api.put` — see Task 2 for why). On skip it redirects to `/` immediately.

**Tech Stack:** React (Next.js Pages Router), raw `fetch`, existing inline CSS in `signup.tsx`, Tailwind CSS, Lucide icons (`ArrowRight`, `Check` already imported).

---

## File Structure

- **Modify only:** `volunteerflow/frontend/src/pages/signup.tsx`
  - Add 3 new state variables
  - Update `handleSubmit` (remove setTimeout, seed wizard orgName)
  - Add `handleWizardFinish` function
  - Replace the `{success ? ... : ...}` success branch JSX

---

## Task 1: Add wizard state and update handleSubmit

**Files:**
- Modify: `volunteerflow/frontend/src/pages/signup.tsx:233-307`

This task adds the wizard state variables and updates `handleSubmit` to:
1. Remove the `setTimeout(() => router.push('/'), 2000)` auto-redirect
2. Seed `wizard.orgName` from `form.orgName` right before setting `success(true)`

`useState` initializes once at component mount when `form.orgName` is still `''`, so we must set it explicitly in `handleSubmit` after the API call succeeds.

- [ ] **Step 1: Add wizard state variables**

Inside `SignupPage`, after the existing state declarations (after line 241 `const [errors, setErrors]...`), add:

```tsx
const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
const [wizardSaving, setWizardSaving] = useState(false);
const [wizard, setWizard] = useState({
  orgName: '',
  description: '',
  website: '',
  orgEmail: '',
  phone: '',
  taxId: '',
  address: '',
});
```

> **Note:** Initialize `orgName` as `''` here — NOT `form.orgName`. `useState` runs only once at component mount when `form` is still empty. The actual orgName value is seeded in `handleSubmit` via `setWizard` (see Step 2 below), right before `setSuccess(true)`.

- [ ] **Step 2: Update handleSubmit — remove setTimeout, seed orgName**

Find the block at the end of `handleSubmit` (around line 299-302):

```tsx
localStorage.setItem('vf_token', json.data.token);
setLoading(false);
setSuccess(true);
setTimeout(() => router.push('/'), 2000);
```

Replace it with:

```tsx
localStorage.setItem('vf_token', json.data.token);
setWizard((w) => ({ ...w, orgName: form.orgName.trim() }));
setLoading(false);
setSuccess(true);
```

The `setTimeout` line is removed entirely. The wizard will handle navigation.

- [ ] **Step 3: Verify the page still loads**

Run: `cd volunteerflow/frontend && npm run dev`

Expected: dev server starts, `/signup` loads without errors in the browser console.

- [ ] **Step 4: Commit**

```bash
git add volunteerflow/frontend/src/pages/signup.tsx
git commit -m "feat: add wizard state to signup, remove success auto-redirect"
```

---

## Task 2: Add handleWizardFinish

**Files:**
- Modify: `volunteerflow/frontend/src/pages/signup.tsx`

`handleWizardFinish` uses raw `fetch` instead of `api.put` because `api.put` (in `src/lib/api.ts`) automatically redirects to `/landing?mode=signin` and clears localStorage on any 401 response. The JWT token was just written to localStorage at the end of handleSubmit, and a network hiccup could return a 401. With raw `fetch`, a 401 is just caught by the `try/catch` and the user is silently forwarded to the dashboard — they can fill in settings later.

- [ ] **Step 1: Add handleWizardFinish after the existing handleSubmit function**

After the closing `};` of `handleSubmit` (around line 307), add:

```tsx
const handleWizardFinish = async () => {
  setWizardSaving(true);
  try {
    const token = localStorage.getItem('vf_token');
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
    await fetch(`${base}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(wizard),
    });
  } catch {
    // silent fail — user can complete profile in Settings → Organization
  } finally {
    router.push('/');
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add volunteerflow/frontend/src/pages/signup.tsx
git commit -m "feat: add handleWizardFinish with raw fetch save"
```

---

## Task 3: Replace success screen with wizard JSX

**Files:**
- Modify: `volunteerflow/frontend/src/pages/signup.tsx:361-382`

The current success branch (lines 361–382) renders the "You're all set!" card. Replace it entirely with the 3-step wizard. The existing `.sp-step-dot`, `.sp-step-dot.active`, `.sp-step-dot.done`, `.sp-step-line`, `.sp-step-line.done`, `.sp-submit`, `.sp-field`, `.sp-label`, `.sp-input`, `.sp-display` CSS classes are already defined in the `styles` string — use them directly.

- [ ] **Step 1: Move `@keyframes spin` into the top-level `styles` string**

The wizard "Finish" button shows a spinner using `animation: 'spin 0.7s linear infinite'`. The `@keyframes spin` rule is currently defined in an inline `<style>` tag inside the signup form JSX (the false branch of the ternary). When the wizard renders (`success === true`), that `<style>` tag is unmounted and the spinner won't animate.

Fix: move the keyframe into the top-level `styles` string (line 9 of the file), which is always rendered. Find this line near the end of the `styles` string (around line 219):

```ts
  @keyframes check-pop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
  .check-pop { animation: check-pop 0.4s ease 0.1s both; }
```

Add `@keyframes spin` directly after it:

```ts
  @keyframes check-pop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
  .check-pop { animation: check-pop 0.4s ease 0.1s both; }
  @keyframes spin { to { transform: rotate(360deg); } }
```

Then find the standalone `<style>` tag near the bottom of the JSX (inside the false branch, around line 565):

```tsx
<style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
```

Delete that line entirely — the keyframe is now in the top-level `styles` string.

- [ ] **Step 2: Replace the success branch JSX**

Find this entire block (lines 361–382):

```tsx
{success ? (
  <div className="success-screen">
    <div className="success-icon check-pop">
      <Check className="w-8 h-8 text-white" strokeWidth={3} />
    </div>
    <h2 className="sp-display" style={{ fontSize: 28, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
      You're all set!
    </h2>
    <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.65, marginBottom: 24 }}>
      Welcome to VolunteerFlow. Taking you to your dashboard…
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 12, padding: 20 }}>
      {['Import or invite your volunteers', 'Create your first event', 'Set up your application form'].map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{i + 1}</span>
          </div>
          <span style={{ fontSize: 14, color: '#065f46', fontWeight: 500 }}>{step}</span>
        </div>
      ))}
    </div>
  </div>
) : (
```

Replace just the `{success ? ( ... ) : (` opening with:

```tsx
{success ? (
  <div>
    {/* ── Wizard header: progress dots + skip ── */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {([1, 2, 3] as const).map((n, i) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <div className={`sp-step-line${wizardStep > n - 1 ? ' done' : ''}`} style={{ width: 28 }} />
            )}
            <div className={`sp-step-dot${wizardStep === n ? ' active' : wizardStep > n ? ' done' : ''}`}>
              {wizardStep > n ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
            </div>
          </span>
        ))}
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6, fontWeight: 500 }}>
          Step {wizardStep} of 3
        </span>
      </div>
      <button
        onClick={() => router.push('/')}
        style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
      >
        Skip setup →
      </button>
    </div>

    {/* ── Step header ── */}
    <div style={{ marginBottom: 20 }}>
      <h2 className="sp-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
        {wizardStep === 1 ? 'Your Organization' : wizardStep === 2 ? 'Contact Info' : 'Legal & Location'}
      </h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        {wizardStep === 1
          ? 'Tell us a bit about your org'
          : wizardStep === 2
          ? 'How can people reach your organization?'
          : 'Optional — used for receipts and compliance'}
      </p>
    </div>

    {/* ── Step 1: org name + description ── */}
    {wizardStep === 1 && (
      <>
        <div className="sp-field">
          <label className="sp-label">Organization Name</label>
          <input
            className="sp-input"
            type="text"
            placeholder="Green Future Foundation"
            value={wizard.orgName}
            onChange={(e) => setWizard((w) => ({ ...w, orgName: e.target.value }))}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Description</label>
          <textarea
            className="sp-input"
            placeholder="What does your organization do?"
            value={wizard.description}
            onChange={(e) => setWizard((w) => ({ ...w, description: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </>
    )}

    {/* ── Step 2: website + email + phone ── */}
    {wizardStep === 2 && (
      <>
        <div className="sp-field">
          <label className="sp-label">Website</label>
          <input
            className="sp-input"
            type="text"
            placeholder="https://yourorg.org"
            value={wizard.website}
            onChange={(e) => setWizard((w) => ({ ...w, website: e.target.value }))}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Contact Email</label>
          <input
            className="sp-input"
            type="email"
            placeholder="hello@yourorg.org"
            value={wizard.orgEmail}
            onChange={(e) => setWizard((w) => ({ ...w, orgEmail: e.target.value }))}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Phone Number</label>
          <input
            className="sp-input"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={wizard.phone}
            onChange={(e) => setWizard((w) => ({ ...w, phone: e.target.value }))}
          />
        </div>
      </>
    )}

    {/* ── Step 3: tax ID + address ── */}
    {wizardStep === 3 && (
      <>
        <div className="sp-field">
          <label className="sp-label">Tax ID / EIN</label>
          <input
            className="sp-input"
            type="text"
            placeholder="12-3456789"
            value={wizard.taxId}
            onChange={(e) => setWizard((w) => ({ ...w, taxId: e.target.value }))}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Address</label>
          <textarea
            className="sp-input"
            placeholder="123 Main St, City, State 12345"
            value={wizard.address}
            onChange={(e) => setWizard((w) => ({ ...w, address: e.target.value }))}
            rows={3}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </>
    )}

    {/* ── Footer: back + next/finish ── */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
      <div>
        {wizardStep > 1 && (
          <button
            onClick={() => setWizardStep((s) => (s - 1) as 1 | 2 | 3)}
            style={{ fontSize: 14, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: '10px 0' }}
          >
            ← Back
          </button>
        )}
      </div>
      <button
        className="sp-submit"
        style={{ width: 'auto', paddingLeft: 32, paddingRight: 32, marginTop: 0 }}
        onClick={wizardStep < 3 ? () => setWizardStep((s) => (s + 1) as 1 | 2 | 3) : handleWizardFinish}
        disabled={wizardSaving}
      >
        {wizardSaving ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Saving…
          </>
        ) : wizardStep < 3 ? (
          <>Next <ArrowRight className="w-4 h-4" /></>
        ) : (
          <>Finish <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  </div>
) : (
```

- [ ] **Step 2: Verify the wizard renders and works**

With the dev server running:
1. Go to `/signup`, create a test account (use a unique email)
2. After submit, the wizard should appear — verify step 1 shows "Your Organization" with org name pre-filled
3. Click Next → step 2 "Contact Info" appears
4. Click Back → returns to step 1 with data intact
5. Click Next → step 2; Next again → step 3 "Legal & Location"
6. On step 3, button should read "Finish →"
7. Click "Finish →" — brief loading spinner, then redirects to dashboard `/`
8. Go to Settings → Organization tab — verify the data you entered is saved. Alternatively, verify via the API: `curl -H "Authorization: Bearer <your_vf_token>" http://localhost:3001/api/settings` and check the returned fields.
9. Sign in as a fresh account and click "Skip setup →" on step 1 — verify immediate redirect to `/` with no settings saved

- [ ] **Step 3: Commit**

```bash
git add volunteerflow/frontend/src/pages/signup.tsx
git commit -m "feat: onboarding wizard replaces post-signup success screen"
```
