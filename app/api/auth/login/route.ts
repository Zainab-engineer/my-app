import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { scryptSync, timingSafeEqual, randomUUID } from 'crypto';

const sql = neon(process.env.DATABASE_URL!);

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':');
  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(key, 'hex');
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const users = await sql`
      SELECT * FROM "User" WHERE username = ${username}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = randomUUID();
    const sessionId = randomUUID();

    await sql`
      INSERT INTO "Session" (id, "userId", token, "createdAt")
      VALUES (${sessionId}, ${user.id}, ${token}, NOW())
    `;

    const response = NextResponse.json({
      user: { id: user.id, username: user.username },
      token,
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
