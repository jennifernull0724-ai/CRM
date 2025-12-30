import { NextResponse } from 'next/server'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { loadEstimatorDashboard } from '@/lib/dashboard/estimator'
import { loadStandardSettings, mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const context = await requireEstimatorContext()
    const [payload, standardSettingsData] = await Promise.all([
      loadEstimatorDashboard({
        companyId: context.companyId,
        userId: context.userId,
        role: context.role,
      }),
      loadStandardSettings(context.companyId),
    ])
    const standardSettings = mapStandardSettingsToSnapshot(standardSettingsData)
    return NextResponse.json({ data: payload, standardSettings })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    throw error
  }
}
