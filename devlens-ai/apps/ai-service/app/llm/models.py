from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = None
    provider: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = 4096
    stream: bool = False
    response_format: Optional[str] = None  # "text" | "json"


class ChatResponse(BaseModel):
    content: str
    model: str
    provider: str
    latency_ms: int
    usage: Dict[str, Any] = Field(default_factory=dict)


class EmbeddingRequest(BaseModel):
    inputs: List[str]
    model: Optional[str] = None
    provider: Optional[str] = None
    dimensions: int = 1536


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    provider: str
    dimensions: int
    latency_ms: int
    usage: Dict[str, Any] = Field(default_factory=dict)
