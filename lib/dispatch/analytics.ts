import type { Prisma, WorkOrderDiscipline, WorkOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const OPEN_WORK_STATUSES: WorkOrderStatus[] = ['SCHEDULED', 'IN_PROGRESS']
const CLOSED_WORK_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

export type DispatchAnalyticsFilters = {
  companyId: string
  discipline?: WorkOrderDiscipline
  startDate?: Date
  endDate?: Date
  windowDays?: number
  limit?: number
}

export type DispatchAnalyticsResult = {
  count: number
  ids: string[]
}

export type DispatchRoleMetrics = {
  openWorkOrders: number
  pendingDispatchRequests: number
  recentlyClosed: {
    last7: number
    last30: number
  }
}

export type WorkOrderListItem = {
  id: string
  title: string
  status: WorkOrderStatus
  discipline: WorkOrderDiscipline
  createdAt: Date
  scheduledAt: Date | null
  closedAt: Date | null
}

function buildBaseWhere(
  companyId: string,
  discipline?: WorkOrderDiscipline
): Prisma.WorkOrderWhereInput {
  const where: Prisma.WorkOrderWhereInput = { companyId }

  if (discipline) {
    where.discipline = discipline
  }

  return where
}

function applyDateRange(
  where: Prisma.WorkOrderWhereInput,
  field: 'createdAt' | 'closedAt',
  startDate?: Date,
  endDate?: Date
) {
  if (!startDate && !endDate) {
    return
  }

  const existingFilter = (where[field] ?? {}) as Prisma.DateTimeFilter
  where[field] = {
    ...existingFilter,
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate ? { lte: endDate } : {}),
  }
}

function resolveWindowDate(windowDays?: number): Date | undefined {
  if (!windowDays) {
    return undefined
  }

  const window = new Date()
  window.setDate(window.getDate() - windowDays)
  return window
}

export async function getOpenWorkOrderAnalytics(
  filters: DispatchAnalyticsFilters
): Promise<DispatchAnalyticsResult> {
  const { companyId, discipline, startDate, endDate, limit = 25 } = filters
  const where = buildBaseWhere(companyId, discipline)
  where.status = { in: OPEN_WORK_STATUSES }
  applyDateRange(where, 'createdAt', startDate, endDate)

  const [count, items] = await Promise.all([
    prisma.workOrder.count({ where }),
    prisma.workOrder.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])

  return { count, ids: items.map((item) => item.id) }
}

export async function getPendingDispatchAnalytics(
  filters: DispatchAnalyticsFilters
): Promise<DispatchAnalyticsResult> {
  const { companyId, discipline, startDate, endDate, limit = 25 } = filters
  const where = buildBaseWhere(companyId, discipline)
  where.status = 'SCHEDULED'
  where.manualEntry = false
  where.estimateId = { not: null }
  where.dispatchRequestId = { not: null }
  applyDateRange(where, 'createdAt', startDate, endDate)

  const [count, items] = await Promise.all([
    prisma.workOrder.count({ where }),
    prisma.workOrder.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])

  return { count, ids: items.map((item) => item.id) }
}

export async function getRecentlyClosedAnalytics(
  filters: DispatchAnalyticsFilters
): Promise<DispatchAnalyticsResult> {
  const { companyId, discipline, startDate, endDate, windowDays = 7, limit = 25 } = filters
  const where = buildBaseWhere(companyId, discipline)
  where.status = { in: ['COMPLETED', 'CANCELLED'] }
  where.closedAt = { not: null }

  const fallbackStart = resolveWindowDate(windowDays)
  applyDateRange(where, 'closedAt', startDate ?? fallbackStart, endDate)

  const [count, items] = await Promise.all([
    prisma.workOrder.count({ where }),
    prisma.workOrder.findMany({
      where,
      select: { id: true },
      orderBy: { closedAt: 'desc' },
      take: limit,
    }),
  ])

  return { count, ids: items.map((item) => item.id) }
}

export async function getWorkOrdersForView(
  view: 'open' | 'pending' | 'closed',
  filters: DispatchAnalyticsFilters
): Promise<WorkOrderListItem[]> {
  const { companyId, discipline, startDate, endDate, windowDays = 7, limit = 25 } = filters
  const where = buildBaseWhere(companyId, discipline)

  if (view === 'open') {
    where.status = { in: OPEN_WORK_STATUSES }
    applyDateRange(where, 'createdAt', startDate, endDate)
  }

  if (view === 'pending') {
    where.status = 'SCHEDULED'
    where.manualEntry = false
    where.estimateId = { not: null }
    where.dispatchRequestId = { not: null }
    applyDateRange(where, 'createdAt', startDate, endDate)
  }

  if (view === 'closed') {
    where.status = { in: ['COMPLETED', 'CANCELLED'] }
    where.closedAt = { not: null }
    const fallbackStart = resolveWindowDate(windowDays)
    applyDateRange(where, 'closedAt', startDate ?? fallbackStart, endDate)
  }

  const items = await prisma.workOrder.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      discipline: true,
      createdAt: true,
      scheduledAt: true,
      closedAt: true,
    },
    orderBy: view === 'closed' ? { closedAt: 'desc' } : { createdAt: 'desc' },
    take: limit,
  })

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    discipline: item.discipline,
    createdAt: item.createdAt,
    scheduledAt: item.scheduledAt,
    closedAt: item.closedAt,
  }))
}

export async function loadDispatchRoleMetrics(companyId: string): Promise<DispatchRoleMetrics> {
  const subtractDays = (days: number) => {
    const copy = new Date()
    copy.setDate(copy.getDate() - days)
    return copy
  }

  const [openWorkOrders, pendingDispatchRequests, last7, last30] = await Promise.all([
    prisma.workOrder.count({ where: { companyId, status: { in: OPEN_WORK_STATUSES } } }),
    prisma.dispatchRequest.count({ where: { companyId, status: 'QUEUED' } }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: CLOSED_WORK_STATUSES },
        closedAt: { gte: subtractDays(7) },
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: CLOSED_WORK_STATUSES },
        closedAt: { gte: subtractDays(30) },
      },
    }),
  ])

  return {
    openWorkOrders,
    pendingDispatchRequests,
    recentlyClosed: {
      last7,
      last30,
    },
  }
}
