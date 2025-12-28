import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { evaluateContactAttention, type AttentionResult } from '@/lib/contacts/attention'

export type ContactListFilters = {
  search?: string
  ownerId?: string
  archived?: boolean
  lastActivityWindowDays?: number | null
  hasOpenTasks?: boolean
  hasOverdueTasks?: boolean
  hasCalls?: boolean
  hasMeetings?: boolean
  sort?: 'attention' | 'activity'
  page?: number
  perPage?: number
}

export type ContactListItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
  phone: string | null
  mobile: string | null
  companyLabel: string
  owner: { id: string; name: string | null; email: string | null } | null
  lastActivityAt: Date | null
  openTasksCount: number
  overdueTaskCount: number
  attention: AttentionResult
}

export type ContactListResult = {
  contacts: ContactListItem[]
  pagination: {
    total: number
    page: number
    perPage: number
    pages: number
  }
}

function buildContactWhere(filters: ContactListFilters, companyId: string): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = {
    companyId,
    archived: filters.archived ?? false,
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId
  }

  const andList: Prisma.ContactWhereInput[] = []

  if (filters.search) {
    const search = filters.search.trim()
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { derivedCompanyName: { contains: search, mode: 'insensitive' } },
      { companyOverrideName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (filters.hasOpenTasks) {
    andList.push({ tasks: { some: { completed: false } } })
  }

  if (filters.hasOverdueTasks) {
    andList.push({ tasks: { some: { completed: false, dueDate: { lt: new Date() } } } })
  }

  if (filters.hasCalls) {
    andList.push({ calls: { some: {} } })
  }

  if (filters.hasMeetings) {
    andList.push({ meetings: { some: {} } })
  }

  if (filters.lastActivityWindowDays && filters.lastActivityWindowDays > 0) {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - filters.lastActivityWindowDays)
    andList.push({ lastActivityAt: { gte: threshold } })
  }

  if (andList.length) {
    where.AND = andList
  }

  return where
}

const CONTACT_QUERY = Prisma.validator<Prisma.ContactDefaultArgs>()({
  include: {
    owner: { select: { id: true, name: true, email: true } },
    tasks: {
      where: { completed: false },
      select: { id: true, dueDate: true, title: true },
    },
    _count: {
      select: {
        calls: true,
        meetings: true,
      },
    },
  },
})

export async function listContactsForCompany(companyId: string, filters: ContactListFilters): Promise<ContactListResult> {
  const where = buildContactWhere(filters, companyId)
  const page = filters.page && filters.page > 0 ? filters.page : 1
  const perPage = filters.perPage && filters.perPage > 0 ? filters.perPage : 25

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: CONTACT_QUERY.include,
      orderBy: { lastActivityAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contact.count({ where }),
  ])

  const enriched = contacts.map((contact) => {
    const overdueTaskCount = contact.tasks.filter((task) => task.dueDate && task.dueDate < new Date()).length
    const attention = evaluateContactAttention({
      archived: contact.archived,
      lastActivityAt: contact.lastActivityAt,
      openTasks: contact.tasks.map((task) => ({ dueDate: task.dueDate })),
      hasOverdueTasks: overdueTaskCount > 0,
      loggedCallCount: contact._count.calls ?? 0,
      meetingCount: contact._count.meetings ?? 0,
    })

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      jobTitle: contact.jobTitle,
      phone: contact.phone,
      mobile: contact.mobile,
      companyLabel: contact.companyOverrideName ?? contact.derivedCompanyName,
      owner: contact.owner,
      lastActivityAt: contact.lastActivityAt,
      openTasksCount: contact.tasks.length,
      overdueTaskCount,
      attention,
    }
  })

  const sorted = filters.sort === 'attention'
    ? enriched.sort((a, b) => b.attention.score - a.attention.score)
    : enriched

  return {
    contacts: sorted,
    pagination: {
      total,
      page,
      perPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    },
  }
}
