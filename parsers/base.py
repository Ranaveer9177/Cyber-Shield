import uuid
import re
from abc import ABC, abstractmethod

class BaseParser(ABC):
    source = "unknown"
    category = "unknown"
    version = "1.0"

    def can_parse(self, line: str) -> bool:
        try:
            return self.parse(line) is not None
        except Exception:
            return False

    @abstractmethod
    def parse(self, line: str) -> dict | None:
        pass

    def make_event(self, **kwargs) -> dict:
        event = {
            "event_id": str(uuid.uuid4()),
            "source": self.source,
            "category": self.category,
            "host": None,
            "username": None,
            "source_ip": None,
            "dest_ip": None,
            "action": "request",
            "severity": "info",
            "raw": "",
            "raw_file_path": None,
            "parser_version": self.version,
        }
        event.update(kwargs)
        return event