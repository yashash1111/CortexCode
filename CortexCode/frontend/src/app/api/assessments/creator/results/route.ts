import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const submissions = [
    {
      id: 'sub-1',
      candidateName: 'Alex Rivera',
      candidateEmail: 'alex.rivera@example.com',
      assessmentTitle: 'Full Stack Software Engineer Assessment',
      assessmentId: 'asm-fullstack-101',
      date: new Date(Date.now() - 3600 * 1000).toLocaleString(),
      score: 92,
      mcqScore: 95,
      codingScore: 90,
      subjectiveScore: 90,
      comprehensionScore: 90,
      status: 'Reviewed',
      proctoringViolations: 0,
      reviewedBy: 'AI System & Lead Faculty',
      answers: {}
    },
    {
      id: 'sub-2',
      candidateName: 'Jordan Chen',
      candidateEmail: 'jordan.chen@example.com',
      assessmentTitle: 'Python Algorithms & Data Structures Challenge',
      assessmentId: 'asm-python-algo-102',
      date: new Date(Date.now() - 7200 * 1000).toLocaleString(),
      score: 84,
      mcqScore: 80,
      codingScore: 90,
      subjectiveScore: 80,
      comprehensionScore: 85,
      status: 'Completed',
      proctoringViolations: 1,
      reviewedBy: null,
      answers: {}
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      submissions,
      totalSubmissions: 2,
      averageScore: 88
    }
  });
}
