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

    // Only admin/owner can bulk archive
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { contactIds } = await request.json()

    if (!contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json(
        { error: 'Contact IDs required' },
        { status: 400 }
      )
    }

    // Archive contacts
    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
      },
      data: {
        status: 'ARCHIVED',
      },
    })

    // Log activity for each contact
    await Promise.all(
      contactIds.map((contactId) =>
        prisma.activity.create({
          data: {
            contactId,
            type: 'STATUS_CHANGED',
            title: 'Contact archived',
            description: `Archived by ${session.user.name}`,
            userId: session.user.id,
          },
        })
      )
    )

    return NextResponse.json({ 
      success: true,
      archivedCount: contactIds.length 
    })
  } catch (error) {
    console.error('Error archiving contacts:', error)
    return NextResponse.json(
      { error: 'Failed to archive contacts' },
      { status: 500 }
    )
  }
}
