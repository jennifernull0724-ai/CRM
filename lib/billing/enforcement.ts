// T-REX AI OS — PRICING ENFORCEMENT (SERVER-SIDE)
// All write operations MUST check plan limits

import { prisma } from '@/lib/prisma'
import { hasFeature, isReadOnly, canAddUser, getPlan, type PlanKey, type SeatLimits } from './planTiers'

export class PricingEnforcementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PricingEnforcementError'
  }
}

/**
 * Check if user's organization can access a feature
 */
export async function enforceFeatureAccess(
  userId: string,
  feature: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      subscriptionStatus: true,
      createdAt: true,
    },
  })
  
  if (!user) {
    throw new PricingEnforcementError('User not found')
  }
  
  // Determine plan (simplified - in production, this would be on Organization/Company)
  const plan: PlanKey = user.subscriptionStatus === 'trial' ? 'starter' : 'growth'
  
  if (!hasFeature(plan, feature)) {
    throw new PricingEnforcementError(`Feature '${feature}' not available on ${plan} plan`)
  }
  
  // Check if plan is expired/read-only
  if (isReadOnly(plan, user.createdAt, user.subscriptionStatus || undefined)) {
    throw new PricingEnforcementError('Account is read-only. Please upgrade to continue.')
  }
}

/**
 * Check if user can create a new deal
 */
export async function enforceCanCreateDeal(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'deals')
  
  // Additional checks could be added here (e.g., deal limits)
}

/**
 * Check if user can access estimating features
 */
export async function enforceCanEstimate(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'estimating')
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  // Users cannot access estimating features - only estimator, admin, owner
  if (user?.role === 'user') {
    throw new PricingEnforcementError('Users cannot edit pricing or approve estimates')
  }
}

/**
 * Check if user can access compliance module
 */
export async function enforceCanAccessCompliance(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'compliance')
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  // Only admin and owner can access compliance
  if (!['admin', 'owner'].includes(user?.role || '')) {
    throw new PricingEnforcementError('Only Admin and Owner roles can access compliance')
  }
}

/**
 * Check if organization can add a new user with specified role
 */
export async function enforceCanAddUser(
  organizationId: string,
  role: keyof SeatLimits
): Promise<void> {
  // In production, this would check organization's plan
  // For now, simplified implementation
  const plan: PlanKey = 'growth' // Would come from organization
  
  const currentCounts = await getUserCountsByRole(organizationId)
  
  if (!canAddUser(plan, role, currentCounts)) {
    const planLimits = getPlan(plan).seatLimits
    throw new PricingEnforcementError(
      `Cannot add ${role}. Plan limit: ${planLimits[role]}, Current: ${currentCounts[role]}`
    )
  }
}

/**
 * Get current user counts by role for an organization
 */
async function getUserCountsByRole(organizationId: string): Promise<SeatLimits> {
  // Simplified - in production would filter by organizationId
  const users = await prisma.user.groupBy({
    by: ['role'],
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

/**
 * Check if user can upload files
 */
export async function enforceCanUploadFile(
  userId: string,
  fileSizeBytes: number
): Promise<void> {
  await enforceFeatureAccess(userId, 'file_storage')
  
  // Additional storage quota checks could be added here
}

/**
 * Check if user can access email integration
 */
export async function enforceCanUseEmailIntegration(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'email_integration')
}

/**
 * Check if user can access analytics
 */
export async function enforceCanAccessAnalytics(userId: string): Promise<void> {
  await enforceFeatureAccess(userId, 'analytics')
}

/**
 * Wrapper to check read-only status before any write operation
 */
export async function enforceCanWrite(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      createdAt: true,
    },
  })
  
  if (!user) {
    throw new PricingEnforcementError('User not found')
  }
  
  const plan: PlanKey = user.subscriptionStatus === 'trial' ? 'starter' : 'growth'
  
  if (isReadOnly(plan, user.createdAt, user.subscriptionStatus || undefined)) {
    throw new PricingEnforcementError(
      'Account is read-only. Starter trial has expired. Please upgrade to continue.'
    )
  }
}
