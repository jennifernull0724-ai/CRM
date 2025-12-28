import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
  archived: z.boolean().optional(),
})

// GET /api/contacts/[id] - Get contact details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
        deals: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { name: true } },
          },
        },
        tasks: {
          where: { completed: false },
          orderBy: { dueDate: 'asc' },
          include: {
            assignedTo: { select: { name: true } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { name: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('GET /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/contacts/[id] - Update contact
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check permissions
    const isOwner = contact.ownerId === session.user.id
    const isAdmin = session.user.role === 'admin' || session.user.role === 'owner'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateSchema.parse(body)

    // Only admin/owner can change owner or archive
    if (!isAdmin && (validated.ownerId || validated.archived !== undefined)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: validated,
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'CONTACT_UPDATED',
        subject: `Contact updated: ${updated.firstName} ${updated.lastName}`,
        contactId: updated.id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ contact: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('PATCH /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/contacts/[id] - Delete contact (admin/owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'owner'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({
      where: { id: params.id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'CONTACT_DELETED',
        subject: `Contact deleted: ${contact.firstName} ${contact.lastName}`,
        description: `Email: ${contact.email}`,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
