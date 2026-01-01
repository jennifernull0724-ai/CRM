/**
 * Line Items API
 * POST   /api/deals/[dealId]/versions/[versionId]/line-items
 * PATCH  /api/deals/[dealId]/versions/[versionId]/line-items/[itemId]
 * DELETE /api/deals/[dealId]/versions/[versionId]/line-items/[itemId]
 * 
 * ALLOWED: Estimator, Admin, Owner
 * FORBIDDEN: User, Dispatch
 * PRECONDITION: stage === IN_ESTIMATING
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  DealStage,
  DealActivityType,
  LineItemCategory,
  assertCanPerformAction,
  DealError,
  isLineItemCategory,
} from '@/types/deal-centric';
import {
  assertDealIsEditable,
  assertCanEditDeal,
  updateDealTotals,
} from '@/lib/deals/stateMachine';

/**
 * POST - Create line item
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dealId: string; versionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { companyId, id: userId, role } = session.user;

    // Verify role can price line items
    try {
      assertCanPerformAction('canPriceLineItems', role as any);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verify deal is editable
    await assertDealIsEditable(params.dealId, companyId);
    await assertCanEditDeal(params.dealId, {
      userId,
      role: role as any,
      companyId,
    });

    // Parse request
    const body = await request.json();

    // Validate
    if (!body.description || !body.quantity || !body.unit || body.unitCost === undefined) {
      return NextResponse.json(
        { error: 'description, quantity, unit, and unitCost are required' },
        { status: 400 }
      );
    }

    if (!isLineItemCategory(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Calculate lineTotal (server-side ONLY)
    const lineTotal = Number(body.quantity) * Number(body.unitCost);

    // Create line item
    const lineItem = await prisma.dealLineItem.create({
      data: {
        dealId: params.dealId,
        versionId: params.versionId,
        description: body.description,
        quantity: body.quantity,
        unit: body.unit,
        unitCost: body.unitCost,
        lineTotal,
        category: body.category || LineItemCategory.LABOR,
        phase: body.phase || null,
        discipline: body.discipline || null,
        customerVisible: body.customerVisible ?? true,
        internalOnly: body.internalOnly ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    // Update deal totals
    await updateDealTotals(params.dealId);

    // Emit activity
    const deal = await prisma.deal.findUnique({
      where: { id: params.dealId },
      select: { contactId: true },
    });

    if (deal) {
      await prisma.activity.create({
        data: {
          companyId,
          contactId: deal.contactId,
          dealId: params.dealId,
          type: DealActivityType.DEAL_LINE_ITEM_ADDED,
          subject: `Line item added: ${body.description}`,
          userId,
          metadata: {
            lineItemId: lineItem.id,
            category: body.category,
            quantity: body.quantity,
            unitCost: body.unitCost,
            lineTotal,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      lineItem: {
        id: lineItem.id,
        description: lineItem.description,
        quantity: Number(lineItem.quantity),
        unit: lineItem.unit,
        unitCost: Number(lineItem.unitCost),
        lineTotal: Number(lineItem.lineTotal),
        category: lineItem.category,
        phase: lineItem.phase,
        discipline: lineItem.discipline,
        customerVisible: lineItem.customerVisible,
        internalOnly: lineItem.internalOnly,
        sortOrder: lineItem.sortOrder,
      },
    });
  } catch (error) {
    console.error('Create line item error:', error);

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

/**
 * GET - List line items
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ dealId: string; versionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { companyId } = session.user;

    // Verify deal belongs to company
    const deal = await prisma.deal.findFirst({
      where: {
        id: params.dealId,
        companyId,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const lineItems = await prisma.dealLineItem.findMany({
      where: {
        dealId: params.dealId,
        versionId: params.versionId,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      lineItems: lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitCost: Number(item.unitCost),
        lineTotal: Number(item.lineTotal),
        category: item.category,
        phase: item.phase,
        discipline: item.discipline,
        customerVisible: item.customerVisible,
        internalOnly: item.internalOnly,
        sortOrder: item.sortOrder,
      })),
    });
  } catch (error) {
    console.error('List line items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
