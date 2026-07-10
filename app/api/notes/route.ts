import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const advisorId = searchParams.get('advisorId');
    const householdId = searchParams.get('householdId');
    const accountId = searchParams.get('accountId');
    const findingId = searchParams.get('findingId');
    const checklistItemId = searchParams.get('checklistItemId');

    if (!advisorId) {
      return NextResponse.json({ error: 'Missing advisorId' }, { status: 400 });
    }

    // Build filter
    const where: any = {
      advisorId,
      deletedAt: null // Only active notes
    };

    if (householdId) where.householdId = householdId;
    if (accountId) where.accountId = accountId;
    if (findingId) where.findingId = findingId;
    if (checklistItemId) where.checklistItemId = checklistItemId;

    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        editedBy: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Fetch Notes API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      advisorId, 
      householdId, 
      accountId, 
      findingId, 
      checklistItemId, 
      noteType, 
      noteBody, 
      visibility 
    } = body;

    if (!advisorId || !noteType || !noteBody || !visibility) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine the acting user's full name from session
    const creatorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = creatorUser ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() : session.name;

    // Create Note
    const note = await prisma.note.create({
      data: {
        advisorId,
        householdId: householdId || null,
        accountId: accountId || null,
        findingId: findingId || null,
        checklistItemId: checklistItemId || null,
        noteType,
        noteBody,
        visibility,
        createdByUserId: session.userId
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        advisorId,
        householdId: householdId || null,
        accountId: accountId || null,
        findingId: findingId || null,
        checklistItemId: checklistItemId || null,
        noteId: note.id,
        action: 'Create',
        objectAffected: 'Note',
        description: `Note added by ${userFullName}`,
        createdByUserId: session.userId,
        createdByUserFullName: userFullName
      }
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Create Note API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
