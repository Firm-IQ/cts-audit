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

    const requirement = await prisma.requirementLibrary.findUnique({
      where: { id },
      include: { documentTypes: true }
    });

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, category, appliesToAccountTypes, required, critical, weight, displayOrder, active, documentTypeIds } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (category !== undefined) dataToUpdate.category = category;
    if (appliesToAccountTypes !== undefined) dataToUpdate.appliesToAccountTypes = appliesToAccountTypes;
    if (required !== undefined) dataToUpdate.required = required;
    if (critical !== undefined) dataToUpdate.critical = critical;
    if (weight !== undefined) dataToUpdate.weight = parseFloat(weight);
    if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder);
    if (active !== undefined) dataToUpdate.active = active;

    if (documentTypeIds !== undefined && Array.isArray(documentTypeIds)) {
      // Disconnect existing and connect new document types
      dataToUpdate.documentTypes = {
        disconnect: requirement.documentTypes.map(d => ({ id: d.id })),
        connect: documentTypeIds.map((dId: string) => ({ id: dId }))
      };
    }

    const updated = await prisma.requirementLibrary.update({
      where: { id },
      data: dataToUpdate,
      include: { documentTypes: true }
    });

    return NextResponse.json({ success: true, requirement: updated });
  } catch (error) {
    console.error('PUT RequirementLibrary API Error:', error);
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

    const requirement = await prisma.requirementLibrary.findUnique({
      where: { id }
    });

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    await prisma.requirementLibrary.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE RequirementLibrary API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
