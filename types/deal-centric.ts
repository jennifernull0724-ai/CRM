/**
 * DEAL-CENTRIC ESTIMATING — TYPE DEFINITIONS
 * T-REX AI OS — FINAL v4 API MASTER CONTRACT
 * 
 * ABSOLUTE RULES:
 * - Deal is the ONLY estimating object
 * - NO Estimate entity
 * - Contact is system anchor (contactId REQUIRED)
 * - All state transitions server-enforced
 * - Approval is ATOMIC
 */

// ============================================================================
// DEAL STAGE — STATE MACHINE
// ============================================================================

export enum DealStage {
  OPEN = 'OPEN',
  IN_ESTIMATING = 'IN_ESTIMATING',
  SUBMITTED = 'SUBMITTED',
  APPROVED_ESTIMATE = 'APPROVED_ESTIMATE',
  DISPATCHED = 'DISPATCHED',
  WON = 'WON',
  LOST = 'LOST',
  NO_BID = 'NO_BID',
}

// Valid state transitions
export const DEAL_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.OPEN]: [DealStage.IN_ESTIMATING, DealStage.NO_BID],
  [DealStage.IN_ESTIMATING]: [DealStage.SUBMITTED, DealStage.OPEN, DealStage.NO_BID],
  [DealStage.SUBMITTED]: [DealStage.APPROVED_ESTIMATE, DealStage.IN_ESTIMATING, DealStage.NO_BID],
  [DealStage.APPROVED_ESTIMATE]: [DealStage.DISPATCHED],
  [DealStage.DISPATCHED]: [DealStage.WON, DealStage.LOST],
  [DealStage.WON]: [],
  [DealStage.LOST]: [],
  [DealStage.NO_BID]: [],
};

// ============================================================================
// LINE ITEM CATEGORY
// ============================================================================

export enum LineItemCategory {
  LABOR = 'LABOR',
  MATERIAL = 'MATERIAL',
  EQUIPMENT = 'EQUIPMENT',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  OVERHEAD = 'OVERHEAD',
  OTHER = 'OTHER',
}

// ============================================================================
// ACTIVITY TYPES — DEAL-CENTRIC EVENTS
// ============================================================================

export enum DealActivityType {
  DEAL_CREATED = 'DEAL_CREATED',
  DEAL_SENT_TO_ESTIMATING = 'DEAL_SENT_TO_ESTIMATING',
  DEAL_STAGE_CHANGED = 'DEAL_STAGE_CHANGED',
  DEAL_LINE_ITEM_ADDED = 'DEAL_LINE_ITEM_ADDED',
  DEAL_LINE_ITEM_UPDATED = 'DEAL_LINE_ITEM_UPDATED',
  DEAL_LINE_ITEM_DELETED = 'DEAL_LINE_ITEM_DELETED',
  DEAL_VERSION_CREATED = 'DEAL_VERSION_CREATED',
  DEAL_SUBMITTED = 'DEAL_SUBMITTED',
  DEAL_APPROVED = 'DEAL_APPROVED',
  DEAL_PDF_GENERATED = 'DEAL_PDF_GENERATED',
  DEAL_DISPATCHED = 'DEAL_DISPATCHED',
  USER_DELIVERY_ENABLED = 'USER_DELIVERY_ENABLED',
  DISPATCH_HANDOFF_CREATED = 'DISPATCH_HANDOFF_CREATED',
}

// ============================================================================
// ROLE TYPES
// ============================================================================

export type UserRole = 'owner' | 'admin' | 'user' | 'estimator' | 'dispatch';

// ============================================================================
// ROLE AUTHORITY MATRIX
// ============================================================================

export const ROLE_PERMISSIONS = {
  canCreateContact: ['owner', 'admin', 'user', 'estimator', 'dispatch'] as UserRole[],
  canViewAllContacts: ['owner', 'admin', 'user', 'estimator', 'dispatch'] as UserRole[],
  canCreateDeal: ['owner', 'admin', 'user', 'estimator'] as UserRole[],
  canSendToEstimating: ['owner', 'admin', 'user', 'estimator'] as UserRole[],
  canPriceLineItems: ['owner', 'admin', 'estimator'] as UserRole[],
  canSubmitDeal: ['owner', 'admin', 'estimator'] as UserRole[],
  canApproveDeal: ['owner', 'admin', 'estimator'] as UserRole[],
  canViewApprovedPdf: ['owner', 'admin', 'user', 'estimator', 'dispatch'] as UserRole[],
  canCreateWorkOrder: ['dispatch'] as UserRole[],
} as const;

