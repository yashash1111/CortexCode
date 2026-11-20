import json
import math
import os
import time
from typing import AsyncGenerator, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings
from app.llm.base import EmbeddingProvider, LLMProvider
from app.llm.models import ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse


class ProviderConfigurationError(RuntimeError):
    """Raised when required provider API credentials are missing."""


class ProviderExecutionError(RuntimeError):
    """Raised when an upstream AI provider fails or returns invalid data."""


def _get_gemini_key() -> Optional[str]:
    key = (
        settings.GEMINI_API_KEY
        or settings.GOOGLE_API_KEY
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    if key and key.strip() and key.strip() != "dummy":
        return key.strip()
    return None


def _get_openai_key() -> Optional[str]:
    key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    if key and key.strip() and key.strip() != "dummy":
        return key.strip()
    return None


def _validate_vectors(vectors: List[List[float]], expected_count: int, expected_dim: int) -> None:
    if len(vectors) != expected_count:
        raise ProviderExecutionError(
            f"Embedding count mismatch: expected {expected_count}, got {len(vectors)}"
        )
    for idx, vec in enumerate(vectors):
        if not isinstance(vec, list) or len(vec) != expected_dim:
            actual = len(vec) if isinstance(vec, list) else "non-list"
            raise ProviderExecutionError(
                f"Embedding dimension mismatch at index {idx}: expected {expected_dim}, got {actual}"
            )
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in vec):
            raise ProviderExecutionError(f"Invalid non-finite float in embedding at index {idx}")


