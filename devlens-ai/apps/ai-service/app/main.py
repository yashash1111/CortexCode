from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from app.core.config import settings

app = FastAPI(title="DevLens AI Service")

api_key_header = APIKeyHeader(name="X-AI-Service-Token", auto_error=False)

def verify_token(api_key_header: str = Security(api_key_header)):
    if api_key_header != settings.AI_SERVICE_TOKEN:
        raise HTTPException(
            status_code=403,
            detail="Could not validate credentials",
        )
    return api_key_header

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

@app.get("/secure-ping", dependencies=[Depends(verify_token)])
def secure_ping():
    return {"status": "ok", "message": "Authentication successful"}

from app.api.endpoints import router as api_router
app.include_router(api_router, prefix="/ai")
