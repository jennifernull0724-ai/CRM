import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/owner can bulk reassign
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { contactIds, newOwnerEmail } = await request.json()

    if (!contactIds || !Array.isArray(contactIds) || !newOwnerEmail) {
      return NextResponse.json(
        { error: 'Contact IDs and new owner email required' },
        { status: 400 }
      )
    }

    // Find new owner
    const newOwner = await prisma.user.findUnique({
      where: { email: newOwnerEmail },
    })

    if (!newOwner) {
      return NextResponse.json(
        { error: 'New owner not found' },
        { status: 404 }
      )
    }

    // Reassign contacts
    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
      },
      data: {
        ownerId: newOwner.id,
      },
    })

    // Log activity for each contact
    await Promise.all(
      contactIds.map((contactId) =>
        prisma.activity.create({
          data: {
            contactId,
            type: 'STATUS_CHANGED',
            title: 'Owner changed',
            description: `Reassigned to ${newOwner.firstName} ${newOwner.lastName} by ${session.user.name}`,
            userId: session.user.id,
          },
        })
      )
    )

    return NextResponse.json({ 
      success: true,
      reassignedCount: contactIds.length,
      newOwner: {
        id: newOwner.id,
        name: `${newOwner.firstName} ${newOwner.lastName}`,
        email: newOwner.email,
      }
    })
  } catch (error) {
    console.error('Error reassigning contacts:', error)
    return NextResponse.json(
      { error: 'Failed to reassign contacts' },
      { status: 500 }
    )
  }
}
