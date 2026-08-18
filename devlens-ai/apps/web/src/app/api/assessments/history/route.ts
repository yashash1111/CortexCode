import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const history = [
    {
      id: 'hist-1',
      sessionId: 'sess-fullstack-101',
      assessmentTitle: 'Full Stack Software Engineer Assessment',
      date: new Date(Date.now() - 24 * 3600 * 1000).toLocaleDateString(),
      score: 88,
      status: 'Completed',
      totalPoints: 100
    }
  ];

  return NextResponse.json({
    success: true,
    data: { history }
  });
}
