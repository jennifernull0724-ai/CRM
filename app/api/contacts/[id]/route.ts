import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { enforceCanWrite, PricingEnforcementError } from '@/lib/billing/enforcement'
import { updateContactRecord } from '@/lib/contacts/mutations'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  jobTitle: z.string().optional(),
  ownerId: z.string().optional(),
  archived: z.boolean().optional(),
})

async function requireWorkspaceSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    throw new Error('UNAUTHORIZED')
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role.toLowerCase(),
  }
}

// GET /api/contacts/[id] - Get contact details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { companyId } = await requireWorkspaceSession()

    const { id } = await params
    const contact = await prisma.contact.findFirst({
      where: { id, companyId },
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/contacts/[id] - Update contact
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, companyId, role } = await requireWorkspaceSession()

    try {
      await enforceCanWrite(userId)
    } catch (error) {
      if (error instanceof PricingEnforcementError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      throw error
    }

    const { id } = await params
    const contact = await prisma.contact.findFirst({
      where: { id, companyId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check permissions
    const isOwner = contact.ownerId === userId
    const isAdmin = role === 'admin' || role === 'owner'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateSchema.parse(body)

    // Only admin/owner can change owner or archive
    if (!isAdmin && (validated.ownerId || validated.archived !== undefined)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (validated.email && validated.email !== contact.email) {
      return NextResponse.json({ error: 'Email address cannot be changed after creation' }, { status: 400 })
    }

    const hasProfileUpdates =
      validated.firstName !== undefined ||
      validated.lastName !== undefined ||
      validated.phone !== undefined ||
      validated.mobile !== undefined ||
      validated.jobTitle !== undefined ||
      validated.ownerId !== undefined

    if (hasProfileUpdates) {
      await updateContactRecord(id, companyId, userId, {
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone: validated.phone,
        mobile: validated.mobile,
        jobTitle: validated.jobTitle,
        ownerId: validated.ownerId,
      })
    }

    if (validated.archived !== undefined && validated.archived !== contact.archived) {
      await prisma.contact.update({
        where: { id },
        data: { archived: validated.archived },
      })
    }

    const fresh = await prisma.contact.findFirst({
      where: { id, companyId },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ contact: fresh })
  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('PATCH /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/contacts/[id] - Delete contact (admin/owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, companyId, role } = await requireWorkspaceSession()

    try {
      await enforceCanWrite(userId)
    } catch (error) {
      if (error instanceof PricingEnforcementError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      throw error
    }

    const isAdmin = role === 'admin' || role === 'owner'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const contact = await prisma.contact.findFirst({
      where: { id, companyId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({
      where: { id },
    })

    await prisma.activity.create({
      data: {
        companyId,
        type: 'CONTACT_DELETED',
        subject: `Contact deleted: ${contact.firstName} ${contact.lastName}`,
        description: `Email: ${contact.email}`,
        contactId: contact.id,
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('DELETE /api/contacts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
