import csv
import io
from datetime import datetime
from parsers.base import BaseParser

class WindowsParser(BaseParser):
    source = "windows"
    category = "authentication"
    FIELDNAMES = ["EventID", "TimeCreated", "TargetUserName", "IpAddress", "WorkstationName"]

    def parse(self, line: str) -> dict | None:
        try:
            f = io.StringIO(line)
            reader = csv.DictReader(f, fieldnames=self.FIELDNAMES)
            row = next(reader)
        except Exception:
            return None
        event_id = row.get("EventID", "").strip()
        if event_id not in ("4624", "4625"):
            return None
        ts = row.get("TimeCreated", "") or row.get("Time", "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            timestamp = dt.isoformat()
        except Exception:
            timestamp = datetime.now().isoformat()
        if event_id == "4625":
            event_type, action, severity = "failed_login", "failure", "medium"
        else:
            event_type, action, severity = "successful_login", "success", "info"
        return self.make_event(
            timestamp=timestamp,
            event_type=event_type,
            host=row.get("WorkstationName"),
            username=row.get("TargetUserName"),
            source_ip=row.get("IpAddress"),
            dest_ip=None,
            action=action,
            severity=severity,
            raw=line,
        )