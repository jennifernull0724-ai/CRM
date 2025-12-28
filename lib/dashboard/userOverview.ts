import { prisma } from '@/lib/prisma'
import type { DispatchRequestStatus, EstimateStatus, WorkOrderStatus } from '@prisma/client'

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

export type UserDashboardData = {
  metrics: UserDashboardMetrics
  contacts: UserDashboardContact[]
  estimates: UserDashboardEstimate[]
  dispatchRecords: UserDashboardDispatchRecord[]
  contactOptions: { id: string; name: string; email: string }[]
}

function buildFullName(firstName: string, lastName: string | null): string {
  return [firstName, lastName ?? ''].join(' ').trim()
}

export async function loadUserDashboardData(userId: string, companyId: string): Promise<UserDashboardData> {
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
      where: { companyId, estimate: { deal: { createdById: userId } } },
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
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      status: estimate.status,
      updatedAt: estimate.updatedAt,
      dealName: estimate.deal.name,
      contactName: buildFullName(estimate.deal.contact.firstName, estimate.deal.contact.lastName),
      contactEmail: estimate.deal.contact.email,
      value: estimate.deal.value,
      latestPdfId: estimate.deal.pdfs[0]?.id ?? null,
      latestPdfUrl: estimate.deal.pdfs[0]?.fileUrl ?? null,
      dispatchRequestId: estimate.dispatchRequests[0]?.id ?? null,
      dispatchStatus: estimate.dispatchRequests[0]?.status ?? null,
      sentToDispatchAt: estimate.sentToDispatchAt,
    })),
    dispatchRecords: dispatchRecords.map((record) => ({
      id: record.id,
      status: record.status,
      priority: record.priority,
      queuedAt: record.queuedAt,
      scheduledFor: record.scheduledFor,
      estimateId: record.estimate?.id ?? null,
      estimateName: record.estimate?.deal.name ?? null,
      workOrders: record.workOrders.map((workOrder) => ({
        id: workOrder.id,
        title: workOrder.title,
        status: workOrder.status,
        createdAt: workOrder.createdAt,
      })),
    })),
    contactOptions: contactOptions.map((contact) => ({
      id: contact.id,
      name: buildFullName(contact.firstName, contact.lastName),
      email: contact.email,
    })),
  }
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
        deal: { createdById: userId },
        status: 'SENT_TO_DISPATCH',
      },
    }),
    prisma.workOrder.count({
      where: {
        companyId,
        status: { not: 'CLOSED' },
        dispatchRequest: {
          estimate: { deal: { createdById: userId } },
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
