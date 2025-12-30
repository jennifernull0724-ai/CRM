import type {
  DispatchRequestStatus,
  EstimateIndustry,
  WorkOrderDiscipline,
  WorkOrderStatus,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'

const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['DRAFT', 'SCHEDULED']
const CLOSED_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

export type DispatchQueueItem = {
  id: string
  status: DispatchRequestStatus
  queuedAt: Date
  quoteNumber: string
  revisionNumber: number
  projectName: string | null
  industry: EstimateIndustry | null
  approvedTotal: number
  sentByName: string | null
  sentByEmail: string | null
  contact: {
    id: string
    name: string
    company: string | null
    email: string | null
  }
  priority: string
  hasWorkOrder: boolean
}

export type DispatchDashboardData = {
  widgets: {
    newRequests: number
    openWorkOrders: number
    activeJobs: number
    closedJobs: {
      last30: number
      last60: number
      last90: number
    }
    complianceOverrides: {
      total: number
      recent: Array<{
        id: string
        workOrderId: string
        workOrderTitle: string
        employeeName: string
        overrideAt: Date | null
        reason: string | null
      }>
    }
  }
  queue: DispatchQueueItem[]
}

export async function loadDispatchDashboard(companyId: string): Promise<DispatchDashboardData> {
  const [queueRecords, openCount, activeCount, closedCounts, overrideSummary] = await Promise.all([
    prisma.dispatchRequest.findMany({
      where: {
        companyId,
        status: 'QUEUED',
      },
      orderBy: { queuedAt: 'asc' },
      take: 25,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyOverrideName: true,
            derivedCompanyName: true,
          },
        },
        estimate: {
          select: {
            id: true,
            quoteNumber: true,
            currentRevision: {
              select: {
                revisionNumber: true,
                projectName: true,
                industry: true,
                grandTotal: true,
              },
            },
            createdBy: { select: { name: true, email: true } },
          },
        },
        workOrders: { select: { id: true }, take: 1 },
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: OPEN_WORK_ORDER_STATUSES },
      },
    }),
    prisma.workOrder.count({
      where: { companyId, status: 'IN_PROGRESS' },
    }),
    collectClosedJobCounts(companyId),
    collectOverrideSummary(companyId),
  ])

  const queue: DispatchQueueItem[] = queueRecords
    .filter((record) => record.estimate?.currentRevision)
    .map((record) => {
      const revision = record.estimate!.currentRevision!
      const approvedTotal = revision.grandTotal ? Number(revision.grandTotal) : 0
      const contactName = `${record.contact.firstName} ${record.contact.lastName}`.trim()
      const companyName = record.contact.companyOverrideName ?? record.contact.derivedCompanyName ?? null

      return {
        id: record.id,
        status: record.status,
        queuedAt: record.queuedAt,
        quoteNumber: record.estimate!.quoteNumber,
        revisionNumber: revision.revisionNumber,
        projectName: revision.projectName,
        industry: revision.industry ?? null,
        approvedTotal,
        sentByName: record.estimate?.createdBy?.name ?? null,
        sentByEmail: record.estimate?.createdBy?.email ?? null,
        contact: {
          id: record.contact.id,
          name: contactName,
          company: companyName,
          email: record.contact.email,
        },
        priority: record.priority,
        hasWorkOrder: record.workOrders.length > 0,
      }
    })

  return {
    widgets: {
      newRequests: queue.length,
      openWorkOrders: openCount,
      activeJobs: activeCount,
      closedJobs: closedCounts,
      complianceOverrides: overrideSummary,
    },
    queue,
  }
}

async function collectClosedJobCounts(companyId: string) {
  const now = new Date()
  const subtractDays = (days: number) => {
    const copy = new Date(now)
    copy.setDate(copy.getDate() - days)
    return copy
  }

  const [last30, last60, last90] = await Promise.all([
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: subtractDays(30) },
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: subtractDays(60) },
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: subtractDays(90) },
      },
    }),
  ])

  return { last30, last60, last90 }
}

async function collectOverrideSummary(companyId: string) {
  const [total, recent] = await Promise.all([
    prisma.workOrderAssignment.count({
      where: { workOrder: { companyId }, overrideAcknowledged: true },
    }),
    prisma.workOrderAssignment.findMany({
      where: { workOrder: { companyId }, overrideAcknowledged: true },
      orderBy: { overrideAt: 'desc' },
      take: 5,
      select: {
        id: true,
        overrideAt: true,
        overrideReason: true,
        workOrder: { select: { id: true, title: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
  ])

  return {
    total,
    recent: recent.map((entry) => ({
      id: entry.id,
      workOrderId: entry.workOrder.id,
      workOrderTitle: entry.workOrder.title,
      employeeName: `${entry.employee.firstName} ${entry.employee.lastName}`.trim(),
      overrideAt: entry.overrideAt,
      reason: entry.overrideReason,
    })),
  }
}

export function mapIndustryToDiscipline(industry: EstimateIndustry | null | undefined): WorkOrderDiscipline {
  if (!industry) {
    return 'CONSTRUCTION'
  }

  switch (industry) {
    case 'RAILROAD':
      return 'RAILROAD'
    case 'ENVIRONMENTAL':
      return 'ENVIRONMENTAL'
    case 'CONSTRUCTION':
    default:
      return 'CONSTRUCTION'
  }
}
