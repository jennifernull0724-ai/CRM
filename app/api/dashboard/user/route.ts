import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadUserDashboardData, loadUserPersonalAnalytics, loadUserActivityTimeline } from '@/lib/dashboard/userOverview'
import { loadStandardSettings, mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'
import { loadMyContactRadarSnapshot } from '@/lib/dashboard/contactSnapshots'
import { normalizeRole } from '@/lib/analytics/contactAnalytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = normalizeRole(session.user.role as string)

  if (role !== 'user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!session.user.companyId) {
    return NextResponse.json({ error: 'Missing company context' }, { status: 400 })
  }

  const [dashboard, analytics, standardSettingsData, contactRadar, timeline] = await Promise.all([
    loadUserDashboardData(session.user.id, session.user.companyId),
    loadUserPersonalAnalytics(session.user.id, session.user.companyId),
    loadStandardSettings(session.user.companyId),
    loadMyContactRadarSnapshot({ companyId: session.user.companyId, userId: session.user.id, role }),
    loadUserActivityTimeline(session.user.id, session.user.companyId),
  ])

  const standardSettings = mapStandardSettingsToSnapshot(standardSettingsData)

  return NextResponse.json({ dashboard, analytics, contactRadar, standardSettings, timeline })
}
