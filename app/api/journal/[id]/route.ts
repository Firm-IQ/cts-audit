import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Journal Entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      entryType,
      date,
      summary,
      detailedNotes,
      confidential,
      pinned,
    } = body;

    // Validate required fields
    if (!title || !entryType || !date) {
      return NextResponse.json({ error: 'Title, Entry Type, and Date are required' }, { status: 400 });
    }

    const updatedEntry = await prisma.journalEntry.update({
      where: { id },
      data: {
        title,
        entryType,
        date,
        summary: summary || '',
        detailedNotes: detailedNotes || '',
        confidential: Boolean(confidential),
        pinned: Boolean(pinned),
      },
    });

    return NextResponse.json({ success: true, entry: updatedEntry });
  } catch (error) {
    console.error('Update Journal Entry API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Journal Entry not found' }, { status: 404 });
    }

    await prisma.journalEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Journal Entry API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
