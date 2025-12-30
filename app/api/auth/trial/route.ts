import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLAN_TIERS } from '@/lib/billing/planTiers'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        id: true,
        planKey: true,
        starterStartedAt: true,
        starterExpiresAt: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Only allow trial if not already on a paid plan or existing trial
    if (company.planKey !== 'starter') {
      return NextResponse.json({ error: 'Trial only available on starter plan' }, { status: 400 })
    }

    if (company.starterStartedAt || company.starterExpiresAt) {
      return NextResponse.json({ error: 'Trial already activated' }, { status: 400 })
    }

    const now = new Date()
    const starterDurationDays = PLAN_TIERS.starter.durationDays ?? 14
    const starterExpiresAt = new Date(now)
    starterExpiresAt.setDate(starterExpiresAt.getDate() + starterDurationDays)

    await prisma.company.update({
      where: { id: company.id },
      data: {
        starterStartedAt: now,
        starterExpiresAt,
      },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: 'trial',
      },
    })

    return NextResponse.json({
      success: true,
      starterExpiresAt: starterExpiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Trial activation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
