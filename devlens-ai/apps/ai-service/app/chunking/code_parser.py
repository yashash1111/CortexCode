import hashlib
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from tree_sitter_language_pack import get_parser


EXT_TO_LANG = {
    "js": "javascript",
    "jsx": "javascript",
    "mjs": "javascript",
    "cjs": "javascript",
    "ts": "typescript",
    "tsx": "tsx",
    "py": "python",
    "java": "java",
    "go": "go",
}

SYMBOL_NODE_TYPES = {
    "function_declaration",
    "function_definition",
    "async_function_definition",
    "method_declaration",
    "method_definition",
    "class_declaration",
    "class_definition",
    "func_literal",
    "function_item",
    "interface_declaration",
}

IMPORT_NODE_TYPES = {
    "import_statement",
    "import_from_statement",
    "import_declaration",
    "import_spec",
}


class ParsedCodeChunk(BaseModel):
    chunk_index: int
    file_path: str
    language: str
    symbol_name: Optional[str] = None
    node_type: Optional[str] = None
    start_line: int
    end_line: int
    content: str
    imports: List[str] = []
    calls: List[str] = []
    file_hash: str
    token_count: int


class ParsedCodeFileResult(BaseModel):
    file_path: str
    language: str
    file_hash: str
    imports: List[str]
    symbols: List[Dict[str, Any]]
    calls: List[str]
    api_routes: List[str]
    db_models: List[str]
    chunks: List[ParsedCodeChunk]


def detect_language(file_path: str) -> Optional[str]:
    ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
    return EXT_TO_LANG.get(ext)


def _node_text(node, source_bytes: bytes) -> str:
    return source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _extract_symbol_name(node, source_bytes: bytes) -> Optional[str]:
    for child in node.children:
        if child.type in ("identifier", "type_identifier", "property_identifier", "field_identifier"):
            return _node_text(child, source_bytes)
    # Check variable_declarator / assignment if arrow function
    return None


def parse_and_chunk_code(
    content: str,
    file_path: str,
    language: Optional[str] = None,
    max_chunk_chars: int = 2000,
) -> ParsedCodeFileResult:
    lang = language or detect_language(file_path) or "typescript"
    source_bytes = content.encode("utf-8")
    file_hash = hashlib.sha256(source_bytes).hexdigest()
    lines = content.splitlines()

    if not content.strip():
        return ParsedCodeFileResult(
            file_path=file_path,
            language=lang,
            file_hash=file_hash,
            imports=[],
            symbols=[],
            calls=[],
            api_routes=[],
            db_models=[],
            chunks=[],
        )

    imports: List[str] = []
    symbols: List[Dict[str, Any]] = []
    calls_set = set()

    try:
        parser = get_parser(lang)  # type: ignore[arg-type]
        tree = parser.parse(source_bytes)
        root = tree.root_node

        def walk(node):
            ntype = node.type
            if ntype in IMPORT_NODE_TYPES:
                txt = _node_text(node, source_bytes).strip()
                if txt:
                    imports.append(txt)

            if ntype in SYMBOL_NODE_TYPES:
                name = _extract_symbol_name(node, source_bytes)
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                if name:
                    symbols.append(
                        {
                            "name": name,
                            "type": ntype,
                            "startLine": start_line,
                            "endLine": end_line,
                        }
                    )

            if ntype in ("call_expression", "call"):
                for child in node.children:
                    if child.type in ("identifier", "member_expression", "attribute", "selector_expression"):
                        callee = _node_text(child, source_bytes).strip()
                        if callee and len(callee) <= 80:
                            calls_set.add(callee.split("(")[0].strip())
                        break

            for child in node.children:
                walk(child)

        walk(root)
    except Exception:
        # Graceful fallback if grammar is unavailable
        pass

    # Extract API routes & DB models via static patterns
    api_routes = sorted(
        set(
            re.findall(
                r"""(?:app|router)\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]""",
                content,
            )
            + re.findall(r"""@(?:app|router)\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]""", content)
        )
    )
    db_models = sorted(set(re.findall(r"""prisma\.([a-zA-Z0-9_]+)\.""", content)))

    # Build chunks from extracted symbols (or line windows for top-level / uncovered code)
    chunks: List[ParsedCodeChunk] = []
    covered_ranges: List[tuple] = []
    chunk_idx = 0

    for sym in symbols:
        s_line = sym["startLine"]
        e_line = sym["endLine"]
        # Skip tiny nested duplicates already inside an emitted symbol unless large
        if any(cs <= s_line and e_line <= ce for cs, ce in covered_ranges):
            continue
        sym_text = "\n".join(lines[s_line - 1 : e_line]).strip()
        if not sym_text:
            continue

        covered_ranges.append((s_line, e_line))
        if len(sym_text) <= max_chunk_chars:
            chunks.append(
                ParsedCodeChunk(
                    chunk_index=chunk_idx,
                    file_path=file_path,
                    language=lang,
                    symbol_name=sym["name"],
                    node_type=sym["type"],
                    start_line=s_line,
                    end_line=e_line,
                    content=sym_text,
                    imports=imports[:15],
                    calls=sorted(calls_set)[:20],
                    file_hash=file_hash,
                    token_count=max(1, len(sym_text) // 4),
                )
            )
            chunk_idx += 1
        else:
            # Split large classes/functions by line windows while preserving symbol & exact line numbers
            cur_start = s_line
            buf: List[str] = []
            buf_len = 0
            for ln in range(s_line, e_line + 1):
                line_str = lines[ln - 1]
                buf.append(line_str)
                buf_len += len(line_str) + 1
                if buf_len >= max_chunk_chars or ln == e_line:
                    txt = "\n".join(buf).strip()
                    if txt:
                        chunks.append(
                            ParsedCodeChunk(
                                chunk_index=chunk_idx,
                                file_path=file_path,
                                language=lang,
                                symbol_name=sym["name"],
                                node_type=sym["type"],
                                start_line=cur_start,
                                end_line=ln,
                                content=txt,
                                imports=imports[:15],
                                calls=sorted(calls_set)[:20],
                                file_hash=file_hash,
                                token_count=max(1, len(txt) // 4),
                            )
                        )
                        chunk_idx += 1
                    buf = []
                    buf_len = 0
                    cur_start = ln + 1

    # Cover top-level / module-level lines if no symbols were extracted
    if not chunks:
        cur_start = 1
        buf = []
        buf_len = 0
        for ln, line_str in enumerate(lines, start=1):
            buf.append(line_str)
            buf_len += len(line_str) + 1
            if buf_len >= max_chunk_chars or ln == len(lines):
                txt = "\n".join(buf).strip()
                if txt:
                    chunks.append(
                        ParsedCodeChunk(
                            chunk_index=chunk_idx,
                            file_path=file_path,
                            language=lang,
                            symbol_name=None,
                            node_type="module",
                            start_line=cur_start,
                            end_line=ln,
                            content=txt,
                            imports=imports[:15],
                            calls=sorted(calls_set)[:20],
                            file_hash=file_hash,
                            token_count=max(1, len(txt) // 4),
                        )
                    )
                    chunk_idx += 1
                buf = []
                buf_len = 0
                cur_start = ln + 1

    return ParsedCodeFileResult(
        file_path=file_path,
        language=lang,
        file_hash=file_hash,
        imports=imports,
        symbols=symbols,
        calls=sorted(calls_set)[:30],
        api_routes=api_routes,
        db_models=db_models,
        chunks=chunks,
    )
