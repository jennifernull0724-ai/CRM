import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getContactOverviewMetrics } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['owner', 'admin'])
    await ensureAnalyticsPreconditions(scope)
    const metrics = await getContactOverviewMetrics(scope)
    return NextResponse.json(metrics)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
