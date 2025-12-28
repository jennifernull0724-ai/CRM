// T-REX AI OS — CANONICAL PRICING TIERS AND FEATURE MATRIX
// PRODUCTION ONLY • NO DEMO MODE • NO SUPER ADMIN

export type PlanKey = "starter" | "growth" | "pro" | "enterprise";

export type SeatLimits = {
  owner: number;
  admin: number;
  estimator: number;
  user: number;
  field: number;
};

export const FEATURE_LABELS = {
  contacts: "Contacts + Accounts",
  companies: "Company records",
  deals: "Deal + pipeline tracking",
  line_items: "Line item estimating",
  activity_log: "Activity log",
  email_single_inbox: "Single inbox email",
  basic_dashboard: "Basic dashboard",
  multi_user: "Multi-user workspace",
  estimating: "Estimating workspace",
  approvals: "Approval routing",
  email_templates: "Email templates",
  bulk_import_contacts_companies: "Bulk import (contacts + companies)",
  full_estimating: "Full estimating suite",
  templates: "Document + email templates",
  branding_uploads: "Branding uploads",
  email_integration: "Two-way email integration",
  compliance_core: "Compliance core",
  qr_verification: "QR verification",
  bulk_import_all: "Bulk import (all objects)",
  analytics: "Analytics + reporting",
  advanced_compliance: "Advanced compliance",
  advanced_analytics: "Advanced analytics",
  data_export: "Data export",
  governance_controls: "Governance controls",
  priority_support: "Priority support",
  white_label_optional: "Optional white label",
} as const;

export type PlanFeatureKey = keyof typeof FEATURE_LABELS;

export const RESTRICTION_LABELS = {
  no_user_invites: "User invites disabled",
  no_compliance: "Compliance module unavailable",
  no_qr: "QR + verification disabled",
  no_bulk_import: "Bulk import disabled",
  no_approvals: "Approvals disabled",
  no_analytics: "Analytics disabled",
  no_exports: "Exports disabled",
  no_templates: "Templates disabled",
} as const;

export type PlanRestrictionKey = keyof typeof RESTRICTION_LABELS;

export type PlanTier = {
  key: PlanKey;
  name: string;
  priceLabel: string;
  stripeEligible: boolean;
  durationDays?: number;
  seatLimits: SeatLimits;
  features: PlanFeatureKey[];
  restrictions: PlanRestrictionKey[];
};

const STARTER_FEATURES: PlanFeatureKey[] = [
  "contacts",
  "companies",
  "deals",
  "line_items",
  "activity_log",
  "email_single_inbox",
  "basic_dashboard",
];

const GROWTH_FEATURES: PlanFeatureKey[] = [
  ...STARTER_FEATURES,
  "multi_user",
  "estimating",
  "approvals",
  "email_templates",
  "bulk_import_contacts_companies",
];

const PRO_FEATURES: PlanFeatureKey[] = [
  ...GROWTH_FEATURES,
  "full_estimating",
  "templates",
  "branding_uploads",
  "email_integration",
  "compliance_core",
  "qr_verification",
  "bulk_import_all",
  "analytics",
];

const ENTERPRISE_FEATURES: PlanFeatureKey[] = [
  ...PRO_FEATURES,
  "advanced_compliance",
  "advanced_analytics",
  "data_export",
  "governance_controls",
  "priority_support",
  "white_label_optional",
];

export const PLAN_TIERS: Record<PlanKey, PlanTier> = {
  starter: {
    key: "starter",
    name: "Starter",
    priceLabel: "Free — 14-day controlled access",
    stripeEligible: false,
    durationDays: 14,
    seatLimits: {
      owner: 1,
      admin: 0,
      estimator: 0,
      user: 0,
      field: 0,
    },
    features: STARTER_FEATURES,
    restrictions: [
      "no_user_invites",
      "no_compliance",
      "no_qr",
      "no_bulk_import",
      "no_approvals",
      "no_analytics",
      "no_exports",
      "no_templates",
    ],
  },
  growth: {
    key: "growth",
    name: "Growth",
    priceLabel: "$2,999 / year",
    stripeEligible: true,
    seatLimits: {
      owner: 1,
      admin: 1,
      estimator: 2,
      user: 3,
      field: 0,
    },
    features: GROWTH_FEATURES,
    restrictions: ["no_compliance", "no_qr", "no_exports"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$4,999 / year",
    stripeEligible: true,
    seatLimits: {
      owner: 1,
      admin: 2,
      estimator: 4,
      user: 6,
      field: 2,
    },
    features: PRO_FEATURES,
    restrictions: [],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    priceLabel: "$6,999 / year",
    stripeEligible: true,
    seatLimits: {
      owner: Number.POSITIVE_INFINITY,
      admin: Number.POSITIVE_INFINITY,
      estimator: Number.POSITIVE_INFINITY,
      user: Number.POSITIVE_INFINITY,
      field: Number.POSITIVE_INFINITY,
    },
    features: ENTERPRISE_FEATURES,
    restrictions: [],
  },
};

const PLAN_ORDER: PlanKey[] = ["starter", "growth", "pro", "enterprise"];

export function getPlan(key: PlanKey): PlanTier {
  return PLAN_TIERS[key];
}

export function getTotalSeats(limits: SeatLimits): number {
  const total = limits.owner + limits.admin + limits.estimator + limits.user + limits.field;
  return Number.isFinite(total) ? total : Number.POSITIVE_INFINITY;
}

export function planAllowsFeature(plan: PlanKey, feature: PlanFeatureKey): boolean {
  return PLAN_TIERS[plan].features.includes(feature);
}

export function planHasRestriction(plan: PlanKey, restriction: PlanRestrictionKey): boolean {
  return PLAN_TIERS[plan].restrictions.includes(restriction);
}

export function describeFeature(feature: PlanFeatureKey): string {
  return FEATURE_LABELS[feature];
}

export function describeRestriction(restriction: PlanRestrictionKey): string {
  return RESTRICTION_LABELS[restriction];
}

export function formatSeatLimit(value: number): string {
  return Number.isFinite(value) ? value.toString() : "Unlimited";
}

export function getUpgradeMessage(currentPlan: PlanKey, capability: PlanFeatureKey | PlanRestrictionKey): string {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  if ((FEATURE_LABELS as Record<string, string>)[capability as string]) {
    const feature = capability as PlanFeatureKey;
    const targetPlan = PLAN_ORDER.find((plan) => planAllowsFeature(plan, feature)) ?? "enterprise";
    const targetIndex = PLAN_ORDER.indexOf(targetPlan);

    if (targetIndex <= currentIndex) {
      return "Already included in your plan";
    }

    return `Upgrade to ${PLAN_TIERS[targetPlan].name} to use ${describeFeature(feature)}`;
  }

  const restriction = capability as PlanRestrictionKey;
  const targetPlan = PLAN_ORDER.find((plan) => !planHasRestriction(plan, restriction) && PLAN_ORDER.indexOf(plan) > currentIndex) ?? "enterprise";

  if (!planHasRestriction(currentPlan, restriction)) {
    return "Already included in your plan";
  }

  return `Upgrade to ${PLAN_TIERS[targetPlan].name} to remove: ${describeRestriction(restriction)}`;
}
