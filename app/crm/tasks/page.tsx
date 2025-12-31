import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getCrmTasks } from '@/lib/crm/tasks'

function describeStatus(status: 'open' | 'completed', dueDate: Date | null) {
  if (status === 'completed') {
    return 'Completed'
  }

  if (dueDate) {
    const diff = formatDistanceToNow(new Date(dueDate), { addSuffix: true })
    return `Due ${diff}`
  }

  return 'Open'
}

export default async function CrmTasksPage() {
  const session = await auth()

  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/tasks')
  }

  const tasks = await getCrmTasks(session.user.companyId, session.user.id)

  return (
    <div className="px-6 py-8">
      {/* HubSpot-Style Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">ℹ️</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Tasks are created from contact profiles</p>
            <p className="text-sm text-blue-700">
              In HubSpot-style CRM, all work happens on the contact record. Go to a{' '}
              <Link href="/contacts" className="underline hover:text-blue-900">
                contact profile
              </Link>
              {' '}to create tasks, log calls, send emails, and add notes.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Your tasks</h1>
              <p className="text-sm text-slate-600">Tasks assigned to you across all contacts</p>
            </div>
            <Link
              href="/contacts"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Contacts
            </Link>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left">Task</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">No tasks assigned to you.</p>
                    <Link href="/contacts" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                      Browse contacts to create tasks →
                    </Link>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {task.contactId ? (
                        <Link href={`/contacts/${task.contactId}`} className="font-semibold text-blue-600 hover:text-blue-700">
                          {task.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900">{task.title}</span>
                      )}
                      <p className="text-xs text-slate-500">#{task.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {task.contactId ? (
                        <Link href={`/contacts/${task.contactId}`} className="text-sm text-blue-600 hover:text-blue-700">
                          {task.contactName}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-600">{task.contactName}</span>
                      )}
                      {task.dealName ? <p className="text-xs text-slate-500">Deal: {task.dealName}</p> : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${task.status === 'completed' ? 'text-green-600' : task.dueDate && new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                        {describeStatus(task.status, task.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
