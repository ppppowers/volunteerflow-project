# Payment Gateway Selector — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sequential Stripe + PayPal payment blocks in `BillingTab` with a single "Subscribe" button that opens a `PaymentGatewayModal` for choosing a payment provider.

**Spec:** `docs/superpowers/specs/2026-03-26-payment-gateway-selector-design.md`

---

## File Structure

- **Create:** `volunteerflow/frontend/src/components/PaymentGatewayModal.tsx`
- **Modify:** `volunteerflow/frontend/src/pages/settings.tsx`

---

## Task 1: Create `PaymentGatewayModal`

**File:** `volunteerflow/frontend/src/components/PaymentGatewayModal.tsx`

**Steps:**
- [ ] Read `volunteerflow/frontend/src/components/FeedbackModal.tsx` for overlay/card patterns
- [ ] Read `volunteerflow/frontend/src/components/Button.tsx` for button styles
- [ ] Props interface:
  ```ts
  interface PaymentGatewayModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    price: number;
    plan: string;
    onStripeClick: () => Promise<void>;
    onPayPalApprove: (data: { subscriptionID: string | null }) => Promise<void>;
    onPayPalError: () => void;
    stripeLoading: boolean;
  }
  ```
- [ ] Return `null` when `isOpen` is false
- [ ] Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50`
- [ ] Card: `bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4`
- [ ] Header row: title "Choose payment method" + X close button (`onClose`)
- [ ] Plan summary line below title: `{planName} · {Monthly/Yearly} · $price/{month or year}`
- [ ] **Card 1 — Stripe** (`rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-400 p-4`):
  - `CreditCard` icon + "Pay with Card" title + "All major cards accepted · Powered by Stripe" subtitle
  - Full-width primary Button: "Subscribe with Card" → calls `onStripeClick`
  - Shows spinner + "Redirecting…" when `stripeLoading`; disabled while loading
- [ ] **Card 2 — PayPal** (`rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-yellow-400 p-4`):
  - `Wallet` icon + "Pay with PayPal" title + "Use your PayPal account or PayPal Credit" subtitle
  - If `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set: render `PayPalScriptProvider` + `PayPalButtons`:
    ```tsx
    createSubscription={async (_data, actions) => {
      const { planId } = await api.get<{ planId: string }>(
        `/billing/paypal/plan-id?plan=${plan}&cycle=${billingCycle}`
      );
      return actions.subscription.create({ plan_id: planId });
    }}
    onApprove={(data) => { onPayPalApprove(data as { subscriptionID: string | null }); onClose(); }}
    onError={() => { onPayPalError(); onClose(); }}
    ```
  - If not set: gray card with "PayPal not configured" note
- [ ] Clicking backdrop (`onClick` on overlay div) calls `onClose`; stop propagation on card click
- [ ] Import `api` from `@/lib/api` for the PayPal plan-id lookup
- [ ] Import `PayPalButtons, PayPalScriptProvider` from `@paypal/react-paypal-js`
- [ ] Import `CreditCard, Wallet, X` from `lucide-react`
- [ ] No `'use client'` directive (Pages Router)
- [ ] Commit: `feat: PaymentGatewayModal component`

---

## Task 2: Update `BillingTab` in `settings.tsx`

**File:** `volunteerflow/frontend/src/pages/settings.tsx`

**Steps:**
- [ ] Read lines 1–10 to see current imports, then lines 2160–2260 for the subscribe block
- [ ] Add import: `import PaymentGatewayModal from '@/components/PaymentGatewayModal';`
- [ ] Remove `PayPalButtons` and `PayPalScriptProvider` from the `@paypal/react-paypal-js` import line (they move to the modal) — if that empties the import, remove the whole line
- [ ] Add `const [isGatewayOpen, setIsGatewayOpen] = useState(false);` to `BillingTab` state (after existing state declarations)
- [ ] Replace the entire "Subscribe UI" block (the `<div className="space-y-4">` inside the `isSubscribed` else branch, lines ~2206–2253) with:
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
- [ ] Commit: `feat: replace subscribe UI with gateway selector modal`

---

## Acceptance Criteria

- [ ] Billing tab shows a single "Subscribe" button for unsubscribed paid plans
- [ ] Clicking opens modal with plan name, cycle, price in header
- [ ] "Pay with Card" button calls Stripe checkout and shows loading state
- [ ] PayPal buttons render inside the modal and complete subscription flow
- [ ] Modal closes after PayPal approve/error; error surfaces in BillingTab as before
- [ ] Existing subscribed state (manage billing, renewal info) unchanged
- [ ] No TypeScript errors
