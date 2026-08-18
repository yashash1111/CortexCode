import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ASSESSMENTS, type Assessment } from '@/components/assessment/assessmentStorage';

// In-memory store for deployed instance runtime
let inMemoryAssessments: Assessment[] = [...DEFAULT_ASSESSMENTS];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') || 'candidate';

  let results = inMemoryAssessments;
  if (role === 'candidate') {
    results = inMemoryAssessments.filter(a => a.status === 'PUBLISHED');
  }

  return NextResponse.json({
    success: true,
    data: {
      assessments: results,
      total: results.length
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newAssessment: Assessment = {
      id: body.id || `asm-${Date.now()}`,
      title: body.title || 'Untitled Assessment',
      description: body.description || '',
      durationMinutes: body.durationMinutes || 60,
      difficulty: body.difficulty || 'Intermediate',
      subjects: body.subjects || ['Computer Science'],
      questionTypes: body.questionTypes || ['MCQ', 'Coding'],
      sections: body.sections || [],
      canNavigateBackwards: body.canNavigateBackwards ?? true,
      questions: body.questions || [],
      status: body.status || 'PUBLISHED',
      totalPoints: body.totalPoints || (body.questions?.reduce((acc: number, q: any) => acc + (q.points || 10), 0) || 100),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = inMemoryAssessments.findIndex(a => a.id === newAssessment.id);
    if (existingIndex >= 0) {
      inMemoryAssessments[existingIndex] = newAssessment;
    } else {
      inMemoryAssessments.unshift(newAssessment);
    }

    return NextResponse.json({
      success: true,
      data: {
        assessment: newAssessment,
        message: 'Assessment saved and published successfully.'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 400 });
  }
}
