import { NextRequest, NextResponse } from 'next/server';
import { generateAiResponseServer } from '@/lib/serverAiHelper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.content || '';
    const history = body.history || [];
    const mode = body.mode || 'chat';
    const userKeys = body.userKeys;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({
        success: false,
        error: { message: 'Message is required.' }
      }, { status: 400 });
    }

    const content = await generateAiResponseServer(message.trim(), history, mode, userKeys);

    return NextResponse.json({
      success: true,
      data: { content }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: { message: err.message || 'Failed to generate demo response' }
    }, { status: 500 });
  }
}
