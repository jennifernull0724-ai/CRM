/**
 * Line Item Operations
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
  DealActivityType,
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
 * PATCH - Update line item
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ dealId: string; versionId: string; itemId: string }> }
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

    // Load existing item
    const existingItem = await prisma.dealLineItem.findUnique({
      where: { id: params.itemId },
    });

    if (!existingItem || existingItem.dealId !== params.dealId) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Validate category if provided
    if (body.category && !isLineItemCategory(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Calculate new lineTotal if quantity or unitCost changed
    const quantity = body.quantity ?? Number(existingItem.quantity);
    const unitCost = body.unitCost ?? Number(existingItem.unitCost);
    const lineTotal = Number(quantity) * Number(unitCost);

    // Update line item
    const lineItem = await prisma.dealLineItem.update({
      where: { id: params.itemId },
      data: {
        description: body.description ?? existingItem.description,
        quantity,
        unit: body.unit ?? existingItem.unit,
        unitCost,
        lineTotal,
        category: body.category ?? existingItem.category,
        phase: body.phase !== undefined ? body.phase : existingItem.phase,
        discipline:
          body.discipline !== undefined
            ? body.discipline
            : existingItem.discipline,
        customerVisible:
          body.customerVisible ?? existingItem.customerVisible,
        internalOnly: body.internalOnly ?? existingItem.internalOnly,
        sortOrder: body.sortOrder ?? existingItem.sortOrder,
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
          type: DealActivityType.DEAL_LINE_ITEM_UPDATED,
          subject: `Line item updated: ${lineItem.description}`,
          userId,
          metadata: {
            lineItemId: lineItem.id,
            changes: body,
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
    console.error('Update line item error:', error);

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
 * DELETE - Delete line item
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ dealId: string; versionId: string; itemId: string }> }
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

    // Load existing item
    const existingItem = await prisma.dealLineItem.findUnique({
      where: { id: params.itemId },
    });

    if (!existingItem || existingItem.dealId !== params.dealId) {
      return NextResponse.json(
        { error: 'Line item not found' },
        { status: 404 }
      );
    }

    // Delete line item
    await prisma.dealLineItem.delete({
      where: { id: params.itemId },
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
          type: DealActivityType.DEAL_LINE_ITEM_DELETED,
          subject: `Line item deleted: ${existingItem.description}`,
          userId,
          metadata: {
            lineItemId: params.itemId,
            description: existingItem.description,
            lineTotal: Number(existingItem.lineTotal),
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete line item error:', error);

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
