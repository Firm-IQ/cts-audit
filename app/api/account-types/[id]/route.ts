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
    if (!session || session.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accountType = await prisma.accountType.findUnique({
      where: { id }
    });

    if (!accountType) {
      return NextResponse.json({ error: 'Account Type not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, active, displayOrder } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) {
      if (name !== accountType.name) {
        const existing = await prisma.accountType.findUnique({ where: { name } });
        if (existing) {
          return NextResponse.json({ error: 'Account Type with this name already exists' }, { status: 400 });
        }
      }
      dataToUpdate.name = name;
    }
    if (description !== undefined) dataToUpdate.description = description;
    if (active !== undefined) dataToUpdate.active = active;
    if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder);

    const updated = await prisma.accountType.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, accountType: updated });
  } catch (error) {
    console.error('PUT AccountTypes API Error:', error);
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
    if (!session || session.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accountType = await prisma.accountType.findUnique({
      where: { id }
    });

    if (!accountType) {
      return NextResponse.json({ error: 'Account Type not found' }, { status: 404 });
    }

    await prisma.accountType.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE AccountTypes API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
