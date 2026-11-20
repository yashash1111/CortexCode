-- Add User role for administrator controls
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';

-- Centralized AI Provider Configuration
CREATE TABLE IF NOT EXISTS "AIProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "selectedModel" TEXT,
    "dailyRequestLimit" INTEGER,
    "monthlyTokenLimit" INTEGER,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIProviderConfig_provider_key" ON "AIProviderConfig"("provider");

-- AI Provider Health & Failure Events
CREATE TABLE IF NOT EXISTS "AIProviderHealthEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIProviderHealthEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AIProviderHealthEvent_provider_idx" ON "AIProviderHealthEvent"("provider");
CREATE INDEX IF NOT EXISTS "AIProviderHealthEvent_createdAt_idx" ON "AIProviderHealthEvent"("createdAt");
