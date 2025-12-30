import { Prisma, type DispatchRequestStatus, type EstimateStatus, type WorkOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ensureCompanyBootstrap } from '@/lib/system/bootstrap'

export type UserDashboardContact = {
  id: string
  name: string
  email: string
  lastActivityAt: Date | null
  recentActivities: {
    id: string
    type: string
    subject: string
    createdAt: Date
  }[]
}

export type UserDashboardEstimate = {
  id: string
  status: EstimateStatus
  updatedAt: Date
  dealName: string
  contactName: string
  contactEmail: string
  value: number | null
  latestPdfId: string | null
  latestPdfUrl: string | null
  dispatchRequestId: string | null
  dispatchStatus: DispatchRequestStatus | null
  sentToDispatchAt: Date | null
}

export type UserDashboardDispatchRecord = {
  id: string
  status: DispatchRequestStatus
  priority: string
  queuedAt: Date
  scheduledFor: Date | null
  estimateId: string | null
  estimateName: string | null
  workOrders: {
    id: string
    title: string
    status: WorkOrderStatus
    createdAt: Date
  }[]
}

export type UserDashboardMetrics = {
  activeQuotes: number
  awaitingApproval: number
  sentToDispatch: number
  openWorkOrders: number
}

export type UserPersonalAnalytics = {
  dealsCreated: number
  estimatesApproved: number
  estimatesSentToDispatch: number
  conversionRate: number
  avgApprovalHours: number
  workOrdersFromMyDispatches: number
}

export type UserDashboardData = {
  metrics: UserDashboardMetrics
  contacts: UserDashboardContact[]
  estimates: UserDashboardEstimate[]
  dispatchRecords: UserDashboardDispatchRecord[]
  contactOptions: { id: string; name: string; email: string }[]
}

export type UserActivityTimelineEntry = {
  id: string
  type: string
  subject: string
  createdAt: string
  contactId: string | null
  contactName: string | null
  dealId: string | null
  dealName: string | null
}

function buildFullName(firstName: string, lastName: string | null): string {
  return [firstName, lastName ?? ''].join(' ').trim()
}

export async function loadUserDashboardData(userId: string, companyId: string): Promise<UserDashboardData> {
  // Ensure workspace has minimum required system records
  await ensureCompanyBootstrap(companyId)

  const [metrics, contacts, estimates, dispatchRecords, contactOptions] = await Promise.all([
    collectMetrics(userId, companyId),
    prisma.contact.findMany({
      where: { createdById: userId, companyId, archived: false },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lastActivityAt: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, type: true, subject: true, createdAt: true },
        },
      },
    }),
    prisma.estimate.findMany({
      where: { companyId, deal: { createdById: userId } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      include: {
        contact: {
          select: { firstName: true, lastName: true, email: true },
        },
        deal: {
          select: {
            id: true,
            name: true,
            value: true,
            contact: {
              select: { firstName: true, lastName: true, email: true },
            },
            pdfs: {
              orderBy: { generatedAt: 'desc' },
              take: 1,
              select: { id: true, fileUrl: true },
            },
          },
        },
        dispatchRequests: {
          orderBy: { queuedAt: 'desc' },
          take: 1,
          select: { id: true, status: true },
        },
      },
    }),
    prisma.dispatchRequest.findMany({
      where: { companyId, estimate: { sentToDispatchById: userId } },
      orderBy: { queuedAt: 'desc' },
      take: 10,
      include: {
        estimate: {
          select: {
            id: true,
            deal: { select: { name: true } },
          },
        },
        workOrders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.contact.findMany({
      where: { createdById: userId, companyId, archived: false },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ])

  return {
    metrics,
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: buildFullName(contact.firstName, contact.lastName),
      email: contact.email,
      lastActivityAt: contact.lastActivityAt,
      recentActivities: contact.activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        createdAt: activity.createdAt,
      })),
    })),
    estimates: estimates.map((estimate) => {
      const deal = estimate.deal
      const contact = deal?.contact ?? estimate.contact
      const latestPdf = deal?.pdfs[0]

      return {
        id: estimate.id,
        status: estimate.status,
        updatedAt: estimate.updatedAt,
        dealName: deal?.name ?? 'Standalone estimate',
        contactName: buildFullName(contact.firstName, contact.lastName),
        contactEmail: contact.email,
        value: deal?.value ?? null,
        latestPdfId: latestPdf?.id ?? null,
        latestPdfUrl: latestPdf?.fileUrl ?? null,
        dispatchRequestId: estimate.dispatchRequests[0]?.id ?? null,
        dispatchStatus: estimate.dispatchRequests[0]?.status ?? null,
        sentToDispatchAt: estimate.sentToDispatchAt,
      }
    }),
    dispatchRecords: dispatchRecords.map((record) => {
      const estimateDeal = record.estimate?.deal
      return {
        id: record.id,
        status: record.status,
        priority: record.priority,
        queuedAt: record.queuedAt,
        scheduledFor: record.scheduledFor,
        estimateId: record.estimate?.id ?? null,
        estimateName: estimateDeal?.name ?? null,
        workOrders: record.workOrders.map((workOrder) => ({
          id: workOrder.id,
          title: workOrder.title,
          status: workOrder.status,
          createdAt: workOrder.createdAt,
        })),
      }
    }),
    contactOptions: contactOptions.map((contact) => ({
      id: contact.id,
      name: buildFullName(contact.firstName, contact.lastName),
      email: contact.email,
    })),
  }
}

