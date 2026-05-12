# How to Setup Neon Database with Next.js

This guide explains how to connect a Next.js application to Neon PostgreSQL database using the official Neon serverless library.

## Prerequisites
- Next.js project (this guide uses App Router)
- Neon database account and connection string

## Step 1: Install Neon Serverless Library

```bash
npm install @neondatabase/serverless
```

## Step 2: Set Up Environment Variables

Create or update your `.env.local` file with your Neon database URL:

```env
DATABASE_URL="postgresql://neondb_owner:your_password@ep-your-host-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Step 3: Create Database Table

You can create tables using SQL commands. For this todo example:

```sql
CREATE TABLE "Todo" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);
```

## Step 4: Create API Routes

### GET/POST Todos Route
Create `app/api/todos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const todos = await sql`
      SELECT * FROM "Todo" 
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    const todos = await sql`
      INSERT INTO "Todo" (title, completed, "createdAt", "updatedAt")
      VALUES (${title.trim()}, false, NOW(), NOW())
      RETURNING *
    `;
    
    return NextResponse.json(todos[0], { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
```

### Individual Todo Operations Route
Create `app/api/todos/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { completed } = await request.json();
    const { id } = params;

    const todos = await sql`
      UPDATE "Todo" 
      SET completed = ${completed}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (todos.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(todos[0]);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const todos = await sql`
      DELETE FROM "Todo" 
      WHERE id = ${id}
      RETURNING *
    `;

    if (todos.length === 0) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
```

## Step 5: Database Schema Management

### Adding a New Table

To create a new table, use the `CREATE TABLE` SQL command:

```sql
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);
```

### Adding a New Field to Existing Table

To add a new column to an existing table:

```sql
ALTER TABLE "Todo" 
ADD COLUMN "description" TEXT;
```

### Modifying an Existing Field

To change the data type or constraints of an existing column:

```sql
-- Change data type
ALTER TABLE "Todo" 
ALTER COLUMN "title" TYPE VARCHAR(255);

-- Add NOT NULL constraint
ALTER TABLE "Todo" 
ALTER COLUMN "title" SET NOT NULL;

-- Add default value
ALTER TABLE "Todo" 
ALTER COLUMN "completed" SET DEFAULT false;
```

### Renaming a Column

To rename an existing column:

```sql
ALTER TABLE "Todo" 
RENAME COLUMN "title" TO "task";
```

### Dropping a Column

To remove a column from a table:

```sql
ALTER TABLE "Todo" 
DROP COLUMN "description";
```

### Creating Indexes

To improve query performance:

```sql
-- Create index on frequently queried column
CREATE INDEX "idx_todo_completed" ON "Todo" ("completed");

-- Create unique index
CREATE UNIQUE INDEX "idx_user_email" ON "User" ("email");
```

### Adding Foreign Keys

To create relationships between tables:

```sql
-- First add the reference column
ALTER TABLE "Todo" 
ADD COLUMN "userId" TEXT;

-- Then add the foreign key constraint
ALTER TABLE "Todo" 
ADD CONSTRAINT "fk_user" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;
```

### Running Schema Changes

You can execute these SQL commands in several ways:

#### Method 1: Neon Dashboard
1. Go to your Neon dashboard
2. Navigate to the SQL Editor
3. Enter your SQL commands
4. Click "Run"

#### Method 2: Using Neon Serverless in Code
Create a temporary API route for schema changes:

```typescript
// app/api/migrate/route.ts
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    await sql`ALTER TABLE "Todo" ADD COLUMN "priority" INTEGER DEFAULT 0`;
    return NextResponse.json({ success: true, message: 'Migration completed' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration failed', details: error },
      { status: 500 }
    );
  }
}
```

#### Method 3: Command Line
Use `psql` or any PostgreSQL client:

```bash
psql "postgresql://neondb_owner:your_password@ep-your-host.c-7.us-east-1.aws.neon.tech/neondb"
```

## Step 6: Run the Application

```bash
npm run dev
```

Your API endpoints are now ready to handle database operations.

## Key Benefits of Using Neon Serverless

1. **Simplified Setup**: No complex ORM configuration needed
2. **Direct SQL Control**: Write raw SQL queries for maximum control
3. **Neon Optimized**: Built specifically for Neon PostgreSQL
4. **Serverless Ready**: Perfect for serverless deployments
5. **Lightweight**: No additional ORM overhead

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution**: Make sure to install the package: `npm install @neondatabase/serverless`

### Issue: Database connection errors
**Solution**: Verify your DATABASE_URL environment variable is correct and accessible

### Issue: SQL syntax errors
**Solution**: Use double quotes for table and column names (`"Todo"`, `"id"`) to match PostgreSQL conventions

## Alternative: Using Prisma

If you prefer using an ORM, you can also use Prisma with Neon. However, the serverless approach shown above is simpler and more direct for basic database operations.

## Testing

To test your database connection:

1. **Test API Endpoints**: Use tools like Postman, curl, or browser dev tools to test your API routes:
   ```bash
   # Test GET all todos
   curl http://localhost:3000/api/todos

   # Test POST new todo
   curl -X POST http://localhost:3000/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title": "Test todo"}'
   ```

2. **Check Neon Dashboard**: Verify tables and data in your Neon dashboard's SQL Editor

3. **Monitor Console**: Check your Next.js server logs for any database errors

This confirms that your Neon database is properly connected and functional.
