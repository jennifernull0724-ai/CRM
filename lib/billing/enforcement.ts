// T-REX AI OS — PRICING ENFORCEMENT (SERVER-SIDE)
// All write operations MUST check plan limits

import Stripe from 'stripe'
import type { AccessAuditAction, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  PLAN_TIERS,
  describeFeature,
  planAllowsFeature,
  type PlanFeatureKey,
  type PlanKey,
  type SeatLimits,
} from './planTiers'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2025-12-15.clover',
    })
  : null

const MIN_PRO_SEATS = 15
const PLAN_TOTAL_SEAT_CAP: Record<PlanKey, number | null> = {
  starter: 1,
  growth: 10,
  pro: null,
  enterprise: null,
}

export class PricingEnforcementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PricingEnforcementError'
  }
}

export class SeatEnforcementError extends PricingEnforcementError {
  constructor(message: string) {
    super(message)
    this.name = 'SeatEnforcementError'
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
  void role
  await enforceSeatCap({
    companyId,
    requestedDelta: 1,
    reason: 'invite',
    skipStarterLock: true,
  })
}

type SeatCapReason = 'invite' | 'accept-invite' | 'role-change' | 'enable-user' | 'system'

type SeatCapOptions = {
  companyId: string
  requestedDelta: number
  reason: SeatCapReason
  actorId?: string
  skipStarterLock?: boolean
  metadata?: Record<string, unknown>
}

export type SeatUsageSummary = {
  planKey: PlanKey
  planName: string
  activeSeats: number
  limit: number | null
  stripeSeatQuantity: number | null
  inviteAllowed: boolean
  inviteBlockedReason: string | null
}

type SeatContext = {
  companyId: string
  planKey: PlanKey
  planName: string
  activeSeats: number
  stripeSeatQuantity: number | null
  stripeSeatItemId: string | null
  stripeSubscriptionId: string | null
}

type SeatLimitResolution = {
  limit: number | null
  stripeQuantity: number | null
  itemId: string | null
}

const SEAT_REASON_TO_ACTION: Record<SeatCapReason, AccessAuditAction> = {
  invite: 'INVITE_BLOCKED_SEAT_LIMIT',
  'accept-invite': 'INVITE_BLOCKED_SEAT_LIMIT',
  'role-change': 'ROLE_CHANGE_BLOCKED_SEAT_LIMIT',
  'enable-user': 'ROLE_CHANGE_BLOCKED_SEAT_LIMIT',
  system: 'SEAT_CAP_REACHED',
}

export async function enforceSeatCap(options: SeatCapOptions): Promise<void> {
  const context = await loadSeatContext(options.companyId)
  const seatLimit = await resolveSeatLimit(context)
  const projectedSeats = context.activeSeats + options.requestedDelta

  if (context.planKey === 'starter' && !options.skipStarterLock) {
    await logSeatLimitBreach(context, options, seatLimit.limit ?? 1)
    throw new SeatEnforcementError('Starter plan is limited to a single owner seat. Upgrade to invite additional users.')
  }

  if (seatLimit.limit !== null && projectedSeats > seatLimit.limit) {
    await logSeatLimitBreach(context, options, seatLimit.limit)
    throw new SeatEnforcementError(buildSeatLimitMessage(context.planKey, seatLimit.limit))
  }
}

export async function getSeatUsageSummary(companyId: string): Promise<SeatUsageSummary> {
  const context = await loadSeatContext(companyId)
  const seatLimit = await resolveSeatLimit(context)
  const plan = PLAN_TIERS[context.planKey]

  let limit = seatLimit.limit ?? PLAN_TOTAL_SEAT_CAP[context.planKey]
  let inviteAllowed = true
  let inviteBlockedReason: string | null = null

  if (context.planKey === 'starter') {
    inviteAllowed = false
    inviteBlockedReason = 'Starter plan locked to a single owner seat.'
    limit = 1
  } else if (limit !== null) {
    inviteAllowed = context.activeSeats + 1 <= limit

    if (!inviteAllowed) {
      inviteBlockedReason =
        context.planKey === 'growth'
          ? 'Growth plan capped at 10 seats.'
          : `Pro plan billing currently covers ${limit} seat(s). Increase your Stripe seat quantity to invite more users.`
    }
  }

  return {
    planKey: context.planKey,
    planName: plan.name,
    activeSeats: context.activeSeats,
    limit,
    stripeSeatQuantity: seatLimit.stripeQuantity,
    inviteAllowed,
    inviteBlockedReason,
  }
}

export async function syncProSeatQuantity(companyId: string, actorId?: string, source?: string): Promise<void> {
  const context = await loadSeatContext(companyId)

  if (context.planKey !== 'pro' || !stripe || !context.stripeSubscriptionId) {
    return
  }

  const seatMeta = await ensureProSeatMetadata(context)
  const currentQuantity = seatMeta.quantity
  const desiredQuantity = Math.max(MIN_PRO_SEATS, context.activeSeats)

  if (desiredQuantity >= currentQuantity || !seatMeta.itemId) {
    return
  }

  await stripe.subscriptions.update(context.stripeSubscriptionId, {
    items: [
      {
        id: seatMeta.itemId,
        quantity: desiredQuantity,
      },
    ],
  })

  await prisma.company.update({
    where: { id: context.companyId },
    data: { stripeSeatQuantity: desiredQuantity },
  })

  await logSeatAudit('SEAT_QUANTITY_UPDATED', context, actorId, {
    from: currentQuantity,
    to: desiredQuantity,
    activeSeats: context.activeSeats,
    source: source ?? 'system',
    timestamp: new Date().toISOString(),
  })
}

function buildSeatLimitMessage(planKey: PlanKey, limit: number): string {
  switch (planKey) {
    case 'starter':
      return 'Starter plan is limited to a single seat. Upgrade to Growth to invite additional users.'
    case 'growth':
      return 'Growth plan supports up to 10 users. Remove a seat or upgrade to Pro to continue.'
    case 'pro':
      return `Pro plan billing currently covers ${limit} seat(s). Increase your Stripe seat quantity before adding more users.`
    default:
      return 'Seat limit reached. Upgrade your plan or remove an existing user.'
  }
}

async function loadSeatContext(companyId: string): Promise<SeatContext> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      planKey: true,
      stripeSeatQuantity: true,
      stripeSeatItemId: true,
      stripeSubscriptionId: true,
    },
  })

  if (!company) {
    throw new SeatEnforcementError('Company context unavailable for seat enforcement')
  }

  const activeSeats = await prisma.user.count({ where: { companyId, disabled: false } })

  return {
    companyId,
    planKey: company.planKey as PlanKey,
    planName: PLAN_TIERS[company.planKey as PlanKey].name,
    activeSeats,
    stripeSeatQuantity: company.stripeSeatQuantity,
    stripeSeatItemId: company.stripeSeatItemId,
    stripeSubscriptionId: company.stripeSubscriptionId,
  }
}

