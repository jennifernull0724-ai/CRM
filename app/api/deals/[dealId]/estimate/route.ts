/**
 * GET /api/deals/[dealId]/estimate
 * User delivery (read-only approved estimate)
 * 
 * ROLE: User
 * PRECONDITION: stage >= APPROVED_ESTIMATE
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

    const { companyId } = session.user;

    // Load deal
    const deal = await prisma.deal.findFirst({
      where: {
        id: params.dealId,
        companyId,
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
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
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
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Verify deal is approved
    if (
      deal.stage !== DealStage.APPROVED_ESTIMATE &&
      deal.stage !== DealStage.DISPATCHED &&
      deal.stage !== DealStage.WON &&
      deal.stage !== DealStage.LOST
    ) {
      return NextResponse.json(
        { error: 'Deal has not been approved' },
        { status: 403 }
      );
    }

    const approvedVersion = deal.versions[0];

    if (!approvedVersion) {
      return NextResponse.json(
        { error: 'No approved version found' },
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
        stage: deal.stage,
        approvedAt: deal.approvedAt,
        approvedBy: deal.approvedBy,
        subtotal: Number(deal.subtotal),
        taxes: deal.taxes ? Number(deal.taxes) : null,
        total: Number(deal.total),
      },
      approvedVersion: {
        id: approvedVersion.id,
        versionNumber: approvedVersion.version,
        subtotal: Number(approvedVersion.subtotal),
        taxes: approvedVersion.taxes
          ? Number(approvedVersion.taxes)
          : null,
        total: Number(approvedVersion.total),
        approvedAt: approvedVersion.approvedAt,
        lineItems: approvedVersion.lineItems.map((item) => ({
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
      },
      pdf: deal.pdfs[0] || null,
      readOnly: true,
    });
  } catch (error) {
    console.error('Get user delivery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
