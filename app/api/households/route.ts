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
      name,
      primaryClientName,
      secondaryClientName,
      totalAum,
      revenue,
      email,
      phone,
      address,
      notes,
      readinessStatus,
    } = body;

    if (!advisorId) {
      return NextResponse.json({ error: 'Advisor ID is required' }, { status: 400 });
    }
    if (!name || !primaryClientName) {
      return NextResponse.json({ error: 'Household Name and Primary Client Name are required' }, { status: 400 });
    }

    const household = await prisma.household.create({
      data: {
        advisorId,
        name,
        primaryClientName,
        secondaryClientName: secondaryClientName || '',
        totalAum: totalAum ? parseFloat(totalAum) : null,
        revenue: revenue ? parseFloat(revenue) : null,
        email: email || '',
        phone: phone || '',
        address: address || '',
        notes: notes || '',
        readinessStatus: readinessStatus || 'Not Reviewed',
      },
    });

    return NextResponse.json({ success: true, household });
  } catch (error) {
    console.error('Create Household API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const advisorId = searchParams.get('advisorId');

    if (!advisorId) {
      return NextResponse.json({ error: 'Advisor ID is required' }, { status: 400 });
    }

    const households = await prisma.household.findMany({
      where: { advisorId },
      include: {
        accounts: {
          include: {
            checklistItems: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, households });
  } catch (error) {
    console.error('Get Households API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