class RealLLMProvider(LLMProvider):
    GEMINI_DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]
    OPENAI_DEFAULT_MODEL = "gpt-4o-mini"

    def _resolve_provider_order(self, requested: Optional[str]) -> List[str]:
        pref = (requested or settings.LLM_PROVIDER or "auto").lower()
        order: List[str] = []
        if pref in ("gemini", "google"):
            order = ["gemini", "openai"]
        elif pref == "openai":
            order = ["openai", "gemini"]
        else:
            if _get_gemini_key():
                order.append("gemini")
            if _get_openai_key():
                order.append("openai")
        return order

    def _build_gemini_payload(self, request: ChatRequest) -> Dict:
        system_parts: List[str] = []
        contents: List[Dict] = []
        for msg in request.messages:
            if msg.role == "system":
                system_parts.append(msg.content)
            else:
                role = "model" if msg.role in ("assistant", "model") else "user"
                if contents and contents[-1]["role"] == role:
                    contents[-1]["parts"].append({"text": msg.content})
                else:
                    contents.append({"role": role, "parts": [{"text": msg.content}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        gen_config: Dict = {
            "temperature": request.temperature,
            "maxOutputTokens": request.max_tokens or 4096,
        }
        if request.response_format == "json":
            gen_config["responseMimeType"] = "application/json"

        payload: Dict = {"contents": contents, "generationConfig": gen_config}
        if system_parts:
            payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}
        return payload

    async def _generate_gemini(self, request: ChatRequest, api_key: str) -> Tuple[str, str, Dict]:
        models = (
            [request.model] + [m for m in self.GEMINI_DEFAULT_MODELS if m != request.model]
            if request.model and request.model.startswith("gemini")
            else self.GEMINI_DEFAULT_MODELS
        )
        payload = self._build_gemini_payload(request)
        last_error: Optional[str] = None

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            for model in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                resp = await client.post(url, json=payload)
                if resp.status_code != 200:
                    last_error = f"Gemini {model} HTTP {resp.status_code}: {resp.text[:300]}"
                    continue
                data = resp.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if not text or not text.strip():
                    last_error = f"Gemini {model} returned empty content"
                    continue
                meta = data.get("usageMetadata", {})
                usage = {
                    "input_tokens": int(meta.get("promptTokenCount", 0)),
                    "output_tokens": int(meta.get("candidatesTokenCount", 0)),
                    "total_tokens": int(meta.get("totalTokenCount", 0)),
                }
                return text.strip(), model, usage

        raise ProviderExecutionError(last_error or "All Gemini models failed")

    async def _generate_openai(self, request: ChatRequest, api_key: str) -> Tuple[str, str, Dict]:
        model = request.model if request.model and not request.model.startswith("gemini") else self.OPENAI_DEFAULT_MODEL
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        payload: Dict = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens or 2048,
        }
        if request.response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            if resp.status_code != 200:
                raise ProviderExecutionError(f"OpenAI HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not text or not text.strip():
                raise ProviderExecutionError("OpenAI returned empty content")
            u = data.get("usage", {})
            usage = {
                "input_tokens": int(u.get("prompt_tokens", 0)),
                "output_tokens": int(u.get("completion_tokens", 0)),
                "total_tokens": int(u.get("total_tokens", 0)),
            }
            return text.strip(), model, usage

    async def generate(self, request: ChatRequest) -> ChatResponse:
        order = self._resolve_provider_order(request.provider)
        if not order:
            raise ProviderConfigurationError("No LLM provider API key configured (GEMINI_API_KEY or OPENAI_API_KEY)")

        start = time.perf_counter()
        errors: List[str] = []

        for prov in order:
            try:
                if prov == "gemini":
                    key = _get_gemini_key()
                    if not key:
                        continue
                    content, model_used, usage = await self._generate_gemini(request, key)
                elif prov == "openai":
                    key = _get_openai_key()
                    if not key:
                        continue
                    content, model_used, usage = await self._generate_openai(request, key)
                else:
                    continue

                latency_ms = int((time.perf_counter() - start) * 1000)
                return ChatResponse(
                    content=content,
                    model=model_used,
                    provider=prov,
                    latency_ms=latency_ms,
                    usage=usage,
                )
            except Exception as exc:
                errors.append(f"{prov}: {str(exc) or type(exc).__name__}")

        if not errors:
            raise ProviderConfigurationError("No configured LLM provider has a valid API key")
        raise ProviderExecutionError("; ".join(errors))

    async def stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        order = self._resolve_provider_order(request.provider)
        if not order:
            raise ProviderConfigurationError("No LLM provider API key configured")

        gemini_key = _get_gemini_key()
        openai_key = _get_openai_key()

        if "gemini" in order and gemini_key:
            model = (
                request.model
                if request.model and request.model.startswith("gemini")
                else self.GEMINI_DEFAULT_MODELS[0]
            )
            payload = self._build_gemini_payload(request)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={gemini_key}"
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        raise ProviderExecutionError(f"Gemini stream HTTP {resp.status_code}: {body.decode('utf-8', 'ignore')[:300]}")
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            chunk = json.loads(raw)
                            parts = chunk.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                            for part in parts:
                                text = part.get("text")
                                if text:
                                    yield text
                        except json.JSONDecodeError:
                            continue
            return

        if "openai" in order and openai_key:
            model = request.model if request.model and not request.model.startswith("gemini") else self.OPENAI_DEFAULT_MODEL
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            payload = {
                "model": model,
                "messages": messages,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens or 2048,
                "stream": True,
            }
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                async with client.stream(
                    "POST",
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json=payload,
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        raise ProviderExecutionError(f"OpenAI stream HTTP {resp.status_code}: {body.decode('utf-8', 'ignore')[:300]}")
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        raw = line[5:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            chunk = json.loads(raw)
                            delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                            if delta:
                                yield delta
                        except json.JSONDecodeError:
                            continue
            return

        raise ProviderConfigurationError("No streaming-capable LLM provider key configured")


class RealEmbeddingProvider(EmbeddingProvider):
    GEMINI_EMBED_MODELS = ["gemini-embedding-001", "text-embedding-004"]
    OPENAI_EMBED_MODEL = "text-embedding-3-small"

    def _resolve_provider_order(self, requested: Optional[str]) -> List[str]:
        pref = (requested or settings.EMBEDDING_PROVIDER or "auto").lower()
        if pref == "openai":
            return ["openai", "gemini"]
        if pref in ("gemini", "google"):
            return ["gemini", "openai"]
        order: List[str] = []
        if _get_gemini_key():
            order.append("gemini")
        if _get_openai_key():
            order.append("openai")
        return order

    async def _embed_gemini(self, inputs: List[str], dimensions: int, api_key: str, requested_model: Optional[str]) -> Tuple[List[List[float]], str, Dict]:
        models = (
            [requested_model] + [m for m in self.GEMINI_EMBED_MODELS if m != requested_model]
            if requested_model and ("embedding" in requested_model)
            else self.GEMINI_EMBED_MODELS
        )
        last_error: Optional[str] = None

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            for model in models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents?key={api_key}"
                requests_payload = [
                    {
                        "model": f"models/{model}",
                        "content": {"parts": [{"text": text}]},
                        "outputDimensionality": dimensions,
                    }
                    for text in inputs
                ]
                resp = await client.post(url, json={"requests": requests_payload})
                if resp.status_code != 200:
                    last_error = f"Gemini embed {model} HTTP {resp.status_code}: {resp.text[:300]}"
                    continue
                data = resp.json()
                raw_embeddings = data.get("embeddings", [])
                vectors = [item.get("values", []) for item in raw_embeddings]
                _validate_vectors(vectors, len(inputs), dimensions)
                approx_tokens = sum(max(1, len(t) // 4) for t in inputs)
                return vectors, model, {"input_tokens": approx_tokens, "total_tokens": approx_tokens}

        raise ProviderExecutionError(last_error or "Gemini embedding models failed")

    async def _embed_openai(self, inputs: List[str], dimensions: int, api_key: str, requested_model: Optional[str]) -> Tuple[List[List[float]], str, Dict]:
        model = requested_model if requested_model and requested_model.startswith("text-embedding-") else self.OPENAI_EMBED_MODEL
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "input": inputs, "dimensions": dimensions},
            )
            if resp.status_code != 200:
                raise ProviderExecutionError(f"OpenAI embed HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            items = sorted(data.get("data", []), key=lambda x: x.get("index", 0))
            vectors = [item.get("embedding", []) for item in items]
            _validate_vectors(vectors, len(inputs), dimensions)
            u = data.get("usage", {})
            usage = {
                "input_tokens": int(u.get("prompt_tokens", 0)),
                "total_tokens": int(u.get("total_tokens", 0)),
            }
            return vectors, model, usage

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        if not request.inputs:
            raise ValueError("inputs must be a non-empty list of strings")
        cleaned = [t.strip() for t in request.inputs]
        if any(not t for t in cleaned):
            raise ValueError("inputs must not contain empty strings")

        order = self._resolve_provider_order(request.provider)
        if not order:
            raise ProviderConfigurationError("No embedding provider API key configured (GEMINI_API_KEY or OPENAI_API_KEY)")

        start = time.perf_counter()
        errors: List[str] = []

        for prov in order:
            try:
                if prov == "gemini":
                    key = _get_gemini_key()
                    if not key:
                        continue
                    vectors, model_used, usage = await self._embed_gemini(
                        cleaned, request.dimensions, key, request.model
                    )
                elif prov == "openai":
                    key = _get_openai_key()
                    if not key:
                        continue
                    vectors, model_used, usage = await self._embed_openai(
                        cleaned, request.dimensions, key, request.model
                    )
                else:
                    continue

                latency_ms = int((time.perf_counter() - start) * 1000)
                return EmbeddingResponse(
                    embeddings=vectors,
                    model=model_used,
                    provider=prov,
                    dimensions=request.dimensions,
                    latency_ms=latency_ms,
                    usage=usage,
                )
            except Exception as exc:
                errors.append(f"{prov}: {str(exc) or type(exc).__name__}")

        if not errors:
            raise ProviderConfigurationError("No configured embedding provider has a valid API key")
        raise ProviderExecutionError("; ".join(errors))


def get_llm_provider(provider_name: str = "auto") -> LLMProvider:
    return RealLLMProvider()


def get_embedding_provider(provider_name: str = "auto") -> EmbeddingProvider:
    return RealEmbeddingProvider()
