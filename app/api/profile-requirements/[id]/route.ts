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

    const profileReq = await prisma.profileRequirement.findUnique({
      where: { id }
    });

    if (!profileReq) {
      return NextResponse.json({ error: 'Profile Requirement assignment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { state, overrideWeight } = body;

    const dataToUpdate: any = {};
    if (state !== undefined) dataToUpdate.state = state;
    if (overrideWeight !== undefined) {
      dataToUpdate.overrideWeight = overrideWeight !== null ? parseFloat(overrideWeight) : null;
    }

    const updated = await prisma.profileRequirement.update({
      where: { id },
      data: dataToUpdate,
      include: {
        profile: true,
        requirement: true
      }
    });

    return NextResponse.json({ success: true, profileRequirement: updated });
  } catch (error) {
    console.error('PUT ProfileRequirements API Error:', error);
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

    const profileReq = await prisma.profileRequirement.findUnique({
      where: { id }
    });

    if (!profileReq) {
      return NextResponse.json({ error: 'Profile Requirement assignment not found' }, { status: 404 });
    }

    await prisma.profileRequirement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE ProfileRequirements API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
