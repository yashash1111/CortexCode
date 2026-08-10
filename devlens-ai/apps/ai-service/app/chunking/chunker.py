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

def chunk_file(file_content: str, file_path: str, language: str) -> List[CodeChunkModel]:
    # Phase 2 implementation of chunking.
    # In a full implementation, this would use Tree-sitter to parse classes/functions.
    # We fallback to simple character/line based chunking for now based on config.
    
    chunks = []
    lines = file_content.split('\n')
    
    current_chunk = []
    current_length = 0
    start_line = 1
    
    # Rough approximation: 1 token ~= 4 characters
    max_chars = settings.CHUNK_SIZE * 4
    overlap_chars = settings.CHUNK_OVERLAP * 4
    
    chunk_index = 0
    i = 0
    
    while i < len(lines):
        line = lines[i]
        current_chunk.append(line)
        current_length += len(line) + 1 # +1 for newline
        
        if current_length >= max_chars or i == len(lines) - 1:
            content = '\n'.join(current_chunk)
            chunks.append(CodeChunkModel(
                content=content,
                file_path=file_path,
                language=language,
                symbol_name=None, # Extracting symbols requires language parsers
                start_line=start_line,
                end_line=i + 1,
                chunk_index=chunk_index,
                token_count=len(content) // 4
            ))
            chunk_index += 1
            
            # Simple overlap logic by keeping the last few lines
            overlap_content = []
            overlap_len = 0
            for overlap_line in reversed(current_chunk):
                if overlap_len + len(overlap_line) > overlap_chars:
                    break
                overlap_content.insert(0, overlap_line)
                overlap_len += len(overlap_line) + 1
            
            current_chunk = overlap_content
            current_length = overlap_len
            start_line = i + 1 - len(overlap_content) + 1
            
        i += 1
        
    return chunks
