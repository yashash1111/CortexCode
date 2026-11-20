import base64
import re
from typing import Any, Dict, List, Optional, Tuple
import pymupdf
from pydantic import BaseModel


class DocChunkModel(BaseModel):
    chunk_index: int
    content: str
    source_path: str
    page_number: Optional[int] = None
    section_heading: Optional[str] = None
    token_count: int


class ParsedDocumentResult(BaseModel):
    title: Optional[str] = None
    page_count: int = 0
    extracted_text: str
    metadata: Dict[str, Any]
    chunks: List[DocChunkModel]


def _split_into_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _chunk_blocks(
    blocks: List[Tuple[Optional[int], Optional[str], str]],
    source_path: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 180,
) -> List[DocChunkModel]:
    """
    Heading-aware & paragraph-aware chunker.
    `blocks` is a list of (page_number, section_heading, paragraph_text).
    """
    chunks: List[DocChunkModel] = []
    current_parts: List[str] = []
    current_len = 0
    current_page: Optional[int] = None
    current_heading: Optional[str] = None
    chunk_idx = 0

    def flush():
        nonlocal current_parts, current_len, chunk_idx
        text = "\n\n".join(current_parts).strip()
        if not text:
            return
        chunks.append(
            DocChunkModel(
                chunk_index=chunk_idx,
                content=text,
                source_path=source_path,
                page_number=current_page,
                section_heading=current_heading,
                token_count=max(1, len(text) // 4),
            )
        )
        chunk_idx += 1

        # Compute sentence-safe overlap from the tail
        if chunk_overlap > 0:
            sentences = _split_into_sentences(text)
            tail: List[str] = []
            tail_len = 0
            for sent in reversed(sentences):
                if tail_len + len(sent) + 1 > chunk_overlap and tail:
                    break
                tail.insert(0, sent)
                tail_len += len(sent) + 1
            overlap_str = " ".join(tail).strip()
            if overlap_str and len(overlap_str) < chunk_size:
                current_parts = [overlap_str]
                current_len = len(overlap_str)
                return

        current_parts = []
        current_len = 0

    for page_num, heading, para in blocks:
        para = para.strip()
        if not para:
            continue

        # Flush if heading changes and current buffer is substantial
        if heading and current_heading and heading != current_heading and current_len >= chunk_size // 3:
            flush()

        # Flush on page change for PDFs so every chunk preserves an exact page number
        if page_num is not None and current_page is not None and page_num != current_page and current_parts:
            flush()
            current_parts = []
            current_len = 0
            current_page = page_num

        if current_page is None:
            current_page = page_num
        if heading:
            current_heading = heading

        # If a single paragraph exceeds chunk_size, split by sentences
        if len(para) > chunk_size:
            sentences = _split_into_sentences(para)
            for sent in sentences:
                if current_len + len(sent) + 2 > chunk_size and current_parts:
                    flush()
                    current_page = page_num
                    if heading:
                        current_heading = heading
                current_parts.append(sent)
                current_len += len(sent) + 2
            continue

        if current_len + len(para) + 2 > chunk_size and current_parts:
            flush()
            current_page = page_num
            if heading:
                current_heading = heading

        current_parts.append(para)
        current_len += len(para) + 2

    if current_parts:
        flush()

    return chunks


def parse_and_chunk_pdf(
    content_base64: str,
    source_path: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 180,
) -> ParsedDocumentResult:
    raw_bytes = base64.b64decode(content_base64)
    if not raw_bytes:
        raise ValueError("Uploaded PDF file is empty.")

    try:
        doc = pymupdf.open(stream=raw_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Invalid or corrupted PDF file: {exc}")

    try:
        if doc.page_count == 0:
            raise ValueError("PDF has zero pages.")

        meta = doc.metadata or {}
        blocks: List[Tuple[Optional[int], Optional[str], str]] = []
        all_page_texts: List[str] = []
        active_heading: Optional[str] = None

        for page_idx in range(doc.page_count):
            page_num = page_idx + 1
            page = doc[page_idx]
            page_dict = page.get_text("dict")
            page_text_parts: List[str] = []

            # Estimate median body font size on page to detect headings
            font_sizes: List[float] = []
            for b in page_dict.get("blocks", []):
                if b.get("type") != 0:
                    continue
                for line in b.get("lines", []):
                    for span in line.get("spans", []):
                        if span.get("text", "").strip():
                            font_sizes.append(float(span.get("size", 11.0)))
            median_size = sorted(font_sizes)[len(font_sizes) // 2] if font_sizes else 11.0

            for b in page_dict.get("blocks", []):
                if b.get("type") != 0:
                    continue
                block_lines: List[str] = []
                max_span_size = 0.0
                is_bold = False
                for line in b.get("lines", []):
                    line_txt = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
                    if line_txt:
                        block_lines.append(line_txt)
                    for s in line.get("spans", []):
                        max_span_size = max(max_span_size, float(s.get("size", 0.0)))
                        if "bold" in str(s.get("font", "")).lower():
                            is_bold = True

                block_text = " ".join(block_lines).strip()
                if not block_text:
                    continue
                page_text_parts.append(block_text)

                is_heading = (
                    len(block_text) <= 140
                    and (max_span_size >= median_size * 1.18 or (is_bold and len(block_text) <= 80))
                )
                if is_heading:
                    active_heading = block_text
                blocks.append((page_num, active_heading, block_text))

            all_page_texts.append(f"--- Page {page_num} ---\n" + "\n\n".join(page_text_parts))

        extracted_text = "\n\n".join(all_page_texts).strip()
        if not blocks or len(extracted_text.replace("-", "").strip()) < 20:
            raise ValueError(
                "PDF contains no extractable text (empty or scanned image-only document)."
            )

        chunks = _chunk_blocks(blocks, source_path, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        return ParsedDocumentResult(
            title=meta.get("title") or source_path,
            page_count=doc.page_count,
            extracted_text=extracted_text,
            metadata={
                "author": meta.get("author"),
                "subject": meta.get("subject"),
                "pageCount": doc.page_count,
                "format": "pdf",
            },
            chunks=chunks,
        )
    finally:
        doc.close()


def parse_and_chunk_markdown(
    text: str,
    source_path: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 180,
) -> ParsedDocumentResult:
    if not text or not text.strip():
        raise ValueError("Markdown document is empty.")

    lines = text.splitlines()
    blocks: List[Tuple[Optional[int], Optional[str], str]] = []
    heading_stack: List[Tuple[int, str]] = []
    para_lines: List[str] = []
    doc_title: Optional[str] = None

    def current_heading() -> Optional[str]:
        if not heading_stack:
            return None
        return " > ".join(h[1] for h in heading_stack)

    def flush_para():
        nonlocal para_lines
        content = "\n".join(para_lines).strip()
        if content:
            blocks.append((None, current_heading(), content))
        para_lines = []

    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if m:
            flush_para()
            level = len(m.group(1))
            title = m.group(2).strip()
            if level == 1 and not doc_title:
                doc_title = title
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, title))
            blocks.append((None, current_heading(), f"{m.group(1)} {title}"))
        elif line.strip() == "":
            flush_para()
        else:
            para_lines.append(line)

    flush_para()
    if not blocks:
        raise ValueError("Markdown document contains no parseable content.")

    chunks = _chunk_blocks(blocks, source_path, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return ParsedDocumentResult(
        title=doc_title or source_path,
        page_count=1,
        extracted_text=text,
        metadata={"format": "markdown", "headingsCount": len([b for b in blocks if b[2].startswith("#")])},
        chunks=chunks,
    )
