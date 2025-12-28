// T-REX AI OS — PRICING ENFORCEMENT (SERVER-SIDE)
// All write operations MUST check plan limits

import { prisma } from '@/lib/prisma'
import {
  PLAN_TIERS,
  describeFeature,
  planAllowsFeature,
  type PlanFeatureKey,
  type PlanKey,
  type SeatLimits,
} from './planTiers'

export class PricingEnforcementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PricingEnforcementError'
  }
}

type CompanyBillingContext = {
  userId: string
  userRole: string
  companyId: string
  planKey: PlanKey
  starterStartedAt?: Date | null
  starterExpiresAt?: Date | null
}

async function getCompanyContextByUserId(userId: string): Promise<CompanyBillingContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      company: {
        select: {
          id: true,
          planKey: true,
          starterStartedAt: true,
          starterExpiresAt: true,
        },
      },
    },
  })

  if (!user || !user.companyId || !user.company) {
    throw new PricingEnforcementError('Company context unavailable for user')
  }

  return {
    userId: user.id,
    userRole: user.role,
    companyId: user.company.id,
    planKey: user.company.planKey as PlanKey,
    starterStartedAt: user.company.starterStartedAt ?? undefined,
    starterExpiresAt: user.company.starterExpiresAt ?? undefined,
  }
}

function computeStarterExpiry(context: CompanyBillingContext): Date | null {
  if (context.planKey !== 'starter') {
    return null
  }

  if (context.starterExpiresAt) {
    return context.starterExpiresAt
  }

  if (!context.starterStartedAt) {
    return null
  }

  const durationDays = PLAN_TIERS.starter.durationDays ?? 14
  const expires = new Date(context.starterStartedAt)
  expires.setDate(expires.getDate() + durationDays)
  return expires
}

function isStarterExpired(context: CompanyBillingContext): boolean {
  if (context.planKey !== 'starter') {
    return false
  }

  const expiresAt = computeStarterExpiry(context)
  return !!expiresAt && expiresAt.getTime() < Date.now()
}

async function ensurePlanSupportsFeature(
  context: CompanyBillingContext,
  feature: PlanFeatureKey
): Promise<void> {
  if (!planAllowsFeature(context.planKey, feature)) {
    throw new PricingEnforcementError(
      `${describeFeature(feature)} is not available on the ${PLAN_TIERS[context.planKey].name} plan`
    )
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceFeatureAccess(userId: string, feature: PlanFeatureKey): Promise<void> {
  const context = await getCompanyContextByUserId(userId)
  await ensurePlanSupportsFeature(context, feature)
}

export async function enforceCanCreateDeal(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'deals')
}

export async function enforceCanEstimate(userId: string): Promise<void> {
  const context = await getCompanyContextByUserId(userId)
  const hasEstimating =
    planAllowsFeature(context.planKey, 'estimating') || planAllowsFeature(context.planKey, 'full_estimating')

  if (!hasEstimating) {
    throw new PricingEnforcementError('Estimating is not enabled for your plan')
  }

  if (context.userRole === 'user') {
    throw new PricingEnforcementError('Only estimator, admin, or owner roles can edit estimates')
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceCanAccessCompliance(userId: string): Promise<void> {
  const context = await getCompanyContextByUserId(userId)
  const hasCompliance =
    planAllowsFeature(context.planKey, 'compliance_core') || planAllowsFeature(context.planKey, 'advanced_compliance')

  if (!hasCompliance) {
    throw new PricingEnforcementError('Compliance is not enabled on this plan')
  }

  if (!['admin', 'owner'].includes(context.userRole)) {
    throw new PricingEnforcementError('Only Admin or Owner roles can access compliance')
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceCanAccessAnalytics(userId: string): Promise<void> {
  const context = await getCompanyContextByUserId(userId)
  const hasAnalytics =
    planAllowsFeature(context.planKey, 'analytics') || planAllowsFeature(context.planKey, 'advanced_analytics')

  if (!hasAnalytics) {
    throw new PricingEnforcementError('Analytics require the Pro plan or higher')
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceCanUseEmailIntegration(userId: string): Promise<void> {
  const context = await getCompanyContextByUserId(userId)

  if (!planAllowsFeature(context.planKey, 'email_integration')) {
    throw new PricingEnforcementError('Two-way email integration requires Pro or Enterprise')
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceCanUploadFile(userId: string, _fileSizeBytes: number): Promise<void> {
  const context = await getCompanyContextByUserId(userId)
  void _fileSizeBytes

  if (!planAllowsFeature(context.planKey, 'branding_uploads')) {
    throw new PricingEnforcementError('File uploads beyond the basic plan require Pro or higher')
  }

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter access expired. Upgrade to continue.')
  }
}

export async function enforceCanWrite(userId: string): Promise<void> {
  const context = await getCompanyContextByUserId(userId)

  if (isStarterExpired(context)) {
    throw new PricingEnforcementError('Starter trial has expired. Upgrade to continue making changes.')
  }
}

export async function enforceCanAddUser(companyId: string, role: keyof SeatLimits): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      planKey: true,
    },
  })

  if (!company) {
    throw new PricingEnforcementError('Company not found')
  }

  const planKey = company.planKey as PlanKey
  const plan = PLAN_TIERS[planKey]
  const planLimit = plan.seatLimits[role]

  if (!Number.isFinite(planLimit)) {
    return
  }

  const currentCounts = await getUserCountsByRole(companyId)

  if (currentCounts[role] >= planLimit) {
    throw new PricingEnforcementError(
      `${plan.name} plan allows ${planLimit} ${role} seat(s). Remove a seat or upgrade to add more.`
    )
  }
}

async function getUserCountsByRole(companyId: string): Promise<SeatLimits> {
  const users = await prisma.user.groupBy({
    by: ['role'],
    where: { companyId },
    _count: true,
  })

  const counts: SeatLimits = {
    owner: 0,
    admin: 0,
    estimator: 0,
    user: 0,
    field: 0,
  }

  users.forEach(({ role, _count }) => {
    if (role in counts) {
      counts[role as keyof SeatLimits] = _count
    }
  })

  return counts
}
