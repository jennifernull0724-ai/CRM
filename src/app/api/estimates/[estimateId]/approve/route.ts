import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { estimateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is OWNER or ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only Owner/Admin can approve estimates' }, { status: 403 });
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: params.estimateId },
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (estimate.status === 'APPROVED') {
      return NextResponse.json({ error: 'Estimate already approved' }, { status: 400 });
    }

    const approved = await prisma.estimate.update({
      where: { id: params.estimateId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      include: {
        contact: true,
        lineItems: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        contactId: estimate.contactId,
        userId: session.user.id,
        type: 'ESTIMATE_APPROVED',
        title: 'Estimate approved',
        description: `Estimate approved with total $${estimate.total}`,
      },
    });

    return NextResponse.json(approved);
  } catch (error) {
    console.error('Error approving estimate:', error);
    return NextResponse.json({ error: 'Failed to approve estimate' }, { status: 500 });
  }
}
