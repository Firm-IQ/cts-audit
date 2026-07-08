import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      advisorId,
      contactType,
      name,
      title,
      company,
      email,
      phone,
      mobilePhone,
      preferredContactMethod,
      roleInTransition,
      notes,
      primaryContact,
    } = body;

    // Validate required fields
    if (!advisorId) {
      return NextResponse.json({ error: 'Advisor ID is required' }, { status: 400 });
    }
    if (!name || !contactType) {
      return NextResponse.json({ error: 'Name and Contact Type are required' }, { status: 400 });
    }

    // If marked as primary contact, reset other contacts for this advisor
    if (primaryContact) {
      await prisma.contact.updateMany({
        where: { advisorId, primaryContact: true },
        data: { primaryContact: false },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        advisorId,
        contactType,
        name,
        title: title || '',
        company: company || '',
        email: email || '',
        phone: phone || '',
        mobilePhone: mobilePhone || '',
        preferredContactMethod: preferredContactMethod || 'Email',
        roleInTransition: roleInTransition || '',
        notes: notes || '',
        primaryContact: Boolean(primaryContact),
      },
    });

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Create Contact API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
