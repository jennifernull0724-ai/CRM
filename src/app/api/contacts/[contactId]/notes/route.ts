import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { contactId: params.contactId },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Extract @mentions (simple regex for @username)
    const mentionMatches = content.match(/@(\w+)/g) || [];
    const mentions = mentionMatches.map((m: string) => m.substring(1));

    // Create note
    const note = await prisma.note.create({
      data: {
        contactId: params.contactId,
        content,
        mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
        authorId: session.user.id,
      },
      include: {
        author: {
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
        contactId: params.contactId,
        type: 'NOTE',
        title: 'Note added',
        description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        userId: session.user.id,
      },
    });

    // Update contact last activity
    await prisma.contact.update({
      where: { id: params.contactId },
      data: { lastActivity: new Date() },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
