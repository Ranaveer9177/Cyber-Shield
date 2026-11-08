import re
from datetime import datetime
from parsers.base import BaseParser

class ApacheParser(BaseParser):
    source = "apache"
    category = "web"
    RE = re.compile(
        r'(?P<ip>\S+) \S+ (?P<user>\S+) \[(?P<ts>[^\]]+)\] '
        r'"(?P<method>\S+) (?P<path>\S+) [^"]*" (?P<status>\d{3}) (?P<size>\S+)'
    )

    def parse(self, line: str) -> dict | None:
        m = self.RE.match(line)
        if not m:
            return None
        d = m.groupdict()
        ts = d["ts"].split()[0]
        try:
            dt = datetime.strptime(ts, "%d/%b/%Y:%H:%M:%S")
            timestamp = dt.isoformat()
        except Exception:
            timestamp = datetime.now().isoformat()
        status = int(d["status"])
        if status == 401:
            event_type, severity, action = "http_unauthorized", "low", "failure"
        elif status == 403:
            event_type, severity, action = "http_forbidden", "low", "failure"
        elif status == 404:
            event_type, severity, action = "http_not_found", "info", "request"
        elif status >= 500:
            event_type, severity, action = "http_server_error", "low", "request"
        else:
            event_type, severity, action = "http_request", "info", "request"
        return self.make_event(
            timestamp=timestamp,
            event_type=event_type,
            username=d["user"] if d["user"] != "-" else None,
            source_ip=d["ip"],
            dest_ip=None,
            action=action,
            severity=severity,
            raw=line,
        )