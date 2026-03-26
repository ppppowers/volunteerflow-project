# Onboarding Walkthrough Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the post-signup success screen with a 3-step wizard that collects org profile data and saves it to org_settings.

**Architecture:** All changes are contained in `signup.tsx`. The existing success state (`success === true`) currently triggers an auto-redirect after 2 seconds; that redirect is removed and replaced by the wizard. On finish, the wizard saves via raw `fetch` (not `api.put` — see Save Behavior), then redirects to `/`. On skip, it redirects immediately without saving.

**Tech Stack:** React (Pages Router), raw `fetch` for the wizard save call, Tailwind CSS, Lucide icons.

---

## Trigger

After `handleSubmit` sets `setSuccess(true)`, the wizard renders inside the same signup card instead of the current "You're all set!" screen. The `setTimeout(() => router.push('/'), 2000)` is **removed entirely** from `handleSubmit`.

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
│  ● ○ ○  Step 1 of 3          Skip setup →   │
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

- **Progress dots:** 3 dots — `●` filled green (completed steps), `●` filled green with ring (current step), `○` empty grey (upcoming). On step 1: `● ○ ○`. On step 2: `● ● ○`. On step 3: `● ● ●`.
- **"Skip setup →"** link top-right — redirects to `/` immediately, no save
- **Back button** — hidden on step 1, visible on steps 2–3
- **Next/Finish button** — "Next →" on steps 1–2, "Finish →" on step 3
- **Loading state on Finish:** use a separate `wizardSaving` boolean state (not the existing `loading` state which is used by the signup form submit button)

---

## Data & State

New state added inside the `SignupPage` component in `signup.tsx`:

```ts
const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
const [wizardSaving, setWizardSaving] = useState(false);
const [wizard, setWizard] = useState({
  orgName: form.orgName,   // inline initialization — form.orgName is populated before success is set
  description: '',
  website: '',
  orgEmail: '',
  phone: '',
  taxId: '',
  address: '',
});
```

**Important:** Initialize `wizard` with `useState({ orgName: form.orgName, ... })` inline — do NOT use a `useEffect` to copy `form.orgName` after `success` transitions. `form.orgName` is already populated at the time the wizard state is declared, so inline initialization is correct and avoids a one-render flash with an empty org name field.

---

## Save Behavior

**On Finish (step 3):**

Use raw `fetch` instead of `api.put` to avoid the automatic 401→redirect-to-login behavior built into `api.ts`. The JWT token was just written to `localStorage` and the user is not yet in a fully authenticated browser session from `api.ts`'s perspective.

```ts
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
    // silent fail — user can fill in settings manually
  } finally {
    router.push('/');
  }
};
```

- **Skip (any step):** `router.push('/')` immediately. No save.
- **Back:** `setWizardStep((s) => (s - 1) as 1 | 2 | 3)`. No save.
- **All fields optional:** No validation needed on any wizard step.

---

## Backend

No changes required. The existing `PUT /api/settings` endpoint in `index.js` already accepts and persists all 7 fields (`orgName`, `description`, `website`, `orgEmail`, `phone`, `taxId`, `address`) to `org_settings`.

---

## Files Changed

- **Modify only:** `volunteerflow/frontend/src/pages/signup.tsx`
  - Remove `setTimeout(() => router.push('/'), 2000)` from `handleSubmit`
  - Add `wizardStep`, `wizardSaving`, and `wizard` state declarations
  - Replace the `success === true` JSX branch (the "You're all set!" card) with the wizard UI
  - Implement `handleWizardFinish` using raw `fetch` as shown above
  - Implement skip: `router.push('/')`

---

## Error Handling

- If the `fetch` to `PUT /api/settings` fails (network error, non-401 server error): catch silently, redirect to dashboard anyway. The org can complete their profile in Settings → Organization.
- If a 401 is returned: the raw `fetch` does NOT redirect — it simply throws or returns a non-ok response, which the try/catch handles by redirecting to dashboard anyway.
- No field validation on wizard steps — all fields are optional.
