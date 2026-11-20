from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from app.core.config import settings

app = FastAPI(title="CortexCode AI Service", version="1.1.0")

api_key_header = APIKeyHeader(name="X-AI-Service-Token", auto_error=False)


def verify_token(api_key_header: str = Security(api_key_header)):
    if not api_key_header or api_key_header != settings.AI_SERVICE_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Could not validate credentials",
        )
    return api_key_header


@app.get("/health")
def health_check():
    gemini_configured = bool(settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY)
    groq_configured = bool(settings.GROQ_API_KEY)
    huggingface_configured = bool(settings.HUGGINGFACE_API_KEY)
    openai_configured = bool(settings.OPENAI_API_KEY)
    return {
        "status": "ok",
        "service": "ai-service",
        "providers": {
            "gemini": gemini_configured,
            "groq": groq_configured,
            "huggingface": huggingface_configured,
            "openai": openai_configured,
        },
        "embedding_dimensions": settings.EMBEDDING_DIMENSIONS,
    }


@app.get("/secure-ping", dependencies=[Depends(verify_token)])
def secure_ping():
    return {"status": "ok", "message": "Authentication successful"}


from app.api.endpoints import router as api_router

app.include_router(api_router, prefix="/ai")
