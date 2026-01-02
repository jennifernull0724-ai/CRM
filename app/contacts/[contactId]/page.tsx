import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow, formatRelative } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getContactWorkspace } from '@/lib/contacts/workspace'
import {
  completeContactTaskAction,
  createContactNoteAction,
  createContactTaskAction,
  logContactCallAction,
  logContactCustomActivityAction,
  logContactMeetingAction,
  logContactSocialAction,
  sendContactEmailAction,
  updateContactTaskAction,
  type ActionState,
} from '@/app/contacts/actions'
import { NoteComposer } from '@/app/contacts/[contactId]/_components/note-composer'
import { ContactEmailComposer } from '@/app/contacts/[contactId]/_components/contact-email-composer'
import { sanitizeNoteBody } from '@/lib/contacts/noteRichText'
import { loadContactEmailComposerData } from '@/lib/contacts/emailComposer'

export const dynamic = 'force-dynamic'

const TIMELINE_FILTERS = [
  { label: 'Contact', value: 'CONTACT_CREATED' },
  { label: 'Task created', value: 'TASK_CREATED' },
  { label: 'Task updated', value: 'TASK_UPDATED' },
  { label: 'Task completed', value: 'TASK_COMPLETED' },
  { label: 'Note', value: 'NOTE_ADDED' },
  { label: 'Call', value: 'CALL_LOGGED' },
  { label: 'Meeting', value: 'MEETING_LOGGED' },
  { label: 'Social', value: 'SOCIAL_LOGGED' },
  { label: 'Custom', value: 'CUSTOM_ACTIVITY_LOGGED' },
  { label: 'Deal', value: 'DEAL_CREATED' },
]

const DEFAULT_TIMELINE_TYPES = TIMELINE_FILTERS.map((filter) => filter.value)

type SearchParams = Record<string, string | string[] | undefined>

type WorkspaceUser = {
  id: string
  name: string | null
  role?: string | null
  email?: string | null
}

