# CortexCode — Full-Stack AI Developer Intelligence Workspace

CortexCode is a unified developer intelligence platform combining **Docs & Spec RAG** (`/docs`) and **GitHub Codebase Intelligence & AI PR Reviewer** (`/github`).

---

## Monorepo Structure

```text
CortexCode/
├── frontend/              # Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts
├── backend/
│   ├── api/               # Express.js, TypeScript, Prisma ORM, BullMQ + Redis
│   └── ai-service/        # Python FastAPI, PyMuPDF, Tree-sitter, Embeddings & LLM
├── docs/                  # architecture/, api/, guides/, deployment/
├── infrastructure/        # docker/, database/, deployment/
└── scripts/
```

---

## Local Setup

1. **Start Infrastructure (PostgreSQL + pgvector & Redis):**
   ```bash
   docker compose up -d postgres redis
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `backend/api/.env`, `backend/ai-service/.env`, and `frontend/.env` and set your secrets (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY` / `OPENAI_API_KEY`, `AI_SERVICE_TOKEN`).

3. **Run Database Migrations:**
   ```bash
   cd backend/api
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Start Python AI Service (Port 8000):**
   ```bash
   cd backend/ai-service
   ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

5. **Start Express API (Port 3001) & Next.js Web (Port 3000):**
   ```bash
   npm run dev:api
   npm run dev:web
   ```

---

## Running Tests

```bash
# Python AI Service tests
cd backend/ai-service && ./venv/bin/python -m pytest -v

# Backend integration tests
cd backend/api && npm run build
node --test --test-reporter=spec tests/phase1.test.cjs tests/phase2.test.cjs tests/phase3.test.cjs
```
