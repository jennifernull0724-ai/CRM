import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { enforceCanCreateDeal, enforceCanWrite, PricingEnforcementError } from '@/lib/billing/enforcement'
import { revalidateContactSurfaces } from '@/lib/contacts/cache'

const dealSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contactId: z.string().min(1, 'Contact is required'),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  closeDate: z.string().optional(),
  stage: z.string().optional(),
})

// GET /api/deals - List deals
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage') || ''
    const assignedToId = searchParams.get('assignedToId') || ''
    const contactId = searchParams.get('contactId') || ''

    const where: Record<string, unknown> = {
      ...(stage && { stage }),
      ...(assignedToId && { assignedToId }),
      ...(contactId && { contactId }),
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: {
            lineItems: true,
            versions: true,
            pdfs: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('GET /api/deals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/deals - Create deal
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce pricing: Check if user can create deals
    try {
      await enforceCanCreateDeal(session.user.id)
      await enforceCanWrite(session.user.id)
    } catch (error) {
      if (error instanceof PricingEnforcementError) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      throw error
    }

    const body = await req.json()
    const validated = dealSchema.parse(body)

    // Verify contact exists inside the current workspace
    const contact = await prisma.contact.findFirst({
      where: { id: validated.contactId, companyId: session.user.companyId },
      select: { id: true, firstName: true, lastName: true, companyId: true },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Create deal
    const deal = await prisma.deal.create({
      data: {
        name: validated.name,
        description: validated.description,
        contactId: validated.contactId,
        companyId: validated.companyId || contact.companyId,
        assignedToId: validated.assignedToId,
        createdById: session.user.id,
        value: validated.value,
        probability: validated.probability,
        closeDate: validated.closeDate ? new Date(validated.closeDate) : null,
        stage: validated.stage || 'New',
        currentVersion: 1,
      },
      include: {
        contact: true,
        company: true,
        assignedTo: { select: { name: true } },
      },
    })

    // Create initial version
    await prisma.dealVersion.create({
      data: {
        dealId: deal.id,
        version: 1,
        description: 'Initial version',
        isActive: true,
      },
    })

    const activityTimestamp = deal.createdAt

    // Update contact lastActivityAt
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastActivityAt: activityTimestamp, activityState: 'ACTIVE' },
    })

    // Log DEAL_CREATED activity
    await prisma.activity.create({
      data: {
        companyId: contact.companyId,
        type: 'DEAL_CREATED',
        subject: `Deal created: ${deal.name}`,
        description: `New deal created for ${contact.firstName} ${contact.lastName}`,
        dealId: deal.id,
        contactId: contact.id,
        userId: session.user.id,
        metadata: {
          dealId: deal.id,
          contactId: contact.id,
        },
      },
    })

    await prisma.accessAuditLog.create({
      data: {
        companyId: contact.companyId,
        actorId: session.user.id,
        action: 'DEAL_CREATED_FROM_CONTACT',
        metadata: {
          contactId: contact.id,
          dealId: deal.id,
          actorId: session.user.id,
          companyId: contact.companyId,
          timestamp: activityTimestamp.toISOString(),
        },
      },
    })

    revalidateContactSurfaces(contact.id)

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/deals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
