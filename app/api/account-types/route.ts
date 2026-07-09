import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const accountTypes = await prisma.accountType.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    return NextResponse.json({ success: true, accountTypes });
  } catch (error) {
    console.error('GET AccountTypes API Error:', error);
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
    const { name, description, active, displayOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Account Type Name is required' }, { status: 400 });
    }

    const existing = await prisma.accountType.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: 'Account Type with this name already exists' }, { status: 400 });
    }

    const accountType = await prisma.accountType.create({
      data: {
        name,
        description: description || '',
        active: active !== undefined ? active : true,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0
      }
    });

    return NextResponse.json({ success: true, accountType });
  } catch (error) {
    console.error('POST AccountTypes API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
