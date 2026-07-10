import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const advisor = await prisma.advisor.findUnique({
      where: { id },
      select: {
        id: true,
        reportToken: true,
        reportEnabled: true,
        reportLastViewed: true,
        initialScore: true,
        assessments: {
          orderBy: { createdAt: 'asc' },
          select: { overallReadinessScore: true }
        }
      }
    });

    if (!advisor) {
      return NextResponse.json({ error: 'Advisor not found' }, { status: 404 });
    }

    // If initialScore is not set, set it to the first assessment score or current score
    let initialScore = advisor.initialScore;
    if (initialScore === null && advisor.assessments.length > 0) {
      initialScore = advisor.assessments[0].overallReadinessScore;
      await prisma.advisor.update({
        where: { id },
        data: { initialScore }
      });
    }

    return NextResponse.json({
      reportToken: advisor.reportToken,
      reportEnabled: advisor.reportEnabled,
      reportLastViewed: advisor.reportLastViewed,
      initialScore: initialScore || 0
    });
  } catch (error) {
    console.error('Get Live Report API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, enabled } = body;

    const advisor = await prisma.advisor.findUnique({
      where: { id },
      include: { assessments: { orderBy: { createdAt: 'asc' } } }
    });

    if (!advisor) {
      return NextResponse.json({ error: 'Advisor not found' }, { status: 404 });
    }

    let initialScore = advisor.initialScore;
    if (initialScore === null && advisor.assessments.length > 0) {
      initialScore = advisor.assessments[0].overallReadinessScore;
    }

    if (action === 'toggle') {
      const updated = await prisma.advisor.update({
        where: { id },
        data: {
          reportEnabled: enabled,
          initialScore
        }
      });
      return NextResponse.json({ success: true, reportEnabled: updated.reportEnabled });
    }

    if (action === 'regenerate') {
      const newToken = randomUUID();
      const updated = await prisma.advisor.update({
        where: { id },
        data: {
          reportToken: newToken,
          reportEnabled: true, // Auto-enable on regeneration
          initialScore
        }
      });
      return NextResponse.json({
        success: true,
        reportToken: updated.reportToken,
        reportEnabled: updated.reportEnabled
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update Live Report API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
