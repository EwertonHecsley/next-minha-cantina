import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'cantina_session';
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-session-secret-change-in-production'
);

interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Already on login page — allow through
  if (pathname === '/login') {
    const session = await getSessionFromRequest(req);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Check all non-API routes for auth
  if (!pathname.startsWith('/api/')) {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};