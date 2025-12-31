import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { normalizeRole } from '@/lib/analytics/contactAnalytics'
import { loadMyContactRadarSnapshot } from '@/lib/dashboard/contactSnapshots'
import { loadStandardSettings, mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'
import { UserShell } from '@/components/shells/user-shell'
import { StandardSettingsQuickLinks } from '@/app/dashboard/_components/standard-settings-quick-links'
import { prisma } from '@/lib/prisma'

export default async function UserDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?from=/dashboard/user')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const rawRole = (session.user.role as string | undefined) ?? 'user'
  if (rawRole.toLowerCase() !== 'user') {
    redirect(resolveRoleDestination(rawRole))
  }

  const normalizedRole = normalizeRole(rawRole)

  const [standardSettingsRecord, contactRadar, userMetrics] = await Promise.all([
    loadStandardSettings(session.user.companyId),
    loadMyContactRadarSnapshot({ companyId: session.user.companyId, userId: session.user.id, role: normalizedRole }),
    loadUserDashboardMetrics(session.user.id, session.user.companyId),
  ])

  const standardSettings = mapStandardSettingsToSnapshot(standardSettingsRecord)

  return (
    <UserShell companyLogoUrl={null} userName={session.user.name ?? session.user.email ?? undefined}>
      <div className="space-y-8 px-6 pb-12 pt-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Your Dashboard</h1>
          <p className="text-sm text-slate-600">Personal workspace for your contacts and deals</p>
        </header>

        <StandardSettingsQuickLinks snapshot={standardSettings} role="user" />

        {/* Task Urgency */}
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard 
            label="Tasks due today" 
            value={userMetrics.tasksDueToday} 
            helper="Urgent"
            color="red"
          />
          <MetricCard 
            label="Overdue tasks" 
            value={userMetrics.overdueTasks} 
            helper="Immediate attention"
            color="orange"
          />
          <MetricCard 
            label="Due this week" 
            value={userMetrics.tasksDueThisWeek} 
            helper="Plan ahead"
            color="blue"
          />
        </section>

        {/* Contacts + Activity */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ContactsNeedingAttention 
            staleContacts={contactRadar.stale} 
            totalStale={contactRadar.summary.myContactsWithNoActivity}
          />
          <RecentActivityCard 
            activities={userMetrics.recentActivities}
          />
        </section>

        {/* Email Sent (last 7 days) */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">Last 7 days</p>
            </div>
            <Link href="/crm/email" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View inbox
            </Link>
          </div>
          <div className="mt-4 text-4xl font-bold text-slate-900">{userMetrics.emailsSentLast7Days}</div>
          <p className="text-sm text-slate-500">Emails sent from your account</p>
        </section>

        {/* Deal Pipeline Status (NO PRICING) */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Deals</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">Your pipeline</p>
            </div>
            <Link href="/crm/deals" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all deals
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <DealStatusCard 
              label="Draft" 
              count={userMetrics.dealsDraft}
              deals={userMetrics.draftDeals}
            />
            <DealStatusCard 
              label="Submitted" 
              count={userMetrics.dealsSubmitted}
              deals={userMetrics.submittedDeals}
            />
            <DealStatusCard 
              label="Approved" 
              count={userMetrics.dealsApproved}
              deals={userMetrics.approvedDeals}
            />
            <DealStatusCard 
              label="Returned" 
              count={userMetrics.dealsReturned}
              deals={userMetrics.returnedDeals}
            />
          </div>
        </section>

        {/* Recent Tasks */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tasks</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">Recent & upcoming</p>
            </div>
            <Link href="/crm/tasks" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all tasks
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm text-red-600">Due today</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{contactRadar.tasks.tasksDueToday}</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-sm text-orange-600">Overdue</p>
              <p className="mt-2 text-3xl font-bold text-orange-700">{contactRadar.tasks.tasksOverdue}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-blue-600">This week</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{contactRadar.tasks.tasksDueThisWeek}</p>
            </div>
          </div>
        </section>
      </div>
    </UserShell>
  )
}

// Server-side data loader (NO ESTIMATES/PRICING)
async function loadUserDashboardMetrics(userId: string, companyId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const weekFromNow = new Date()
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    tasksDueToday,
    overdueTasks,
    tasksDueThisWeek,
    emailsSent,
    draftDeals,
    submittedDeals,
    approvedDeals,
    returnedDeals,
    recentActivities,
  ] = await Promise.all([
    // Tasks due today
    prisma.task.count({
      where: {
        assignedToId: userId,
        completed: false,
        contact: { companyId },
        dueDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Overdue tasks
    prisma.task.count({
      where: {
        assignedToId: userId,
        completed: false,
        contact: { companyId },
        dueDate: { lt: today },
      },
    }),
    // Tasks due this week
    prisma.task.count({
      where: {
        assignedToId: userId,
        completed: false,
        contact: { companyId },
        dueDate: {
          gte: today,
          lt: weekFromNow,
        },
      },
    }),
    // Emails sent (last 7 days)
    prisma.email.count({
      where: {
        companyId,
        authorId: userId,
        direction: 'OUTBOUND',
        sentAt: { gte: sevenDaysAgo },
      },
    }),
    // Draft deals
    prisma.deal.findMany({
      where: {
        companyId,
        createdById: userId,
        stage: 'New',
      },
      select: {
        id: true,
        name: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
    // Submitted deals
    prisma.deal.findMany({
      where: {
        companyId,
        createdById: userId,
        sentToEstimatingAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
    // Approved deals
    prisma.deal.findMany({
      where: {
        companyId,
        createdById: userId,
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
    // Returned deals
    prisma.deal.findMany({
      where: {
        companyId,
        createdById: userId,
        stage: 'Lost',
      },
      select: {
        id: true,
        name: true,
        contact: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
    // Recent activities
    prisma.activity.findMany({
      where: {
        companyId,
        userId,
      },
      select: {
        id: true,
        type: true,
        subject: true,
        createdAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    tasksDueToday,
    overdueTasks,
    tasksDueThisWeek,
    emailsSentLast7Days: emailsSent,
    dealsDraft: draftDeals.length,
    dealsSubmitted: submittedDeals.length,
    dealsApproved: approvedDeals.length,
    dealsReturned: returnedDeals.length,
    draftDeals,
    submittedDeals,
    approvedDeals,
    returnedDeals,
    recentActivities,
  }
}

// UI Components
function MetricCard({ label, value, helper, color }: { label: string; value: number; helper: string; color: 'red' | 'orange' | 'blue' }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  return (
    <div className={`rounded-2xl border border-slate-200 p-4 ${colorClasses[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
      <p className="text-sm opacity-90">{helper}</p>
    </div>
  )
}

function ContactsNeedingAttention({ staleContacts, totalStale }: { staleContacts: any[]; totalStale: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contacts</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Needing attention</p>
        </div>
        <Link href="/contacts" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all
        </Link>
      </div>
      {staleContacts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">All contacts have recent activity</p>
      ) : (
        <div className="mt-4 space-y-2">
          {staleContacts.slice(0, 5).map((contact) => (
            <Link 
              key={contact.contactId} 
              href={`/contacts/${contact.contactId}`}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                <p className="text-xs text-slate-500">{contact.company || 'No company'}</p>
              </div>
              <p className="text-xs text-slate-500">
                {contact.lastActivityAt ? new Date(contact.lastActivityAt).toLocaleDateString() : 'No activity'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function RecentActivityCard({ activities }: { activities: any[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Activity</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Recent</p>
        </div>
      </div>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No recent activity</p>
      ) : (
        <div className="mt-4 space-y-2">
          {activities.map((activity) => (
            <Link 
              key={activity.id}
              href={`/contacts/${activity.contact.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{activity.contact.name}</p>
                <p className="text-xs text-slate-600">{activity.type}</p>
              </div>
              <p className="text-xs text-slate-500">
                {new Date(activity.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function DealStatusCard({ label, count, deals }: { label: string; count: number; deals: any[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <span className="text-xs text-slate-500">{count}</span>
      </div>
      {deals.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">None</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {deals.slice(0, 3).map((deal) => (
            <li key={deal.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <Link href={`/crm/deals/${deal.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                {deal.dealName}
              </Link>
              <p className="text-xs text-slate-500">{deal.contact.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
