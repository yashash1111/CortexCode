import { NextRequest, NextResponse } from 'next/server';
import { generateAiResponseServer } from '@/lib/serverAiHelper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.content || '';
    const history = body.history || [];
    const mode = body.mode || 'chat';

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({
        success: false,
        error: { message: 'Message is required.' }
      }, { status: 400 });
    }

    const content = await generateAiResponseServer(message.trim(), history, mode);

    return NextResponse.json({
      success: true,
      data: { content }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate response';
    return NextResponse.json({
      success: false,
      error: { message }
    }, { status: 500 });
  }
}
