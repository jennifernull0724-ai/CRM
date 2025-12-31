/**
 * POST /api/deals/[dealId]/approve
 * Approve deal — ATOMIC TRANSACTION
 * 
 * SIDE EFFECTS (ALL OR NOTHING):
 * - Lock DealVersion
 * - Generate DealPdf
 * - Emit APPROVED
 * - Emit PDF_GENERATED
 * - Create DispatchHandoff
 * - stage → DISPATCHED
 * - Emit DISPATCHED
 * - Enable User delivery
 * - Emit USER_DELIVERY_ENABLED
 * 
 * ALLOWED: Estimator, Admin, Owner
 * FORBIDDEN: User, Dispatch
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { approveDeal } from '@/lib/deals/approval';
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

    const result = await approveDeal(
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

    return NextResponse.json({
      success: true,
      message: 'Deal approved and dispatched',
      result: {
        dealId: result.dealId,
        versionNumber: result.versionNumber,
        pdfId: result.pdfId,
        handoffId: result.handoffId,
        activitiesCreated: result.activities.length,
      },
    });
  } catch (error) {
    console.error('Approve deal error:', error);

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
