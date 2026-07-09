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

    const docType = await prisma.documentType.findUnique({
      where: { id }
    });

    if (!docType) {
      return NextResponse.json({ error: 'Document Type not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, documentKey, category, description, typicalAccountTypes, critical, active, notes, displayOrder } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) {
      if (name !== docType.name) {
        const existing = await prisma.documentType.findUnique({ where: { name } });
        if (existing) {
          return NextResponse.json({ error: 'Document Type with this name already exists' }, { status: 400 });
        }
      }
      dataToUpdate.name = name;
    }
    if (documentKey !== undefined) {
      if (documentKey !== docType.documentKey) {
        const existing = await prisma.documentType.findUnique({ where: { documentKey } });
        if (existing) {
          return NextResponse.json({ error: 'Document Type with this Document Key already exists' }, { status: 400 });
        }
      }
      dataToUpdate.documentKey = documentKey;
    }
    if (category !== undefined) dataToUpdate.category = category;
    if (description !== undefined) dataToUpdate.description = description;
    if (typicalAccountTypes !== undefined) dataToUpdate.typicalAccountTypes = typicalAccountTypes;
    if (critical !== undefined) dataToUpdate.critical = !!critical;
    if (active !== undefined) dataToUpdate.active = !!active;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder);

    const updated = await prisma.documentType.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, documentType: updated });
  } catch (error) {
    console.error('PUT DocumentTypes API Error:', error);
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

    const docType = await prisma.documentType.findUnique({
      where: { id }
    });

    if (!docType) {
      return NextResponse.json({ error: 'Document Type not found' }, { status: 404 });
    }

    await prisma.documentType.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE DocumentTypes API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
