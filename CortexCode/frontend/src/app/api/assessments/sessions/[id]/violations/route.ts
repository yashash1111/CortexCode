import { NextRequest, NextResponse } from 'next/server';

const sessionViolations: Record<string, { fullscreen: number; tabSwitch: number; total: number }> = {};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const type = body.type || 'FULLSCREEN_EXIT';

  if (!sessionViolations[id]) {
    sessionViolations[id] = { fullscreen: 0, tabSwitch: 0, total: 0 };
  }

  if (type === 'FULLSCREEN_EXIT') {
    sessionViolations[id].fullscreen += 1;
  } else {
    sessionViolations[id].tabSwitch += 1;
  }

  sessionViolations[id].total += 1;
  const isTerminated = sessionViolations[id].total >= 3;

  return NextResponse.json({
    success: true,
    data: {
      sessionId: id,
      type,
      totalViolations: sessionViolations[id].total,
      terminated: isTerminated,
      terminationReason: isTerminated ? 'Exceeded maximum permitted proctoring violations (3/3).' : null
    }
  });
}