type PageProps = {
  import { notFound, redirect } from 'next/navigation'
  import { getServerSession } from 'next-auth'
  import { format, formatDistanceToNow } from 'date-fns'
  import { authOptions } from '@/lib/auth'
  import { prisma } from '@/lib/prisma'
  import { AppLayout } from '@/ui/layouts/AppLayout'
  import { GlobalHeader } from '@/ui/app-shell/GlobalHeader'
  import { PrimaryNavRail } from '@/ui/app-shell/PrimaryNavRail'
  import { ObjectSubNav } from '@/ui/app-shell/ObjectSubNav'
  import { PrimaryNavItem } from '@/ui/navigation/PrimaryNavItem'
  import { ActiveRouteIndicator } from '@/ui/navigation/ActiveRouteIndicator'
  import { RecordPageLayout } from '@/ui/layouts/RecordPageLayout'
  import { ObjectHeader } from '@/ui/objects/ObjectHeader'
  import { PropertySection } from '@/ui/objects/PropertySection'
  import { AssociationPanel } from '@/ui/objects/AssociationPanel'
  import { ObjectEmptyState } from '@/ui/objects/ObjectEmptyState'
  import { ActivityTimelineLayout } from '@/ui/layouts/ActivityTimelineLayout'
  import { ActivityTimeline } from '@/ui/activity/ActivityTimeline'
  import { ActivityItemShell } from '@/ui/activity/ActivityItemShell'
  import { ActivityComposer } from '@/ui/activity/ActivityComposer'
  import { ActivityEmptyState } from '@/ui/activity/ActivityEmptyState'
  import { Pill } from '@/ui/primitives/Pill'
  import { Card } from '@/ui/primitives/Card'
  import { ScrollContainer } from '@/ui/primitives/ScrollContainer'
  import { ActivityComposerForm } from './activity-composer-form'

  export const dynamic = 'force-dynamic'

  type PageProps = {
    params: { contactId: string }
  }

  const primaryNav = [
    { label: 'Contacts', href: '/contacts' },
    { label: 'Companies', href: '/companies' },
    { label: 'Deals', href: '/deals' },
    { label: 'Tickets', href: '/tickets' },
    { label: 'Reports', href: '/reports' },
    { label: 'Automation', href: '/automation' },
    { label: 'Settings', href: '/settings' },
  ]

  export default async function ContactDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      redirect(`/login?from=/contacts/${params.contactId}`)
    }

    const contact = await prisma.contact.findFirst({
      where: { id: params.contactId, companyId: session.user.companyId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })

    if (!contact) {
      notFound()
    }

    const activities = await prisma.activity.findMany({
      where: { contactId: contact.id, companyId: session.user.companyId },
      orderBy: [
        { occurredAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 120,
    })

    const timelineGroups = groupActivitiesByDay(activities)
    const latestActivity = activities[0]
    const lastActivityLabel = latestActivity
      ? formatDistanceToNow(latestActivity.occurredAt ?? latestActivity.createdAt, { addSuffix: true })
      : 'No activity yet'

    return (
      <AppLayout
        header={<GlobalHeader leftSlot={<span className="text-sm font-semibold text-slate-800">Contacts</span>} rightSlot={<Pill tone="accent">Contact record</Pill>} />}
        primaryNav={
          <PrimaryNavRail>
            {primaryNav.map((item) => (
              <div key={item.label} className="grid grid-cols-[6px_1fr] items-center gap-2 px-2">
                <ActiveRouteIndicator isActive={item.href.startsWith('/contacts')} />
                <PrimaryNavItem label={item.label} isActive={item.href.startsWith('/contacts')} />
              </div>
            ))}
          </PrimaryNavRail>
        }
        subNav={
          <ObjectSubNav>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">Record</span>
            <span className="text-xs text-slate-500">Timeline</span>
            <span className="text-xs text-slate-500">Associations</span>
          </ObjectSubNav>
        }
      >
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <RecordPageLayout
            header={
              <ObjectHeader
                titleSlot={
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Contact</div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {contact.firstName} {contact.lastName}
                    </div>
                  </div>
                }
                metaSlot={
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    {contact.email ? <span>{contact.email}</span> : <span>No email</span>}
                    <span className="text-slate-300">·</span>
                    <span>Owner: {contact.owner?.name ?? 'Unassigned'}</span>
                    <span className="text-slate-300">·</span>
                    <span>Last activity: {lastActivityLabel}</span>
                  </div>
                }
                actionSlot={<Pill>Activity state: {contact.activityState}</Pill>}
              />
            }
            leftColumn={
              <div className="space-y-4">
                <PropertySection title="Primary details">
                  <DetailField label="Email" value={contact.email} />
                  <DetailField label="Phone" value={contact.phone} />
                  <DetailField label="Mobile" value={contact.mobile} />
                  <DetailField label="Job title" value={contact.jobTitle} />
                </PropertySection>

                <PropertySection title="Ownership">
                  <DetailField label="Owner" value={contact.owner?.name ?? 'Unassigned'} />
                  <DetailField label="Created" value={format(contact.createdAt, 'PP p')} />
                  <DetailField label="Updated" value={format(contact.updatedAt, 'PP p')} />
                  <DetailField label="Archived" value={contact.archived ? 'Yes' : 'No'} />
                </PropertySection>
              </div>
            }
            rightColumn={
              <ActivityTimelineLayout
                composer={
                  <ActivityComposer
                    header={<div className="text-sm font-semibold text-slate-800">Log activity</div>}
                    footer={<div className="flex justify-end text-xs text-slate-500">Commands emit Activities only</div>}
                  >
                    <ActivityComposerForm contactId={contact.id} />
                  </ActivityComposer>
                }
                timeline={
                  <ActivityTimeline>
                    {timelineGroups.length === 0 ? (
                      <ActivityEmptyState />
                    ) : (
                      <ScrollContainer height={420}>
                        <div className="space-y-4">
                          {timelineGroups.map((group) => (
                            <Card key={group.label} padding="p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</div>
                              <div className="space-y-2">
                                {group.items.map((item) => (
                                  <ActivityItemShell key={item.id}>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      <span>{item.type}</span>
                                      <span>{format(item.occurredAt ?? item.createdAt, 'p')}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">{item.subject}</div>
                                    {item.description ? (
                                      <p className="text-sm text-slate-600">{item.description}</p>
                                    ) : null}
                                  </ActivityItemShell>
                                ))}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </ScrollContainer>
                    )}
                  </ActivityTimeline>
                }
                associations={
                  <AssociationPanel title="Associations">
                    <ObjectEmptyState />
                  </AssociationPanel>
                }
              />
            }
          />
        </div>
      </AppLayout>
    )
  }

  type ActivityProjection = { id: string; occurredAt: Date; createdAt: Date; type: string; subject: string; description: string | null }

  function groupActivitiesByDay(activities: ActivityProjection[]) {
    const groups: Array<{ label: string; items: ActivityProjection[] }> = []

    for (const activity of activities) {
      const dayKey = format(activity.occurredAt ?? activity.createdAt, 'yyyy-MM-dd')
      const label = format(activity.occurredAt ?? activity.createdAt, 'PPP')
      const existing = groups.find((group) => group.label === label)
      if (existing) {
        existing.items.push(activity)
      } else {
        groups.push({ label, items: [activity] })
      }
    }

    return groups
  }

  function DetailField({ label, value }: { label: string; value?: string | null }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <div className="mt-1 text-slate-800">{value && value.length > 0 ? value : 'Not set'}</div>
      </div>
    )
  }
            <option value="FIELD">Field</option>
            <option value="OTHER">Other</option>
          </select>
          <input name="action" placeholder="Action" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" required />
          <input type="datetime-local" name="occurredAt" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <textarea name="notes" placeholder="Notes" className="h-16 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <button className="w-full rounded-2xl bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">Log touch</button>
        </form>

        <form action={bindAction(logCustom)} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom</p>
          <input name="description" placeholder="Description" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" required />
          <input type="datetime-local" name="occurredAt" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <textarea name="notes" placeholder="Notes" className="h-24 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <button className="w-full rounded-2xl bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">Log custom activity</button>
        </form>
      </div>
    </section>
  )
}

type TimelineItem = {
  id: string
  type: string
  subject: string
  description: string | null
  createdAt: Date
  user?: { name: string | null } | null
}

function TimelinePanel({ contactId, timeline, timelineTypes }: { contactId: string; timeline: TimelineItem[]; timelineTypes: string[] }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Activity timeline</p>
          <h2 className="text-2xl font-semibold text-white">Immutable truth</h2>
        </div>
        <p className="text-xs text-slate-500">Server-side filters</p>
      </div>
      <form className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm" method="GET">
        <div className="grid gap-2 md:grid-cols-3">
          {TIMELINE_FILTERS.map((filter) => (
            <label key={filter.value} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2">
              <input type="checkbox" name="timelineType" value={filter.value} defaultChecked={timelineTypes.includes(filter.value)} className="h-4 w-4 rounded border-slate-500 text-emerald-400" />
              <span className="text-xs text-slate-200">{filter.label}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-2xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900">
            Apply filters
          </button>
          <Link href={`/contacts/${contactId}`} className="rounded-2xl border border-slate-700 px-4 py-2 text-xs text-slate-200">
            Reset
          </Link>
        </div>
      </form>
      <div className="mt-6 space-y-4">
        {timeline.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">No activity recorded for the selected filters.</p>
        ) : (
          timeline.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{activity.type}</span>
                  <span>·</span>
                  <span>{formatRelativeSafe(activity.createdAt)}</span>
                  {activity.user?.name && (
                    <>
                      <span>·</span>
                      <span>{activity.user.name}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-base font-medium text-white">{activity.subject}</p>
                {activity.description && <p className="text-sm text-slate-400">{activity.description}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

async function EmailShell({ integration, contact, userContext, action }: { integration: { provider: string; status: string } | null; contact: { id: string; firstName: string; lastName: string; email: string }; userContext: { companyId: string; userId: string }; action: (state: ActionState, formData: FormData) => Promise<ActionState> }) {
  if (!integration) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-400">
          <p>Email composer unlocks once Gmail or Outlook is connected.</p>
          <Link href="/settings/profile" className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200">
            Connect provider
          </Link>
        </div>
      </section>
    )
  }

  if (!contact.email) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <p className="mt-4 text-sm text-slate-400">This contact does not have an email address saved yet.</p>
      </section>
    )
  }

  const composerData = await loadContactEmailComposerData({
    companyId: userContext.companyId,
    userId: userContext.userId,
    contactEmail: contact.email,
  })

  if (!composerData.accounts.length) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-400">
          <p>Your workspace is connected but you still need to authorize at least one personal mailbox.</p>
          <Link href="/settings/profile" className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200">
            Connect mailbox
          </Link>
        </div>
      </section>
    )
  }

  if (composerData.suppressedRecipient) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <div className="mt-4 space-y-3 text-sm text-rose-200">
          <p>
            Sending to {composerData.suppressedRecipient.email} is disabled
            {composerData.suppressedRecipient.reason ? ` (${composerData.suppressedRecipient.reason})` : ''}.
          </p>
          <p className="text-slate-400">Head to settings to re-enable delivery before composing.</p>
          <Link href="/settings/profile" className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200">
            Manage preferences
          </Link>
        </div>
      </section>
    )
  }

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || contact.email
  const defaultTemplateId = composerData.templates.find((template) => template.isDefault)?.id ?? null

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <p className="text-xs text-slate-500">
          {integration.provider} · {integration.status}
        </p>
      </div>
      <div className="mt-4">
        <ContactEmailComposer
          action={action}
          initialTo={contact.email}
          contactName={contactName}
          accountOptions={composerData.accounts}
          templateOptions={composerData.templates}
          defaultTemplateId={defaultTemplateId}
          signature={composerData.signature}
        />
      </div>
    </section>
  )
}

function RelatedObjectsPanel({ deals, estimates, workOrders }: { deals: Array<{ id: string; name: string; stage: string; value: number | null }>; estimates: Array<{ id: string; quoteNumber: string; status: string }>; workOrders: Array<{ id: string; title: string; status: string }> }) {
  return (
    <section className="space-y-4">
      <RelatedCard
        title="Deals"
        empty="No deals yet"
        items={deals.map((deal) => (
          <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <div>
              <p className="font-semibold text-white">{deal.name}</p>
              <p className="text-xs text-slate-500">Stage · {deal.stage}</p>
            </div>
            {deal.value && <p className="text-sm text-slate-300">${deal.value.toLocaleString()}</p>}
          </Link>
        ))}
      />

      <RelatedCard
        title="Estimates"
        empty="No estimates"
        items={estimates.map((estimate) => (
          <div key={estimate.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <p className="font-semibold text-white">Quote #{estimate.quoteNumber}</p>
            <p className="text-xs text-slate-500">Status · {estimate.status}</p>
          </div>
        ))}
      />

      <RelatedCard
        title="Work Orders"
        empty="No work orders"
        items={workOrders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <p className="font-semibold text-white">{order.title}</p>
            <p className="text-xs text-slate-500">Status · {order.status}</p>
          </div>
        ))}
      />
    </section>
  )
}

function RelatedCard({ title, empty, items }: { title: string; empty: string; items: ReactNode[] }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{title}</p>
      <div className="mt-3 space-y-3">{items.length > 0 ? items : <p className="text-sm text-slate-500">{empty}</p>}</div>
    </section>
  )
}

function normalizeTimelineFilters(raw: string | string[] | undefined): string[] {
  if (!raw) {
    return DEFAULT_TIMELINE_TYPES
  }
  const values = Array.isArray(raw) ? raw : [raw]
  const allowed = new Set(DEFAULT_TIMELINE_TYPES)
  const selected = values.map((value) => value.toString()).filter((value) => allowed.has(value))
  return selected.length ? selected : DEFAULT_TIMELINE_TYPES
}

function parseMentionIds(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function formatRelativeSafe(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date
  return formatRelative(target, new Date())
}
