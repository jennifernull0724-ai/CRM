import { prisma } from '@/lib/prisma'
import type {
  ComplianceEmployee,
  ComplianceStatus,
  DispatchRequestStatus,
  EstimateStatus,
  WorkOrderStatus,
} from '@prisma/client'

const DAY = 24 * 60 * 60 * 1000

export type PipelineStageSummary = {
  stage: string
  deals: number
  value: number
}

export type EstimateSummary = {
  status: EstimateStatus
  count: number
}

export type DispatchSummary = {
  status: DispatchRequestStatus
  count: number
}

export type WorkOrderSummary = {
  status: WorkOrderStatus
  count: number
}

export type ComplianceStatusSummary = {
  status: ComplianceStatus
  count: number
}

export type GlobalAnalytics = {
  contacts: {
    total: number
    activeLast14Days: number
    recent: { id: string; name: string; lastActivityAt: Date | null }[]
  }
  contactActivityVolume: {
    last7Days: number
    last30Days: number
  }
  deals: {
    pipeline: PipelineStageSummary[]
  }
  estimates: {
    statuses: EstimateSummary[]
    revisionCount: number
    recentRevisions: {
      id: string
      estimateId: string
      revisionNumber: number
      status: EstimateStatus
      approvedAt: Date | null
      submittedAt: Date | null
    }[]
  }
  dispatch: {
    queueSize: number
    blocked: number
    summaries: DispatchSummary[]
    queue: {
      id: string
      status: DispatchRequestStatus
      priority: string
      queuedAt: Date
      complianceBlocked: boolean
      blockReason: string | null
      estimateName: string | null
      dispatcherName: string | null
    }[]
  }
  workOrders: {
    summaries: WorkOrderSummary[]
    manualCount: number
    withoutAssignments: number
    blocked: {
      count: number
      items: {
        id: string
        title: string
        status: WorkOrderStatus
        blockReason: string | null
        createdAt: Date
      }[]
    }
  }
  compliance: {
    statuses: ComplianceStatusSummary[]
    employees: Pick<ComplianceEmployee, 'id' | 'firstName' | 'lastName' | 'role' | 'title' | 'complianceStatus' | 'active'>[]
    blocks: number
    expiringByWindow: {
      within30: number
      within60: number
      within90: number
    }
    expiringCertifications: {
      id: string
      employeeName: string
      expiresAt: Date
      status: string
      certificationName: string
      proofCount: number
    }[]
    auditVolume: {
      last7Days: number
      last30Days: number
    }
  }
}

