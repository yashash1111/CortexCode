from abc import ABC, abstractmethod
from typing import AsyncGenerator
from app.llm.models import ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, request: ChatRequest) -> ChatResponse:
        pass
        
    @abstractmethod
    async def stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        pass

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        pass
