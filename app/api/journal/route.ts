import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      advisorId,
      title,
      entryType,
      date,
      summary,
      detailedNotes,
      confidential,
      pinned,
    } = body;

    // Validate required fields
    if (!advisorId) {
      return NextResponse.json({ error: 'Advisor ID is required' }, { status: 400 });
    }
    if (!title || !entryType || !date) {
      return NextResponse.json({ error: 'Title, Entry Type, and Date are required' }, { status: 400 });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        advisorId,
        title,
        entryType,
        date,
        author: session.name || session.email,
        summary: summary || '',
        detailedNotes: detailedNotes || '',
        confidential: Boolean(confidential),
        pinned: Boolean(pinned),
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Create Journal Entry API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
