import { formatDistanceToNow } from 'date-fns'
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
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">CRM Tasks</p>
          <h1 className="text-2xl font-semibold text-slate-900">Assigned work only</h1>
          <p className="text-sm text-slate-500">This list only shows tasks assigned to you. No rollups, no kanban—just the queue you are responsible for.</p>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Name / ID</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Last updated</th>
                <th className="px-6 py-3 text-left">Owner</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    You do not have any assigned tasks.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 text-slate-600">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{task.title}</div>
                      <p className="text-xs text-slate-400">#{task.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{task.contactName}</p>
                      {task.dealName ? <p className="text-xs text-slate-500">Deal · {task.dealName}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{describeStatus(task.status, task.dueDate)}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-slate-900">You</td>
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
