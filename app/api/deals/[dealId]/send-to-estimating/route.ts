/**
 * POST /api/deals/[dealId]/send-to-estimating
 * Send deal to estimating (OPEN → IN_ESTIMATING)
 * 
 * ALLOWED: User, Estimator, Admin, Owner
 * FORBIDDEN: Dispatch
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendDealToEstimating } from '@/lib/deals/stateMachine';
import { DealError } from '@/types/deal-centric';

export async function POST(
  request: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const result = await sendDealToEstimating(
      {
        dealId: params.dealId,
        assignedToId: body.assignedToId,
        notes: body.notes,
      },
      {
        userId: session.user.id,
        role: session.user.role as any,
        companyId: session.user.companyId,
      }
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Send to estimating error:', error);

    if (error instanceof DealError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
