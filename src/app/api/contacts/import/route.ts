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

    const { contacts } = await request.json()

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Invalid contacts data' },
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const contact of contacts) {
      try {
        // Create contact
        const createdContact = await prisma.contact.create({
          data: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            company: contact.company,
            email: contact.email || null,
            phone: contact.phone || null,
            title: contact.title || null,
            ownerId: session.user.id,
            status: 'ACTIVE',
            lastActivity: new Date(),
          },
        })

        // Log activity
        await prisma.activity.create({
          data: {
            contactId: createdContact.id,
            type: 'NOTE',
            title: 'Contact imported',
            description: `Imported from CSV/Excel by ${session.user.name}`,
            userId: session.user.id,
          },
        })

        imported++
      } catch (err: any) {
        skipped++
        errors.push(`Failed to import ${contact.firstName} ${contact.lastName}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed' },
      { status: 500 }
    )
  }
}
