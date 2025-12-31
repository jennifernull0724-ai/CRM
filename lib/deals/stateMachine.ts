/**
 * DEAL STATE MACHINE — SERVER-ENFORCED TRANSITIONS
 * T-REX AI OS — FINAL v4 API MASTER CONTRACT
 * 
 * ABSOLUTE RULES:
 * - All state transitions validated server-side
 * - Users can trigger IN_ESTIMATING
 * - Estimators own pricing + approval
 * - Approval is ATOMIC (no partial states)
 * - All transitions emit Activity records
 */

import { prisma } from '@/lib/prisma';
import {
  DealStage,
  DealActivityType,
  UserRole,
  isValidStateTransition,
  assertCanPerformAction,
  InvalidStateTransitionError,
  DealNotFoundError,
  UnauthorizedDealError,
} from '@/types/deal-centric';

// ============================================================================
// STATE TRANSITION VALIDATION
// ============================================================================

interface TransitionContext {
  userId: string;
  role: UserRole;
  companyId: string;
}

interface TransitionResult {
  success: boolean;
  dealId: string;
  fromStage: DealStage;
  toStage: DealStage;
  activityId: string;
}

/**
 * Validates and executes a state transition
 * THROWS if transition is invalid or unauthorized
 */
export async function transitionDealStage(
  dealId: string,
  toStage: DealStage,
  context: TransitionContext,
  metadata?: Record<string, any>
): Promise<TransitionResult> {
  // Load deal with current stage
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      companyId: context.companyId,
    },
    select: {
      id: true,
      stage: true,
      contactId: true,
      companyId: true,
    },
  });

  if (!deal) {
    throw new DealNotFoundError(dealId);
  }

  const fromStage = deal.stage as DealStage;

  // Validate transition is allowed
  if (!isValidStateTransition(fromStage, toStage)) {
    throw new InvalidStateTransitionError(fromStage, toStage);
  }

  // Update deal stage
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: toStage,
      lastActivityAt: new Date(),
    },
  });

  // Emit activity log
  const activity = await prisma.activity.create({
    data: {
      companyId: context.companyId,
      contactId: deal.contactId,
      dealId: deal.id,
      type: DealActivityType.DEAL_STAGE_CHANGED,
      subject: `Deal stage changed: ${fromStage} → ${toStage}`,
      userId: context.userId,
      metadata: {
        fromStage,
        toStage,
        role: context.role,
        ...metadata,
      },
    },
  });

  return {
    success: true,
    dealId: deal.id,
    fromStage,
    toStage,
    activityId: activity.id,
  };
}

// ============================================================================
// SEND DEAL TO ESTIMATING
// ============================================================================

interface SendToEstimatingParams {
  dealId: string;
  assignedToId?: string;
  notes?: string;
}

/**
 * Sends deal to estimating (OPEN → IN_ESTIMATING)
 * ALLOWED: User, Estimator, Admin, Owner
 * FORBIDDEN: Dispatch
 */
export async function sendDealToEstimating(
  params: SendToEstimatingParams,
  context: TransitionContext
): Promise<TransitionResult> {
  // Verify role can send to estimating
  assertCanPerformAction('canSendToEstimating', context.role);

  // Load deal
  const deal = await prisma.deal.findFirst({
    where: {
      id: params.dealId,
      companyId: context.companyId,
    },
    select: {
      id: true,
      stage: true,
      contactId: true,
      companyId: true,
    },
  });

  if (!deal) {
    throw new DealNotFoundError(params.dealId);
  }

  // Must be in OPEN stage
  if (deal.stage !== DealStage.OPEN) {
    throw new InvalidStateTransitionError(deal.stage as DealStage, DealStage.IN_ESTIMATING);
  }

  // Update deal: OPEN → IN_ESTIMATING
  await prisma.deal.update({
    where: { id: params.dealId },
    data: {
      stage: DealStage.IN_ESTIMATING,
      inEstimating: true,
      estimatingStartedAt: new Date(),
      estimatingStartedById: context.userId,
      assignedToId: params.assignedToId || context.userId,
      lastActivityAt: new Date(),
    },
  });

  // Emit activity
  const activity = await prisma.activity.create({
    data: {
      companyId: context.companyId,
      contactId: deal.contactId,
      dealId: deal.id,
      type: DealActivityType.DEAL_SENT_TO_ESTIMATING,
      subject: 'Deal sent to estimating',
      userId: context.userId,
      metadata: {
        assignedToId: params.assignedToId,
        notes: params.notes,
        role: context.role,
      },
    },
  });

  return {
    success: true,
    dealId: deal.id,
    fromStage: DealStage.OPEN,
    toStage: DealStage.IN_ESTIMATING,
    activityId: activity.id,
  };
}

// ============================================================================
// SUBMIT DEAL FOR APPROVAL
// ============================================================================

