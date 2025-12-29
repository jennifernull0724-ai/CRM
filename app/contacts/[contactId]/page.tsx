import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getContactWorkspace } from '@/lib/contacts/workspace'
import {
  completeContactTaskAction,
  createContactNoteAction,
  createContactTaskAction,
  sendContactEmailAction,
  logContactCallAction,
  logContactCustomActivityAction,
  logContactMeetingAction,
  logContactSocialAction,
  updateContactTaskAction,
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
                      const mentionIds = parseMentionIds(note.mentions)
                      const mentionedUsers = mentionIds
                        .map((id) => mentionLookup.get(id))
                        .filter(Boolean)

                      return (
                        <article key={note.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                          <div
                            className="prose prose-invert max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(note.content) }}
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>{note.createdBy?.name ?? 'Unknown actor'}</span>
                            <span>·</span>
                            <span>{formatRelative(note.createdAt)}</span>
                            {mentionedUsers.length > 0 && (
                              <span className="inline-flex flex-wrap gap-2">
                                {mentionedUsers.map((user) => (
                                  <span key={user!.id} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                                    @{user!.name}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            </section>

            <ManualActivityPanel
              logCall={logCall}
              logMeeting={logMeeting}
              logSocial={logSocial}
              logCustom={logCustom}
            />

            <TimelinePanel
              contactId={contact.id}
              timeline={workspace.timeline}
              timelineTypes={timelineTypes}
            />
          </div>

          <div className="space-y-6">
            <EmailShell integration={workspace.emailIntegration} contact={contact} />
            <RelatedObjectsPanel
              deals={workspace.deals}
              estimates={workspace.estimates}
              workOrders={workspace.workOrders}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: number
  helper: string
  tone: 'emerald' | 'amber' | 'violet'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : 'text-indigo-300'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-4">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  )
}

type ActionState = import('@/app/contacts/actions').ActionState

type TaskPanelProps = {
  tasks: Array<{
    id: string
    title: string
    dueDate: Date | null
    priority: string
    notes: string | null
    assignedTo?: { id: string; name: string; email: string | null }
    createdAt: Date
  }>
  completedTasks: TaskPanelProps['tasks']
  overdueTasks: number
  users: Array<{ id: string; name: string }>
  createAction: (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  updateAction: (
    taskId: string
  ) => (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  completeAction: (
    taskId: string
  ) => (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
}

function TasksPanel({ tasks, completedTasks, overdueTasks, users, createAction, updateAction, completeAction }: TaskPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Tasks</p>
          <h2 className="text-2xl font-semibold text-white">Execution queue</h2>
        </div>
        <div className="text-xs text-rose-300">{overdueTasks} overdue</div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <form action={createAction} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Create task</p>
          <input name="title" placeholder="Task title" className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100" required />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">
              Due date
              <input type="date" name="dueDate" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100" />
            </label>
            <label className="text-xs text-slate-400">
              Priority
              <select name="priority" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
          <label className="text-xs text-slate-400">
            Assign owner
            <select name="ownerId" className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
              <option value="">Me</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <textarea
            name="notes"
            placeholder="Internal notes"
            className="h-24 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
          />
          <button type="submit" className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900">
            Save task
          </button>
        </form>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">No open tasks.</p>
          ) : (
            tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-white">{task.title}</p>
                    <p className="text-xs text-slate-500">
                      Due {task.dueDate ? formatRelative(task.dueDate) : 'No due date'} · {task.priority}
                    </p>
                  </div>
                  <form action={completeAction(task.id)}>
                    <button className="rounded-full border border-emerald-300/50 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-400/10">
                      Mark complete
                    </button>
                  </form>
                </div>
                {task.notes && <p className="mt-2 text-sm text-slate-400">{task.notes}</p>}
                <details className="mt-3 rounded-2xl border border-slate-800">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-slate-400">Edit task</summary>
                  <form action={updateAction(task.id)} className="space-y-2 px-3 py-2 text-sm">
                    <input name="title" defaultValue={task.title} className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
                    <div className="grid gap-2 md:grid-cols-2">
                      <input type="date" name="dueDate" defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
                      <select name="priority" defaultValue={task.priority} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <select name="ownerId" defaultValue={task.assignedTo?.id ?? ''} className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1">
                      <option value="">Keep current owner</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    <textarea name="notes" defaultValue={task.notes ?? ''} className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
                    <button className="w-full rounded-2xl bg-slate-800/70 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">
                      Update task
                    </button>
                  </form>
                </details>
              </article>
            ))
          )}
          {completedTasks.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              <p className="mb-2 font-semibold text-slate-200">Recently completed</p>
              <ul className="space-y-1">
                {completedTasks.map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ManualActivityPanel({
  logCall,
  logMeeting,
  logSocial,
  logCustom,
}: {
  logCall: (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  logMeeting: (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  logSocial: (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  logCustom: (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Manual activities</p>
      <h2 className="text-2xl font-semibold text-white">Log the touch</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form action={logCall} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Call</p>
          <div className="grid gap-2 md:grid-cols-2">
            <select name="direction" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1">
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
            <input type="number" name="duration" min={0} placeholder="Duration (min)" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          </div>
          <input name="result" placeholder="Outcome" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" required />
          <input type="datetime-local" name="happenedAt" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <textarea name="notes" placeholder="Notes" className="h-16 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <button className="w-full rounded-2xl bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">Log call</button>
        </form>

        <form action={logMeeting} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meeting</p>
          <select name="meetingType" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1">
            <option value="DISCOVERY">Discovery</option>
            <option value="REVIEW">Review</option>
            <option value="SITE_VISIT">Site visit</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="datetime-local" name="scheduledFor" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <input type="number" name="duration" min={0} placeholder="Duration (min)" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <input name="attendees" placeholder="Attendees (comma separated)" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <input name="outcome" placeholder="Outcome" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <textarea name="notes" placeholder="Notes" className="h-16 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <button className="w-full rounded-2xl bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">Log meeting</button>
        </form>

        <form action={logSocial} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Social touch</p>
          <select name="platform" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1">
            <option value="LINKEDIN">LinkedIn</option>
            <option value="X">X</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FIELD">Field</option>
            <option value="OTHER">Other</option>
          </select>
          <input name="action" placeholder="Action" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" required />
          <input type="datetime-local" name="occurredAt" className="rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <textarea name="notes" placeholder="Notes" className="h-16 rounded-2xl border border-slate-800 bg-slate-900/70 px-2 py-1" />
          <button className="w-full rounded-2xl bg-slate-800/80 px-3 py-2 text-xs uppercase tracking-wide text-slate-200">Log touch</button>
        </form>

        <form action={logCustom} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
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

function TimelinePanel({
  contactId,
  timeline,
  timelineTypes,
}: {
  contactId: string
  timeline: Array<{
    id: string
    type: string
    subject: string
    description: string | null
    createdAt: Date
    user?: { name: string | null } | null
  }>
  timelineTypes: string[]
}) {
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
                  <span>{formatRelative(activity.createdAt)}</span>
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

async function EmailShell({
  integration,
  contact,
}: {
  integration: { provider: string; status: string } | null
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}) {
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

  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    return null
  }

  const composerData = await loadContactEmailComposerData({
    companyId: session.user.companyId,
    userId: session.user.id,
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
  const sendEmail = (state: ActionState, formData: FormData) => sendContactEmailAction(contact.id, state, formData)

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Email</p>
        <h2 className="text-2xl font-semibold text-white">Workspace inbox</h2>
        <p className="text-xs text-slate-500">{integration.provider} · {integration.status}</p>
      </div>
      <div className="mt-4">
        <ContactEmailComposer
          action={sendEmail}
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

function RelatedObjectsPanel({
  deals,
  estimates,
  workOrders,
}: {
  deals: Array<{ id: string; name: string; stage: string; value: number | null }>
  estimates: Array<{ id: string; quoteNumber: string; status: string }>
  workOrders: Array<{ id: string; title: string; status: string }>
}) {
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

function RelatedCard({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: ReactNode[]
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{title}</p>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? items : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </section>
  )
}
import Link from 'next/link'
              {contact.company && (
                <p className="text-lg text-gray-600 mb-2">{contact.company.name}</p>
              )}
              <div className="flex gap-4 text-sm text-gray-500">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="hover:text-blue-600">
                    {contact.phone}
                  </a>
                )}
              </div>
              {contact.owner && (
                <p className="text-sm text-gray-500 mt-2">
                  Owner: <span className="font-medium">{contact.owner.name}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/contacts/${contact.id}/edit`}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium"
              >
                Edit Contact
              </Link>
              <Link
                href={`/deals/new?contactId=${contact.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                + New Deal
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tasks */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Tasks
                    {overdueTasks.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-red-600">
                        ({overdueTasks.length} overdue)
                      </span>
                    )}
                  </h2>
                  <Link
                    href={`/contacts/${contact.id}/tasks/new`}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Add Task
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {contact.tasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No open tasks</p>
                ) : (
                  <div className="space-y-3">
                    {contact.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded border ${
                          task.dueDate && task.dueDate < new Date()
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className="text-sm text-gray-500 mt-1">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
                  <Link
                    href={`/contacts/${contact.id}/notes/new`}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    + Add Note
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {contact.notes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  <div className="space-y-4">
                    {contact.notes.map((note) => (
                      <div key={note.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {note.createdBy?.name} •{' '}
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
              </div>
              <div className="p-6">
                {contact.activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-4">
                    {contact.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{activity.subject}</p>
                          {activity.description && (
                            <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {activity.user?.name} • {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Deals */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Deals</h2>
              </div>
              <div className="p-6">
                {contact.deals.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No deals yet</p>
                ) : (
                  <div className="space-y-3">
                    {contact.deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        className="block p-3 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <h3 className="font-medium text-gray-900">{deal.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Stage: {deal.stage}</p>
                        {deal.value && (
                          <p className="text-sm text-gray-600">
                            ${deal.value.toLocaleString()}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/contacts/${contact.id}/activity/call`}
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded text-center hover:bg-blue-700"
                >
                  Log Call
                </Link>
                <Link
                  href={`/contacts/${contact.id}/activity/meeting`}
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded text-center hover:bg-green-700"
                >
                  Log Meeting
                </Link>
                <Link
                  href={`/contacts/${contact.id}/email`}
                  className="block w-full bg-purple-600 text-white px-4 py-2 rounded text-center hover:bg-purple-700"
                >
                  Send Email
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
