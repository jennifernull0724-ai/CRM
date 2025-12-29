import { NextResponse } from 'next/server'
import { ensureAnalyticsPreconditions, getMyMentionFeed } from '@/lib/analytics/contactAnalytics'
import { handleAnalyticsError, requireAnalyticsScope } from '../_utils'

export async function GET() {
  try {
    const scope = await requireAnalyticsScope(['user', 'estimator'])
    await ensureAnalyticsPreconditions(scope)
    const mentions = await getMyMentionFeed(scope)
    return NextResponse.json(mentions)
  } catch (error) {
    return handleAnalyticsError(error)
  }
}
