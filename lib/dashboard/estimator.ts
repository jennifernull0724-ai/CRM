import { Prisma, EstimateStatus } from '@prisma/client'
import type { EstimateStatus as EstimateStatusValue } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ensureCompanyBootstrap } from '@/lib/system/bootstrap'

const PIPELINE_STATUSES: EstimateStatusValue[] = [
  EstimateStatus.DRAFT,
  EstimateStatus.AWAITING_APPROVAL,
  EstimateStatus.APPROVED,
  EstimateStatus.SENT_TO_DISPATCH,
  EstimateStatus.RETURNED_TO_USER,
]

type AllowedEstimatorRole = 'owner' | 'admin' | 'estimator'

type ScopeParams = {
  companyId: string
  userId: string
  role: AllowedEstimatorRole
}

export type EstimatorDashboardMetrics = {
  estimatesCreated: number
  awaitingApproval: number
  approved: number
  sentToDispatch: number
  revisionCount: number
  avgApprovalHours: number
}

export type EstimatorPipelineSummary = Array<{
  status: EstimateStatusValue
  count: number
}>

export type EstimatorAwaitingRecord = {
  id: string
  quoteNumber: string
  revisionNumber: number
  submittedAt: Date | null
}

export type EstimatorApprovalRecord = {
  id: string
  quoteNumber: string
  revisionNumber: number
  approvedAt: Date
}

export type EstimatorDispatchRecord = {
  id: string
  quoteNumber: string
  sentToDispatchAt: Date
}

export type EstimatorDashboardPayload = {
  metrics: EstimatorDashboardMetrics
  pipeline: EstimatorPipelineSummary
  awaitingApprovals: EstimatorAwaitingRecord[]
  recentApprovals: EstimatorApprovalRecord[]
  recentDispatches: EstimatorDispatchRecord[]
}

export async function loadEstimatorDashboard(params: ScopeParams): Promise<EstimatorDashboardPayload> {
  // Ensure workspace has minimum required system records
  await ensureCompanyBootstrap(params.companyId)

  const baseWhere = buildEstimateScope(params)

  const [statusGroups, aggregate, approvalWindows, awaitingApprovals, recentApprovals, recentDispatches] = await Promise.all([
    prisma.estimate.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.estimate.aggregate({
      where: baseWhere,
      _sum: { revisionCount: true },
      _count: { _all: true },
    }),
    prisma.estimate.findMany({
      where: {
        ...baseWhere,
        approvedAt: { not: null },
        submittedAt: { not: null },
      },
      select: { submittedAt: true, approvedAt: true },
    }),
    prisma.estimateRevision.findMany({
      where: {
        status: 'AWAITING_APPROVAL',
        estimate: baseWhere,
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        revisionNumber: true,
        submittedAt: true,
        estimate: { select: { id: true, quoteNumber: true } },
      },
    }),
    prisma.estimateRevision.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: { not: null },
        estimate: baseWhere,
      },
      orderBy: { approvedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        revisionNumber: true,
        approvedAt: true,
        estimate: { select: { id: true, quoteNumber: true } },
      },
    }),
    prisma.estimate.findMany({
      where: {
        ...baseWhere,
        status: 'SENT_TO_DISPATCH',
        sentToDispatchAt: { not: null },
      },
      orderBy: { sentToDispatchAt: 'desc' },
      take: 10,
      select: { id: true, quoteNumber: true, sentToDispatchAt: true },
    }),
  ])

  const statusMap = statusGroups.reduce<Record<EstimateStatusValue, number>>((acc, group) => {
    acc[group.status] = group._count._all
    return acc
  }, Object.create(null))

  const avgApprovalHours = approvalWindows.length
    ? approvalWindows.reduce((sum, record) => {
        const approvedAt = record.approvedAt as Date
        const submittedAt = record.submittedAt as Date
        return sum + (approvedAt.getTime() - submittedAt.getTime()) / (1000 * 60 * 60)
      }, 0) / approvalWindows.length
    : 0

  const metrics: EstimatorDashboardMetrics = {
    estimatesCreated: aggregate._count._all ?? 0,
    awaitingApproval: statusMap.AWAITING_APPROVAL ?? 0,
    approved: statusMap.APPROVED ?? 0,
    sentToDispatch: statusMap.SENT_TO_DISPATCH ?? 0,
    revisionCount: aggregate._sum.revisionCount ?? 0,
    avgApprovalHours,
  }

  const pipeline: EstimatorPipelineSummary = PIPELINE_STATUSES.map((status) => ({
    status,
    count: statusMap[status] ?? 0,
  }))

  return {
    metrics,
    pipeline,
    awaitingApprovals: awaitingApprovals.map((entry) => ({
      id: entry.estimate.id,
      quoteNumber: entry.estimate.quoteNumber,
      revisionNumber: entry.revisionNumber,
      submittedAt: entry.submittedAt,
    })),
    recentApprovals: recentApprovals.map((entry) => ({
      id: entry.estimate.id,
      quoteNumber: entry.estimate.quoteNumber,
      revisionNumber: entry.revisionNumber,
      approvedAt: entry.approvedAt as Date,
    })),
    recentDispatches: recentDispatches.map((estimate) => ({
      id: estimate.id,
      quoteNumber: estimate.quoteNumber,
      sentToDispatchAt: estimate.sentToDispatchAt as Date,
    })),
  }
}

function buildEstimateScope(params: ScopeParams): Prisma.EstimateWhereInput {
  if (params.role === 'estimator') {
    return {
      companyId: params.companyId,
      createdById: params.userId,
    }
  }

  return {
    companyId: params.companyId,
  }
}
