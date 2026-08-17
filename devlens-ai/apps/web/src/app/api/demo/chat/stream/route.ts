import { NextRequest } from 'next/server';
import { generateAiResponseServer } from '@/lib/serverAiHelper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.content || '';
    const history = body.history || [];
    const mode = body.mode || 'chat';
    const userKeys = body.userKeys;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fullResponse = await generateAiResponseServer(message.trim(), history, mode, userKeys);

    // Stream SSE back to client
    const encoder = new TextEncoder();
    const words = fullResponse.split(' ');

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const wordChunk = (i === 0 ? '' : ' ') + words[i];
          const data = JSON.stringify({ content: wordChunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          await new Promise(r => setTimeout(r, 15));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Stream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
