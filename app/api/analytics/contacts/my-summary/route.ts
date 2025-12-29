import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getMyContactSummary } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['user', 'estimator'])
    await ensureAnalyticsPreconditions(scope)
    const summary = await getMyContactSummary(scope)
    return NextResponse.json(summary)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
