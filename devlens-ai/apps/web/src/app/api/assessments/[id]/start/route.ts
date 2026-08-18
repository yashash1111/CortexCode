import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const durationMinutes = 60;
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  const session = {
    id: `sess-${id}-${Date.now()}`,
    assessmentId: id,
    durationMinutes,
    expiresAt,
    status: 'ACTIVE',
    currentQuestionIndex: 0,
    fullscreenExitCount: 0,
    tabSwitchCount: 0
  };

  return NextResponse.json({
    success: true,
    data: { session }
  });
}
