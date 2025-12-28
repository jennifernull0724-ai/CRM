import Link from 'next/link'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export default async function UserDashboard() {
  // Get counts for dashboard metrics
  const [contactsCount, dealsCount, tasksCount, activitiesCount] = await Promise.all([
    prisma.contact.count({ where: { archived: false } }),
    prisma.deal.count(),
    prisma.task.count({ where: { completed: false } }),
    prisma.activity.count(),
  ])

  // Get recent activities
  const recentActivities = await prisma.activity.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      contact: true,
      deal: true,
    },
  })

  // Get tasks due today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tasksDueToday = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      contact: true,
      deal: true,
    },
  })

  // Get overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: {
        lt: today,
      },
    },
    include: {
      contact: true,
      deal: true,
    },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contacts</h3>
          <p className="text-3xl font-bold text-gray-900">{contactsCount}</p>
          <Link href="/contacts" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Deals</h3>
          <p className="text-3xl font-bold text-gray-900">{dealsCount}</p>
          <Link href="/deals" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Open Tasks</h3>
          <p className="text-3xl font-bold text-gray-900">{tasksCount}</p>
          {overdueTasks.length > 0 && (
            <p className="text-sm text-red-600 mt-1">{overdueTasks.length} overdue</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Activities</h3>
          <p className="text-3xl font-bold text-gray-900">{activitiesCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Tasks Due Today
              {tasksDueToday.length > 0 && (
                <span className="ml-2 text-sm font-normal text-blue-600">
                  ({tasksDueToday.length})
                </span>
              )}
            </h2>
          </div>
          <div className="p-6">
            {tasksDueToday.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tasks due today</p>
            ) : (
              <div className="space-y-3">
                {tasksDueToday.map((task) => (
                  <div key={task.id} className="p-3 border border-gray-200 rounded">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.contact && (
                      <p className="text-sm text-gray-600 mt-1">
                        Contact: {task.contact.firstName} {task.contact.lastName}
                      </p>
                    )}
                    {task.deal && (
                      <p className="text-sm text-gray-600 mt-1">Deal: {task.deal.name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-red-600">
                Overdue Tasks ({overdueTasks.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <div key={task.id} className="p-3 border border-red-300 bg-red-50 rounded">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.contact && (
                      <p className="text-sm text-gray-600 mt-1">
                        Contact: {task.contact.firstName} {task.contact.lastName}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className="text-sm text-red-600 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 pb-4 border-b border-gray-200 last:border-0">
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

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/contacts/new"
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 text-center font-medium"
          >
            + New Contact
          </Link>
          <Link
            href="/deals/new"
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 text-center font-medium"
          >
            + New Deal
          </Link>
          <Link
            href="/contacts"
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 text-center font-medium"
          >
            View Contacts
          </Link>
          <Link
            href="/deals"
            className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 text-center font-medium"
          >
            View Pipeline
          </Link>
        </div>
      </div>
    </div>
  )
}
