import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import { scryptSync, randomBytes } from 'crypto';

const sql = neon(process.env.DATABASE_URL!);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "User_username_key" UNIQUE ("username")
    );
  `;
  console.log('Created User table');

  await sql`
    CREATE TABLE IF NOT EXISTS "Session" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Session_token_key" UNIQUE ("token")
    );
  `;
  console.log('Created Session table');

  const existing = await sql`SELECT id FROM "User" WHERE username = 'admin'`;
  if (existing.length === 0) {
    const id = randomUUID();
    const hash = hashPassword('admin');
    await sql`
      INSERT INTO "User" (id, username, "passwordHash", "createdAt")
      VALUES (${id}, 'admin', ${hash}, NOW());
    `;
    console.log('Seeded admin user');
  } else {
    console.log('Admin user already exists');
  }
}

main().catch(console.error);
