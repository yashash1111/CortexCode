# CortexCode — System Architecture (`ARCHITECTURE.md`)

**Phase:** 1 (System Audit, Backend Stabilization & Shared Infrastructure)

---

## 1. High-Level Topology

```text
┌───────────────────────────┐
│   apps/web (Next.js 16)   │  Port 3000
│  /docs /github /observ.   │  Rewrites /api/* -> Express API
└─────────────┬─────────────┘
              │ HTTP + HttpOnly JWT Cookies
              ▼
┌───────────────────────────┐
│   apps/api (Express TS)   │  Port 3001
│  - Auth & RBAC Middleware │
│  - AIGateway + Pricing    │
│  - EmbeddingService       │
│  - BullMQ Queues/Workers  │
└──────┬──────────┬─────────┘
       │          │
       │          ├──────────────────────────────┐
       ▼          ▼                              ▼
┌────────────┐ ┌────────────────┐   ┌─────────────────────────┐
│ PostgreSQL │ │     Redis      │   │  apps/ai-service        │
│ + pgvector │ │   (BullMQ)     │   │  (FastAPI Python 3.13)  │
│ Port 5432  │ │   Port 6379    │   │  Port 8000              │
└────────────┘ └────────────────┘   │  - Real Embeddings 1536 │
                                    │  - Real SSE Streaming   │
                                    └─────────────────────────┘
```

---

## 2. Shared AI Gateway (`apps/api/src/services/ai/aiGateway.ts`)

All LLM operations route through `AIGateway`:
- **Providers:** Gemini (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-flash-latest`), OpenAI (`gpt-4o-mini`, `gpt-4o`), Cerebras (`llama-3.3-70b`), Anthropic Claude (`claude-3-5-sonnet-20240620`).
- **Capabilities:** Model selection, real SSE streaming (`AIGateway.stream`), structured JSON output (`responseFormat: 'json'`), configurable timeouts (`25s` default), controlled provider fallback, prompt sanitization (`promptGuard.ts`).
- **Telemetry:** Measures `latencyMs`, captures `inputTokens` / `outputTokens` / `totalTokens`, calculates `estimatedCost` via `config/modelPricing.ts`, and persists every call (success or error) to `UsageLog`.

---

## 3. Embeddings & Vector Isolation (`EmbeddingService` + `KnowledgeChunk`)

- `apps/ai-service` generates real 1536-dimensional semantic embeddings via Gemini (`gemini-embedding-001` / `text-embedding-004` with `outputDimensionality: 1536`) or OpenAI (`text-embedding-3-small`).
- Every vector is validated for exact dimension (`1536`) and finite numeric values before storage.
- `KnowledgeChunk` stores vectors in PostgreSQL `pgvector` with an HNSW cosine similarity index (`vector_cosine_ops`).
- Every retrieval query in `EmbeddingService.searchKnowledgeChunks` enforces both `workspaceId` and `moduleType` (`'doc'` or `'repo'`) isolation.

---

## 4. Persistent Background Jobs (`BullMQ` + `IngestionJob`)

- `addIndexJob()` enforces duplicate-job protection via `dedupeKey` (`repo:<repositoryId>`) and persists `IngestionJob` rows (`queued` -> `processing` -> `completed` | `failed`).
- `indexing.worker.ts` chunks full file contents, generates real embeddings, writes `KnowledgeChunk` & `CodeChunk` rows, and updates progress percentage.
- `pr_review.worker.ts` resolves real `PullRequest` records, decrypts GitHub OAuth tokens (`AES-256-GCM`), and calls `AIGateway`.
- Job status and observability summaries are exposed via `/api/jobs` and `/api/jobs/observability/summary`.

---

## 5. Security Hardening

- **No Hardcoded Credentials:** Removed all embedded API keys and `NEXT_PUBLIC_*` secret variables.
- **Strict CORS & Rate Limiting:** Explicit origin allowlist with `credentials: true`, global `/api` rate limiting (`120 req/min`), and strict auth rate limiting (`20 req/15m`).
- **Auth & OAuth:** Required `JWT_SECRET`/`JWT_REFRESH_SECRET`, DB-backed refresh token rotation, HMAC-SHA256 signed GitHub OAuth `state` with 10-minute TTL, and AES-256-GCM encrypted GitHub tokens.
- **Authorization & Validation:** Workspace and repository ownership checks on all routes, authenticated upload filtering by MIME and extension, `1mb` JSON payload limit, and prompt-injection guards.
