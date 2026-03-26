# Idle Timeout & Warning Dialog — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

All authenticated users — both org dashboard users and staff portal users — are logged out after 10 minutes of inactivity. A warning dialog appears at the 9-minute mark giving the user 60 seconds to stay logged in before automatic logout.

---

## Scope

- **Org users** — authenticated pages wrapped by `Layout` (`volunteerflow/frontend/src/components/Layout.tsx`)
- **Staff users** — authenticated pages wrapped by `StaffLayout` (`volunteerflow/frontend/src/components/staff/StaffLayout.tsx`)
- **Not in scope** — public/unauthenticated pages (landing, apply, login pages)

---

## Architecture

### 1. `useIdleTimer` hook

**File:** `volunteerflow/frontend/src/hooks/useIdleTimer.ts`

Tracks user inactivity and triggers callbacks at configurable thresholds.

**Parameters:**
- `warningMs: number` — milliseconds of idle before warning (default: `9 * 60 * 1000`)
- `timeoutMs: number` — milliseconds of idle before logout (default: `10 * 60 * 1000`)
- `onTimeout: () => void` — called when `timeoutMs` is reached

**Returns:**
- `isWarning: boolean` — true when between `warningMs` and `timeoutMs`
- `secondsLeft: number` — countdown seconds remaining (only meaningful when `isWarning` is true)
- `reset: () => void` — resets the idle timer (called on "Stay logged in")

**Activity events listened to:** `mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`

**Behavior:**
- Registers event listeners on `document` on mount, removes on unmount
- Uses `useRef` for the timer to avoid stale closure issues
- `secondsLeft` counts down from 60 once warning is active, updated every second via `setInterval`
- Calling `reset()` clears both timers, resets `isWarning` to false, and restarts the idle timer

---

### 2. `IdleWarningModal` component

**File:** `volunteerflow/frontend/src/components/IdleWarningModal.tsx`

**Props:**
- `isWarning: boolean`
- `secondsLeft: number`
- `onStay: () => void` — resets the timer
- `onLogout: () => void` — logs out immediately

**Behavior:**
- Renders nothing when `isWarning` is false
- When visible: modal overlay with title "Are you still there?", body "You'll be logged out in {secondsLeft} seconds due to inactivity.", two buttons: "Stay logged in" (primary) and "Log out" (secondary/ghost)
- Styled to match the page it's on — org pages use the light/neutral palette; staff pages use the dark amber palette. Achieved by passing a `variant` prop (`'org' | 'staff'`)

---

### 3. Integration — Org `Layout`

**File:** `volunteerflow/frontend/src/components/Layout.tsx`

Add `useIdleTimer` inside the `Layout` component. On timeout:
1. Clear `localStorage.removeItem('vf_token')`
2. Clear `localStorage.removeItem('vf_user')`
3. `window.location.href = '/landing?mode=signin'`

Render `<IdleWarningModal variant="org" ... />` inside the layout's JSX.

The hook is only active when the layout is mounted (i.e., the user is authenticated and on a protected page).

---

### 4. Integration — Staff `StaffLayout`

**File:** `volunteerflow/frontend/src/components/staff/StaffLayout.tsx`

Add `useIdleTimer` inside `StaffLayout`. On timeout:
1. Call `POST /api/staff/auth/logout` (fire-and-forget — marks session inactive server-side)
2. Clear `localStorage.removeItem('vf_staff_token')`
3. Clear `localStorage.removeItem('vf_staff_user')`
4. `window.location.href = '/staff/login'`

Render `<IdleWarningModal variant="staff" ... />` inside the layout's JSX.

---

### 5. Backend — Staff stale timeout alignment

**File:** `volunteerflow/backend/src/staff/middleware.js`

Change `STALE_MINUTES` from `5` to `10` so the server-side session invalidation window matches the client-side timeout. No other backend changes are needed.

---

## Data Flow

```
User idle for 9 min
  → useIdleTimer sets isWarning = true, starts 60s countdown
  → IdleWarningModal renders with countdown

User clicks "Stay logged in"
  → reset() called
  → isWarning = false, countdown stops, idle timer restarts from 0

User ignores warning for 60s (or clicks "Log out")
  → onTimeout() fires
  → localStorage cleared, redirect to login page
```

---

## What Is Not Changed

- JWT expiry for org users remains 7 days (server-side; the idle timeout is client-enforced)
- Staff server-side `MAX_SESSION_HOURS` (4 hours) is unchanged
- No new API endpoints are added
- No changes to how 401s are handled in `api.ts` / `staffApi.ts`

---

## Files Changed

| File | Change |
|------|--------|
| `volunteerflow/frontend/src/hooks/useIdleTimer.ts` | NEW |
| `volunteerflow/frontend/src/components/IdleWarningModal.tsx` | NEW |
| `volunteerflow/frontend/src/components/Layout.tsx` | Add hook + modal |
| `volunteerflow/frontend/src/components/staff/StaffLayout.tsx` | Add hook + modal |
| `volunteerflow/backend/src/staff/middleware.js` | `STALE_MINUTES` 5 → 10 |
