import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const sessions = await sql`
      SELECT u.id FROM "Session" s
      JOIN "User" u ON u.id = s."userId"
      WHERE s.token = ${token}
    `;

    if (sessions.length === 0) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
