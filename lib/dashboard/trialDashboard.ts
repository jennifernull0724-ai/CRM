import { loadMyContactRadarSnapshot } from '@/lib/dashboard/contactSnapshots'
import { loadUserActivityTimeline } from '@/lib/dashboard/userOverview'
import { getEmailActivityMetrics, type MyTaskSnapshot } from '@/lib/analytics/contactAnalytics'
import { prisma } from '@/lib/prisma'

export type TrialDashboardData = {
  tasks: {
    open: number
    snapshot: MyTaskSnapshot
  }
  quick: {
    contacts: number
    deals: number
    tasks: number
    emails7d: number
  }
  recentNotes: Array<{
    id: string
    contactId: string | null
    contactName: string
    createdAt: Date
    excerpt: string
  }>
  emailsSent: number
  activity: Array<{
    id: string
    subject: string
    type: string
    createdAt: Date
    contactId: string | null
    contactName: string | null
  }>
  latestContact: {
    id: string | null
    name: string | null
    email: string | null
  }
}

export async function loadTrialDashboardData(params: { userId: string; companyId: string }): Promise<TrialDashboardData> {
  const { userId, companyId } = params
  const scope = { userId, companyId, role: 'user' as const }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [radar, openTasks, notes, timeline, emailMetrics, latestContact, contactCount, dealCount, taskCount, emails7d] = await Promise.all([
    loadMyContactRadarSnapshot(scope),
    prisma.task.count({
      where: { assignedToId: userId, completed: false, contact: { companyId } },
    }),
    prisma.note.findMany({
      where: { createdById: userId, contact: { companyId } },
      select: {
        id: true,
        content: true,
        createdAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    loadUserActivityTimeline(userId, companyId),
    getEmailActivityMetrics(scope),
    prisma.contact.findFirst({
      where: { companyId, archived: false },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    prisma.contact.count({ where: { companyId, archived: false } }),
    prisma.deal.count({ where: { companyId, createdById: userId } }),
    prisma.task.count({ where: { assignedToId: userId, contact: { companyId }, completed: false } }),
    prisma.email.count({
      where: {
        contact: { companyId },
        direction: 'OUTBOUND',
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ])

  return {
    tasks: {
      open: openTasks,
      snapshot: radar.tasks,
    },
    quick: {
      contacts: contactCount,
      deals: dealCount,
      tasks: taskCount,
      emails7d,
    },
    recentNotes: notes.map((note) => ({
      id: note.id,
      contactId: note.contact?.id ?? null,
      contactName: formatName(note.contact?.firstName, note.contact?.lastName) ?? 'Contact',
      createdAt: note.createdAt,
      excerpt: toPlainText(note.content).slice(0, 180),
    })),
    emailsSent: emailMetrics.emailsSent,
    activity: timeline.slice(0, 6).map((event) => ({
      id: event.id,
      subject: event.subject,
      type: event.type,
      createdAt: new Date(event.createdAt),
      contactId: event.contactId,
      contactName: event.contactName,
    })),
    latestContact: latestContact
      ? {
          id: latestContact.id,
          name: formatName(latestContact.firstName, latestContact.lastName),
          email: latestContact.email,
        }
      : { id: null, name: null, email: null },
  }
}

function toPlainText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatName(first?: string | null, last?: string | null): string | null {
  const value = `${first ?? ''} ${last ?? ''}`.trim()
  return value.length ? value : null
}
