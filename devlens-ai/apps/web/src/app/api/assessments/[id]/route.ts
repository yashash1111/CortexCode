import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ASSESSMENTS, type Assessment } from '@/components/assessment/assessmentStorage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessment = DEFAULT_ASSESSMENTS.find(a => a.id === id);

  if (!assessment) {
    return NextResponse.json({ success: false, error: { message: 'Assessment not found' } }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { assessment }
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    return NextResponse.json({
      success: true,
      data: {
        assessment: { ...body, id, updatedAt: new Date().toISOString() },
        message: 'Assessment updated successfully'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    data: { id, message: 'Assessment deleted successfully' }
  });
}
