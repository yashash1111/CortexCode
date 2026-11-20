from pydantic import BaseModel
from typing import List, Optional
from app.core.config import settings


class CodeChunkModel(BaseModel):
    content: str
    file_path: str
    language: Optional[str] = None
    symbol_name: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    chunk_index: int
    token_count: int


def chunk_file(file_content: str, file_path: str, language: Optional[str] = None) -> List[CodeChunkModel]:
    if not file_content or not file_content.strip():
        return []

    chunks: List[CodeChunkModel] = []
    lines = file_content.split("\n")

    current_chunk: List[str] = []
    current_length = 0
    start_line = 1

    max_chars = max(200, settings.CHUNK_SIZE * 4)
    overlap_chars = min(max_chars // 2, max(0, settings.CHUNK_OVERLAP * 4))

    chunk_index = 0
    for i, line in enumerate(lines):
        current_chunk.append(line)
        current_length += len(line) + 1

        if current_length >= max_chars or i == len(lines) - 1:
            content = "\n".join(current_chunk)
            chunks.append(
                CodeChunkModel(
                    content=content,
                    file_path=file_path,
                    language=language,
                    symbol_name=None,
                    start_line=start_line,
                    end_line=i + 1,
                    chunk_index=chunk_index,
                    token_count=max(1, len(content) // 4),
                )
            )
            chunk_index += 1

            if i == len(lines) - 1:
                break

            overlap_content: List[str] = []
            overlap_len = 0
            for overlap_line in reversed(current_chunk):
                if overlap_len + len(overlap_line) + 1 > overlap_chars:
                    break
                overlap_content.insert(0, overlap_line)
                overlap_len += len(overlap_line) + 1

            current_chunk = overlap_content
            current_length = overlap_len
            start_line = i + 2 - len(overlap_content)

    return chunks
