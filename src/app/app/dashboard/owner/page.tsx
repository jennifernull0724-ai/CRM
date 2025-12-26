import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Users,
  CheckSquare,
  Clock,
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity as ActivityIcon,
} from 'lucide-react'

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'OWNER') {
    redirect(`/app/dashboard/${session.user.role.toLowerCase()}`)
  }

  // Fetch dashboard data
  const [
    totalContacts,
    totalUsers,
    totalTasks,
    overdueTasks,
    totalEstimates,
    recentActivity,
    staleContacts,
  ] = await Promise.all([
    prisma.contact.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.task.count({ where: { completed: false } }),
    prisma.task.count({
      where: {
        completed: false,
        dueDate: { lt: new Date() },
      },
    }),
    prisma.estimate.count(),
    prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        user: true,
      },
    }),
    prisma.contact.count({
      where: {
        OR: [
          { lastActivity: null },
          {
            lastActivity: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          },
        ],
      },
    }),
  ])

  const stats = [
    {
      name: 'Total Contacts',
      value: totalContacts,
      icon: Users,
      color: 'blue',
      href: '/app/contacts',
    },
    {
      name: 'Active Users',
      value: totalUsers,
      icon: Users,
      color: 'green',
      href: '/app/settings/admin',
    },
    {
      name: 'Open Tasks',
      value: totalTasks,
      icon: CheckSquare,
      color: 'purple',
      href: '/app/tasks',
    },
    {
      name: 'Overdue Tasks',
      value: overdueTasks,
      icon: AlertTriangle,
      color: 'red',
      href: '/app/tasks?filter=overdue',
    },
    {
      name: 'Total Estimates',
      value: totalEstimates,
      icon: FileText,
      color: 'indigo',
      href: '/app/estimating/queue',
    },
    {
      name: 'Stale Contacts (30d+)',
      value: staleContacts,
      icon: Clock,
      color: 'orange',
      href: '/app/contacts?filter=stale',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back, {session.user.name || 'Owner'}
        </h2>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600',
            red: 'bg-red-100 text-red-600',
            indigo: 'bg-indigo-100 text-indigo-600',
            orange: 'bg-orange-100 text-orange-600',
          }[stat.color]

          return (
            <a
              key={stat.name}
              href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${colorClasses} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </a>
          )
        })}
      </div>

      {/* Contact Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Touch Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Contact Touch Health
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Touched Today</span>
              <span className="font-bold text-green-600">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Touched Last 7 Days</span>
              <span className="font-bold text-blue-600">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Touched Last 30 Days</span>
              <span className="font-bold text-yellow-600">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">No Touch (30+ Days)</span>
              <span className="font-bold text-red-600">{staleContacts}</span>
            </div>
          </div>
        </div>

        {/* Activity Mix */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Activity Mix (Last 30 Days)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Notes</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Calls</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Meetings</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Emails</span>
              <span className="font-bold text-gray-900">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <ActivityIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.contact.firstName} {activity.contact.lastName} ({activity.contact.company})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.user.firstName} {activity.user.lastName} • {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Engagement Trends */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Team Engagement Trends
        </h3>
        <div className="text-center text-gray-500 py-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Engagement trends will appear here</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/app/contacts/new"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition text-center"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <span className="font-semibold text-gray-900">Add Contact</span>
          </a>
          <a
            href="/app/contacts/import"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition text-center"
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <span className="font-semibold text-gray-900">Import Contacts</span>
          </a>
          <a
            href="/app/compliance/employees"
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition text-center"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <span className="font-semibold text-gray-900">Manage Employees</span>
          </a>
        </div>
      </div>
    </div>
  )
}
