import { Prisma, EmailDirection } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ContactAnalyticsRole = 'user' | 'estimator' | 'admin' | 'owner'

export type ContactAnalyticsScope = {
  companyId: string
  userId: string
  role: ContactAnalyticsRole
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const NO_ACTIVITY_THRESHOLD_MINUTES = 30
const RECENT_MENTION_WINDOW_DAYS = 14
const DEFAULT_RESULT_LIMIT = 100

export class AnalyticsPreconditionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyticsPreconditionError'
  }
}

export type ContactOverviewMetrics = {
  totalContacts: number
  activeContacts: number
  archivedContacts: number
  contactsWithOpenTasks: number
  contactsWithOverdueTasks: number
  contactsWithNoActivity: number
  contactsTouchedLast7Days: number
  contactsTouchedLast30Days: number
}

export type ActivityByUserRow = {
  userId: string
  userName: string
  contactsOwned: number
  contactsTouchedLast7Days: number
  tasksCompleted: number
  emailsSent: number
  callsLogged: number
  meetingsLogged: number
}

export type ContactTaskPerformance = {
  openTasks: number
  overdueTasks: number
  completedTasks: number
  averageCompletionTimeHours: number
  completionRate: number
}

export type UntouchedContact = {
  contactId: string
  name: string
  company: string | null
  ownerName: string
  lastActivityAt: Date | null
}

export type MySummaryMetrics = {
  myContacts: number
  myContactsWithOpenTasks: number
  myOverdueTasks: number
  myContactsWithNoActivity: number
  myRecentMentions: number
}

export type MyTaskSnapshot = {
  tasksDueToday: number
  tasksOverdue: number
  tasksDueThisWeek: number
}

export type MyMentionEntry = {
  contactId: string
  contactName: string
  mentionedBy: string
  noteExcerpt: string
  createdAt: Date
}

export type MyStaleContact = {
  contactId: string
  name: string
  company: string | null
  lastActivityAt: Date | null
}

export type EmailActivityMetrics = {
  emailsSent: number
  emailsReceived: number
  emailsWithAttachments: number
  inlineImagesSent: number
}

export type AttachmentUsageMetrics = {
  totalAttachments: number
  pdfs: number
  images: number
  otherFiles: number
}

export function normalizeRole(role?: string | null): ContactAnalyticsRole {
  const lowered = (role ?? 'user').toLowerCase()
  if (lowered === 'owner' || lowered === 'admin' || lowered === 'estimator') {
    return lowered
  }
  return 'user'
}

export function isPrivilegedRole(role: ContactAnalyticsRole): boolean {
  return role === 'admin' || role === 'owner'
}

function ownershipFilter(scope: ContactAnalyticsScope): Prisma.ContactWhereInput {
  if (isPrivilegedRole(scope.role)) {
    return {}
  }
  return { ownerId: scope.userId }
}

function baseContactWhere(scope: ContactAnalyticsScope): Prisma.ContactWhereInput {
  return {
    companyId: scope.companyId,
    archived: false,
    ...ownershipFilter(scope),
  }
}

function taskScopeWhere(scope: ContactAnalyticsScope): Prisma.TaskWhereInput {
  return {
    contact: baseContactWhere(scope),
  }
}

function mentionNeedle(userId: string): string {
  return `"${userId}"`
}

function ownerClause(scope: ContactAnalyticsScope, alias = 'c'): Prisma.Sql {
  if (isPrivilegedRole(scope.role)) {
    return Prisma.sql``
  }
  const column = Prisma.raw(`${alias}."ownerId"`)
  return Prisma.sql`AND ${column} = ${scope.userId}`
}

