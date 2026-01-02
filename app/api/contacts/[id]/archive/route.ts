import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enforceCanWrite, PricingEnforcementError } from '@/lib/billing/enforcement'

async function requireWorkspaceSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    throw new Error('UNAUTHORIZED')
  }
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role?.toLowerCase() ?? 'user',
  }
}

export async function POST(
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
    const contact = await prisma.contact.findFirst({ where: { id, companyId } })
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    if (contact.archived) {
      return NextResponse.json({ success: true })
    }

    const archivedAt = new Date()

    await prisma.activity.create({
      data: {
        companyId,
        type: 'CONTACT_ARCHIVED',
        subject: `Contact archived: ${contact.firstName} ${contact.lastName}`,
        description: `Email: ${contact.email}`,
        contactId: contact.id,
        userId,
        metadata: { archivedAt: archivedAt.toISOString() },
      },
    })

    await prisma.contact.update({
      where: { id: contact.id },
      data: { archived: true, archivedAt },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('POST /api/contacts/[id]/archive error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
