from typing import List, Dict, Any
from app.core.config import settings

class ContextBuilder:
    @staticmethod
    def build_context(retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Builds a context string from a list of retrieved chunks, handling duplicates
        and formatting them with sources.
        """
        if not retrieved_chunks:
            return ""

        context_parts = []
        seen_files = set()
        
        for chunk in retrieved_chunks:
            file_path = chunk.get('file_path')
            content = chunk.get('content')
            start_line = chunk.get('start_line', 'unknown')
            end_line = chunk.get('end_line', 'unknown')
            
            # Simple deduplication by file (can be improved to merge adjacent chunks)
            chunk_identifier = f"{file_path}:{start_line}-{end_line}"
            if chunk_identifier in seen_files:
                continue
                
            seen_files.add(chunk_identifier)
            
            context_parts.append(
                f"--- Source: {file_path} (Lines {start_line}-{end_line}) ---\n{content}\n"
            )
            
        return "\n".join(context_parts)
