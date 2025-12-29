import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getContactTaskPerformance } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['owner', 'admin'])
    await ensureAnalyticsPreconditions(scope)
    const metrics = await getContactTaskPerformance(scope)
    return NextResponse.json(metrics)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
