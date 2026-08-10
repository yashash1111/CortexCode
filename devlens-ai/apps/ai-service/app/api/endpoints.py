from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.main import verify_token
from app.llm.provider import get_llm_provider, get_embedding_provider
from app.llm.models import ChatRequest, EmbeddingRequest
from app.core.config import settings

router = APIRouter(dependencies=[Depends(verify_token)])

@router.post("/embed")
async def embed(request: EmbeddingRequest):
    provider = get_embedding_provider(settings.EMBEDDING_PROVIDER)
    response = await provider.embed(request)
    return response

@router.post("/chat")
async def chat(request: ChatRequest):
    provider = get_llm_provider(settings.LLM_PROVIDER)
    
    if request.stream:
        async def event_generator():
            async for token in provider.stream(request):
                yield token
        return StreamingResponse(event_generator(), media_type="text/plain")
    else:
        response = await provider.generate(request)
        return response

@router.post("/explain")
async def explain(request: ChatRequest):
    # Specialized prompt handling can be added here
    provider = get_llm_provider(settings.LLM_PROVIDER)
    return await provider.generate(request)

@router.post("/bugs")
async def find_bugs(request: ChatRequest):
    provider = get_llm_provider(settings.LLM_PROVIDER)
    return await provider.generate(request)