async function resolveSeatLimit(context: SeatContext): Promise<SeatLimitResolution> {
  if (context.planKey === 'pro') {
    const seatMeta = await ensureProSeatMetadata(context)
    return {
      limit: seatMeta.quantity,
      stripeQuantity: seatMeta.quantity,
      itemId: seatMeta.itemId,
    }
  }

  return {
    limit: PLAN_TOTAL_SEAT_CAP[context.planKey],
    stripeQuantity: context.stripeSeatQuantity,
    itemId: null,
  }
}

async function ensureProSeatMetadata(context: SeatContext): Promise<{ quantity: number; itemId: string | null }> {
  let quantity = context.stripeSeatQuantity ?? null
  let itemId = context.stripeSeatItemId ?? null

  if ((!quantity || !itemId) && stripe && context.stripeSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(context.stripeSubscriptionId)
    const seatItem =
      subscription.items.data.find((item) => item.id === context.stripeSeatItemId) ?? subscription.items.data[0]
    quantity = seatItem?.quantity ?? MIN_PRO_SEATS
    itemId = seatItem?.id ?? null

    await prisma.company.update({
      where: { id: context.companyId },
      data: {
        stripeSeatQuantity: quantity,
        ...(itemId ? { stripeSeatItemId: itemId } : {}),
      },
    })
  }

  if (!quantity) {
    quantity = MIN_PRO_SEATS
  }

  return { quantity, itemId }
}

async function logSeatLimitBreach(context: SeatContext, options: SeatCapOptions, limit: number) {
  const metadata = {
    planKey: context.planKey,
    planName: context.planName,
    activeSeats: context.activeSeats,
    attemptedDelta: options.requestedDelta,
    projectedSeats: context.activeSeats + options.requestedDelta,
    seatLimit: limit,
    stripeSeatQuantity: context.planKey === 'pro' ? limit : null,
    reason: options.reason,
    timestamp: new Date().toISOString(),
    ...(options.metadata ?? {}),
  }

  await logSeatAudit('SEAT_CAP_REACHED', context, options.actorId, metadata)

  const specificAction = SEAT_REASON_TO_ACTION[options.reason]
  if (specificAction && specificAction !== 'SEAT_CAP_REACHED') {
    await logSeatAudit(specificAction, context, options.actorId, metadata)
  }
}

async function logSeatAudit(
  action: AccessAuditAction,
  context: SeatContext,
  actorId: string | undefined,
  metadata: Record<string, unknown>
) {
  await prisma.accessAuditLog.create({
    data: {
      companyId: context.companyId,
      actorId: actorId ?? null,
      action,
      metadata: metadata as Prisma.InputJsonValue,
    },
  })
}
