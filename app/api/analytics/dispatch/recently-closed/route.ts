import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import type { WorkOrderDiscipline } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { getRecentlyClosedAnalytics } from '@/lib/dispatch/analytics'

const DISPATCH_ANALYTICS_ROLES = new Set(['dispatch', 'admin', 'owner'])

function parseDiscipline(value: string | null): WorkOrderDiscipline | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.toUpperCase()
  if (normalized === 'CONSTRUCTION' || normalized === 'RAILROAD' || normalized === 'ENVIRONMENTAL') {
    return normalized as WorkOrderDiscipline
  }
  return undefined
}

function parseDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.min(parsed, 100)
}

function parseWindow(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return undefined
  }

  return Math.min(parsed, 30)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role.toLowerCase()
  if (!DISPATCH_ANALYTICS_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const discipline = parseDiscipline(url.searchParams.get('discipline'))
  const startDate = parseDate(url.searchParams.get('start'))
  const endDate = parseDate(url.searchParams.get('end'))
  const limit = parseLimit(url.searchParams.get('limit'))
  const windowDays = parseWindow(url.searchParams.get('window'))

  const analytics = await getRecentlyClosedAnalytics({
    companyId: session.user.companyId,
    discipline,
    startDate,
    endDate,
    limit,
    windowDays,
  })

  return NextResponse.json(analytics)
}
