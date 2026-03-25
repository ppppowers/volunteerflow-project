import { createContext, useContext, useState, ReactNode } from 'react';
import {
  PlanId,
  FeatureKey,
  AddOnId,
  hasFeature,
  getFeatureLimit,
  getUpgradePath,
  canPurchaseAddOn,
  PLANS,
  FeatureValue,
} from '@/lib/pricing.config';

interface PlanContextValue {
  currentPlan: PlanId;
  setPlan: (plan: PlanId) => void;
  activeAddOns: AddOnId[];
  addAddOn: (id: AddOnId) => void;
  removeAddOn: (id: AddOnId) => void;
  can: (feature: FeatureKey) => boolean;
  limit: (feature: FeatureKey) => FeatureValue;
  upgradeRequired: (feature: FeatureKey) => PlanId | null;
  hasAddOn: (id: AddOnId) => boolean;
  canBuyAddOn: (id: AddOnId) => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children, initialPlan = 'discover' }: { children: ReactNode; initialPlan?: PlanId }) {
  const [currentPlan, setCurrentPlan] = useState<PlanId>(initialPlan);
  const [activeAddOns, setActiveAddOns] = useState<AddOnId[]>([]);

  const can = (feature: FeatureKey): boolean => {
    if (hasFeature(currentPlan, feature)) return true;
    // Check if an add-on grants this feature
    // (simplified: we map add-on featureKey to the feature)
    return false;
  };

  const limit = (feature: FeatureKey): FeatureValue => {
    return getFeatureLimit(currentPlan, feature);
  };

  const upgradeRequired = (feature: FeatureKey): PlanId | null => {
    if (can(feature)) return null;
    return getUpgradePath(currentPlan, feature);
  };

  const hasAddOn = (id: AddOnId) => activeAddOns.includes(id);

  const addAddOn = (id: AddOnId) => {
    if (!activeAddOns.includes(id)) setActiveAddOns((p) => [...p, id]);
  };

  const removeAddOn = (id: AddOnId) => {
    setActiveAddOns((p) => p.filter((a) => a !== id));
  };

  const canBuyAddOn = (id: AddOnId) => canPurchaseAddOn(currentPlan, id);

  return (
    <PlanContext.Provider
      value={{ currentPlan, setPlan: setCurrentPlan, activeAddOns, addAddOn, removeAddOn, can, limit, upgradeRequired, hasAddOn, canBuyAddOn }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside <PlanProvider>');
  return ctx;
}
