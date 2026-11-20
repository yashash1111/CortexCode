import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.chunking.chunker import chunk_file
from app.llm.provider import _validate_vectors, ProviderExecutionError

client = TestClient(app)
AUTH_HEADERS = {"X-AI-Service-Token": settings.AI_SERVICE_TOKEN}


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["embedding_dimensions"] == 1536


def test_secure_ping_auth():
    resp_no_auth = client.get("/secure-ping")
    assert resp_no_auth.status_code == 403

    resp_bad = client.get("/secure-ping", headers={"X-AI-Service-Token": "wrong"})
    assert resp_bad.status_code == 403

    resp_ok = client.get("/secure-ping", headers=AUTH_HEADERS)
    assert resp_ok.status_code == 200
    assert resp_ok.json()["status"] == "ok"


def test_chunk_file():
    assert chunk_file("", "empty.ts") == []
    content = "\n".join([f"const line_{i} = {i}; // padding text for chunking test" for i in range(200)])
    chunks = chunk_file(content, "sample.ts", "typescript")
    assert len(chunks) > 1
    assert chunks[0].start_line == 1
    assert all(c.chunk_index == idx for idx, c in enumerate(chunks))


def test_validate_vectors_rejects_bad_dimensions():
    with pytest.raises(ProviderExecutionError):
        _validate_vectors([[0.1] * 768], 1, 1536)

    with pytest.raises(ProviderExecutionError):
        _validate_vectors([[float("nan")] * 1536], 1, 1536)


def test_embed_rejects_empty_inputs():
    resp = client.post("/ai/embed", json={"inputs": []}, headers=AUTH_HEADERS)
    assert resp.status_code == 400


def test_real_embeddings_live():
    resp = client.post(
        "/ai/embed",
        json={"inputs": ["PostgreSQL vector similarity search", "React dashboard sidebar component"]},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, f"Embed failed: {resp.text}"
    data = resp.json()
    assert data["dimensions"] == 1536
    assert len(data["embeddings"]) == 2
    v1, v2 = data["embeddings"]
    assert len(v1) == 1536
    assert len(v2) == 1536
    # Ensure vectors are real and distinct (not dummy constant vectors)
    assert v1 != v2
    assert len(set(v1[:20])) > 5


def test_real_chat_live():
    resp = client.post(
        "/ai/chat",
        json={
            "messages": [{"role": "user", "content": "Reply with exactly the word: PONG"}],
            "temperature": 0.0,
            "max_tokens": 128,
        },
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, f"Chat failed: {resp.text}"
    data = resp.json()
    assert "PONG" in data["content"].upper()
    assert data["latency_ms"] >= 0
    assert data["provider"] in ("gemini", "openai")


def test_parse_and_chunk_markdown():
    md = "# Auth Spec\n\nJWT tokens are used for API auth.\n\n## Refresh Flow\n\nRefresh tokens rotate on every use.\n"
    resp = client.post(
        "/ai/docs/parse-and-chunk",
        json={"file_type": "markdown", "source_path": "auth.md", "text": md, "chunk_size": 80, "chunk_overlap": 20},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["title"] == "Auth Spec"
    assert len(data["chunks"]) >= 2
    assert any("Refresh Flow" in (c.get("section_heading") or "") for c in data["chunks"])


def test_parse_and_chunk_pdf_with_pages():
    import base64
    import fitz

    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((72, 72), "System Architecture", fontsize=18)
    p1.insert_text((72, 110), "CortexCode uses PostgreSQL with pgvector for vector similarity.", fontsize=11)
    p2 = doc.new_page()
    p2.insert_text((72, 72), "API Security", fontsize=18)
    p2.insert_text((72, 110), "All endpoints enforce workspace ownership and rate limiting.", fontsize=11)
    pdf_b64 = base64.b64encode(doc.tobytes()).decode("ascii")
    doc.close()

    resp = client.post(
        "/ai/docs/parse-and-chunk",
        json={"file_type": "pdf", "source_path": "System_Design.pdf", "content_base64": pdf_b64},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["page_count"] == 2
    pages = {c["page_number"] for c in data["chunks"]}
    assert 1 in pages and 2 in pages


def test_parse_empty_pdf_rejected():
    import base64
    import fitz

    doc = fitz.open()
    doc.new_page()  # blank page with no text
    pdf_b64 = base64.b64encode(doc.tobytes()).decode("ascii")
    doc.close()

    resp = client.post(
        "/ai/docs/parse-and-chunk",
        json={"file_type": "pdf", "source_path": "blank.pdf", "content_base64": pdf_b64},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 400


def test_tree_sitter_code_parsing_ts_and_python():
    ts_code = """
import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class AuthController {
  static async login(req: Request, res: Response) {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    return res.json(user);
  }
}
"""
    resp = client.post(
        "/ai/code/parse-and-chunk",
        json={"file_path": "src/controllers/auth.controller.ts", "content": ts_code},
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["language"] == "typescript"
    assert len(data["imports"]) >= 2
    assert any(s["name"] == "AuthController" for s in data["symbols"])
    assert "user" in data["db_models"]
    assert len(data["chunks"]) >= 1
    assert data["chunks"][0]["start_line"] >= 1

    py_code = """
def verify_token(token: str) -> bool:
    return token.startswith("Bearer ")
"""
    resp_py = client.post(
        "/ai/code/parse-and-chunk",
        json={"file_path": "app/auth.py", "content": py_code},
        headers=AUTH_HEADERS,
    )
    assert resp_py.status_code == 200
    py_data = resp_py.json()
    assert py_data["language"] == "python"
    assert any(s["name"] == "verify_token" for s in py_data["symbols"])
