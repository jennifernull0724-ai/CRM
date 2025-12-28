import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
})

// GET /api/contacts - List contacts with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const ownerId = searchParams.get('ownerId') || ''
    const archived = searchParams.get('archived') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '50')

    const where: any = {
      archived,
      ...(ownerId && { ownerId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          company: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              deals: true,
              tasks: { where: { completed: false } },
            },
          },
        },
        orderBy: { lastActivityAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        perPage,
        pages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('GET /api/contacts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/contacts - Create contact
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = contactSchema.parse(body)

    // Check if email already exists
    const existing = await prisma.contact.findUnique({
      where: { email: validated.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 400 }
      )
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        ...validated,
        ownerId: validated.ownerId || session.user.id,
        createdById: session.user.id,
        lastActivityAt: new Date(),
      },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    // Log CONTACT_CREATED activity
    await prisma.activity.create({
      data: {
        type: 'CONTACT_CREATED',
        subject: `Contact created: ${contact.firstName} ${contact.lastName}`,
        description: `New contact ${contact.email} was created`,
        contactId: contact.id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('POST /api/contacts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
