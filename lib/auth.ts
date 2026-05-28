import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';

const sql = neon(process.env.DATABASE_URL!);

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;

    const sessions = await sql`
      SELECT u.id, u.username
      FROM "Session" s
      JOIN "User" u ON u.id = s."userId"
      WHERE s.token = ${token}
    `;

    if (sessions.length === 0) return null;
    return sessions[0] as { id: string; username: string };
  } catch {
    return null;
  }
}
