/**
 * POST /api/crm/deals/[dealId]/submit
 * Submit deal for approval (IN_ESTIMATING → SUBMITTED)
 * 
 * ALLOWED: Estimator, Admin, Owner
 * FORBIDDEN: User, Dispatch
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { submitDeal } from '@/lib/deals/stateMachine';
import { DealError } from '@/types/deal-centric';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const body = await request.json();

    const result = await submitDeal(
      {
        dealId: params.dealId,
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
    console.error('Submit deal error:', error);

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
