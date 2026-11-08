import json
from datetime import datetime
from parsers.base import BaseParser

class AWSParser(BaseParser):
    source = "aws"
    category = "cloud"

    def parse(self, line: str) -> dict | None:
        try:
            rec = json.loads(line)
        except Exception:
            return None
        if "Records" in rec:
            return None
        return self.parse_record(rec)

    def parse_record(self, rec: dict) -> dict | None:
        ts = rec.get("eventTime")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            timestamp = dt.isoformat()
        except Exception:
            timestamp = datetime.now().isoformat()
        src_ip = rec.get("sourceIPAddress")
        user = rec.get("userIdentity", {}).get("userName")
        event_name = rec.get("eventName")
        error_code = rec.get("errorCode")
        if error_code:
            event_type, action, severity = event_name, "failure", "medium"
        else:
            event_type, action, severity = event_name, "success", "info"
        return self.make_event(
            timestamp=timestamp,
            event_type=event_type,
            username=user,
            source_ip=src_ip,
            dest_ip=None,
            action=action,
            severity=severity,
            raw=json.dumps(rec),
        )