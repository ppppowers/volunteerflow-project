import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import {
  Check,
  Minus,
  Zap,
  Shield,
  Crown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  Info,
  Plus,
} from 'lucide-react';
import {
  PLANS,
  ADD_ONS,
  FEATURE_GROUPS,
  PlanId,
  AddOnId,
  BillingCycle,
  FeatureValue,
  getYearlySavings,
} from '@/lib/pricing.config';
import { usePlan } from '@/context/usePlan';

const PLAN_ORDER: PlanId[] = ['discover', 'grow', 'enterprise'];

const PLAN_ICONS: Record<PlanId, typeof Zap> = {
  discover: Zap,
  grow: Shield,
  enterprise: Crown,
};

const PLAN_BORDER: Record<PlanId, string> = {
  discover: 'border-white/10',
  grow: 'border-emerald-500',
  enterprise: 'border-amber-500',
};

const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

  .pricing-page {
    font-family: 'DM Sans', sans-serif;
  }

  .pricing-display { font-family: 'Playfair Display', serif; }

  .pricing-hero-bg {
    background: radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 50%, rgba(245,158,11,0.05) 0%, transparent 50%),
                #0a0f1e;
  }

  .plan-card-pro {
    background: linear-gradient(160deg, #0f172a 0%, #1e293b 100%);
  }

  .plan-card-pro .plan-price { color: #f0fdf4; }
  .plan-card-pro .plan-name { color: #ffffff; }
  .plan-card-pro .plan-desc { color: rgba(255,255,255,0.65); }
  .plan-card-pro .plan-divider { border-color: rgba(255,255,255,0.12); }
  .plan-card-pro .feature-text { color: rgba(255,255,255,0.85); }

  .pro-shine {
    position: relative;
    overflow: hidden;
  }
  .pro-shine::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(16,185,129,0.6), rgba(245,158,11,0.4), transparent);
  }
  .pro-shine::after {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .tooltip-wrap { position: relative; display: inline-flex; align-items: center; }
  .tooltip-box {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #0f172a;
    color: #f1f5f9;
    font-size: 11px;
    line-height: 1.5;
    padding: 6px 10px;
    border-radius: 7px;
    white-space: normal;
    max-width: 220px;
    text-align: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 50;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .tooltip-wrap:hover .tooltip-box { opacity: 1; }

  .billing-toggle {
    display: inline-flex;
    background: rgba(255,255,255,0.08);
    border-radius: 99px;
    padding: 3px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .billing-opt {
    padding: 8px 20px;
    border-radius: 99px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.45);
    font-family: 'DM Sans', sans-serif;
  }
  .billing-opt.is-active {
    background: rgba(255,255,255,0.12);
    color: white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }

  .feature-row:nth-child(even) { background: rgba(255,255,255,0.02); }

  @keyframes price-fade {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .price-animate { animation: price-fade 0.25s ease both; }

  .addon-card {
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .addon-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .cta-btn-outline {
    padding: 12px 20px;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .cta-btn-outline:hover { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; }

  .cta-btn-primary {
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #10b981, #0d9488);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    box-shadow: 0 4px 16px rgba(16,185,129,0.30);
    letter-spacing: 0.2px;
  }
  .cta-btn-primary:hover { background: linear-gradient(135deg, #059669, #0f766e); box-shadow: 0 6px 20px rgba(16,185,129,0.40); transform: translateY(-1px); }

  .cta-btn-dark {
    padding: 12px 20px;
    border: 1px solid rgba(245,158,11,0.3);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    box-shadow: 0 4px 12px rgba(15,23,42,0.25);
    letter-spacing: 0.2px;
  }
  .cta-btn-dark:hover { background: linear-gradient(135deg, #0f172a, #020617); box-shadow: 0 6px 20px rgba(245,158,11,0.2); transform: translateY(-1px); }
`;

function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip-wrap ml-1 cursor-help">
      <Info className="w-3 h-3 text-neutral-400 hover:text-neutral-300" />
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

function FeatureCell({
  value,
  formatValue,
  isPro,
}: {
  value: FeatureValue;
  formatValue?: (v: FeatureValue) => string;
  isPro: boolean;
}) {
  if (typeof value === 'boolean') {
    if (value)
      return (
        <div className="flex justify-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isPro ? 'bg-emerald-500' : 'bg-emerald-900/40'}`}>
            <Check className={`w-3 h-3 ${isPro ? 'text-white' : 'text-emerald-400'}`} />
          </div>
        </div>
      );
    return (
      <div className="flex justify-center">
        <Minus className="w-4 h-4 text-neutral-600" />
      </div>
    );
  }

  if (formatValue) {
    return (
      <div className={`text-center text-sm font-semibold ${isPro ? 'text-emerald-400' : 'text-neutral-300'}`}>
        {formatValue(value)}
      </div>
    );
  }

  return (
    <div className={`text-center text-sm font-semibold ${isPro ? 'text-emerald-400' : 'text-neutral-300'}`}>
      {value === 'unlimited' ? '∞' : String(value)}
    </div>
  );
}

function PlanCard({
  planId,
  billing,
  currentPlan,
  onSelect,
}: {
  planId: PlanId;
  billing: BillingCycle;
  currentPlan: PlanId | null;
  onSelect: (id: PlanId) => void;
}) {
  const plan = PLANS[planId];
  const Icon = PLAN_ICONS[planId];
  const isCurrent = currentPlan === planId;
  const isPro = planId === 'grow';

  const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const savings = getYearlySavings(plan);

  const topFeatures: Record<PlanId, string[]> = {
    discover: ['5 admin seats', 'Unlimited volunteers & events', 'Email & SMS messaging', '10,000 SMS / year', 'Automated reminders', 'Mobile-friendly'],
    grow: ['15 admin seats', '50,000 SMS / year', 'Custom design & branding', 'Group registration', 'Applicant vetting', 'Hours & attendance tracking'],
    enterprise: ['50 admin seats', '100,000 SMS / year', 'Leader / captain user type', 'Credentials & badges', 'SSO / SAML + audit logs', 'Dedicated CSM & SLA'],
  };

  return (
    <div className="relative">
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 tracking-wide">
            ✦ {plan.badge}
          </span>
        </div>
      )}
      <div
        className={`rounded-2xl border-2 transition-all ${PLAN_BORDER[planId]} ${
          isPro
            ? 'plan-card-pro pro-shine shadow-2xl scale-[1.02]'
            : 'bg-[#111827] shadow-sm hover:shadow-lg hover:shadow-black/20'
        }`}
      >

      <div className="p-7">
        <div className="mb-5">
          <div
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wider uppercase mb-2.5 ${
              isPro
                ? 'bg-emerald-500/20 text-emerald-400'
                : planId === 'enterprise'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-white/8 text-neutral-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {plan.name}
          </div>
          <p className={`text-sm leading-relaxed ${isPro ? 'plan-desc' : 'text-neutral-400'}`}>
            {plan.description}
          </p>
        </div>

        <div className="mb-6 price-animate" key={billing}>
          {price !== null ? (
            <div>
              <div className="flex items-end gap-1.5">
                <span className={`pricing-display text-5xl font-bold leading-none ${isPro ? 'plan-price' : 'text-white'}`}>
                  {billing === 'yearly'
                    ? `$${plan.yearlyPrice!.toLocaleString()}`
                    : `$${plan.monthlyPrice}`}
                </span>
                <span className={`text-sm font-medium mb-1.5 ${isPro ? 'text-white/50' : 'text-neutral-400'}`}>
                  {billing === 'yearly' ? '/yr' : '/mo'}
                </span>
              </div>
              {billing === 'yearly' && (
                <p className="text-xs font-semibold text-emerald-500 mt-1.5">
                  Save {getYearlySavings(plan)}% vs monthly billing
                </p>
              )}
              {billing === 'monthly' && (
                <p className={`text-xs mt-1.5 ${isPro ? 'text-white/40' : 'text-neutral-400'}`}>
                  or ${plan.yearlyPrice!.toLocaleString()}/yr billed annually
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className={`pricing-display text-3xl font-semibold leading-none ${isPro ? 'plan-price' : 'text-white'}`}>
                Custom pricing
              </div>
              <p className={`text-sm font-medium mt-1 ${isPro ? 'text-white/50' : 'text-neutral-400'}`}>
                Annual contract · Volume discounts
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => !isCurrent && onSelect(planId)}
          className={`cta-btn-${plan.ctaVariant} mb-6`}
          style={isCurrent ? { opacity: 0.6, cursor: 'default' } : {}}
        >
          {isCurrent ? 'Current plan' : plan.ctaLabel}
          {!isCurrent && <ArrowRight className="w-4 h-4" />}
        </button>

        <div className={`pt-5 border-t plan-divider ${isPro ? '' : 'border-white/10'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-3.5 ${isPro ? 'text-white/40' : 'text-neutral-400'}`}>
            {planId === 'discover' ? 'Includes' : planId === 'grow' ? 'Everything in Discover, plus' : 'Everything in Grow, plus'}
          </p>
          <ul className="space-y-2.5">
            {topFeatures[planId].map((feat) => (
              <li key={feat} className={`flex items-center gap-2.5 text-sm feature-text ${isPro ? '' : 'text-neutral-300'}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPro ? 'bg-emerald-500/30' : planId === 'enterprise' ? 'bg-amber-500/10' : 'bg-emerald-900/20'
                }`}>
                  <Check className={`w-2.5 h-2.5 ${
                    isPro ? 'text-emerald-400' : planId === 'enterprise' ? 'text-amber-500' : 'text-emerald-400'
                  }`} />
                </div>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}

function AddOnCard({
  addOnId,
  billing,
  currentPlan,
  purchased,
  onToggle,
}: {
  addOnId: AddOnId;
  billing: BillingCycle;
  currentPlan: PlanId | null;
  purchased: boolean;
  onToggle: () => void;
}) {
  const addOn = ADD_ONS[addOnId];
  const price = billing === 'monthly' ? addOn.monthlyPrice : addOn.yearlyPrice;
  const canBuy = currentPlan ? addOn.availableFor.includes(currentPlan) : true;

  return (
    <div className={`addon-card rounded-xl border-2 p-4 ${
      purchased
        ? 'border-emerald-500 bg-emerald-900/15'
        : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-bold text-white">{addOn.name}</h4>
        <span className={`text-sm font-bold flex-shrink-0 ${purchased ? 'text-emerald-400' : 'text-white'}`}>
          +${price}<span className="text-xs font-normal text-neutral-400">/mo</span>
        </span>
      </div>
      <p className="text-xs text-neutral-400 mb-3 leading-relaxed">{addOn.description}</p>
      <div className="flex items-center justify-between">
        <div className="tooltip-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            canBuy
              ? 'bg-emerald-900/40 text-emerald-400'
              : 'bg-white/8 text-neutral-400'
          }`}>
            {canBuy ? 'Available for your plan' : 'Included in Grow+'}
          </span>
          <span className="tooltip-box">{addOn.tooltip}</span>
        </div>
        {canBuy ? (
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              purchased
                ? 'bg-emerald-900/40 text-emerald-400 hover:bg-red-900/20 hover:text-red-400'
                : 'bg-white text-neutral-900 hover:bg-neutral-200'
            }`}
          >
            {purchased ? <><Check className="w-3 h-3" />Added</> : <><Plus className="w-3 h-3" />Add</>}
          </button>
        ) : (
          <span className="text-[10px] text-neutral-400 italic">Upgrade plan to enable</span>
        )}
      </div>
    </div>
  );
}

function ComparisonTable({ billing }: { billing: BillingCycle }) {
  const [openGroups, setOpenGroups] = useState<string[]>(['Platform Limits', 'Core Features']);

  const toggle = (title: string) =>
    setOpenGroups((g) => g.includes(title) ? g.filter((x) => x !== title) : [...g, title]);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4">
        <div className="px-5 py-4 bg-white/3 border-b border-r border-white/10 flex items-end">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Feature</span>
        </div>
        {PLAN_ORDER.map((pid) => {
          const plan = PLANS[pid];
          const Icon = PLAN_ICONS[pid];
          const isGrow = pid === 'grow';
          return (
            <div
              key={pid}
              className={`px-4 py-4 text-center border-b border-r border-white/10 last:border-r-0 relative ${
                isGrow ? 'bg-emerald-950/40' : 'bg-white/3'
              }`}
            >
              {isGrow && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />
              )}
              <div className={`inline-flex items-center gap-1.5 text-sm font-bold mb-1 ${isGrow ? 'text-emerald-400' : 'text-white/80'}`}>
                <Icon className="w-3.5 h-3.5" />
                {plan.name}
              </div>
              <p className="text-xs text-neutral-500">
                {plan.monthlyPrice === null
                  ? 'Custom pricing'
                  : billing === 'yearly'
                  ? `$${plan.yearlyPrice!.toLocaleString()}/yr`
                  : `$${plan.monthlyPrice}/mo`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Feature Groups */}
      {FEATURE_GROUPS.map((group, gi) => {
        const isOpen = openGroups.includes(group.title);
        return (
          <div key={group.title}>
            {/* Group header */}
            <button
              onClick={() => toggle(group.title)}
              className="w-full grid grid-cols-4 border-t border-white/8 hover:bg-white/3 transition-colors group"
            >
              <div className="px-5 py-3 flex items-center gap-2 col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-400 transition-colors">{group.title}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />}
              </div>
              <div className="border-l border-white/5" />
              <div className="bg-emerald-950/20 border-l border-white/5" />
              <div className="border-l border-white/5" />
            </button>

            {/* Feature rows */}
            {isOpen && group.features.map((feat, fi) => (
              <div key={feat.key} className="grid grid-cols-4 border-t border-white/5 hover:bg-white/2 transition-colors">
                <div className="px-5 py-3.5 flex items-center gap-1.5 border-r border-white/5">
                  <span className="text-sm text-neutral-300">{feat.label}</span>
                  <Tooltip text={feat.tooltip} />
                </div>
                {PLAN_ORDER.map((pid) => {
                  const val = PLANS[pid].features[feat.key as keyof typeof PLANS[typeof pid]['features']];
                  const isGrow = pid === 'grow';
                  return (
                    <div key={pid} className={`px-4 py-3.5 flex items-center justify-center border-r border-white/5 last:border-r-0 ${isGrow ? 'bg-emerald-950/25' : ''}`}>
                      <FeatureCell value={val as FeatureValue} formatValue={feat.formatValue} isPro={isGrow} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const FAQ_ITEMS = [
  { q: 'Can I switch plans at any time?', a: 'Yes. Upgrade instantly and get prorated credit for your remaining billing period. Downgrading takes effect at your next renewal.' },
  { q: 'Is there a free trial on paid plans?', a: 'All plans come with a 30-day free trial — no credit card required. Enterprise includes a personalized demo and pilot period.' },
  { q: 'Can I add more admin seats to my plan?', a: 'Yes. You can purchase extra admin seat packs as an add-on on Discover and Grow plans. Enterprise includes 50 seats by default.' },
  { q: 'Do add-ons stack across billing cycles?', a: 'Yes. Add-ons are billed monthly alongside your plan. You can add or remove them at any time with immediate effect.' },
  { q: 'Is my data safe if I cancel?', a: 'Yes. After cancellation you have 90 days to export all your data. We never delete data within that window.' },
  { q: 'Does Enterprise require an annual contract?', a: 'Enterprise pricing is negotiated annually with volume discounts. We also offer month-to-month at a slightly higher rate for flexibility.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-semibold text-white">{item.q}</span>
            {open === i ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-neutral-400 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [purchasedAddOns, setPurchasedAddOns] = useState<AddOnId[]>([]);
  const { currentPlan, setPlan } = usePlan();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    setIsLoggedIn(Boolean(sessionStorage.getItem('vf_token')));
  }, []);
  // Only highlight a current plan when the user is actually signed in
  const activePlan: PlanId | null = isLoggedIn ? currentPlan : null;

  const handleSelectPlan = (planId: PlanId) => {
    setPlan(planId);
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@volunteerflow.com';
    } else {
      router.push(`/signup?plan=${planId}`);
    }
  };

  const toggleAddOn = (id: AddOnId) =>
    setPurchasedAddOns((p) => p.includes(id) ? p.filter((a) => a !== id) : [...p, id]);

  const addOnIds = Object.keys(ADD_ONS) as AddOnId[];
  const addOnTotal = purchasedAddOns.reduce(
    (sum, id) => sum + (billing === 'yearly' ? ADD_ONS[id].yearlyPrice : ADD_ONS[id].monthlyPrice),
    0
  );

  return (
    <div className="pricing-page min-h-screen pricing-hero-bg">
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <PublicNav />

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 text-center" style={{ paddingTop: 100 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
          <Zap className="w-3 h-3" />
          Simple, transparent pricing
        </div>
        <h1 className="pricing-display text-5xl sm:text-6xl font-semibold text-white leading-tight tracking-tight mb-4">
          Pricing that grows<br />
          <em className="text-emerald-400">with your mission</em>
        </h1>
        <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Start free. Scale to thousands of volunteers. No hidden fees, no lock-in.
        </p>
        <div className="inline-flex flex-col items-center gap-2">
          <div className="billing-toggle">
            <button className={`billing-opt ${billing === 'monthly' ? 'is-active' : ''}`} onClick={() => setBilling('monthly')}>Monthly</button>
            <button className={`billing-opt ${billing === 'yearly' ? 'is-active' : ''}`} onClick={() => setBilling('yearly')}>Yearly</button>
          </div>
          {billing === 'yearly' && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full">
              💚 Save up to 16% with annual billing
            </span>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start pt-4">
          {PLAN_ORDER.map((pid) => (
            <PlanCard key={pid} planId={pid} billing={billing} currentPlan={activePlan} onSelect={handleSelectPlan} />
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-400">
          {['🔒 Data encrypted at rest & in transit', '🌱 Built for nonprofits & mission-driven orgs', '💳 No credit card for free plan', '↩️ Cancel anytime'].map((item) => (
            <span key={item} className="font-medium">{item}</span>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="pricing-display text-3xl font-semibold text-white mb-3">Full feature comparison</h2>
          <p className="text-neutral-400 text-sm">Expand each section to compare every feature side by side.</p>
        </div>
        <ComparisonTable billing={billing} />
      </div>

      {/* Enterprise CTA */}
      <div className="bg-black/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Crown className="w-3 h-3" />
            Enterprise
          </div>
          <h2 className="pricing-display text-4xl font-semibold text-white mb-4 leading-tight">
            Running a large-scale<br />volunteer program?
          </h2>
          <p className="text-neutral-400 text-base leading-relaxed max-w-lg mx-auto mb-8">
            Get white-glove onboarding, custom integrations, a dedicated Customer Success Manager, and enterprise SLAs tailored to your organization.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="mailto:sales@volunteerflow.com" className="cta-btn-dark" style={{ width: 'auto', padding: '14px 28px', fontSize: '15px', textDecoration: 'none' }}>
              <Crown className="w-4 h-4" /> Talk to sales
            </a>
            <a href="mailto:sales@volunteerflow.com" className="cta-btn-outline" style={{ width: 'auto', padding: '14px 28px', fontSize: '15px', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>
              Book a demo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[['50+', 'Admin seats'], ['99.9%', 'Uptime SLA'], ['< 2hr', 'Support response'], ['Custom', 'Contract terms']].map(([val, label]) => (
              <div key={label}>
                <div className="pricing-display text-2xl font-semibold text-amber-400 mb-1">{val}</div>
                <div className="text-xs text-neutral-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="pricing-display text-3xl font-semibold text-white mb-3">Frequently asked questions</h2>
        </div>
        <FAQ />
      </div>

      {/* Footer nudge */}
      <div className="border-t border-white/10 bg-[#0a0f1e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-white">Still have questions?</p>
            <p className="text-sm text-neutral-400">Our team responds within a few hours on business days.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/landing#features" className="cta-btn-outline" style={{ width: 'auto', padding: '10px 20px', textDecoration: 'none' }}>
              View features <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href="mailto:support@volunteerflow.com" className="cta-btn-primary" style={{ width: 'auto', padding: '10px 20px', textDecoration: 'none' }}>
              Contact support
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
