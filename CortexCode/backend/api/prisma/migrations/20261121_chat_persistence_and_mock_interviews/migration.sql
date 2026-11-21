-- AlterTable Conversation
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'New Conversation',
  ADD COLUMN IF NOT EXISTS "model" TEXT NOT NULL DEFAULT 'CortexCode AI (GPT-4o)',
  ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");

-- AlterTable Message
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "model" TEXT,
  ADD COLUMN IF NOT EXISTS "attachments" JSONB,
  ADD COLUMN IF NOT EXISTS "feedback" TEXT;

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateTable MockInterviewSession
CREATE TABLE IF NOT EXISTS "MockInterviewSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "role" TEXT NOT NULL,
  "experienceLevel" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "currentDifficulty" TEXT,
  "interviewType" TEXT NOT NULL,
  "preferredLanguage" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "questionLimit" INTEGER NOT NULL DEFAULT 10,
  "questionsAsked" INTEGER NOT NULL DEFAULT 0,
  "currentTopic" TEXT,
  "skills" JSONB,
  "jobDescription" TEXT,
  "projectInfo" TEXT,
  "topics" JSONB,
  "status" TEXT NOT NULL DEFAULT 'created',
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MockInterviewSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MockInterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MockInterviewSession_userId_createdAt_idx" ON "MockInterviewSession"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MockInterviewSession_status_idx" ON "MockInterviewSession"("status");

-- CreateTable MockInterviewMessage
CREATE TABLE IF NOT EXISTS "MockInterviewMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "questionNumber" INTEGER,
  "topic" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockInterviewMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MockInterviewMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MockInterviewMessage_sessionId_createdAt_idx" ON "MockInterviewMessage"("sessionId", "createdAt");

-- CreateTable MockInterviewEvaluation
CREATE TABLE IF NOT EXISTS "MockInterviewEvaluation" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "messageId" TEXT,
  "questionNumber" INTEGER,
  "correctnessScore" DOUBLE PRECISION NOT NULL,
  "communicationScore" DOUBLE PRECISION NOT NULL,
  "problemSolvingScore" DOUBLE PRECISION NOT NULL,
  "completenessScore" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT NOT NULL,
  "strengths" JSONB,
  "weaknesses" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockInterviewEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MockInterviewEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MockInterviewEvaluation_sessionId_createdAt_idx" ON "MockInterviewEvaluation"("sessionId", "createdAt");

-- CreateTable MockInterviewReport
CREATE TABLE IF NOT EXISTS "MockInterviewReport" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "technicalScore" DOUBLE PRECISION,
  "communicationScore" DOUBLE PRECISION,
  "problemSolvingScore" DOUBLE PRECISION,
  "summary" TEXT NOT NULL,
  "strengths" JSONB NOT NULL,
  "weaknesses" JSONB NOT NULL,
  "recommendations" JSONB NOT NULL,
  "learningRoadmap" JSONB NOT NULL,
  "detailedResults" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MockInterviewReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MockInterviewReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockInterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MockInterviewReport_sessionId_key" ON "MockInterviewReport"("sessionId");
