import re
from datetime import datetime
from parsers.base import BaseParser

class LinuxParser(BaseParser):
    source = "linux"
    category = "authentication"
    RE = re.compile(
        r'^(?P<ts>\w{3}\s+\d{1,2} \d{2}:\d{2}:\d{2}) (?P<host>\S+) sshd\[\d+\]: '
        r'(?P<res>Failed|Accepted) password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+)'
    )

    def parse(self, line: str) -> dict | None:
        m = self.RE.match(line)
        if not m:
            return None
        d = m.groupdict()
        year = datetime.now().year
        try:
            dt = datetime.strptime(f"{year} {d['ts']}", "%Y %b %d %H:%M:%S")
            timestamp = dt.isoformat()
        except Exception:
            timestamp = datetime.now().isoformat()
        if d["res"] == "Failed":
            event_type, action, severity = "failed_login", "failure", "medium"
        else:
            event_type, action, severity = "successful_login", "success", "info"
        return self.make_event(
            timestamp=timestamp,
            event_type=event_type,
            host=d["host"],
            username=d["user"],
            source_ip=d["ip"],
            dest_ip=None,
            action=action,
            severity=severity,
            raw=line,
        )