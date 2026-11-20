# CortexCode — Phase 2: Docs & Spec RAG Workspace (`DOCS_RAG.md`)

**Route:** `/docs`

---

## 1. End-to-End Pipeline

1. **Upload (`POST /api/docs/upload`):**
   - Accepts `.pdf`, `.md`, and `.markdown` files up to **15 MB**.
   - Validates MIME type, file extension, and `%PDF-` magic header for PDFs.
   - Stores files under `apps/api/uploads/docs/<workspaceId>/<docId>_<filename>`.
   - Creates `Document` (`PENDING`) and `IngestionJob` (`queued`) and enqueues to BullMQ `doc-ingestion` queue.

2. **Background Parsing & Chunking (`doc_ingestion.worker.ts` -> Python `ai-service /ai/docs/parse-and-chunk`):**
   - **PDF (`pymupdf`):** Extracts text page-by-page, detects headings via font size/weight, preserves exact `page_number` (1-indexed) and `section_heading`, and rejects empty/scanned PDFs gracefully.
   - **Markdown:** Parses `#`–`######` heading hierarchy, preserves section breadcrumbs, and splits on paragraph/sentence boundaries.
   - **Chunking:** Heading-aware & paragraph-aware chunking (`1200` chars, `180` char overlap) without merging across PDF page boundaries.

3. **Real Embeddings & Vector Storage (`EmbeddingService` + `KnowledgeChunk`):**
   - Generates 1536-dim embeddings in batches via `AIClient.embed` and validates dimensions.
   - Stores chunks in `KnowledgeChunk` with `moduleType = 'doc'`, `workspaceId`, `jobId`, `sourcePath`, and `metadata` (`documentId`, `documentName`, `pageNumber`, `sectionHeading`, `chunkIndex`).
   - Progress stages reported in `IngestionJob`: `queued` -> `extracting` -> `chunking` -> `embedding` -> `saving` -> `completed` | `failed`.

4. **Hybrid RAG Retrieval (`DocRagService.hybridSearch`):**
   - Combines pgvector cosine similarity (`0.75` weight) and PostgreSQL `ts_rank_cd` full-text search (`0.25` weight).
   - Enforces `workspaceId`, `moduleType = 'doc'`, and optional `documentIds` filtering.
   - Wraps retrieved passages with `wrapUntrustedContext` to prevent prompt injection.

5. **Streaming SSE Chat & Split-Screen Citation Viewer:**
   - `POST /api/docs/chat` streams `sources`, `token`, and `done` SSE events and persists `Conversation` + `Message` history.
   - Left panel renders Markdown, code blocks, and clickable `[Document.pdf, p. N]` citation badges.
   - Right panel displays the selected source passage, page number, Prev/Next navigation, and inline PDF/file viewer (`GET /api/docs/:id/file`).

6. **Evaluation Engine (`DocEvalService`):**
   - `POST /api/docs/evals/run` supports custom JSON benchmarks or auto-generated 30-question workspace benchmarks.
   - Computes **Retrieval Hit Rate**, **Mean Reciprocal Rank (MRR)**, **Context Relevance**, **Answer Faithfulness**, **Citation Precision**, and **Average Latency** using **LLM-as-a-Judge**, persisting `EvalRun` and `EvalCaseResult` rows.
