import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  AnalyticsPreconditionError,
  ContactAnalyticsRole,
  ContactAnalyticsScope,
  normalizeRole,
} from '@/lib/analytics/contactAnalytics'

export class AnalyticsAccessError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'AnalyticsAccessError'
  }
}

export class AnalyticsInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyticsInputError'
  }
}

export async function requireAnalyticsScope(
  allowedRoles: ContactAnalyticsRole[]
): Promise<ContactAnalyticsScope> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new AnalyticsAccessError('Unauthorized', 401)
  }

  const normalizedRole = normalizeRole(session.user.role)
  if (!allowedRoles.includes(normalizedRole)) {
    throw new AnalyticsAccessError('Forbidden', 403)
  }

  return {
    companyId: session.user.companyId,
    userId: session.user.id,
    role: normalizedRole,
  }
}

export function parseDaysParam(
  rawValue: string | null,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const min = options.min ?? 1
  const max = options.max ?? 365
  if (!rawValue) {
    return fallback
  }
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(Math.max(parsed, min), max)
}

export function handleAnalyticsError(error: unknown) {
  if (error instanceof AnalyticsAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof AnalyticsInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof AnalyticsPreconditionError) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  console.error('Contacts analytics API error', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
