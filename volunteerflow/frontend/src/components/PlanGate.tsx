import { ReactNode } from 'react';
import { usePlan } from '@/context/usePlan';
import { FeatureKey, PLANS, PlanId } from '@/lib/pricing.config';
import { Lock, Zap, ArrowRight } from 'lucide-react';

interface PlanGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: 'hide' | 'blur' | 'banner';
}

const PLAN_LABELS: Record<PlanId, string> = { discover: 'Discover', grow: 'Grow', enterprise: 'Enterprise' };

export function PlanGate({ feature, children, fallback, mode = 'banner' }: PlanGateProps) {
  const { can, upgradeRequired } = usePlan();

  if (can(feature)) return <>{children}</>;

  const requiredPlan = upgradeRequired(feature);

  if (fallback) return <>{fallback}</>;

  if (mode === 'hide') return null;

  if (mode === 'blur') {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-50">{children}</div>
        <UpgradeBadge requiredPlan={requiredPlan} />
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>
      <UpgradeBanner requiredPlan={requiredPlan} feature={feature} />
    </div>
  );
}

function UpgradeBadge({ requiredPlan }: { requiredPlan: PlanId | null }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full px-3 py-1.5 shadow-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300">
        <Lock className="w-3 h-3 text-warning-500" />
        {requiredPlan ? `${PLAN_LABELS[requiredPlan]} feature` : 'Upgrade required'}
      </div>
    </div>
  );
}

function UpgradeBanner({ requiredPlan, feature }: { requiredPlan: PlanId | null; feature: FeatureKey }) {
  const plan = requiredPlan ? PLANS[requiredPlan] : null;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
      <div className="text-center max-w-xs px-4">
        <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center mx-auto mb-3">
          <Zap className="w-5 h-5 text-warning-600 dark:text-warning-400" />
        </div>
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
          {plan ? `Upgrade to ${PLAN_LABELS[requiredPlan!]}` : 'Upgrade your plan'}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          This feature is available on {plan?.name ?? 'a higher'} plan.
        </p>
        <button
          onClick={() => (window.location.href = '/pricing')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          View plans <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline upgrade nudge — use inside dashboards ────────────────────────────

interface UpgradeNudgeProps {
  feature: FeatureKey;
  label?: string;
  compact?: boolean;
}

export function UpgradeNudge({ feature, label, compact = false }: UpgradeNudgeProps) {
  const { can, upgradeRequired } = usePlan();
  if (can(feature)) return null;
  const requiredPlan = upgradeRequired(feature);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-800">
        <Lock className="w-2.5 h-2.5" />
        {requiredPlan ? PLAN_LABELS[requiredPlan] : 'Pro'}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-warning-50 to-orange-50 dark:from-warning-900/20 dark:to-orange-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-warning-600 dark:text-warning-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {label ?? 'Feature locked'}
          </p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
            Available on {requiredPlan ? PLAN_LABELS[requiredPlan] : 'higher'} plan
          </p>
        </div>
      </div>
      <button
        onClick={() => (window.location.href = '/pricing')}
        className="flex-shrink-0 text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
      >
        Upgrade <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
