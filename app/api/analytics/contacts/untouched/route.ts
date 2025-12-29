import { NextRequest, NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getUntouchedContacts } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, parseDaysParam, requireAnalyticsScope } from '../_utils'

export async function GET(request: NextRequest) {
  try {
    const scope = await requireAnalyticsScope(['owner', 'admin'])
    await ensureAnalyticsPreconditions(scope)
    const days = parseDaysParam(request.nextUrl.searchParams.get('days'), 30, { min: 7 })
    const contacts = await getUntouchedContacts(scope, days)
    return NextResponse.json(contacts)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
