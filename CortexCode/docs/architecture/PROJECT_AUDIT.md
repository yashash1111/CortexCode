# CortexCode — Phase 1 System Audit (`PROJECT_AUDIT.md`)

**Date:** 2026-11-20  
**Scope:** Full-stack inspection of `devlens-ai` (`apps/web`, `apps/api`, `apps/ai-service`, `packages/*`, `prisma/schema.prisma`, environment & infrastructure).

---

## 1. Architecture Overview (As Found)

- **Monorepo:** npm workspaces under `devlens-ai/` (`apps/web`, `apps/api`, `apps/ai-service`, `packages/config`, `packages/types`, `packages/ui`).
- **Frontend (`apps/web`):** Next.js 16.3.0, React 19.2.8, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, Axios, Firebase SDK. Also contains Next.js App Router API routes (`src/app/api/*`) that duplicate and bypass the Express backend.
- **Backend (`apps/api`):** Express 4.18, TypeScript, Prisma 5.10, PostgreSQL + pgvector, BullMQ 6 + ioredis 6, Helmet, CORS, Multer, JWT (`jsonwebtoken`).
- **AI Microservice (`apps/ai-service`):** Python FastAPI (`uvicorn`), Pydantic v2, `httpx`, `openai` SDK.
- **Data Stores:** Docker Compose defines `pgvector/pgvector:pg15` (port 5432) and `redis:7-alpine` (port 6379).

---

## 2. Critical Security Findings

1. **Hardcoded & Exposed API Credentials (ROTATE IMMEDIATELY):**
   - `apps/ai-service/app/llm/provider.py` contains a base64-encoded `DEFAULT_GEMINI_KEY`.
   - `apps/api/src/services/ai/providers/geminiProvider.ts` contains a base64-encoded `DEFAULT_GEMINI_KEY`.
   - `apps/api/src/services/ai/providers/cerebrasProvider.ts` contains a plaintext `DEFAULT_CEREBRAS_KEY`.
   - `apps/web/src/lib/serverAiHelper.ts` contains base64-encoded `DEFAULT_GEMINI_KEY` and `DEFAULT_CEREBRAS_KEY`.
   - `apps/web/.env` and `apps/ai-service/.env` define `NEXT_PUBLIC_GEMINI_API_KEY` and `NEXT_PUBLIC_CEREBRAS_API_KEY`, which Next.js bundles into client-side JavaScript.
   - **Action Required:** All exposed Gemini and Cerebras keys found in the repository and `NEXT_PUBLIC_*` env files must be rotated immediately.

2. **Broken CORS Policy (`apps/api/src/app.ts`):**
   - The `cors()` origin callback falls back to `callback(null, true)` for unknown origins, effectively allowing any origin with `credentials: true`.

