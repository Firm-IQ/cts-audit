import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const profiles = await prisma.requirementProfile.findMany({
      orderBy: { name: 'asc' },
      include: {
        profileRequirements: {
          include: {
            requirement: true
          }
        }
      }
    });
    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    console.error('GET RequirementProfiles API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Profile Name is required' }, { status: 400 });
    }

    const existing = await prisma.requirementProfile.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: 'Requirement Profile with this name already exists' }, { status: 400 });
    }

    const profile = await prisma.requirementProfile.create({
      data: {
        name,
        description: description || '',
        active: active !== undefined ? active : true
      }
    });

    // Automatically clone all master profile assignments to the new profile as default values
    const masterProfile = await prisma.requirementProfile.findUnique({
      where: { name: 'CTS Master Requirements' },
      include: { profileRequirements: true }
    });

    if (masterProfile && masterProfile.id !== profile.id) {
      const defaultAssignments = masterProfile.profileRequirements.map(pr => ({
        profileId: profile.id,
        requirementId: pr.requirementId,
        state: pr.state,
        overrideWeight: pr.overrideWeight
      }));

      await prisma.profileRequirement.createMany({
        data: defaultAssignments
      });
    }

    const populated = await prisma.requirementProfile.findUnique({
      where: { id: profile.id },
      include: {
        profileRequirements: {
          include: {
            requirement: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, profile: populated });
  } catch (error) {
    console.error('POST RequirementProfiles API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