export async function loadUserPersonalAnalytics(userId: string, companyId: string): Promise<UserPersonalAnalytics> {
  const [dealsCreated, estimatesApproved, estimatesSentToDispatch, workOrdersFromMyDispatches, approvalRows] =
    await Promise.all([
      prisma.deal.count({ where: { createdById: userId, companyId } }),
      prisma.estimate.count({ where: { createdById: userId, companyId, status: 'APPROVED' } }),
      prisma.estimate.count({ where: { companyId, sentToDispatchById: userId, status: 'SENT_TO_DISPATCH' } }),
      prisma.workOrder.count({
        where: {
          companyId,
          dispatchRequest: {
            estimate: { sentToDispatchById: userId },
          },
        },
      }),
      prisma.$queryRaw<{ hours: number | null }[]>(
        Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM (e."approvedAt" - e."submittedAt")) / 3600) AS hours
          FROM "Estimate" e
          WHERE e."companyId" = ${companyId}
            AND e."createdById" = ${userId}
            AND e."approvedAt" IS NOT NULL
            AND e."submittedAt" IS NOT NULL
        `,
      ),
    ])

  const conversionRate = estimatesApproved === 0 ? 0 : Math.round((estimatesSentToDispatch / estimatesApproved) * 100)
  const avgApprovalHours = approvalRows[0]?.hours ? Number(approvalRows[0].hours) : 0

  return {
    dealsCreated,
    estimatesApproved,
    estimatesSentToDispatch,
    conversionRate,
    avgApprovalHours,
    workOrdersFromMyDispatches,
  }
}

const TIMELINE_WINDOW_LIMIT = 25

export async function loadUserActivityTimeline(
  userId: string,
  companyId: string,
): Promise<UserActivityTimelineEntry[]> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const activities = await prisma.activity.findMany({
    where: {
      companyId,
      userId,
      createdAt: { gte: startOfToday },
    },
    orderBy: { createdAt: 'desc' },
    take: TIMELINE_WINDOW_LIMIT,
    select: {
      id: true,
      type: true,
      subject: true,
      createdAt: true,
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
      deal: {
        select: { id: true, name: true },
      },
    },
  })

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    createdAt: activity.createdAt.toISOString(),
    contactId: activity.contact?.id ?? null,
    contactName: activity.contact ? buildFullName(activity.contact.firstName, activity.contact.lastName) : null,
    dealId: activity.deal?.id ?? null,
    dealName: activity.deal?.name ?? null,
  }))
}

async function collectMetrics(userId: string, companyId: string): Promise<UserDashboardMetrics> {
  const [activeQuotes, awaitingApproval, sentToDispatch, openWorkOrders] = await Promise.all([
    prisma.estimate.count({
      where: {
        companyId,
        deal: { createdById: userId },
        status: { in: ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED'] },
      },
    }),
    prisma.estimate.count({
      where: {
        companyId,
        deal: { createdById: userId },
        status: 'AWAITING_APPROVAL',
      },
    }),
    prisma.estimate.count({
      where: {
        companyId,
        sentToDispatchById: userId,
        status: 'SENT_TO_DISPATCH',
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { in: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'] },
        dispatchRequest: {
          estimate: { sentToDispatchById: userId },
        },
      },
    }),
  ])

  return {
    activeQuotes,
    awaitingApproval,
    sentToDispatch,
    openWorkOrders,
  }
}
