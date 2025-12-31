import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type TimelineFilters = {
  types?: string[]
  limit?: number
}

type ContactWorkspaceContext = {
  userId: string
  role?: string | null
}

export async function getContactWorkspace(
  contactId: string,
  companyId: string,
  filters: TimelineFilters = {},
  context?: ContactWorkspaceContext
) {
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      companyId,
    },
    include: {
      owner: { select: { id: true, name: true, role: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!contact) {
    return null
  }

  const activityWhere: Prisma.ActivityWhereInput = {
    contactId: contact.id,
    companyId,
  }

  if (filters.types && filters.types.length > 0) {
    activityWhere.type = { in: filters.types }
  }

  const limit = filters.limit ?? 50

  const [tasks, notes, timeline, workspaceUsers, deals, estimates, workOrders, emailIntegration] = await Promise.all([
    prisma.task.findMany({
      where: { contactId: contact.id },
      orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, name: true } },
      },
      take: 50,
    }),
    prisma.note.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    }),
    prisma.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { companyId, disabled: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.deal.findMany({
      where: {
        contactId: contact.id,
        companyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, stage: true, value: true, updatedAt: true },
    }),
    prisma.estimate.findMany({
      where: {
        contactId: contact.id,
        companyId,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, quoteNumber: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.workOrder.findMany({
      where: { contactId: contact.id, companyId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.emailIntegration.findFirst({
      where: { companyId, isActive: true },
      select: { id: true, provider: true, status: true },
    }),
  ])

  const openTasks = tasks.filter((task) => !task.completed)
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < new Date()).length

  return {
    contact,
    tasks,
    notes,
    timeline,
    workspaceUsers,
    deals,
    estimates,
    workOrders,
    emailIntegration,
    stats: {
      openTasks: openTasks.length,
      overdueTasks,
      lastActivityAt: contact.lastActivityAt,
    },
  }
}
