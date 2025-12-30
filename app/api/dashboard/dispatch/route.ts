import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadDispatchDashboardBundle } from '@/lib/dashboard/dispatch'
import { loadStandardSettings, mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'

const DISPATCH_ROLES = ['dispatch', 'admin', 'owner']

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user.role as string)?.toLowerCase()

  if (!DISPATCH_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!session.user.companyId) {
    return NextResponse.json({ error: 'Missing company context' }, { status: 400 })
  }

  const [payload, standardSettingsData] = await Promise.all([
    loadDispatchDashboardBundle(session.user.companyId),
    loadStandardSettings(session.user.companyId),
  ])

  const standardSettings = mapStandardSettingsToSnapshot(standardSettingsData)

  return NextResponse.json({ ...payload, standardSettings })
}
