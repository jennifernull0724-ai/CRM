/**
 * GET /api/dispatch/deals
 * List dispatched deals (read-only)
 * 
 * ALLOWED: Dispatch ONLY
 * RETURNS: Deals with stage = DISPATCHED + approved PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DealStage } from '@/types/deal-centric';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Dispatch-only endpoint
    if (session.user.role !== 'dispatch') {
      return NextResponse.json(
        { error: 'Forbidden: Dispatch role required' },
        { status: 403 }
      );
    }

    const { companyId } = session.user;

    // Load all DISPATCHED deals
    const deals = await prisma.deal.findMany({
      where: {
        companyId,
        stage: DealStage.DISPATCHED,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        versions: {
          where: { locked: true },
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            lineItems: {
              where: { customerVisible: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        pdfs: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { dispatchedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      deals: deals.map((deal) => ({
        id: deal.id,
        contactId: deal.contactId,
        contact: deal.contact,
        name: deal.name,
        description: deal.description,
        approvedAt: deal.approvedAt,
        dispatchedAt: deal.dispatchedAt,
        subtotal: Number(deal.subtotal),
        taxes: deal.taxes ? Number(deal.taxes) : null,
        total: Number(deal.total),
        approvedVersion: deal.versions[0] || null,
        pdf: deal.pdfs[0] || null,
      })),
    });
  } catch (error) {
    console.error('List dispatched deals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