3. **Hardcoded JWT Fallback Secrets (`apps/api/src/utils/jwt.ts`):**
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` fall back to `'default_secret'` and `'default_refresh_secret'` if environment variables are missing.

4. **Insecure GitHub OAuth State & Token Storage (`apps/api/src/controllers/github.controller.ts`, `services/github/github.service.ts`):**
   - OAuth `state` is plain unauthenticated base64 `{ userId }` with no HMAC signature, timestamp, or nonce — allowing CSRF / account-linking spoofing.
   - `accessTokenEncrypted` is merely `Buffer.from(token).toString('base64')` (encoding, not encryption).

5. **Missing Authentication & Ownership Checks:**
   - `apps/api/src/routes/workspace.routes.ts` has no `authenticate` middleware, trusts `req.headers['x-user-id']`, and allows any caller to read, chat with, or mutate any workspace.
   - `apps/api/src/routes/upload.routes.ts` has no `authenticate` middleware and its `fileFilter` accepts all files (`cb(null, true)` in the `else` branch).
   - `apps/api/src/services/repository.service.ts` `deleteRepository()` deletes by `{ id }` without verifying `userId`, and `getRepository()` falls back to returning `inMemoryRepos[0]` when not found.
   - `apps/api/src/controllers/ai.controller.ts` `chat()` does not verify that `req.user.userId` owns `repositoryId`.

6. **Unvalidated Refresh Tokens (`apps/api/src/services/auth.service.ts`):**
   - `refreshSession()` verifies the JWT signature only and does not check the `RefreshToken` table for revocation or rotate tokens.

7. **No Prompt-Injection Protection & Missing Global Request Limits:**
   - User-supplied messages and retrieved code/doc chunks are concatenated directly into system/user prompts without boundary sanitization.
   - `express.json()` has no payload size limit, and there is no global API rate limiter or centralized error-handling middleware.

---

## 3. Broken / Incomplete Backend & AI Implementations

1. **Dummy Embeddings (`apps/ai-service/app/llm/provider.py`):**
   - `LiveEmbeddingProvider.embed()` returns `[[0.1] * 1536 for _ in request.inputs]` — identical constant vectors for all inputs.

2. **Fake Streaming (`apps/ai-service/app/llm/provider.py` & `apps/api/src/controllers/demo.controller.ts`):**
   - Both `LiveLLMProvider.stream()` and `DemoChatController.stream()` wait for the full non-streaming completion and then yield word-by-word with `sleep(15ms)` / `setTimeout(12ms)`.

3. **Silent Error Masking & Fake Success Responses:**
   - `LiveLLMProvider.generate()` returns `ChatResponse(content="⚠️ API Key Error: ...")` as HTTP 200 instead of raising an error.
   - `AIController.startIndexing()` and `addIndexJob()` catch queue errors and still return HTTP 202 `{ success: true, message: 'Indexing job added to queue' }`.
   - `/health` in `apps/api/src/app.ts` hardcodes `database: 'healthy'` and `redis: 'healthy'` without checking PostgreSQL or Redis.
   - `AuthService` and `RepositoryService` silently fall back to in-memory `Map`/arrays when PostgreSQL errors occur.
   - `config/redis.ts` sets `retryStrategy: () => null` and swallows all connection errors.

4. **Incomplete Repository Indexing (`apps/api/src/jobs/workers/indexing.worker.ts`):**
   - Only indexes `file.content.substring(0, 1000)` (first 1000 chars of each file, single chunk).
   - Hardcodes `total: 100`, does not guard against `files.length === 0`, and never updates `Job.status = 'failed'` on error.
   - Passes a raw JS array to `${embeddings[0]}::vector` in Prisma `$executeRaw` instead of a formatted pgvector literal `[...]`.

5. **Mock PR Review Worker (`apps/api/src/jobs/workers/pr_review.worker.ts`):**
   - Hardcodes `pullRequestId: 'mock-pr-id'` (violating the `PullRequest` foreign key) and passes `accessTokenEncrypted` directly to GitHub without decoding/decrypting.

6. **Incomplete Document Parsing (`apps/api/src/services/file/fileParser.ts`):**
   - Rejects all PDF/Office documents as unsupported (`isSupported: false`) and performs no chunking/persistence.

7. **No Centralized AI Gateway, Telemetry, or Usage Logging:**
   - `AIUsage` table exists in Prisma, but no service writes to it.
   - AI calls are scattered across `AIService`, `AIClient`, `provider.py`, and `serverAiHelper.ts` with no unified latency tracking, token accounting, cost estimation, or structured JSON support.

---

## 4. Database, Migrations & Testing Gaps

1. **Database Schema & Migrations:**
   - `apps/api/prisma/migrations/` does not exist; 27 tables were pushed previously without Prisma migration history, and newer models in `schema.prisma` (`Assessment*`, `SecurityEvent`) are not yet applied in PostgreSQL.
   - Missing unified Phase 1+ models: `Workspace`, `Document`, `IngestionJob`, `KnowledgeChunk` (with `workspaceId`, `jobId`, `moduleType`, `sourcePath`, `metadata`, `content`, `embedding`), `EvalRun`, and `UsageLog`.
   - No pgvector cosine similarity index (`ivfflat` / `hnsw`) exists on vector columns.
   - `workspace.routes.ts` stores all workspaces, files, tasks, and memories in an ephemeral in-memory `Map`.

2. **Tests:**
   - `apps/api/tests/` and `apps/ai-service/tests/` are both empty. Zero automated tests exist.
