import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// ============================================================================
// DEVELOPMENT ONLY: Authentication Bypass Flag
// Set to false to re-enable strict session checking.
// ============================================================================
export const DEV_AUTH_BYPASS = true;

const JWT_SECRET = process.env.JWT_SECRET || 'continuity-transition-readiness-audit-jwt-secret-key-987654321';
const key = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  name?: string | null;
  role?: string | null;
  [key: string]: any;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Session lasts 24 hours
    .sign(key);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('cts_session')?.value;
  if (token) {
    const session = await verifyJWT(token);
    if (session) return session;
  }

  // DEVELOPMENT ONLY: Provide default Super Admin session when bypass is active
  if (DEV_AUTH_BYPASS) {
    try {
      const { prisma } = await import('@/lib/db');
      const admin = await prisma.user.findFirst({
        where: { email: 'curt@gocontinuity.com' },
      });
      if (admin) {
        return {
          userId: admin.id,
          email: admin.email,
          name: admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : (admin.firstName || 'Curt Kloc'),
          role: admin.role,
        };
      }
    } catch (e) {
      // In case DB is unavailable during edge execution or pre-rendering
    }

    return {
      userId: 'dev-admin',
      email: 'curt@gocontinuity.com',
      name: 'Curt Kloc',
      role: 'Super Admin',
    };
  }

  return null;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('cts_session');
}
