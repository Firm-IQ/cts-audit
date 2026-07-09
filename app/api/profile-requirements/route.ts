import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const profileReqs = await prisma.profileRequirement.findMany({
      include: {
        profile: true,
        requirement: true
      }
    });
    return NextResponse.json({ success: true, profileRequirements: profileReqs });
  } catch (error) {
    console.error('GET ProfileRequirements API Error:', error);
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
    const { profileId, requirementId, state, overrideWeight } = body;

    if (!profileId || !requirementId || !state) {
      return NextResponse.json({ error: 'Profile ID, Requirement ID, and State are required' }, { status: 400 });
    }

    const profileReq = await prisma.profileRequirement.upsert({
      where: {
        profileId_requirementId: {
          profileId,
          requirementId
        }
      },
      update: {
        state,
        overrideWeight: overrideWeight !== undefined && overrideWeight !== null ? parseFloat(overrideWeight) : null
      },
      create: {
        profileId,
        requirementId,
        state,
        overrideWeight: overrideWeight !== undefined && overrideWeight !== null ? parseFloat(overrideWeight) : null
      },
      include: {
        profile: true,
        requirement: true
      }
    });

    return NextResponse.json({ success: true, profileRequirement: profileReq });
  } catch (error) {
    console.error('POST ProfileRequirements API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
