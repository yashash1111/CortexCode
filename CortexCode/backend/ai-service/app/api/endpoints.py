import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.main import verify_token
from app.providers.provider import (
    get_llm_provider,
    get_embedding_provider,
    ProviderConfigurationError,
    ProviderExecutionError,
)
from app.schemas.models import ChatRequest, EmbeddingRequest
from app.parsing.doc_chunker import parse_and_chunk_pdf, parse_and_chunk_markdown
from app.parsing.code_parser import parse_and_chunk_code
from app.core.config import settings

router = APIRouter(dependencies=[Depends(verify_token)])


class ParseDocRequest(BaseModel):
    file_type: str  # "pdf" | "markdown"
    source_path: str
    content_base64: Optional[str] = None
    text: Optional[str] = None
    chunk_size: int = 1200
    chunk_overlap: int = 180


class ParseCodeRequest(BaseModel):
    file_path: str
    content: str
    language: Optional[str] = None
    max_chunk_chars: int = 2000


@router.post("/code/parse-and-chunk")
async def parse_and_chunk_code_endpoint(request: ParseCodeRequest):
    try:
        return parse_and_chunk_code(
            content=request.content,
            file_path=request.file_path,
            language=request.language,
            max_chunk_chars=request.max_chunk_chars,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Code parsing failed: {exc}")


@router.post("/docs/parse-and-chunk")
async def parse_and_chunk_doc(request: ParseDocRequest):
    try:
        fmt = request.file_type.lower()
        if fmt == "pdf":
            if not request.content_base64:
                raise ValueError("content_base64 is required for PDF parsing")
            return parse_and_chunk_pdf(
                request.content_base64,
                request.source_path,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
            )
        if fmt in ("md", "markdown"):
            if request.text is None:
                raise ValueError("text is required for Markdown parsing")
            return parse_and_chunk_markdown(
                request.text,
                request.source_path,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
            )
        raise ValueError(f"Unsupported file_type: {request.file_type}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document parsing failed: {exc}")


@router.post("/embed")
async def embed(request: EmbeddingRequest):
    provider = get_embedding_provider(request.provider or settings.EMBEDDING_PROVIDER)
    try:
        return await provider.embed(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ProviderExecutionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/chat")
async def chat(request: ChatRequest):
    provider = get_llm_provider(request.provider or settings.LLM_PROVIDER)

    if request.stream:
        async def event_generator():
            try:
                async for token in provider.stream(request):
                    yield f"data: {json.dumps({'content': token})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as exc:
                yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    try:
        return await provider.generate(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ProviderExecutionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/explain")
async def explain(request: ChatRequest):
    provider = get_llm_provider(request.provider or settings.LLM_PROVIDER)
    try:
        return await provider.generate(request)
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ProviderExecutionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/bugs")
async def find_bugs(request: ChatRequest):
    provider = get_llm_provider(request.provider or settings.LLM_PROVIDER)
    try:
        return await provider.generate(request)
    except ProviderConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ProviderExecutionError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
