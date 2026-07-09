import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, hashPassword, signJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, newPassword, confirmPassword, isSetup } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Ensure the default Super Admin user exists if no users are present
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      await prisma.user.create({
        data: {
          email: 'curt@gocontinuity.com',
          firstName: 'Curt',
          lastName: 'Kloc',
          role: 'Super Admin',
          active: true,
          password: '', // Empty password denoting first-time setup
          mustChangePassword: true,
        }
      });
    }

    // 2. Query user from database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 3. Check if user is active
    if (!user.active) {
      return NextResponse.json(
        { error: 'This account has been disabled. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // 4. Handle first-time password setup (where password is empty)
    const isFirstTimeSetup = user.password === '' && user.mustChangePassword;

    if (isFirstTimeSetup) {
      if (isSetup) {
        // Client is submitting the password setup form
        if (!newPassword || !confirmPassword) {
          return NextResponse.json(
            { error: 'New password and confirmation are required' },
            { status: 400 }
          );
        }
        if (newPassword !== confirmPassword) {
          return NextResponse.json(
            { error: 'Passwords do not match' },
            { status: 400 }
          );
        }
        if (newPassword.length < 6) {
          return NextResponse.json(
            { error: 'Password must be at least 6 characters long' },
            { status: 400 }
          );
        }

        // Hash and save the password
        const hashedPassword = await hashPassword(newPassword);
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            mustChangePassword: false,
            lastLogin: new Date(),
          }
        });

        // Sign session JWT
        const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || 'Auditor';
        const token = await signJWT({
          userId: user.id,
          email: user.email,
          name,
          role: user.role,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set({
          name: 'cts_session',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
      } else {
        // Client entered email on first login attempt; redirect to setup password
        return NextResponse.json({
          mustSetPassword: true,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Auditor',
        });
      }
    }

    // 5. Standard Login flow
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update lastLogin datetime
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Sign JWT
    const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || 'Auditor';
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name,
      role: user.role,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'cts_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
