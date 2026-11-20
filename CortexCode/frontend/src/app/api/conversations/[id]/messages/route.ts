import { NextRequest, NextResponse } from 'next/server';
import { generateAiResponseServer } from '@/lib/serverAiHelper';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const content = body.content || body.message || '';
    const mode = body.mode || 'chat';

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({
        success: false,
        error: { message: 'Message content is required.' }
      }, { status: 400 });
    }

    const aiContent = await generateAiResponseServer(content.trim(), [], mode);

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: 'msg-' + Date.now(),
          role: 'user',
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        aiResponse: {
          id: 'msg-ai-' + Date.now(),
          role: 'assistant',
          content: aiContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process message';
    return NextResponse.json({
      success: false,
      error: { message }
    }, { status: 500 });
  }
}
