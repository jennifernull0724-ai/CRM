import { NextRequest, NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getMyStaleContacts } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, parseDaysParam, requireAnalyticsScope } from '../_utils'

export async function GET(request: NextRequest) {
  try {
    const scope = await requireAnalyticsScope(['user', 'estimator'])
    await ensureAnalyticsPreconditions(scope)
    const days = parseDaysParam(request.nextUrl.searchParams.get('days'), 14, { min: 7 })
    const contacts = await getMyStaleContacts(scope, days)
    return NextResponse.json(contacts)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
