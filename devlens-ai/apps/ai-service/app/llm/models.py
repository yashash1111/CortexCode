from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False

class ChatResponse(BaseModel):
    content: str
    usage: Optional[Dict[str, Any]] = None

class EmbeddingRequest(BaseModel):
    inputs: List[str]

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    usage: Optional[Dict[str, Any]] = None
