import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';

const sql = neon(process.env.DATABASE_URL!);

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

const MODEL = 'openai/gpt-5-nano';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { message } = body as { message: string };
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const docs = await sql`SELECT * FROM "Document" WHERE id = ${id}`;
    if (docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];
    const chatMessages: ChatMessage[] = doc.chatMessages ?? [];
    const userMessage: ChatMessage = { role: 'user', content: message };
    const updatedMessages = [...chatMessages, userMessage];

    const systemPrompt = `You are a document writing assistant named Consul. Help the user write and refine their document titled "${doc.title}".

Current document HTML:
${doc.content || '<p></p>'}

Rules:
- Respond conversationally to the user.
- When the user asks you to write or modify content, include the NEW Full document HTML at the end of your response wrapped in <!--DOCUMENT_CONTENT--> tags like this:
  <!--DOCUMENT_CONTENT-->
  <h1>Updated Title</h1>
  <p>Updated content...</p>
  <!--/DOCUMENT_CONTENT-->
- Always include the COMPLETE document HTML, never just a fragment.
- Use proper HTML: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <ol>, <pre><code>, <blockquote>.
- If no changes were made, do not include the tags.`;

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 16384,
      stream: true,
    });

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        let saved = false;

        const saveDocument = async (text: string) => {
          if (saved) return;
          saved = true;

          const docMatch = text.match(/<!--DOCUMENT_CONTENT-->([\s\S]*?)<!--\/DOCUMENT_CONTENT-->/);
          const documentContent = docMatch ? docMatch[1].trim() : doc.content;
          const cleanText = text.replace(/<!--DOCUMENT_CONTENT-->[\s\S]*?<!--\/DOCUMENT_CONTENT-->/, '').trim();

          const assistantMessage: ChatMessage = { role: 'assistant', content: cleanText };
          const finalMessages = [...updatedMessages, assistantMessage];

          await sql`
            UPDATE "Document"
            SET content = ${documentContent},
                "chatMessages" = ${JSON.stringify(finalMessages)}::jsonb,
                "updatedAt" = NOW()
            WHERE id = ${id}
          `;

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'document_content', content: documentContent })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', chatMessages: finalMessages })}\n\n`));
        };

        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              fullText += delta.content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta.content })}\n\n`));
            }
          }

          await saveDocument(fullText);
        } catch (err) {
          await saveDocument(fullText);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
