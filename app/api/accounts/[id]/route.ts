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

    const existingAccount = await prisma.account.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      type,
      value,
      custodian,
      registration,
      notes,
      readinessStatus,
    } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Account Name and Type are required' }, { status: 400 });
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        name,
        type,
        value: value ? parseFloat(value) : null,
        custodian: custodian || '',
        registration: registration || '',
        notes: notes || '',
        readinessStatus: readinessStatus || 'Not Reviewed',
      },
      include: {
        checklistItems: true,
      },
    });

    return NextResponse.json({ success: true, account: updatedAccount });
  } catch (error) {
    console.error('Update Account API Error:', error);
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

    const existingAccount = await prisma.account.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Account API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
