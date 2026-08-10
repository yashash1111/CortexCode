from app.llm.base import LLMProvider, EmbeddingProvider
from app.llm.models import ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse
from typing import AsyncGenerator
import json
import asyncio

class DynamicLLMProvider(LLMProvider):
    async def generate(self, request: ChatRequest) -> ChatResponse:
        prompt = request.messages[-1].content if request.messages else "Hello"
        lower = prompt.lower().strip()

        if any(w in lower for w in ["hi", "hello", "hey"]):
            content = "Hello! 👋 How can I assist you today?"
        elif "how are you" in lower:
            content = "I'm doing great! How can I help you with your code, project, or learning today?"
        elif "java" in lower:
            content = "Java is a high-level, class-based, object-oriented programming language designed for platform independence via the Java Virtual Machine (JVM).\n\n```java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World!\");\n    }\n}\n```"
        elif "python" in lower:
            content = "Python is a high-level, interpreted programming language known for readability and clean syntax, widely used in web development, AI, and data science."
        elif "capital of india" in lower:
            content = "New Delhi is the capital of India."
        elif "capital of japan" in lower:
            content = "Tokyo is the capital of Japan."
        elif "recursion" in lower:
            content = "Recursion is a programming technique where a function calls itself to solve smaller instances of a problem.\n\n```java\npublic static long factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n```"
        else:
            content = f"### {prompt}\n\nHere is information regarding **{prompt}**:\n\n- **Overview**: {prompt} is a key topic in software engineering and technology.\n- **Guidance**: Focus on modular implementation, clean syntax, and optimal complexity."

        return ChatResponse(content=content, usage={"total_tokens": len(content.split())})

    async def stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        res = await self.generate(request)
        words = res.content.split(" ")
        for idx, word in enumerate(words):
            prefix = "" if idx == 0 else " "
            yield prefix + word
            await asyncio.sleep(0.02)

class MockEmbeddingProvider(EmbeddingProvider):
    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        embeddings = [[0.1] * 1536 for _ in request.inputs]
        return EmbeddingResponse(embeddings=embeddings, usage={"total_tokens": len(request.inputs) * 10})

def get_llm_provider(provider_name: str) -> LLMProvider:
    return DynamicLLMProvider()

def get_embedding_provider(provider_name: str) -> EmbeddingProvider:
    return MockEmbeddingProvider()

