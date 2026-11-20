# CortexCode — Full-Stack AI Developer Intelligence Workspace

CortexCode is a unified developer intelligence platform combining **Docs & Spec RAG** (`/docs`), **GitHub Codebase Intelligence & AI PR Reviewer** (`/github`), and **Real-Time AI Observability** (`/observability`).

---

## Architecture

- **Frontend (`apps/web`):** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts.
- **Backend API (`apps/api`):** Express.js, TypeScript, Prisma ORM, BullMQ + Redis, centralized `AIGateway` & `EmbeddingService`.
- **AI Microservice (`apps/ai-service`):** Python FastAPI, PyMuPDF (`pymupdf`), Tree-sitter (`tree-sitter-language-pack`), real 1536-dim embeddings & streaming LLM endpoints.
- **Data Stores:** PostgreSQL 15 + `pgvector` (HNSW cosine + GIN full-text indexes), Redis 7.

---

## Local Setup

1. **Start Infrastructure (PostgreSQL + pgvector & Redis):**
   ```bash
   cd devlens-ai
   docker compose up -d postgres redis
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `apps/api/.env`, `apps/ai-service/.env`, and `apps/web/.env` and set your secrets (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY` / `OPENAI_API_KEY`, `AI_SERVICE_TOKEN`).

3. **Run Database Migrations:**
   ```bash
   cd devlens-ai/apps/api
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Start Python AI Service (Port 8000):**
   ```bash
   cd devlens-ai/apps/ai-service
   ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

5. **Start Express API (Port 3001) & Next.js Web (Port 3000):**
   ```bash
   cd devlens-ai
   npm run dev:api
   npm run dev:web
   ```

---

## Running Tests

```bash
# Python AI Service tests (PyMuPDF, Tree-sitter, Embeddings, LLM)
cd devlens-ai/apps/ai-service && ./venv/bin/python -m pytest -v

# Backend Phase 1, Phase 2 & Phase 3 integration tests
cd devlens-ai/apps/api && npm run build
node --test --test-reporter=spec tests/phase1.test.cjs tests/phase2.test.cjs tests/phase3.test.cjs
```
