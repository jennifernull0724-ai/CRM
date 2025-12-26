import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, lineItems } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Calculate total from line items
    const total = (lineItems || []).reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const estimate = await prisma.estimate.create({
      data: {
        contactId,
        ownerId: session.user.id,
        status: 'DRAFT',
        total,
        version: 1,
        lineItems: {
          create: (lineItems || []).map((item: any, index: number) => ({
            category: item.category,
            preset: item.preset || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        lineItems: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        contactId,
        userId: session.user.id,
        type: 'ESTIMATE_CREATED',
        title: 'Estimate created',
        description: `Estimate created with ${lineItems?.length || 0} line items`,
      },
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }
}
