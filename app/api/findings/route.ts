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
      assessmentId,
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
    if (!assessmentId) {
      return NextResponse.json({ error: 'Assessment ID is required' }, { status: 400 });
    }
    if (!title || !category || !severity || !owner || !status) {
      return NextResponse.json(
        { error: 'Category, Title, Severity, Owner, and Status are required' },
        { status: 400 }
      );
    }

    const finding = await prisma.finding.create({
      data: {
        assessmentId,
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

    return NextResponse.json({ success: true, finding });
  } catch (error) {
    console.error('Create Finding API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
