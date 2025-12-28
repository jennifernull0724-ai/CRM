import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ContactDetailPage({
  params,
}: {
  params: { contactId: string }
}) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.contactId },
    include: {
      company: true,
      owner: true,
      deals: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      tasks: {
        where: { completed: false },
        orderBy: { dueDate: 'asc' },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          createdBy: true,
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: true,
        },
      },
    },
  })

  if (!contact) {
    notFound()
  }

  const overdueTasks = contact.tasks.filter(
    (task) => task.dueDate && task.dueDate < new Date()
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {contact.firstName} {contact.lastName}
              </h1>
              {contact.title && (
                <p className="text-lg text-gray-600 mb-1">{contact.title}</p>
              )}
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
