import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { PLAN_TIERS } from '@/lib/billing/planTiers'
import { enforceCanAddUser } from '@/lib/billing/enforcement'
import { ensureCompliancePresets } from '@/lib/compliance/presets'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const now = new Date()
    const starterDurationDays = PLAN_TIERS.starter.durationDays ?? 14
    const starterExpiresAt = new Date(now)
    starterExpiresAt.setDate(starterExpiresAt.getDate() + starterDurationDays)

    const company = await prisma.company.create({
      data: {
        name: `${name}'s Workspace`,
        industry: 'Other',
        kind: 'account',
        planKey: 'starter',
        starterStartedAt: now,
        starterExpiresAt,
      },
    })

    await ensureCompliancePresets(company.id)

    await enforceCanAddUser(company.id, 'owner')

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'owner',
        subscriptionStatus: 'trial',
        companyId: company.id,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'USER_CREATED',
        subject: `User account created: ${name}`,
        description: `New user registered with email ${email}`,
        userId: user.id,
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planKey: company.planKey,
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
