# CortexCode — AI Service

Python FastAPI service providing PyMuPDF document parsing, Tree-sitter AST code parsing, real 1536-dim embeddings, and streaming LLM completions.

## Structure
- `app/api/` — FastAPI endpoints (`/ai/embed`, `/ai/chat`, `/ai/docs/parse-and-chunk`, `/ai/code/parse-and-chunk`)
- `app/core/` — Pydantic settings configuration
- `app/providers/` — Gemini & OpenAI LLM and embedding providers
- `app/parsing/` — PyMuPDF PDF/Markdown parser (`doc_chunker.py`) & Tree-sitter parser (`code_parser.py`)
- `app/chunking/` & `app/rag/` — Text chunking and RAG context builder
- `app/schemas/` — Pydantic request/response models

## Run Locally
```bash
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
./venv/bin/python -m pytest -v
```
