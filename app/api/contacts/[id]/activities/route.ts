import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const takeRaw = Number(searchParams.get('take'))
    const take = Number.isFinite(takeRaw) && takeRaw > 0 && takeRaw <= 200 ? takeRaw : 100

    const { id } = await params
    const activities = await prisma.activity.findMany({
      where: { contactId: id, companyId: session.user.companyId },
      orderBy: [
        { occurredAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
    })

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('GET /api/contacts/[id]/activities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
