# Idle Timeout & Warning Dialog — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log out all authenticated users after 10 minutes of inactivity. Show a warning modal at 9 minutes with a 60-second countdown and a "Stay logged in" option.

**Architecture:** A `useIdleTimer` hook tracks browser activity events and fires callbacks at warning/timeout thresholds. An `IdleWarningModal` component renders the warning UI. The hook + modal are mounted inside `Layout` (org users) and `StaffLayout` (staff users). The staff server-side stale timeout is bumped from 5 → 10 minutes to stay in sync.

**Tech Stack:** React (Next.js Pages Router), TypeScript, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-26-idle-timeout-design.md`

---

## File Structure

- **Create:** `volunteerflow/frontend/src/hooks/useIdleTimer.ts`
- **Create:** `volunteerflow/frontend/src/components/IdleWarningModal.tsx`
- **Modify:** `volunteerflow/frontend/src/components/Layout.tsx` — add hook + modal
- **Modify:** `volunteerflow/frontend/src/components/staff/StaffLayout.tsx` — add hook + modal
- **Modify:** `volunteerflow/backend/src/staff/middleware.js` — `STALE_MINUTES` 5 → 10

---

## Task 1: `useIdleTimer` hook

**Files:**
- Create: `volunteerflow/frontend/src/hooks/useIdleTimer.ts`

**Steps:**
- [ ] Create the `volunteerflow/frontend/src/hooks/` directory (just create the file — Next.js doesn't require registration)
- [ ] Define the hook signature:
  ```ts
  useIdleTimer(options: {
    warningMs?: number;   // default: 9 * 60 * 1000
    timeoutMs?: number;   // default: 10 * 60 * 1000
    onTimeout: () => void;
  }): { isWarning: boolean; secondsLeft: number; reset: () => void }
  ```
- [ ] Listen to `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart` on `document`
- [ ] Use `useRef` for timer IDs to avoid stale closures
- [ ] At `warningMs`: set `isWarning = true`, start a `setInterval` decrementing `secondsLeft` from 60
- [ ] At `timeoutMs`: call `onTimeout()`
- [ ] `reset()`: clear all timers, set `isWarning = false`, reset `secondsLeft = 60`, restart idle timer
- [ ] Clean up all listeners and timers on unmount
- [ ] Only register listeners when `typeof window !== 'undefined'` (SSR safety)

---

## Task 2: `IdleWarningModal` component

**Files:**
- Create: `volunteerflow/frontend/src/components/IdleWarningModal.tsx`

**Steps:**
- [ ] Define props: `isWarning: boolean`, `secondsLeft: number`, `onStay: () => void`, `onLogout: () => void`, `variant: 'org' | 'staff'`
- [ ] Return `null` when `isWarning` is false
- [ ] Render a full-screen overlay with centered modal card
- [ ] Title: "Are you still there?"
- [ ] Body: "You'll be logged out in {secondsLeft} seconds due to inactivity."
- [ ] Two buttons: "Stay logged in" (primary, calls `onStay`) and "Log out" (ghost/secondary, calls `onLogout`)
- [ ] **Org variant** (`variant="org"`): white card, dark text, standard button colors matching `Button.tsx` patterns
- [ ] **Staff variant** (`variant="staff"`): dark card (`bg-gray-900 border-gray-700`), amber text (`text-amber-400`), matching staff portal palette
- [ ] Overlay: semi-transparent black (`bg-black/50`), `z-50`, fixed position

---

## Task 3: Integrate into `Layout` (org users)

**Files:**
- Modify: `volunteerflow/frontend/src/components/Layout.tsx`

**Steps:**
- [ ] Read the full file before editing
- [ ] Import `useIdleTimer` and `IdleWarningModal`
- [ ] Add `useIdleTimer` call inside the `Layout` function with `onTimeout` that:
  1. Calls `localStorage.removeItem('vf_token')`
  2. Calls `localStorage.removeItem('vf_user')`
  3. Sets `window.location.href = '/landing?mode=signin'`
- [ ] Only call the hook when `authState === 'authed'` — use a conditional: pass a no-op `onTimeout` and disable tracking when not authed (or mount a wrapper component conditionally)
- [ ] Render `<IdleWarningModal variant="org" isWarning={isWarning} secondsLeft={secondsLeft} onStay={reset} onLogout={onTimeout} />` inside the layout JSX (outside the main content, inside the outer div)
- [ ] `onLogout` on the modal should call the same logout sequence as `onTimeout`

---

## Task 4: Integrate into `StaffLayout` (staff users)

**Files:**
- Modify: `volunteerflow/frontend/src/components/staff/StaffLayout.tsx`

**Steps:**
- [ ] Read the full file before editing
- [ ] Import `useIdleTimer` and `IdleWarningModal`
- [ ] Define the staff logout function:
  1. Fire-and-forget: `fetch('/api/staff/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('vf_staff_token') } }).catch(() => {})`
  2. `localStorage.removeItem('vf_staff_token')`
  3. `localStorage.removeItem('vf_staff_user')`
  4. `window.location.href = '/staff/login'`
- [ ] Add `useIdleTimer` call with `onTimeout` pointing to the logout function
- [ ] Only active when `isAuthenticated` is true (same pattern as Task 3)
- [ ] Render `<IdleWarningModal variant="staff" isWarning={isWarning} secondsLeft={secondsLeft} onStay={reset} onLogout={logoutFn} />` inside the layout JSX

---

## Task 5: Backend — bump staff stale timeout

**Files:**
- Modify: `volunteerflow/backend/src/staff/middleware.js`

**Steps:**
- [ ] Change line 4: `const STALE_MINUTES = 5;` → `const STALE_MINUTES = 10;`
- [ ] No other changes needed

---

## Acceptance Criteria

- [ ] Org dashboard: no activity for 9 minutes → warning modal appears with countdown
- [ ] Org dashboard: countdown reaches 0 → localStorage cleared, redirect to `/landing?mode=signin`
- [ ] Org dashboard: "Stay logged in" clicked → modal dismisses, timer resets
- [ ] Staff portal: same behavior → redirect to `/staff/login` after logout API call
- [ ] Staff portal: server-side `STALE_MINUTES` is 10
- [ ] No idle logic runs on unauthenticated pages (login, landing, apply)
- [ ] No SSR errors (window/document guarded)
