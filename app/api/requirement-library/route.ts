import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const requirements = await prisma.requirementLibrary.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        documentTypes: true
      }
    });
    return NextResponse.json({ success: true, requirements });
  } catch (error) {
    console.error('GET RequirementLibrary API Error:', error);
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
    const { name, description, category, appliesToAccountTypes, required, critical, weight, displayOrder, active, documentTypeIds } = body;

    if (!name || !category || !appliesToAccountTypes) {
      return NextResponse.json({ error: 'Name, Category, and Applies To Account Types are required' }, { status: 400 });
    }

    const requirement = await prisma.requirementLibrary.create({
      data: {
        name,
        description: description || '',
        category,
        appliesToAccountTypes,
        required: required !== undefined ? required : true,
        critical: critical !== undefined ? critical : false,
        weight: weight !== undefined ? parseFloat(weight) : 1.0,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0,
        active: active !== undefined ? active : true,
        documentTypes: documentTypeIds && Array.isArray(documentTypeIds) 
          ? { connect: documentTypeIds.map((id: string) => ({ id })) }
          : undefined
      },
      include: {
        documentTypes: true
      }
    });

    // Also auto-assign this new requirement to the Master profile
    const masterProfile = await prisma.requirementProfile.findUnique({
      where: { name: 'CTS Master Requirements' }
    });

    if (masterProfile) {
      await prisma.profileRequirement.create({
        data: {
          profileId: masterProfile.id,
          requirementId: requirement.id,
          state: required ? 'Required' : 'Optional'
        }
      });
    }

    return NextResponse.json({ success: true, requirement });
  } catch (error) {
    console.error('POST RequirementLibrary API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
