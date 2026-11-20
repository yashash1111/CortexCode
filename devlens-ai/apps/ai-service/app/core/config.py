from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    AI_SERVICE_TOKEN: str = "internal-service-token"

    LLM_PROVIDER: str = "auto"
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_API_KEY: Optional[str] = None

    EMBEDDING_PROVIDER: str = "auto"
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_API_KEY: Optional[str] = None
    EMBEDDING_DIMENSIONS: int = 1536

    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    CEREBRAS_API_KEY: Optional[str] = None

    REQUEST_TIMEOUT_SECONDS: float = 30.0
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
