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

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // A Super Admin cannot disable or demote themselves to prevent getting locked out
    const isSelf = user.id === session.userId;

    const body = await request.json();
    const { firstName, lastName, email, role, active, triggerPasswordReset } = body;

    // Validate self-modification restrictions
    if (isSelf) {
      if (active === false) {
        return NextResponse.json({ error: 'You cannot disable your own Super Admin account' }, { status: 400 });
      }
      if (role && role !== 'Super Admin') {
        return NextResponse.json({ error: 'You cannot change your own role from Super Admin' }, { status: 400 });
      }
    }

    const dataToUpdate: any = {};
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (role !== undefined) dataToUpdate.role = role;
    if (active !== undefined) dataToUpdate.active = active;
    
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (existing) {
          return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    if (triggerPasswordReset) {
      dataToUpdate.password = ''; // Set to empty to trigger login set-password screen
      dataToUpdate.mustChangePassword = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        lastLogin: true,
        mustChangePassword: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update User API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
