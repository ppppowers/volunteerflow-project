# Payment Gateway Selector — Design Spec

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Replace the current sequential Stripe + PayPal payment blocks in the billing settings page with a single "Subscribe" button that opens a `PaymentGatewayModal`. The modal shows the plan summary and lets the org choose their preferred payment method before proceeding. No backend changes are needed — existing routes handle both providers exactly as before.

---

## Current State (to be replaced)

In `volunteerflow/frontend/src/pages/settings.tsx`, the `BillingTab` component's "Subscribe UI" section (lines ~2206–2253) currently renders:
1. A Stripe card block with a "Subscribe with Stripe" button
2. Below it, a "Or pay with PayPal" block with `PayPalScriptProvider` + `PayPalButtons`

These two blocks are replaced by a single "Subscribe" button that opens the modal.

---

## New Component: `PaymentGatewayModal`

**File:** `volunteerflow/frontend/src/components/PaymentGatewayModal.tsx`

### Props

```ts
interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;           // e.g. "Grow"
  billingCycle: 'monthly' | 'yearly';
  price: number;              // numeric price, e.g. 249
  plan: string;               // plan id, e.g. "grow" — passed to PayPal plan-id lookup
  onStripeClick: () => Promise<void>;   // calls handleStripeCheckout from BillingTab
  onPayPalApprove: (data: { subscriptionID: string | null }) => Promise<void>; // calls handlePayPalApprove
  onPayPalError: () => void;            // sets paypalError in BillingTab
  stripeLoading: boolean;     // passed in so button reflects existing loading state
}
```

### Layout

Fixed full-screen overlay (`fixed inset-0 z-50 flex items-center justify-center bg-black/50`), centered card (`bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4`).

**Header:**
- Title: "Choose payment method"
- Subtitle/plan summary: "{planName} plan · {Monthly/Yearly} · **${price}/{month or year}**"
- X close button top-right

**Two option cards** stacked vertically with gap between, each `rounded-xl border-2 p-4 cursor-pointer transition-all`:

**Card 1 — Pay with Card (Stripe):**
- Border: `border-neutral-200 dark:border-neutral-700 hover:border-primary-400`
- Icon: `CreditCard` from lucide-react
- Title: "Pay with Card"
- Subtitle: "All major cards accepted · Powered by Stripe"
- A full-width "Subscribe with Card" button (primary blue) that calls `onStripeClick`
- Shows spinner + "Redirecting…" when `stripeLoading` is true
- Disabled while `stripeLoading`

**Card 2 — Pay with PayPal:**
- Border: `border-neutral-200 dark:border-neutral-700 hover:border-yellow-400`
- Icon: inline PayPal wordmark (SVG) or a `Wallet` lucide icon with "PayPal" text
- Title: "Pay with PayPal"
- Subtitle: "Use your PayPal account or PayPal Credit"
- Renders `PayPalScriptProvider` + `PayPalButtons` directly inside the card (only when `PAYPAL_CLIENT_ID` is set)
- If `PAYPAL_CLIENT_ID` is not set: card is grayed out with "PayPal not configured" note

**PayPal setup inside modal:**
```tsx
<PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription' }}>
  <PayPalButtons
    style={{ layout: 'horizontal', color: 'blue', shape: 'rect', label: 'subscribe' }}
    createSubscription={async (_data, actions) => {
      const { planId } = await api.get<{ planId: string }>(
        `/billing/paypal/plan-id?plan=${plan}&cycle=${billingCycle}`
      );
      return actions.subscription.create({ plan_id: planId });
    }}
    onApprove={(data) => {
      onPayPalApprove(data as { subscriptionID: string | null });
      onClose();
    }}
    onError={() => {
      onPayPalError();
      onClose();
    }}
  />
</PayPalScriptProvider>
```

### Behaviour
- `PAYPAL_CLIENT_ID` read from `process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID` (same as current code)
- Modal does not auto-close on Stripe click — the page will navigate away naturally
- Modal closes after PayPal approve or PayPal error (error message shown via `onPayPalError` in BillingTab as before)
- Clicking the overlay or X button calls `onClose`

---

## Changes to `BillingTab` in `settings.tsx`

The existing `BillingTab` function already has `handleStripeCheckout`, `handlePayPalApprove`, `checkoutLoading`, and `paypalError` — these are kept as-is and passed as props to the modal.

**Add:**
- `isMGatewayOpen` boolean state (default `false`)
- Import `PaymentGatewayModal`

**Replace** the entire "Subscribe UI" `<div className="space-y-4">` block (lines ~2206–2253) with:

```tsx
<div className="space-y-4">
  <p className="text-sm text-neutral-600 dark:text-neutral-400">
    Activate your <strong>{plan?.name}</strong> plan for{' '}
    <strong>${price}/{billingData?.billingCycle === 'yearly' ? 'year' : 'month'}</strong>.
  </p>
  <Button
    variant="primary"
    onClick={() => setIsGatewayOpen(true)}
    className="w-full sm:w-auto"
  >
    Subscribe
  </Button>
  <PaymentGatewayModal
    isOpen={isGatewayOpen}
    onClose={() => setIsGatewayOpen(false)}
    planName={plan?.name ?? ''}
    billingCycle={billingData?.billingCycle ?? 'monthly'}
    price={price ?? 0}
    plan={billingData?.plan ?? ''}
    onStripeClick={handleStripeCheckout}
    onPayPalApprove={handlePayPalApprove}
    onPayPalError={() => setPaypalError('PayPal encountered an error. Please try again or use card payment.')}
    stripeLoading={checkoutLoading}
  />
</div>
```

The `PayPalScriptProvider` + `PayPalButtons` import in `settings.tsx` is no longer used directly and can be removed from the top-level imports (they move into `PaymentGatewayModal.tsx`).

---

## Files Changed

| File | Change |
|------|--------|
| `volunteerflow/frontend/src/components/PaymentGatewayModal.tsx` | NEW: gateway selector modal |
| `volunteerflow/frontend/src/pages/settings.tsx` | Replace subscribe UI block with single button + modal |

---

## What Is Not Changed

- All backend billing routes (`/api/billing/stripe/*`, `/api/billing/paypal/*`)
- Webhook handlers
- Subscription management UI (shown when `isSubscribed` is true) — unchanged
- Billing history table — unchanged
- PayPal SDK (`@paypal/react-paypal-js`) — still used, just moved into the modal component
- `handleStripeCheckout` and `handlePayPalApprove` functions — kept in `BillingTab`, passed as props
