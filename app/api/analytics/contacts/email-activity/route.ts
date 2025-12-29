import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getEmailActivityMetrics } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['user', 'estimator', 'admin', 'owner'])
    await ensureAnalyticsPreconditions(scope)
    const metrics = await getEmailActivityMetrics(scope)
    return NextResponse.json(metrics)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
