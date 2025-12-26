import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { estimateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: params.estimateId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { estimateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: params.estimateId },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    // Only allow editing Draft estimates
    if (estimate.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot edit approved estimate' }, { status: 400 });
    }

    const body = await request.json();
    const { lineItems, status } = body;

    let updateData: any = {};

    if (lineItems) {
      // Delete existing line items
      await prisma.estimateLineItem.deleteMany({
        where: { estimateId: params.estimateId },
      });

      // Calculate new total
      const total = lineItems.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      updateData.total = total;
      updateData.lineItems = {
        create: lineItems.map((item: any, index: number) => ({
          category: item.category,
          preset: item.preset || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          sortOrder: index,
        })),
      };
    }

    if (status) {
      updateData.status = status;
    }

    const updated = await prisma.estimate.update({
      where: { id: params.estimateId },
      data: updateData,
      include: {
        contact: true,
        lineItems: true,
      },
    });

    // Log activity if status changed
    if (status && status !== estimate.status) {
      await prisma.activity.create({
        data: {
          contactId: estimate.contactId,
          userId: session.user.id,
          type: 'ESTIMATE_UPDATED',
          title: `Estimate status changed to ${status}`,
          description: `Estimate status updated from ${estimate.status} to ${status}`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating estimate:', error);
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
  }
}
