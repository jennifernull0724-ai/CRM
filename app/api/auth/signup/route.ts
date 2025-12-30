import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { PLAN_TIERS } from '@/lib/billing/planTiers'
import { enforceCanAddUser } from '@/lib/billing/enforcement'
import { ensureCompliancePresets } from '@/lib/compliance/presets'
import { ensureDispatchPresets } from '@/lib/dispatch/presets'

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

    // DO NOT auto-assign trial — trial must be explicitly opted into
    const company = await prisma.company.create({
      data: {
        name: `${name}'s Workspace`,
        industry: 'Other',
        kind: 'account',
        planKey: 'starter',
        starterStartedAt: null,
        starterExpiresAt: null,
      },
    })

    await Promise.all([
      ensureCompliancePresets(company.id),
      ensureDispatchPresets(company.id),
    ])

    await enforceCanAddUser(company.id, 'owner')

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'owner',
        subscriptionStatus: 'inactive',
        companyId: company.id,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        planKey: company.planKey,
      },
      credentials: {
        email: user.email,
        password,
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
