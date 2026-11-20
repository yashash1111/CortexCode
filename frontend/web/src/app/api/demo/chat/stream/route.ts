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

    // Stream SSE back to client at ultra-high speed
    const encoder = new TextEncoder();
    const words = fullResponse.split(' ');

    const stream = new ReadableStream({
      async start(controller) {
        const chunkSize = 2; // Stream 2 words per tick for ultra-fast, smooth rendering
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize);
          const chunkStr = (i === 0 ? '' : ' ') + chunkWords.join(' ');
          const data = JSON.stringify({ content: chunkStr });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          await new Promise(r => setTimeout(r, 3));
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
