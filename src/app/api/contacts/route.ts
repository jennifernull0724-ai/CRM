import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const lastActivity = searchParams.get('lastActivity') || ''
    const status = searchParams.get('status') || 'ACTIVE'
    const hasOpenTasks = searchParams.get('hasOpenTasks') === 'true'
    const hasOverdueTasks = searchParams.get('hasOverdueTasks') === 'true'

    // Build where clause
    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Last activity filter
    if (lastActivity) {
      const now = new Date()
      if (lastActivity === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0))
        where.lastActivity = { gte: startOfDay }
      } else if (lastActivity === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        where.lastActivity = { gte: sevenDaysAgo }
      } else if (lastActivity === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        where.lastActivity = { gte: thirtyDaysAgo }
      } else if (lastActivity === 'none') {
        where.lastActivity = null
      }
    }

    // Task filters
    if (hasOpenTasks) {
      where.tasks = {
        some: {
          completed: false,
        },
      }
    }

    if (hasOverdueTasks) {
      where.tasks = {
        some: {
          completed: false,
          dueDate: { lt: new Date() },
        },
      }
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: {
              where: { completed: false },
            },
          },
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      company,
      email,
      phone,
      title,
      ownerId,
    } = body

    if (!firstName || !lastName || !company) {
      return NextResponse.json(
        { error: 'First name, last name, and company are required' },
        { status: 400 }
      )
    }

    // Auto-assign owner if not specified
    const finalOwnerId = ownerId || session.user.id

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        company,
        email,
        phone,
        title,
        ownerId: finalOwnerId,
        status: 'ACTIVE',
      },
      include: {
        owner: true,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        contactId: contact.id,
        type: 'NOTE',
        title: 'Contact created',
        description: `Created by ${session.user.name}`,
        userId: session.user.id,
      },
    })

    // Update lastActivity
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastActivity: new Date() },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
