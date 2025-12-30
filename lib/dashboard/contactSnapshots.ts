import type {
  ContactAnalyticsScope,
  ContactOverviewMetrics,
  ActivityByUserRow,
  ContactTaskPerformance,
  UntouchedContact,
  EmailActivityMetrics,
  AttachmentUsageMetrics,
  MySummaryMetrics,
  MyTaskSnapshot,
  MyMentionEntry,
  MyStaleContact,
} from '@/lib/analytics/contactAnalytics'
import {
  getContactOverviewMetrics,
  getActivityByOwnerAnalytics,
  getContactTaskPerformance,
  getUntouchedContacts,
  getEmailActivityMetrics,
  getAttachmentUsageMetrics,
  getMyContactSummary,
  getMyTaskSnapshot,
  getMyMentionFeed,
  getMyStaleContacts,
} from '@/lib/analytics/contactAnalytics'

export type ContactCommandSnapshot = {
  overview: ContactOverviewMetrics
  activityByUser: ActivityByUserRow[]
  taskPerformance: ContactTaskPerformance
  untouched: Array<Omit<UntouchedContact, 'lastActivityAt'> & { lastActivityAt: string | null }>
  emailActivity: EmailActivityMetrics
  attachments: AttachmentUsageMetrics
}

export type MyContactRadarSnapshot = {
  summary: MySummaryMetrics
  tasks: MyTaskSnapshot
  mentions: Array<Omit<MyMentionEntry, 'createdAt'> & { createdAt: string }>
  stale: Array<Omit<MyStaleContact, 'lastActivityAt'> & { lastActivityAt: string | null }>
}

const DEFAULT_STALE_WINDOW_DAYS = 14

export async function loadContactCommandSnapshot(scope: ContactAnalyticsScope): Promise<ContactCommandSnapshot> {
  const [overview, activityByUser, taskPerformance, untouched, emailActivity, attachments] = await Promise.all([
    getContactOverviewMetrics(scope),
    getActivityByOwnerAnalytics(scope),
    getContactTaskPerformance(scope),
    getUntouchedContacts(scope, 30),
    getEmailActivityMetrics(scope),
    getAttachmentUsageMetrics(scope),
  ])

  return {
    overview,
    activityByUser,
    taskPerformance,
    untouched: untouched.map((contact) => ({
      contactId: contact.contactId,
      name: contact.name,
      company: contact.company,
      ownerName: contact.ownerName,
      lastActivityAt: contact.lastActivityAt ? contact.lastActivityAt.toISOString() : null,
    })),
    emailActivity,
    attachments,
  }
}

export async function loadMyContactRadarSnapshot(
  scope: ContactAnalyticsScope,
  staleWindowDays = DEFAULT_STALE_WINDOW_DAYS,
): Promise<MyContactRadarSnapshot> {
  const [summary, tasks, mentions, stale] = await Promise.all([
    getMyContactSummary(scope),
    getMyTaskSnapshot(scope),
    getMyMentionFeed(scope),
    getMyStaleContacts(scope, staleWindowDays),
  ])

  return {
    summary,
    tasks,
    mentions: mentions.map((mention) => ({
      contactId: mention.contactId,
      contactName: mention.contactName,
      mentionedBy: mention.mentionedBy,
      noteExcerpt: mention.noteExcerpt,
      createdAt: mention.createdAt.toISOString(),
    })),
    stale: stale.map((entry) => ({
      contactId: entry.contactId,
      name: entry.name,
      company: entry.company,
      lastActivityAt: entry.lastActivityAt ? entry.lastActivityAt.toISOString() : null,
    })),
  }
}
