import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const companyId = session.user.companyId
    const userId = session.user.id
    const role = session.user.role || 'user'

    // Search across contacts, deals, tasks
    const [contacts, deals, tasks] = await Promise.all([
      // Contacts
      prisma.contact.findMany({
        where: {
          companyId,
          archived: false,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { companyOverrideName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyOverrideName: true,
        },
        take: 10,
      }),

      // Deals (scoped for users)
      prisma.deal.findMany({
        where: {
          companyId,
          ...(role === 'user' ? { createdById: userId } : {}),
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          stage: true,
          contact: { select: { firstName: true, lastName: true } },
        },
        take: 10,
      }),

      // Tasks (assigned to user)
      prisma.task.findMany({
        where: {
          assignedToId: userId,
          title: { contains: query, mode: 'insensitive' },
          completed: false,
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 10,
      }),
    ])

    const results = [
      ...contacts.map((c) => ({
        id: c.id,
        type: 'contact' as const,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.email || c.companyOverrideName || '',
        url: `/contacts/${c.id}`,
      })),
      ...deals.map((d) => ({
        id: d.id,
        type: 'deal' as const,
        title: d.name,
        subtitle: d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : d.stage,
        url: `/deals/${d.id}`,
      })),
      ...tasks.map((t) => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        subtitle: t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : 'No contact',
        url: t.contact ? `/contacts/${t.contact.id}` : '/crm/tasks',
      })),
    ]

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
