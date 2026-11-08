import csv
from datetime import datetime
from parsers.base import BaseParser

class PaloAltoParser(BaseParser):
    source = "paloalto"
    category = "network"

    def parse(self, line: str) -> dict | None:
        try:
            parts = next(csv.reader([line]))
        except Exception:
            return None
        if len(parts) < 31:
            return None
        ts_raw = parts[7]
        try:
            dt = datetime.strptime(ts_raw, "%Y/%m/%d %H:%M:%S")
            timestamp = dt.isoformat()
        except Exception:
            timestamp = datetime.now().isoformat()
        action_raw = parts[30].lower()
        if action_raw in ("deny", "drop"):
            event_type, action, severity = "traffic_deny", "deny", "high"
        else:
            event_type, action, severity = "traffic_allow", "allow", "info"
        return self.make_event(
            timestamp=timestamp,
            event_type=event_type,
            source_ip=parts[8],
            dest_ip=parts[9],
            action=action,
            severity=severity,
            raw=line,
        )