function toPlainText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function countContactsWithNoActivity(scope: ContactAnalyticsScope): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "Contact" c
    WHERE c."companyId" = ${scope.companyId}
      AND c."archived" = false
      ${ownerClause(scope, 'c')}
      AND (
        c."lastActivityAt" IS NULL OR c."lastActivityAt" <= c."createdAt" + (${NO_ACTIVITY_THRESHOLD_MINUTES}::int * INTERVAL '1 minute')
      )
  `)

  return Number(rows[0]?.count ?? 0)
}

async function countDistinctTaskContacts(where: Prisma.TaskWhereInput): Promise<number> {
  const groups = await prisma.task.groupBy({
    by: ['contactId'],
    where,
    _count: { _all: true },
  })
  return groups.length
}

async function averageCompletionHours(scope: ContactAnalyticsScope): Promise<number> {
  const rows = await prisma.$queryRaw<{ hours: number | null }[]>(Prisma.sql`
    SELECT AVG(EXTRACT(EPOCH FROM (t."completedAt" - t."createdAt")) / 3600) AS hours
    FROM "Task" t
    INNER JOIN "Contact" c ON c."id" = t."contactId"
    WHERE c."companyId" = ${scope.companyId}
      AND c."archived" = false
      ${ownerClause(scope, 'c')}
      AND t."completed" = true
      AND t."completedAt" IS NOT NULL
  `)

  return rows[0]?.hours ? Number(rows[0].hours) : 0
}

function rowsToCountMap(rows: { ownerId: string; count: bigint }[]): Map<string, number> {
  return new Map(rows.map((row) => [row.ownerId, Number(row.count)]))
}

export async function ensureAnalyticsPreconditions(scope: ContactAnalyticsScope): Promise<void> {
  const contactFilter = baseContactWhere(scope)
  const [missingLastActivity, completedWithoutTimestamp] = await Promise.all([
    prisma.contact.count({ where: { ...contactFilter, lastActivityAt: null } }),
    prisma.task.count({ where: { completed: true, completedAt: null, contact: contactFilter } }),
  ])

  if (missingLastActivity > 0) {
    throw new AnalyticsPreconditionError('lastActivityAt missing for contacts in scope')
  }

  if (completedWithoutTimestamp > 0) {
    throw new AnalyticsPreconditionError('Detected completed tasks without completion timestamps')
  }
}

export async function getContactOverviewMetrics(scope: ContactAnalyticsScope): Promise<ContactOverviewMetrics> {
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * DAY_IN_MS)
  const thirtyDaysAgo = new Date(now - 30 * DAY_IN_MS)
  const contactFilter = ownershipFilter(scope)
  const taskWhere = taskScopeWhere(scope)

  const [
    totalContacts,
    activeContacts,
    archivedContacts,
    contactsWithOpenTasks,
    contactsWithOverdueTasks,
    contactsWithNoActivity,
    contactsTouchedLast7Days,
    contactsTouchedLast30Days,
  ] = await Promise.all([
    prisma.contact.count({ where: { companyId: scope.companyId } }),
    prisma.contact.count({ where: { ...contactFilter, companyId: scope.companyId, archived: false } }),
    prisma.contact.count({ where: { ...contactFilter, companyId: scope.companyId, archived: true } }),
    countDistinctTaskContacts({ ...taskWhere, completed: false }),
    countDistinctTaskContacts({
      ...taskWhere,
      completed: false,
      dueDate: { lt: new Date() },
    }),
    countContactsWithNoActivity(scope),
    prisma.contact.count({
      where: {
        ...contactFilter,
        companyId: scope.companyId,
        archived: false,
        lastActivityAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.contact.count({
      where: {
        ...contactFilter,
        companyId: scope.companyId,
        archived: false,
        lastActivityAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  return {
    totalContacts,
    activeContacts,
    archivedContacts,
    contactsWithOpenTasks,
    contactsWithOverdueTasks,
    contactsWithNoActivity,
    contactsTouchedLast7Days,
    contactsTouchedLast30Days,
  }
}

export async function getActivityByOwnerAnalytics(scope: ContactAnalyticsScope): Promise<ActivityByUserRow[]> {
  if (!isPrivilegedRole(scope.role)) {
    return []
  }

  const ownerGroups = await prisma.contact.groupBy({
    by: ['ownerId'],
    where: { companyId: scope.companyId, archived: false },
    _count: { _all: true },
  })

  if (ownerGroups.length === 0) {
    return []
  }

  const ownerIds = ownerGroups.map((group) => group.ownerId)
  const [ownerProfiles, touchedGroups, tasksCompletedRows, emailsSentRows, callsRows, meetingsRows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    }),
    prisma.contact.groupBy({
      by: ['ownerId'],
      where: {
        companyId: scope.companyId,
        archived: false,
        lastActivityAt: { gte: new Date(Date.now() - 7 * DAY_IN_MS) },
      },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ ownerId: string; count: bigint }[]>(Prisma.sql`
      SELECT c."ownerId", COUNT(*)::bigint AS count
      FROM "Task" t
      INNER JOIN "Contact" c ON c."id" = t."contactId"
      WHERE c."companyId" = ${scope.companyId}
        AND c."archived" = false
        AND t."completed" = true
      GROUP BY c."ownerId"
    `),
    prisma.$queryRaw<{ ownerId: string; count: bigint }[]>(Prisma.sql`
      SELECT c."ownerId", COUNT(*)::bigint AS count
      FROM "Email" e
      INNER JOIN "Contact" c ON c."id" = e."contactId"
      WHERE c."companyId" = ${scope.companyId}
        AND e."direction" = ${EmailDirection.OUTBOUND}
      GROUP BY c."ownerId"
    `),
    prisma.$queryRaw<{ ownerId: string; count: bigint }[]>(Prisma.sql`
      SELECT c."ownerId", COUNT(*)::bigint AS count
      FROM "ContactCall" call
      INNER JOIN "Contact" c ON c."id" = call."contactId"
      WHERE c."companyId" = ${scope.companyId}
      GROUP BY c."ownerId"
    `),
    prisma.$queryRaw<{ ownerId: string; count: bigint }[]>(Prisma.sql`
      SELECT c."ownerId", COUNT(*)::bigint AS count
      FROM "ContactMeeting" meeting
      INNER JOIN "Contact" c ON c."id" = meeting."contactId"
      WHERE c."companyId" = ${scope.companyId}
      GROUP BY c."ownerId"
    `),
  ])

  const touchedMap = new Map(touchedGroups.map((group) => [group.ownerId, group._count._all]))
  const tasksMap = rowsToCountMap(tasksCompletedRows)
  const emailsMap = rowsToCountMap(emailsSentRows)
  const callsMap = rowsToCountMap(callsRows)
  const meetingsMap = rowsToCountMap(meetingsRows)
  const profileMap = new Map(ownerProfiles.map((profile) => [profile.id, profile.name ?? 'Unassigned owner']))

  return ownerGroups.map((group) => ({
    userId: group.ownerId,
    userName: profileMap.get(group.ownerId) ?? 'Unassigned owner',
    contactsOwned: group._count._all,
    contactsTouchedLast7Days: touchedMap.get(group.ownerId) ?? 0,
    tasksCompleted: tasksMap.get(group.ownerId) ?? 0,
    emailsSent: emailsMap.get(group.ownerId) ?? 0,
    callsLogged: callsMap.get(group.ownerId) ?? 0,
    meetingsLogged: meetingsMap.get(group.ownerId) ?? 0,
  }))
}

export async function getContactTaskPerformance(scope: ContactAnalyticsScope): Promise<ContactTaskPerformance> {
  const taskWhere = taskScopeWhere(scope)
  const now = new Date()

  const [openTasks, overdueTasks, completedTasks, totalTasks, avgHours] = await Promise.all([
    prisma.task.count({ where: { ...taskWhere, completed: false } }),
    prisma.task.count({ where: { ...taskWhere, completed: false, dueDate: { lt: now } } }),
    prisma.task.count({ where: { ...taskWhere, completed: true } }),
    prisma.task.count({ where: taskWhere }),
    averageCompletionHours(scope),
  ])

  const completionRate = totalTasks === 0 ? 0 : Number((completedTasks / totalTasks).toFixed(4))

  return {
    openTasks,
    overdueTasks,
    completedTasks,
    averageCompletionTimeHours: Number(avgHours.toFixed(2)),
    completionRate,
  }
}

export async function getUntouchedContacts(scope: ContactAnalyticsScope, days: number): Promise<UntouchedContact[]> {
  const cutoff = new Date(Date.now() - days * DAY_IN_MS)
  const contacts = await prisma.contact.findMany({
    where: {
      ...baseContactWhere(scope),
      lastActivityAt: { lt: cutoff },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      derivedCompanyName: true,
      companyOverrideName: true,
      owner: { select: { name: true } },
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: 'asc' },
    take: DEFAULT_RESULT_LIMIT,
  })

  return contacts.map((contact) => ({
    contactId: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    company: contact.companyOverrideName ?? contact.derivedCompanyName ?? null,
    ownerName: contact.owner?.name ?? 'Unassigned owner',
    lastActivityAt: contact.lastActivityAt,
  }))
}

export async function getMyContactSummary(scope: ContactAnalyticsScope): Promise<MySummaryMetrics> {
  const contactWhere = baseContactWhere(scope)
  const mentionWindow = new Date(Date.now() - RECENT_MENTION_WINDOW_DAYS * DAY_IN_MS)
  const mentionFilter = mentionNeedle(scope.userId)

  const [
    myContacts,
    myContactsWithOpenTasks,
    myOverdueTasks,
    myContactsWithNoActivity,
    myRecentMentions,
  ] = await Promise.all([
    prisma.contact.count({ where: contactWhere }),
    countDistinctTaskContacts({ ...taskScopeWhere(scope), completed: false }),
    prisma.task.count({
      where: {
        ...taskScopeWhere(scope),
        completed: false,
        dueDate: { lt: new Date() },
      },
    }),
    countContactsWithNoActivity(scope),
    prisma.note.count({
      where: {
        contact: contactWhere,
        mentions: { contains: mentionFilter },
        createdAt: { gte: mentionWindow },
      },
    }),
  ])

  return {
    myContacts,
    myContactsWithOpenTasks,
    myOverdueTasks,
    myContactsWithNoActivity,
    myRecentMentions,
  }
}

export async function getMyTaskSnapshot(scope: ContactAnalyticsScope): Promise<MyTaskSnapshot> {
  const taskWhere = taskScopeWhere(scope)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const endOfWeek = new Date(startOfToday.getTime() + 7 * DAY_IN_MS)

  const [tasksDueToday, tasksOverdue, tasksDueThisWeek] = await Promise.all([
    prisma.task.count({
      where: {
        ...taskWhere,
        completed: false,
        dueDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    prisma.task.count({
      where: {
        ...taskWhere,
        completed: false,
        dueDate: { lt: startOfToday },
      },
    }),
    prisma.task.count({
      where: {
        ...taskWhere,
        completed: false,
        dueDate: {
          gt: endOfToday,
          lte: endOfWeek,
        },
      },
    }),
  ])

  return {
    tasksDueToday,
    tasksOverdue,
    tasksDueThisWeek,
  }
}

export async function getMyMentionFeed(scope: ContactAnalyticsScope): Promise<MyMentionEntry[]> {
  const contactWhere = baseContactWhere(scope)
  const notes = await prisma.note.findMany({
    where: {
      contact: contactWhere,
      mentions: { contains: mentionNeedle(scope.userId) },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      contact: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: DEFAULT_RESULT_LIMIT,
  })

  return notes.map((note) => ({
    contactId: note.contact.id,
    contactName: `${note.contact.firstName} ${note.contact.lastName}`.trim(),
    mentionedBy: note.createdBy?.name ?? 'System',
    noteExcerpt: toPlainText(note.content).slice(0, 180),
    createdAt: note.createdAt,
  }))
}

export async function getMyStaleContacts(scope: ContactAnalyticsScope, days: number): Promise<MyStaleContact[]> {
  const cutoff = new Date(Date.now() - days * DAY_IN_MS)
  const contacts = await prisma.contact.findMany({
    where: {
      ...baseContactWhere(scope),
      lastActivityAt: { lt: cutoff },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      derivedCompanyName: true,
      companyOverrideName: true,
      lastActivityAt: true,
    },
    orderBy: { lastActivityAt: 'asc' },
    take: DEFAULT_RESULT_LIMIT,
  })

  return contacts.map((contact) => ({
    contactId: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    company: contact.companyOverrideName ?? contact.derivedCompanyName ?? null,
    lastActivityAt: contact.lastActivityAt,
  }))
}

export async function getEmailActivityMetrics(scope: ContactAnalyticsScope): Promise<EmailActivityMetrics> {
  const contactWhere = baseContactWhere(scope)

  const [emailsSent, emailsReceived, emailsWithAttachments, inlineImagesSent] = await Promise.all([
    prisma.email.count({
      where: {
        contact: contactWhere,
        direction: EmailDirection.OUTBOUND,
      },
    }),
    prisma.email.count({
      where: {
        contact: contactWhere,
        direction: EmailDirection.INBOUND,
      },
    }),
    prisma.email.count({
      where: {
        contact: contactWhere,
        attachments: { some: {} },
      },
    }),
    prisma.emailAttachment.count({
      where: {
        isInline: true,
        contact: contactWhere,
        email: {
          direction: EmailDirection.OUTBOUND,
          contact: contactWhere,
        },
      },
    }),
  ])

  return {
    emailsSent,
    emailsReceived,
    emailsWithAttachments,
    inlineImagesSent,
  }
}

export async function getAttachmentUsageMetrics(scope: ContactAnalyticsScope): Promise<AttachmentUsageMetrics> {
  const contactWhere = baseContactWhere(scope)

  const [totalAttachments, pdfs, images] = await Promise.all([
    prisma.emailAttachment.count({ where: { contact: contactWhere } }),
    prisma.emailAttachment.count({
      where: {
        contact: contactWhere,
        mimeType: { contains: 'pdf', mode: 'insensitive' },
      },
    }),
    prisma.emailAttachment.count({
      where: {
        contact: contactWhere,
        mimeType: { startsWith: 'image/', mode: 'insensitive' },
      },
    }),
  ])

  const otherFiles = Math.max(totalAttachments - pdfs - images, 0)

  return {
    totalAttachments,
    pdfs,
    images,
    otherFiles,
  }
}
