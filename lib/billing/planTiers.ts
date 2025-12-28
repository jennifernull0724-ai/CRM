// T-REX AI OS — CANONICAL PRICING TIERS (SINGLE SOURCE OF TRUTH)
// NO DEMO MODE • NO SUPER ADMIN • PRODUCTION ONLY

export type PlanKey = "starter" | "growth" | "pro" | "enterprise";

export type SeatLimits = {
  owner: number;
  admin: number;
  estimator: number;
  user: number;
  field: number;
};

export type PlanTier = {
  key: PlanKey;
  name: string;
  priceLabel: string;
  stripeEligible: boolean;
  durationDays?: number; // Only for starter
  seatLimits: SeatLimits;
  features: string[];
  restrictions: string[];
};

export const PLAN_TIERS: Record<PlanKey, PlanTier> = {
  starter: {
    key: "starter",
    name: "Starter",
    priceLabel: "14-day trial",
    stripeEligible: false,
    durationDays: 14,
    seatLimits: {
      owner: 1,
      admin: 0,
      estimator: 1,
      user: 2,
      field: 0,
    },
    features: [
      "Contact management",
      "Basic deal tracking",
      "Up to 4 users total",
      "14-day access",
      "Email support",
    ],
    restrictions: [
      "No estimating/pricing features",
      "No compliance module",
      "No analytics",
      "No file storage",
      "No email integration",
      "Read-only after expiry",
    ],
  },
  growth: {
    key: "growth",
    name: "Growth",
    priceLabel: "$199/month",
    stripeEligible: true,
    seatLimits: {
      owner: 1,
      admin: 1,
      estimator: 3,
      user: 10,
      field: 5,
    },
    features: [
      "Full contact & deal management",
      "Estimating with line items",
      "PDF generation",
      "Email integration (Gmail/Outlook)",
      "Up to 20 users total",
      "10GB file storage",
      "Priority email support",
    ],
    restrictions: [
      "No compliance module",
      "Basic analytics only",
      "Single company only",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$499/month",
    stripeEligible: true,
    seatLimits: {
      owner: 2,
      admin: 3,
      estimator: 10,
      user: 50,
      field: 20,
    },
    features: [
      "Everything in Growth",
      "Full compliance module",
      "Employee certifications & QR codes",
      "Advanced analytics",
      "Up to 85 users total",
      "100GB file storage",
      "Custom email templates",
      "Phone support",
    ],
    restrictions: [
      "Single company only",
    ],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom pricing",
    stripeEligible: true,
    seatLimits: {
      owner: 10,
      admin: 20,
      estimator: 50,
      user: 500,
      field: 100,
    },
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Multi-company support",
      "Unlimited file storage",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Custom training",
    ],
    restrictions: [],
  },
};

// Helper functions
export function getPlan(key: PlanKey): PlanTier {
  return PLAN_TIERS[key];
}

export function getTotalSeats(limits: SeatLimits): number {
  return limits.owner + limits.admin + limits.estimator + limits.user + limits.field;
}

export function canAddUser(
  plan: PlanKey,
  role: keyof SeatLimits,
  currentCounts: SeatLimits
): boolean {
  const planLimits = PLAN_TIERS[plan].seatLimits;
  return currentCounts[role] < planLimits[role];
}

export function hasFeature(plan: PlanKey, feature: string): boolean {
  const planTier = PLAN_TIERS[plan];
  
  // Map features to capabilities
  const featureMap: Record<string, PlanKey[]> = {
    contacts: ["starter", "growth", "pro", "enterprise"],
    deals: ["starter", "growth", "pro", "enterprise"],
    estimating: ["growth", "pro", "enterprise"],
    compliance: ["pro", "enterprise"],
    analytics: ["pro", "enterprise"],
    email_integration: ["growth", "pro", "enterprise"],
    file_storage: ["growth", "pro", "enterprise"],
    multi_company: ["enterprise"],
  };
  
  return featureMap[feature]?.includes(plan) ?? false;
}

export function isExpired(
  plan: PlanKey,
  createdAt: Date,
  subscriptionStatus?: string
): boolean {
  // Starter expires after 14 days
  if (plan === "starter") {
    const daysSinceCreation = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreation > 14;
  }
  
  // Paid plans check subscription status
  if (subscriptionStatus) {
    return ["cancelled", "expired", "past_due"].includes(subscriptionStatus);
  }
  
  return false;
}

export function isReadOnly(
  plan: PlanKey,
  createdAt: Date,
  subscriptionStatus?: string
): boolean {
  // Starter becomes read-only after expiry
  if (plan === "starter") {
    return isExpired(plan, createdAt);
  }
  
  // Paid plans are read-only if subscription is not active
  return subscriptionStatus !== "active";
}

export function getUpgradeMessage(currentPlan: PlanKey, feature: string): string {
  if (currentPlan === "starter") {
    return "Upgrade to Growth plan to access this feature";
  }
  
  if (currentPlan === "growth") {
    if (feature === "compliance" || feature === "analytics") {
      return "Upgrade to Pro plan to access this feature";
    }
  }
  
  if (currentPlan === "pro") {
    if (feature === "multi_company") {
      return "Contact sales for Enterprise plan";
    }
  }
  
  return "Upgrade required";
}