export async function getGlobalAnalytics(companyId: string): Promise<GlobalAnalytics> {
  const now = Date.now()
  const fourteenDaysAgo = new Date(now - 14 * DAY)
  const sevenDaysAgo = new Date(now - 7 * DAY)
  const thirtyDaysAgo = new Date(now - 30 * DAY)
  const ninetyDaysAhead = new Date(now + 90 * DAY)

  const [
    contactTotal,
    contactActive,
    recentContacts,
    contactActivity7d,
    contactActivity30d,
    dealPipeline,
    estimateStatuses,
    revisionTotal,
    recentRevisions,
    dispatchGroups,
    dispatchQueue,
    workOrderGroups,
    manualWorkOrders,
    workOrdersWithoutAssignments,
    blockedWorkOrders,
    complianceStatuses,
    complianceEmployees,
    dispatchBlocks,
    expiringCertifications,
    auditLast7Days,
    auditLast30Days,
  ] = await Promise.all([
    prisma.contact.count({ where: { companyId, archived: false } }),
    prisma.contact.count({ where: { companyId, archived: false, lastActivityAt: { gte: fourteenDaysAgo } } }),
    prisma.contact.findMany({
      where: { companyId, archived: false },
      select: { id: true, firstName: true, lastName: true, lastActivityAt: true },
      orderBy: { lastActivityAt: 'desc' },
      take: 8,
    }),
    prisma.activity.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        OR: [
          { contact: { companyId } },
          { deal: { companyId } },
        ],
      },
    }),
    prisma.activity.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { contact: { companyId } },
          { deal: { companyId } },
        ],
      },
    }),
    prisma.deal.groupBy({
      by: ['stage'],
      where: { companyId },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.estimate.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.estimate.aggregate({ where: { companyId }, _sum: { revisionCount: true } }).then((result) => result._sum.revisionCount ?? 0),
    prisma.estimateRevision.findMany({
      where: { estimate: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        estimateId: true,
        revisionNumber: true,
        status: true,
        approvedAt: true,
        submittedAt: true,
      },
    }),
    prisma.dispatchRequest.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.dispatchRequest.findMany({
      where: { companyId },
      orderBy: { queuedAt: 'asc' },
      take: 15,
      select: {
        id: true,
        status: true,
        priority: true,
        queuedAt: true,
        complianceBlocked: true,
        blockReason: true,
        estimate: {
          select: {
            deal: { select: { name: true } },
          },
        },
        dispatcher: { select: { name: true } },
      },
    }),
    prisma.workOrder.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.workOrder.count({ where: { companyId, manualEntry: true } }),
    prisma.workOrder.count({ where: { companyId, assignments: { none: { unassignedAt: null } } } }),
    prisma.workOrder.findMany({
      where: { companyId, complianceBlocked: true },
      select: { id: true, title: true, status: true, blockReason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.complianceEmployee.groupBy({
      by: ['complianceStatus'],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.complianceEmployee.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        title: true,
        role: true,
        complianceStatus: true,
        active: true,
      },
      orderBy: { lastVerifiedAt: 'desc' },
      take: 25,
    }),
    prisma.dispatchRequest.count({ where: { companyId, complianceBlocked: true } }),
    prisma.complianceCertification.findMany({
      where: {
        employee: { companyId },
        expiresAt: {
          gt: new Date(now),
          lte: ninetyDaysAhead,
        },
      },
      select: {
        id: true,
        employee: { select: { firstName: true, lastName: true } },
        expiresAt: true,
        status: true,
        customName: true,
        presetKey: true,
        images: { select: { id: true } },
      },
    }),
    prisma.complianceActivity.count({ where: { employee: { companyId }, createdAt: { gte: sevenDaysAgo } } }),
    prisma.complianceActivity.count({ where: { employee: { companyId }, createdAt: { gte: thirtyDaysAgo } } }),
  ])

  const contactRecent = recentContacts.map((contact) => ({
    id: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    lastActivityAt: contact.lastActivityAt ?? null,
  }))

  const pipelineSummaries: PipelineStageSummary[] = dealPipeline.map((group) => ({
    stage: group.stage,
    deals: group._count._all,
    value: group._sum.value ?? 0,
  }))

  const estimateSummary: EstimateSummary[] = estimateStatuses.map((group) => ({
    status: group.status as EstimateStatus,
    count: group._count._all,
  }))

  const dispatchSummary: DispatchSummary[] = dispatchGroups.map((group) => ({
    status: group.status as DispatchRequestStatus,
    count: group._count._all,
  }))

  const workOrderSummary: WorkOrderSummary[] = workOrderGroups.map((group) => ({
    status: group.status as WorkOrderStatus,
    count: group._count._all,
  }))

  const complianceSummary: ComplianceStatusSummary[] = complianceStatuses.map((group) => ({
    status: group.complianceStatus as ComplianceStatus,
    count: group._count._all,
  }))

  const expiringSummary = { within30: 0, within60: 0, within90: 0 }
  const expiringList = expiringCertifications.map((cert) => {
    const expiresAt = cert.expiresAt
    const diffDays = Math.ceil((expiresAt.getTime() - now) / DAY)
    if (diffDays <= 30) {
      expiringSummary.within30 += 1
    } else if (diffDays <= 60) {
      expiringSummary.within60 += 1
    } else {
      expiringSummary.within90 += 1
    }

    return {
      id: cert.id,
      employeeName: `${cert.employee.firstName} ${cert.employee.lastName}`.trim(),
      expiresAt,
      status: cert.status,
      certificationName: cert.customName ?? cert.presetKey ?? 'Custom',
      proofCount: cert.images.length,
    }
  })

  const dispatchQueueDetails = dispatchQueue.map((request) => ({
    id: request.id,
    status: request.status,
    priority: request.priority,
    queuedAt: request.queuedAt,
    complianceBlocked: request.complianceBlocked,
    blockReason: request.blockReason,
    estimateName: request.estimate?.deal?.name ?? null,
    dispatcherName: request.dispatcher?.name ?? null,
  }))

  return {
    contacts: {
      total: contactTotal,
      activeLast14Days: contactActive,
      recent: contactRecent,
    },
    contactActivityVolume: {
      last7Days: contactActivity7d,
      last30Days: contactActivity30d,
    },
    deals: {
      pipeline: pipelineSummaries,
    },
    estimates: {
      statuses: estimateSummary,
      revisionCount: revisionTotal,
      recentRevisions,
    },
    dispatch: {
      queueSize: dispatchQueue.length,
      blocked: dispatchBlocks,
      summaries: dispatchSummary,
      queue: dispatchQueueDetails,
    },
    workOrders: {
      summaries: workOrderSummary,
      manualCount: manualWorkOrders,
      withoutAssignments: workOrdersWithoutAssignments,
      blocked: {
        count: blockedWorkOrders.length,
        items: blockedWorkOrders,
      },
    },
    compliance: {
      statuses: complianceSummary,
      employees: complianceEmployees,
      blocks: dispatchBlocks,
      expiringByWindow: expiringSummary,
      expiringCertifications: expiringList,
      auditVolume: {
        last7Days: auditLast7Days,
        last30Days: auditLast30Days,
      },
    },
  }
}
