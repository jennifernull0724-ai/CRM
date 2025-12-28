import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { search?: string; owner?: string; archived?: string }
}) {
  const search = searchParams.search || ''
  const ownerFilter = searchParams.owner || ''
  const showArchived = searchParams.archived === 'true'

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        {
          OR: search
            ? [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { name: { contains: search, mode: 'insensitive' } } },
              ]
            : undefined,
        },
        ownerFilter ? { ownerId: ownerFilter } : {},
        { archived: showArchived },
      ],
    },
    include: {
      company: true,
      owner: true,
      tasks: {
        where: { completed: false },
      },
      _count: {
        select: {
          deals: true,
        },
      },
    },
    orderBy: {
      lastActivityAt: 'desc',
    },
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <div className="flex gap-3">
            <Link
              href="/contacts/import"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              Import Contacts
            </Link>
            <Link
              href="/contacts/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Contact
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search contacts..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                name="owner"
                defaultValue={ownerFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Owners</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="archived"
                defaultValue={showArchived ? 'true' : 'false'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="false">Active</option>
                <option value="true">Archived</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deals
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No contacts found. Create your first contact to get started.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const overdueTasks = contact.tasks.filter(
                    (task) => task.dueDate && task.dueDate < new Date()
                  )
                  return (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {contact.firstName} {contact.lastName}
                        </Link>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.company?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact.owner?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.lastActivityAt
                          ? new Date(contact.lastActivityAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`${
                            overdueTasks.length > 0
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-900'
                          }`}
                        >
                          {contact.tasks.length}
                          {overdueTasks.length > 0 && ` (${overdueTasks.length} overdue)`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {contact._count.deals}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
