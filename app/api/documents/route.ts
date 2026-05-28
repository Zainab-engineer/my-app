import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';

    const documents = await sql`
      SELECT * FROM "Document"
      WHERE ${search ? sql`LOWER("title") LIKE LOWER(${'%' + search + '%'})` : sql`TRUE`}
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const documents = await sql`
      INSERT INTO "Document" (id, title, content, "createdAt", "updatedAt")
      VALUES (${id}, ${title.trim()}, ${content ?? ''}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json(documents[0], { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
