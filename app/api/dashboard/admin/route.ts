import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadControlPlaneData } from '@/lib/dashboard/controlPlane'
import { getAssetDashboardSummary } from '@/lib/assets/registry'
import { mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'
import { loadContactCommandSnapshot } from '@/lib/dashboard/contactSnapshots'
import { normalizeRole } from '@/lib/analytics/contactAnalytics'
import type { PlanKey } from '@/lib/billing/planTiers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (session.user.role as string)?.toLowerCase()

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!session.user.companyId) {
    return NextResponse.json({ error: 'Missing company context' }, { status: 400 })
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const contactRole = normalizeRole(session.user.role as string)
  const [data, assetSummary, contactAnalytics] = await Promise.all([
    loadControlPlaneData(session.user.companyId),
    getAssetDashboardSummary(session.user.companyId),
    loadContactCommandSnapshot({ companyId: session.user.companyId, userId: session.user.id, role: contactRole }),
  ])

  const viewer = {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? null,
    email: session.user.email ?? null,
    role: 'admin' as const,
  }

  const standardSettings = mapStandardSettingsToSnapshot(data.standardSettings)

  return NextResponse.json({ data, assetSummary, planKey, viewer, standardSettings, contactAnalytics })
}
