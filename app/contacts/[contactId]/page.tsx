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

type PageProps = {
  params: { contactId: string }
  searchParams?: SearchParams
}

export default async function ContactDetailPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    redirect(`/login?from=/contacts/${params.contactId}`)
  }

  const timelineTypes = normalizeTimelineFilters(searchParams?.timelineType)
  const workspace = await getContactWorkspace(
    params.contactId,
    session.user.companyId,
    {
      types: timelineTypes,
      limit: 75,
    },
    {
      userId: session.user.id,
      role: session.user.role ?? 'user',
    }
  )

  if (!workspace) {
    notFound()
  }

  const { contact } = workspace
  const openTasks = workspace.tasks.filter((task) => !task.completed)
  const completedTasks = workspace.tasks.filter((task) => task.completed).slice(0, 5)
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < new Date()).length
  const mentionableUsers = workspace.workspaceUsers.map((user) => ({
    id: user.id,
    name: user.name ?? 'Workspace user',
    role: user.role ?? 'user',
    email: user.email,
  }))
  const mentionLookup = new Map(workspace.workspaceUsers.map((user) => [user.id, user]))

  const noteComposerAction = (state: ActionState, formData: FormData) => createContactNoteAction(contact.id, state, formData)
  const createTask = (state: ActionState | FormData, formData?: FormData) => createContactTaskAction(contact.id, state, formData)
  const updateTask = (taskId: string) => (state: ActionState | FormData, formData?: FormData) => updateContactTaskAction(contact.id, taskId, state, formData)
  const completeTask = (taskId: string) => (state: ActionState | FormData, formData?: FormData) => completeContactTaskAction(contact.id, taskId, state, formData)
  const logCall = (state: ActionState | FormData, formData?: FormData) => logContactCallAction(contact.id, state, formData)
  const logMeeting = (state: ActionState | FormData, formData?: FormData) => logContactMeetingAction(contact.id, state, formData)
  const logSocial = (state: ActionState | FormData, formData?: FormData) => logContactSocialAction(contact.id, state, formData)
  const logCustom = (state: ActionState | FormData, formData?: FormData) => logContactCustomActivityAction(contact.id, state, formData)
  const sendEmail = (state: ActionState, formData: FormData) => sendContactEmailAction(contact.id, state, formData)

  const ownerName = contact.owner?.name ?? 'Unassigned'
  const companyLabel = contact.companyOverrideName ?? contact.derivedCompanyName
  const lastActivityLabel = contact.lastActivityAt
    ? formatDistanceToNow(new Date(contact.lastActivityAt), { addSuffix: true })
    : 'Never'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Contact</p>
              <h1 className="text-3xl font-semibold text-white">
                {contact.firstName} {contact.lastName}
              </h1>
              <p className="text-sm text-slate-400">
                {contact.jobTitle ?? 'No title'} · {companyLabel || 'Unknown company'}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-emerald-300">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="hover:text-emerald-300">
                    {contact.phone}
                  </a>
                )}
                <span>Owner · {ownerName}</span>
                <span>Status · {contact.activityState}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Open tasks" value={workspace.stats.openTasks} helper="Assigned to this contact" tone="emerald" />
              <Metric label="Overdue" value={workspace.stats.overdueTasks} helper="Tasks past due" tone="amber" />
              <Metric label="Last activity" value={lastActivityLabel} helper="Timeline touch" tone="violet" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <TasksPanel
              tasks={openTasks}
              completedTasks={completedTasks}
              overdueTasks={overdueTasks}
              users={workspace.workspaceUsers.map((user) => ({ id: user.id, name: user.name ?? 'Workspace user' }))}
              createAction={createTask}
              updateAction={updateTask}
              completeAction={completeTask}
            />

            <NotesPanel
              notes={workspace.notes}
              mentionLookup={mentionLookup}
              mentionableUsers={mentionableUsers}
              action={noteComposerAction}
            />

            <ManualActivityPanel logCall={logCall} logMeeting={logMeeting} logSocial={logSocial} logCustom={logCustom} />

            <TimelinePanel contactId={contact.id} timeline={workspace.timeline} timelineTypes={timelineTypes} />
          </div>

          <div className="space-y-6">
            <EmailShell
              integration={workspace.emailIntegration}
              contact={{ id: contact.id, firstName: contact.firstName, lastName: contact.lastName, email: contact.email }}
              userContext={{ companyId: session.user.companyId, userId: session.user.id }}
              action={sendEmail}
            />
            <RelatedObjectsPanel deals={workspace.deals} estimates={workspace.estimates} workOrders={workspace.workOrders} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, helper, tone }: { label: string; value: string | number; helper: string; tone: 'emerald' | 'amber' | 'violet' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : 'text-indigo-300'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  )
}

type NotesPanelProps = {
  notes: Array<{
    id: string
    content: string
    mentions: string | null
    createdAt: Date
    createdBy: { name: string | null } | null
  }>
  mentionableUsers: Array<{ id: string; name: string; role: string; email?: string | null }>
  mentionLookup: Map<string, { id: string; name: string | null }>
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
}

function NotesPanel({ notes, mentionableUsers, mentionLookup, action }: NotesPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Notes</p>
          <h2 className="text-2xl font-semibold text-white">Shared context</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">No notes yet.</p>
          ) : (
            notes.map((note) => {
              const mentionIds = parseMentionIds(note.mentions)
              const mentionedUsers = mentionIds.map((id) => mentionLookup.get(id)).filter(Boolean)

              return (
                <article key={note.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <div
                    className="prose prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitizeNoteBody(note.content) }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{note.createdBy?.name ?? 'Unknown actor'}</span>
                    <span>·</span>
                    <span>{formatRelativeSafe(note.createdAt)}</span>
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
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Compose</p>
          <div className="mt-3">
            <NoteComposer action={action} mentionableUsers={mentionableUsers} />
          </div>
        </div>
      </div>
    </section>
  )
}

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
  updateAction: (taskId: string) => (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
  completeAction: (taskId: string) => (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>
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
                    <p className="text-xs text-slate-500">Due {task.dueDate ? formatRelativeSafe(task.dueDate) : 'No due date'} · {task.priority}</p>
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

type ManualPanelAction = (stateOrFormData: ActionState | FormData, formData?: FormData) => Promise<ActionState>

function ManualActivityPanel({ logCall, logMeeting, logSocial, logCustom }: { logCall: ManualPanelAction; logMeeting: ManualPanelAction; logSocial: ManualPanelAction; logCustom: ManualPanelAction }) {
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
