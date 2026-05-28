import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`
    ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "chatMessages" JSONB NOT NULL DEFAULT '[]'::jsonb;
  `;
  console.log('Added chatMessages column to Document table');
}

main().catch(console.error);
