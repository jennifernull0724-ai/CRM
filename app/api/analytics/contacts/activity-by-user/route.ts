import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getActivityByOwnerAnalytics } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['owner', 'admin'])
    await ensureAnalyticsPreconditions(scope)
    const rows = await getActivityByOwnerAnalytics(scope)
    return NextResponse.json(rows)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
