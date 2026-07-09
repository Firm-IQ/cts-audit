import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const crmType = searchParams.get('crmType');

    if (!crmType) {
      return NextResponse.json({ error: 'crmType is required' }, { status: 400 });
    }

    const crmMapping = await prisma.crmMapping.findUnique({
      where: { crmType }
    });

    return NextResponse.json({ success: true, crmMapping });
  } catch (error) {
    console.error('GET crm-mappings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { crmType, mapping } = body;

    if (!crmType || !mapping) {
      return NextResponse.json({ error: 'crmType and mapping are required' }, { status: 400 });
    }

    const saved = await prisma.crmMapping.upsert({
      where: { crmType },
      update: {
        mapping: typeof mapping === 'string' ? mapping : JSON.stringify(mapping),
      },
      create: {
        crmType,
        mapping: typeof mapping === 'string' ? mapping : JSON.stringify(mapping),
      }
    });

    return NextResponse.json({ success: true, crmMapping: saved });
  } catch (error) {
    console.error('POST crm-mappings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
