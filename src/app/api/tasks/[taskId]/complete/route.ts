import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        completed: true,
        completedAt: new Date(),
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        contactId: task.contactId,
        type: 'TASK_COMPLETED',
        title: \`Task completed: \${task.title}\`,
        description: task.description || undefined,
        userId: session.user.id,
      },
    });

    // Update contact last activity
    await prisma.contact.update({
      where: { id: task.contactId },
      data: { lastActivity: new Date() },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
