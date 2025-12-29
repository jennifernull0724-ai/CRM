import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getMyTaskSnapshot } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['user', 'estimator'])
    await ensureAnalyticsPreconditions(scope)
    const snapshot = await getMyTaskSnapshot(scope)
    return NextResponse.json(snapshot)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
