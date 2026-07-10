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

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Authorization: Creator or Admin
    const isCreator = note.createdByUserId === session.userId;
    const isAdmin = session.role === 'Super Admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { noteBody, noteType, visibility } = body;

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

    // Update Note
    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        noteBody: noteBody !== undefined ? noteBody : note.noteBody,
        noteType: noteType !== undefined ? noteType : note.noteType,
        visibility: visibility !== undefined ? visibility : note.visibility,
        editedByUserId: session.userId,
        editedAt: new Date()
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        editedBy: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        advisorId: note.advisorId,
        householdId: note.householdId,
        accountId: note.accountId,
        findingId: note.findingId,
        checklistItemId: note.checklistItemId,
        noteId: note.id,
        action: 'Edit',
        objectAffected: 'Note',
        description: `Note edited by ${userFullName}`,
        createdByUserId: session.userId,
        createdByUserFullName: userFullName
      }
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Update Note API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    const note = await prisma.note.findUnique({
      where: { id }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const isCreator = note.createdByUserId === session.userId;
    const isAdmin = session.role === 'Super Admin';

    // Verify deletion authorization
    if (permanent) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only administrators may permanently delete notes' }, { status: 403 });
      }
      
      // Permanent Delete
      await prisma.note.delete({
        where: { id }
      });
    } else {
      // Soft Delete (Allow creator or admin)
      if (!isCreator && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.note.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    }

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

    // Create Activity Log
    await prisma.activityLog.create({
      data: {
        advisorId: note.advisorId,
        householdId: note.householdId,
        accountId: note.accountId,
        findingId: note.findingId,
        checklistItemId: note.checklistItemId,
        noteId: note.id,
        action: permanent ? 'Permanent Delete' : 'Delete',
        objectAffected: 'Note',
        description: `Note deleted by ${userFullName}`,
        createdByUserId: session.userId,
        createdByUserFullName: userFullName
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Note API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
