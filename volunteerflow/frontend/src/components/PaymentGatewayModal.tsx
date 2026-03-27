import { CreditCard, Wallet, X } from 'lucide-react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { api } from '@/lib/api';
import Button from '@/components/Button';

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

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  planName,
  billingCycle,
  price,
  plan,
  onStripeClick,
  onPayPalApprove,
  onPayPalError,
  stripeLoading,
}: PaymentGatewayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Choose payment method
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Plan summary */}
        <p className="text-sm text-neutral-500 mt-1">
          {planName} &middot; {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} &middot; ${price}/{billingCycle === 'yearly' ? 'year' : 'month'}
        </p>

        {/* Card 1 — Stripe */}
        <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 p-4 mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-neutral-500" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Pay with Card
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            All major cards accepted &middot; Powered by Stripe
          </p>
          <Button
            variant="primary"
            className="w-full"
            disabled={stripeLoading}
            onClick={onStripeClick}
          >
            {stripeLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Redirecting&hellip;
              </>
            ) : (
              'Subscribe with Card'
            )}
          </Button>
        </div>

        {/* Card 2 — PayPal */}
        <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-yellow-400 p-4 space-y-3 mt-3">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-neutral-500" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Pay with PayPal
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Use your PayPal account or PayPal Credit
          </p>
          {PAYPAL_CLIENT_ID ? (
            <PayPalScriptProvider
              options={{ clientId: PAYPAL_CLIENT_ID, vault: true, intent: 'subscription' }}
            >
              <PayPalButtons
                style={{ layout: 'horizontal', color: 'blue', shape: 'rect', label: 'subscribe' }}
                createSubscription={async (_data, actions) => {
                  const { planId } = await api.get<{ planId: string }>(
                    `/billing/paypal/plan-id?plan=${plan}&cycle=${billingCycle}`
                  );
                  return actions.subscription.create({ plan_id: planId });
                }}
                onApprove={async (data) => {
                  await onPayPalApprove(data as { subscriptionID: string | null });
                  onClose();
                }}
                onError={() => {
                  onPayPalError();
                  onClose();
                }}
              />
            </PayPalScriptProvider>
          ) : (
            <p className="text-xs text-neutral-400 italic">PayPal not configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
