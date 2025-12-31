/**
 * GET /api/deals/[dealId]/estimating
 * Estimating workspace (read + write for Estimator/Admin/Owner, read-only for User)
 * 
 * ROLE:
 *   Estimator/Admin/Owner → READ + WRITE
 *   User → READ ONLY
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

    const { companyId, role } = session.user;

    // Load deal with all estimating data
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          where: { version: 1 }, // Current version
          take: 1,
          include: {
            lineItems: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Determine access mode
    const canWrite =
      role === 'estimator' || role === 'admin' || role === 'owner';
    const canRead = true; // All roles can read

    // User can only read if deal is in estimating or later
    if (
      role === 'user' &&
      deal.stage === DealStage.OPEN
    ) {
      return NextResponse.json(
        { error: 'Deal has not been sent to estimating' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      deal: {
        id: deal.id,
        companyId: deal.companyId,
        contactId: deal.contactId,
        contact: deal.contact,
        name: deal.name,
        description: deal.description,
        stage: deal.stage,
        currentVersion: deal.currentVersion,
        createdById: deal.createdById,
        createdBy: deal.createdBy,
        assignedToId: deal.assignedToId,
        assignedTo: deal.assignedTo,
        approvedAt: deal.approvedAt,
        subtotal: Number(deal.subtotal),
        taxes: deal.taxes ? Number(deal.taxes) : null,
        total: Number(deal.total),
        inEstimating: deal.inEstimating,
        estimatingStartedAt: deal.estimatingStartedAt,
        lastActivityAt: deal.lastActivityAt,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      },
      currentVersion: deal.versions[0]
        ? {
            id: deal.versions[0].id,
            versionNumber: deal.versions[0].version,
            subtotal: Number(deal.versions[0].subtotal),
            taxes: deal.versions[0].taxes
              ? Number(deal.versions[0].taxes)
              : null,
            total: Number(deal.versions[0].total),
            locked: deal.versions[0].locked,
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
              customerVisible: item.customerVisible,
              internalOnly: item.internalOnly,
              sortOrder: item.sortOrder,
            })),
          }
        : null,
      permissions: {
        canRead,
        canWrite,
      },
    });
  } catch (error) {
    console.error('Get estimating workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
