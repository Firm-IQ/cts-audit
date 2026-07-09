import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const docTypes = await prisma.documentType.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    return NextResponse.json({ success: true, documentTypes: docTypes });
  } catch (error) {
    console.error('GET DocumentTypes API Error:', error);
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
    const { name, category, description, active, displayOrder } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and Category are required' }, { status: 400 });
    }

    // Check unique name
    const existing = await prisma.documentType.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: 'Document Type with this name already exists' }, { status: 400 });
    }

    const docType = await prisma.documentType.create({
      data: {
        name,
        category,
        description: description || '',
        active: active !== undefined ? active : true,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0
      }
    });

    return NextResponse.json({ success: true, documentType: docType });
  } catch (error) {
    console.error('POST DocumentTypes API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
