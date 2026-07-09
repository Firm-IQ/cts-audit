import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { documentTypes } = body;

    if (!Array.isArray(documentTypes)) {
      return NextResponse.json({ error: 'documentTypes must be an array' }, { status: 400 });
    }

    const imported = [];
    for (const doc of documentTypes) {
      const { documentKey, name, category, description, typicalAccountTypes, critical, active, notes, displayOrder } = doc;
      if (!name || !documentKey || !category) continue;

      const saved = await prisma.documentType.upsert({
        where: { documentKey },
        update: {
          name,
          category,
          description: description || '',
          typicalAccountTypes: typicalAccountTypes || 'All',
          critical: critical !== undefined ? !!critical : false,
          active: active !== undefined ? !!active : true,
          notes: notes || '',
          displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0
        },
        create: {
          name,
          documentKey,
          category,
          description: description || '',
          typicalAccountTypes: typicalAccountTypes || 'All',
          critical: critical !== undefined ? !!critical : false,
          active: active !== undefined ? !!active : true,
          notes: notes || '',
          displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0
        }
      });
      imported.push(saved);
    }

    return NextResponse.json({ success: true, count: imported.length });
  } catch (error) {
    console.error('Import Document Types Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
