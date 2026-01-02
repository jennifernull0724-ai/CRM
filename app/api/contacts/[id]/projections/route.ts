import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatISO } from 'date-fns'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const contact = await prisma.contact.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const activities = await prisma.activity.findMany({
      where: { contactId: contact.id, companyId: session.user.companyId },
      orderBy: [
        { occurredAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
    })

    const headerProjection = {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      jobTitle: contact.jobTitle,
      owner: contact.owner ? { id: contact.owner.id, name: contact.owner.name, email: contact.owner.email ?? undefined } : null,
      archived: contact.archived,
      archivedAt: contact.archivedAt ? formatISO(contact.archivedAt) : null,
      createdAt: formatISO(contact.createdAt),
      updatedAt: formatISO(contact.updatedAt),
      activityState: contact.activityState,
    }

    const activityProjection = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      subject: activity.subject,
      description: activity.description,
      metadata: activity.metadata,
      occurredAt: formatISO(activity.occurredAt),
      createdAt: formatISO(activity.createdAt),
    }))

    return NextResponse.json({ header: headerProjection, activityPreview: activityProjection })
  } catch (error) {
    console.error('GET /api/contacts/[id]/projections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
