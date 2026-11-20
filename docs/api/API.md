# CortexCode API Reference (`API.md`)

All `/api/*` endpoints (except `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/webhooks/github`, and `/api/demo/*`) require authentication via HttpOnly `accessToken` cookie or `Authorization: Bearer <token>`.

## Health & Observability
- `GET /health` — Live PostgreSQL, Redis, AI Service, and provider configuration check.
- `GET /api/jobs` — List user's `IngestionJob`s (`workspaceId`, `moduleType`, `status`).
- `GET /api/jobs/:id` — Get job status, progress percentage, stage, and error details.
- `GET /api/jobs/observability/summary` — Real-time metrics (`days`, `workspaceId`, `module`, `model` filters): KPIs, p50/p95 latency, daily usage, `byModel`, `byModule`, jobs, evals, and PR reviews.

## Docs & Spec RAG (`/api/docs`)
- `POST /api/docs/upload` — Upload PDF or Markdown (max 15 MB), enqueue BullMQ ingestion job.
- `GET /api/docs?workspaceId=...` — List workspace documents and latest job progress.
- `GET /api/docs/:id` — Document details, chunks, and ingestion history.
- `GET /api/docs/:id/file` — Stream raw PDF/Markdown for Citation Viewer.
- `POST /api/docs/:id/reindex` — Re-index document.
- `DELETE /api/docs/:id` — Delete document, file, and `KnowledgeChunk`s.
- `POST /api/docs/search` — Hybrid pgvector + full-text search (`workspaceId`, `query`, `documentIds`, `topK`).
- `POST /api/docs/chat` — SSE streaming RAG chat (`sources`, `token`, `done` events).
- `GET /api/docs/chat/history?workspaceId=...` — Load conversation history.
- `POST /api/docs/evals/run`, `GET /api/docs/evals`, `GET /api/docs/evals/:runId` — RAG evaluation runner & history.

## GitHub Code Intelligence & PR Reviewer (`/api/github-intel`)
- `POST /api/github-intel/repos/connect` — Connect public or OAuth private GitHub repo by URL.
- `GET /api/github-intel/repos?workspaceId=...` — List connected repositories with chunk/file counts and job status.
- `GET /api/github-intel/repos/:id/branches` — List repository branches.
- `POST /api/github-intel/repos/:id/index` — Start incremental Tree-sitter + pgvector indexing.
- `DELETE /api/github-intel/repos/:id` — Remove repository and `moduleType='repo'` chunks.
- `POST /api/github-intel/repos/:id/qa` — Hybrid codebase Q&A with exact `file:start-end` citations & dependency graph context.
- `GET /api/github-intel/repos/:id/graph` — Return files, symbols, and `CodeGraphEdge` relationships.
- `POST /api/github-intel/pr-reviews` — Run structured codebase-aware PR review from PR URL.
- `GET /api/github-intel/pr-reviews?workspaceId=...` — List PR reviews and findings.
- `PATCH /api/github-intel/pr-reviews/findings/:findingId` — Update finding status (`open`, `dismissed`, `resolved`, `approved`).
- `POST /api/github-intel/pr-reviews/:reviewId/publish` — Publish approved findings to GitHub (requires `confirmed: true`).
