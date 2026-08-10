from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    AI_SERVICE_TOKEN: str = "internal-service-token"
    
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4-turbo"
    LLM_API_KEY: Optional[str] = None
    
    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_API_KEY: Optional[str] = None
    
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 5
    
    class Config:
        env_file = ".env"

settings = Settings()
