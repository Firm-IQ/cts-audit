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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
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
    if (!name || !contactType) {
      return NextResponse.json({ error: 'Name and Contact Type are required' }, { status: 400 });
    }

    // If marked as primary contact, reset other contacts for this advisor
    if (primaryContact) {
      await prisma.contact.updateMany({
        where: { advisorId: existingContact.advisorId, NOT: { id }, primaryContact: true },
        data: { primaryContact: false },
      });
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
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

    return NextResponse.json({ success: true, contact: updatedContact });
  } catch (error) {
    console.error('Update Contact API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Contact API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
