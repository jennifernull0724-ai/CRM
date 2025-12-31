/**
 * GET /api/dispatch/deals/[dealId]
 * Get single dispatched deal with approved PDF (read-only)
 * 
 * ALLOWED: Dispatch ONLY
 * RETURNS: Deal + Contact + Approved Version + Line Items + PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DealStage } from '@/types/deal-centric';

export async function GET(
  request: NextRequest,
  { params }: { params: { dealId: string } }
) {
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

    // Load deal (must be DISPATCHED)
    const deal = await prisma.deal.findFirst({
      where: {
        id: params.dealId,
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
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
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
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found or not dispatched' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deal: {
        id: deal.id,
        contactId: deal.contactId,
        contact: deal.contact,
        name: deal.name,
        description: deal.description,
        approvedAt: deal.approvedAt,
        approvedBy: deal.approvedBy,
        dispatchedAt: deal.dispatchedAt,
        subtotal: Number(deal.subtotal),
        taxes: deal.taxes ? Number(deal.taxes) : null,
        total: Number(deal.total),
        approvedVersion: deal.versions[0] ? {
          id: deal.versions[0].id,
          versionNumber: deal.versions[0].version,
          subtotal: Number(deal.versions[0].subtotal),
          taxes: deal.versions[0].taxes ? Number(deal.versions[0].taxes) : null,
          total: Number(deal.versions[0].total),
          approvedAt: deal.versions[0].approvedAt,
          lineItems: deal.versions[0].lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitCost: Number(item.unitCost),
            lineTotal: Number(item.lineTotal),
            category: item.category,
            phase: item.phase,
            discipline: item.discipline,
          })),
        } : null,
        pdf: deal.pdfs[0] || null,
      },
    });
  } catch (error) {
    console.error('Get dispatched deal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
