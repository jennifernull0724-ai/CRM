import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const forbiddenPatterns = /(demo|sample|mock)/i

const activitySchema = z.object({
  contactId: z.string().min(1),
  dealId: z.string().optional(),
  type: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().optional(),
  metadata: z.any().optional(),
  occurredAt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = activitySchema.parse(body)

    const textFields = [parsed.subject, parsed.description].filter(Boolean) as string[]
    const containsForbidden = textFields.some((value) => forbiddenPatterns.test(value))
    if (containsForbidden) {
      return NextResponse.json({ error: 'Forbidden content' }, { status: 400 })
    }

    const contact = await prisma.contact.findFirst({
      where: { id: parsed.contactId, companyId: session.user.companyId },
      select: { id: true },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const activity = await prisma.activity.create({
      data: {
        companyId: session.user.companyId,
        contactId: parsed.contactId,
        dealId: parsed.dealId,
        userId: session.user.id,
        type: parsed.type,
        subject: parsed.subject,
        description: parsed.description ?? null,
        metadata: parsed.metadata ?? null,
        occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
      },
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/activities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
