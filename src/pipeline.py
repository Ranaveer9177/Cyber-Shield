import os
import uuid
from datetime import datetime
from parsers import PARSERS, BaseParser
from src.database import insert_event, insert_error

RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
os.makedirs(RAW_DIR, exist_ok=True)

def save_raw_batch(source: str, content: str) -> str:
    import re
    clean_source = re.sub(r'[^a-zA-Z0-9_-]', '', source) or 'unknown'
    ext = ".json" if clean_source == "aws" else ".log"
    fname = f"{clean_source}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    path = os.path.abspath(os.path.join(RAW_DIR, fname))
    if not path.startswith(os.path.abspath(RAW_DIR)):
        raise ValueError("Invalid storage path")
    with open(path, "w") as f:
        f.write(content)
    return path

def detect_source(sample_line: str) -> str | None:
    for name, parser in PARSERS.items():
        if parser.can_parse(sample_line):
            return name
    return None

def ingest_lines(source: str, lines: list[str], raw_file_path: str | None = None) -> tuple[int, int, list[dict]]:
    parser = PARSERS.get(source)
    if not parser:
        return 0, len(lines), []
    ok, fail, events = 0, 0, []
    for line in lines:
        line = line.rstrip("\n")
        if not line:
            continue
        parsed = parser.parse(line)
        if parsed:
            if raw_file_path:
                parsed["raw_file_path"] = raw_file_path
            insert_event(parsed)
            events.append(parsed)
            ok += 1
        else:
            insert_error(source, line, "No parser match")
            fail += 1
    return ok, fail, events

def ingest_payload(source: str, content: str) -> tuple[int, int, list[dict]]:
    raw_path = save_raw_batch(source, content)
    if source == "aws":
        import json
        try:
            data = json.loads(content)
            records = data.get("Records", [])
            lines = [json.dumps(r) for r in records]
        except Exception:
            lines = [content]
    elif content.strip().startswith("[") or (content.strip().startswith("{") and "log" in content):
        import json
        try:
            data = json.loads(content)
            if isinstance(data, list):
                extracted = []
                for item in data:
                    if isinstance(item, dict):
                        l = item.get("log") or item.get("message") or json.dumps(item)
                        extracted.append(str(l).rstrip())
                    elif isinstance(item, list) and len(item) == 2 and isinstance(item[1], dict):
                        l = item[1].get("log") or item[1].get("message") or json.dumps(item[1])
                        extracted.append(str(l).rstrip())
                    else:
                        extracted.append(str(item))
                lines = extracted
            elif isinstance(data, dict):
                l = data.get("log") or data.get("message") or json.dumps(data)
                lines = [str(l)]
            else:
                lines = content.strip().split("\n")
        except Exception:
            lines = content.strip().split("\n")
    else:
        lines = content.strip().split("\n")
    return ingest_lines(source, lines, raw_path)