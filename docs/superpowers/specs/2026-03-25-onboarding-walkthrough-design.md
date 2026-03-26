# Onboarding Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the post-signup success screen with a 3-step wizard that collects org profile data and saves it to org_settings.

**Architecture:** All changes are contained in `signup.tsx`. The existing success state (`success === true`) currently triggers an auto-redirect after 2 seconds; that redirect is removed and replaced by the wizard. On finish, the wizard calls the existing `PUT /api/settings` endpoint, then redirects to `/`. On skip, it redirects immediately without saving.

**Tech Stack:** React (Pages Router), existing `api.put('/settings', ...)` endpoint, Tailwind CSS, Lucide icons.

---

## Trigger

After `handleSubmit` sets `setSuccess(true)`, the wizard renders inside the same signup card instead of the current "You're all set!" screen. The `setTimeout(() => router.push('/'), 2000)` is removed entirely.

---

## Wizard Steps

### Step 1 — Your Organization
- **Fields:** Organization Name (pre-filled from `form.orgName`, editable), Description (textarea)
- **Label:** "Your Organization" / "Tell us a bit about your org"

### Step 2 — Contact Info
- **Fields:** Website (text input), Contact Email (text input), Phone Number (text input)
- **Label:** "Contact Info" / "How can people reach your organization?"

### Step 3 — Legal & Location
- **Fields:** Tax ID / EIN (text input), Address (textarea)
- **Label:** "Legal & Location" / "Optional — used for receipts and compliance"

---

## UI Layout (per step)

```
┌─────────────────────────────────────────────┐
│  ● ● ○  Step 1 of 3          Skip setup →   │
│─────────────────────────────────────────────│
│  Your Organization                           │
│  Tell us a bit about your org                │
│                                              │
│  [Organization Name input]                   │
│  [Description textarea]                      │
│                                              │
│                         [Next →]             │
└─────────────────────────────────────────────┘
```

- **Progress dots:** 3 dots — filled (completed), active ring (current), empty (upcoming)
- **"Skip setup →"** link top-right — redirects to `/` immediately, no save
- **Back button** — hidden on step 1, visible on steps 2–3
- **Next/Finish button** — "Next →" on steps 1–2, "Finish →" on step 3 with loading state during save

---

## Data & State

New state added to `PeoplePage` (actually to the signup page — this is within `signup.tsx`):

```ts
const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
const [wizard, setWizard] = useState({
  orgName: '',      // pre-filled from form.orgName on wizard mount
  description: '',
  website: '',
  orgEmail: '',
  phone: '',
  taxId: '',
  address: '',
});
```

The `wizard.orgName` is initialized from `form.orgName` when `success` transitions to `true` (via `useEffect` or inline initialization).

---

## Save Behavior

- **Finish (step 3):** Call `api.put('/settings', { orgName, description, website, orgEmail, phone, taxId, address })` → on success or error, redirect to `/`.
- **Skip (any step):** Redirect to `/` immediately. No save.
- **Back:** Navigate to previous step. No save.
- **All fields optional:** No validation needed on wizard steps.

---

## Backend

No changes required. The existing `PUT /api/settings` endpoint in `index.js` already accepts and persists all 7 fields to `org_settings`.

---

## Files Changed

- **Modify:** `volunteerflow/frontend/src/pages/signup.tsx`
  - Remove `setTimeout(() => router.push('/'), 2000)` from `handleSubmit`
  - Add `wizardStep` and `wizard` state
  - Replace the success screen JSX with the wizard component (inline function or extracted component at top of file)
  - On finish: call `api.put('/settings', wizard)` then `router.push('/')`
  - On skip: call `router.push('/')`

---

## Error Handling

- If the `PUT /api/settings` call fails on finish: log the error, redirect to dashboard anyway (org can fill in settings manually). Do not block the user.
- No field validation on wizard steps — all fields are optional.
