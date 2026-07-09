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

    const profile = await prisma.requirementProfile.findUnique({
      where: { id }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Protect master profile from being deleted or renamed
    const isMaster = profile.name === 'CTS Master Requirements';

    const body = await request.json();
    const { name, description, active } = body;

    const dataToUpdate: any = {};
    if (name !== undefined && !isMaster) {
      if (name !== profile.name) {
        const existing = await prisma.requirementProfile.findUnique({ where: { name } });
        if (existing) {
          return NextResponse.json({ error: 'Profile with this name already exists' }, { status: 400 });
        }
      }
      dataToUpdate.name = name;
    }
    if (description !== undefined) dataToUpdate.description = description;
    if (active !== undefined && !isMaster) dataToUpdate.active = active;

    const updated = await prisma.requirementProfile.update({
      where: { id },
      data: dataToUpdate,
      include: {
        profileRequirements: {
          include: {
            requirement: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error('PUT RequirementProfiles API Error:', error);
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

    const profile = await prisma.requirementProfile.findUnique({
      where: { id }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.name === 'CTS Master Requirements') {
      return NextResponse.json({ error: 'You cannot delete the master requirements profile' }, { status: 400 });
    }

    await prisma.requirementProfile.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE RequirementProfiles API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
