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

    const existingHousehold = await prisma.household.findUnique({
      where: { id },
    });

    if (!existingHousehold) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
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

    if (!name || !primaryClientName) {
      return NextResponse.json({ error: 'Household Name and Primary Client Name are required' }, { status: 400 });
    }

    const updatedHousehold = await prisma.household.update({
      where: { id },
      data: {
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

    return NextResponse.json({ success: true, household: updatedHousehold });
  } catch (error) {
    console.error('Update Household API Error:', error);
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

    const existingHousehold = await prisma.household.findUnique({
      where: { id },
    });

    if (!existingHousehold) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    await prisma.household.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Household API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