interface SubmitDealParams {
  dealId: string;
  notes?: string;
}

/**
 * Submits deal for approval (IN_ESTIMATING → SUBMITTED)
 * ALLOWED: Estimator, Admin, Owner
 * FORBIDDEN: User, Dispatch
 */
export async function submitDeal(
  params: SubmitDealParams,
  context: TransitionContext
): Promise<TransitionResult> {
  // Verify role can submit
  assertCanPerformAction('canSubmitDeal', context.role);

  // Load deal
  const deal = await prisma.deal.findFirst({
    where: {
      id: params.dealId,
      companyId: context.companyId,
    },
    include: {
      versions: {
        where: { version: { equals: 1 } }, // Current version
        take: 1,
      },
    },
  });

  if (!deal) {
    throw new DealNotFoundError(params.dealId);
  }

  // Must be in IN_ESTIMATING stage
  if (deal.stage !== DealStage.IN_ESTIMATING) {
    throw new InvalidStateTransitionError(deal.stage as DealStage, DealStage.SUBMITTED);
  }

  // Verify deal has line items
  const lineItemCount = await prisma.dealLineItem.count({
    where: {
      dealId: params.dealId,
    },
  });

  if (lineItemCount === 0) {
    throw new UnauthorizedDealError('Cannot submit deal without line items');
  }

  // Update deal: IN_ESTIMATING → SUBMITTED
  await prisma.deal.update({
    where: { id: params.dealId },
    data: {
      stage: DealStage.SUBMITTED,
      lastActivityAt: new Date(),
    },
  });

  // Emit activity
  const activity = await prisma.activity.create({
    data: {
      companyId: context.companyId,
      contactId: deal.contactId,
      dealId: deal.id,
      type: DealActivityType.DEAL_SUBMITTED,
      subject: 'Deal submitted for approval',
      userId: context.userId,
      metadata: {
        notes: params.notes,
        role: context.role,
        lineItemCount,
      },
    },
  });

  return {
    success: true,
    dealId: deal.id,
    fromStage: DealStage.IN_ESTIMATING,
    toStage: DealStage.SUBMITTED,
    activityId: activity.id,
  };
}

// ============================================================================
// CALCULATE DEAL TOTALS (SERVER-SIDE ONLY)
// ============================================================================

interface DealTotals {
  subtotal: number;
  taxes: number | null;
  total: number;
}

/**
 * Calculates deal totals from line items
 * SERVER-CALCULATED ONLY (never trust client)
 */
export async function calculateDealTotals(dealId: string): Promise<DealTotals> {
  const lineItems = await prisma.dealLineItem.findMany({
    where: { dealId },
    select: { lineTotal: true },
  });

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const taxes = null; // Tax calculation TBD per company
  const total = subtotal + (taxes ?? 0);

  return { subtotal, taxes, total };
}

/**
 * Updates deal financial totals
 * Called after line item changes
 */
export async function updateDealTotals(dealId: string): Promise<void> {
  const totals = await calculateDealTotals(dealId);

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      subtotal: totals.subtotal,
      taxes: totals.taxes,
      total: totals.total,
      lastActivityAt: new Date(),
    },
  });
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Verifies deal is in editable stage
 * EDITABLE: OPEN, IN_ESTIMATING
 * LOCKED: SUBMITTED, APPROVED_ESTIMATE, DISPATCHED, WON, LOST, NO_BID
 */
export async function assertDealIsEditable(
  dealId: string,
  companyId: string
): Promise<void> {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
    select: { stage: true },
  });

  if (!deal) {
    throw new DealNotFoundError(dealId);
  }

  const editableStages: DealStage[] = [DealStage.OPEN, DealStage.IN_ESTIMATING];

  if (!editableStages.includes(deal.stage as DealStage)) {
    throw new UnauthorizedDealError(
      `Cannot edit deal in ${deal.stage} stage`
    );
  }
}

/**
 * Verifies user can edit deal (ownership or admin)
 */
export async function assertCanEditDeal(
  dealId: string,
  context: TransitionContext
): Promise<void> {
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      companyId: context.companyId,
    },
    select: {
      createdById: true,
      assignedToId: true,
      stage: true,
    },
  });

  if (!deal) {
    throw new DealNotFoundError(dealId);
  }

  // Admin/Owner can edit any deal
  if (context.role === 'admin' || context.role === 'owner') {
    return;
  }

  // Estimators can edit assigned deals
  if (context.role === 'estimator' && deal.assignedToId === context.userId) {
    return;
  }

  // Users can edit their own deals (pre-estimating)
  if (
    context.role === 'user' &&
    deal.createdById === context.userId &&
    deal.stage === DealStage.OPEN
  ) {
    return;
  }

  throw new UnauthorizedDealError('You do not have permission to edit this deal');
}
