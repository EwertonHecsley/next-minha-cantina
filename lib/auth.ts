import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'cantina_session';
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-session-secret-change-in-production'
);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export async function createSession(userId: string, email: string, role: string) {
  const token = await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function getUser(session?: SessionPayload) {
  const user = session ?? (await getSession());
  if (!user) return null;

  const [found] = await db.select().from(users).where(eq(users.id, user.userId)).limit(1);
  if (!found) return null;

  return found;
}

export async function handleLogin(req: Request) {
  const { email, password } = await req.json();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
  }

  await createSession(user.id, user.email, user.role);

  return NextResponse.json({ success: true, role: user.role, email: user.email });
}
