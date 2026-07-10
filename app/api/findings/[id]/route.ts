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

    const existingFinding = await prisma.finding.findUnique({
      where: { id },
    });

    if (!existingFinding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      category,
      title,
      description,
      severity,
      impact,
      recommendation,
      owner,
      status,
      reviewerNotes,
      evidenceSummary,
      priority,
      assignedTo,
      dueDate,
      resolutionNotes,
    } = body;

    // Validate required fields
    if (!title || !category || !severity || !owner || !status) {
      return NextResponse.json(
        { error: 'Category, Title, Severity, Owner, and Status are required' },
        { status: 400 }
      );
    }

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

    const updatedFinding = await prisma.finding.update({
      where: { id },
      data: {
        category,
        title,
        description: description || '',
        severity,
        impact: impact || '',
        recommendation: recommendation || '',
        owner,
        status,
        reviewerNotes: reviewerNotes || '',
        evidenceSummary: evidenceSummary || '',
        priority: priority || 'Normal',
        assignedTo: assignedTo || 'Advisor Staff',
        dueDate: dueDate ? new Date(dueDate) : null,
        resolutionNotes: resolutionNotes || '',
      },
    });

    // Touch parent assessment
    await prisma.assessment.update({
      where: { id: existingFinding.assessmentId },
      data: {
        lastUpdatedBy: userFullName,
        updatedAt: new Date()
      }
    });

    // Log Activity
    if (status !== existingFinding.status) {
      await prisma.activityLog.create({
        data: {
          advisorId: (await prisma.assessment.findUnique({ where: { id: existingFinding.assessmentId } }))?.advisorId || '',
          householdId: existingFinding.householdId,
          accountId: existingFinding.accountId,
          findingId: id,
          action: status === 'Resolved' || status === 'Verified' ? 'Resolve' : 'Update',
          objectAffected: 'Finding',
          description: `Finding "${title}" marked as ${status} by ${userFullName}`,
          previousValue: existingFinding.status,
          newValue: status,
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    } else {
      await prisma.activityLog.create({
        data: {
          advisorId: (await prisma.assessment.findUnique({ where: { id: existingFinding.assessmentId } }))?.advisorId || '',
          householdId: existingFinding.householdId,
          accountId: existingFinding.accountId,
          findingId: id,
          action: 'Update',
          objectAffected: 'Finding',
          description: `Finding "${title}" updated by ${userFullName}`,
          createdByUserId: session.userId,
          createdByUserFullName: userFullName
        }
      });
    }

    return NextResponse.json({ success: true, finding: updatedFinding });
  } catch (error) {
    console.error('Update Finding API Error:', error);
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

    const existingFinding = await prisma.finding.findUnique({
      where: { id },
    });

    if (!existingFinding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const editorUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    const userFullName = editorUser ? `${editorUser.firstName || ''} ${editorUser.lastName || ''}`.trim() : session.name;

    const advisorId = (await prisma.assessment.findUnique({ where: { id: existingFinding.assessmentId } }))?.advisorId || '';

    // Touch parent assessment
    await prisma.assessment.update({
      where: { id: existingFinding.assessmentId },
      data: {
        lastUpdatedBy: userFullName,
        updatedAt: new Date()
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        advisorId,
        householdId: existingFinding.householdId,
        accountId: existingFinding.accountId,
        action: 'Delete',
        objectAffected: 'Finding',
        description: `Finding "${existingFinding.title}" deleted by ${userFullName}`,
        createdByUserId: session.userId,
        createdByUserFullName: userFullName
      }
    });

    await prisma.finding.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Finding API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