// ============================================================================
// REQUEST / RESPONSE TYPES
// ============================================================================

export interface CreateDealRequest {
  name: string;
  description?: string;
  contactId: string;
  pipeline?: string;
  value?: number;
  closeDate?: Date;
}

export interface SendToEstimatingRequest {
  dealId: string;
  assignedToId?: string; // Estimator to assign
  notes?: string;
}

export interface CreateLineItemRequest {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  category: LineItemCategory;
  phase?: string;
  discipline?: string;
  customerVisible?: boolean;
  internalOnly?: boolean;
  sortOrder?: number;
}

export interface UpdateLineItemRequest {
  description?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  category?: LineItemCategory;
  phase?: string;
  discipline?: string;
  customerVisible?: boolean;
  internalOnly?: boolean;
  sortOrder?: number;
}

export interface SubmitDealRequest {
  dealId: string;
  notes?: string;
}

export interface ApproveDealRequest {
  dealId: string;
  notes?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface DealResponse {
  id: string;
  companyId: string;
  contactId: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    company: string | null;
  };
  name: string;
  description: string | null;
  stage: DealStage;
  currentVersion: number;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedToId: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  approvedAt: Date | null;
  approvedById: string | null;
  approvedBy: {
    id: string;
    name: string;
  } | null;
  dispatchedAt: Date | null;
  subtotal: number;
  taxes: number | null;
  total: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealVersionResponse {
  id: string;
  dealId: string;
  versionNumber: number;
  subtotal: number;
  taxes: number | null;
  total: number;
  revisionReason: string | null;
  approvedAt: Date | null;
  approvedById: string | null;
  locked: boolean;
  createdAt: Date;
  lineItems: DealLineItemResponse[];
}

export interface DealLineItemResponse {
  id: string;
  dealVersionId: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lineTotal: number;
  category: LineItemCategory;
  phase: string | null;
  discipline: string | null;
  customerVisible: boolean;
  internalOnly: boolean;
  sortOrder: number;
}

export interface DealPdfResponse {
  id: string;
  dealId: string;
  dealVersionId: string;
  hash: string;
  storageKey: string;
  generatedById: string;
  generatedAt: Date;
}

export interface DispatchHandoffResponse {
  id: string;
  dealId: string;
  dealVersionId: string;
  deal: DealResponse;
  version: DealVersionResponse;
  pdf: DealPdfResponse;
  createdAt: Date;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DealError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DealError';
  }
}

export class UnauthorizedDealError extends DealError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 403);
  }
}

export class InvalidStateTransitionError extends DealError {
  constructor(from: DealStage, to: DealStage) {
    super(
      `Invalid state transition from ${from} to ${to}`,
      'INVALID_STATE_TRANSITION',
      400
    );
  }
}

export class DealNotFoundError extends DealError {
  constructor(dealId: string) {
    super(`Deal ${dealId} not found`, 'DEAL_NOT_FOUND', 404);
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidStateTransition(from: DealStage, to: DealStage): boolean {
  return DEAL_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canPerformAction(
  action: keyof typeof ROLE_PERMISSIONS,
  role: UserRole
): boolean {
  return ROLE_PERMISSIONS[action].includes(role);
}

export function assertCanPerformAction(
  action: keyof typeof ROLE_PERMISSIONS,
  role: UserRole
): void {
  if (!canPerformAction(action, role)) {
    throw new UnauthorizedDealError(
      `Role ${role} cannot perform action: ${action}`
    );
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isDealStage(value: string): value is DealStage {
  return Object.values(DealStage).includes(value as DealStage);
}

export function isLineItemCategory(value: string): value is LineItemCategory {
  return Object.values(LineItemCategory).includes(value as LineItemCategory);
}

export function isUserRole(value: string): value is UserRole {
  return ['owner', 'admin', 'user', 'estimator', 'dispatch'].includes(value);
}
