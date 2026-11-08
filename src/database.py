import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "cybershield.db")

SCHEMA = """
-- 1. Unified Normalized Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    host TEXT,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL,
    username TEXT,
    source_ip TEXT,
    dest_ip TEXT,
    action TEXT NOT NULL,
    severity TEXT NOT NULL,
    raw TEXT NOT NULL,
    raw_file_path TEXT,
    parser_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_source_ip ON events(source_ip);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- 2. Triggered Alerts Table
-- Each alert is a dashboard threat notification with:
-- - threat name (rule) and description
-- - source IP and affected host
-- - detection time window (first_seen / last_seen)
-- - severity: low | medium | high | critical
-- - recommended action
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    source_ip TEXT NOT NULL,
    host TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    event_count INTEGER NOT NULL,
    recommended_action TEXT,
    status TEXT DEFAULT 'open',
    UNIQUE(rule, source_ip)
);

-- 3. Correlated Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_ip TEXT UNIQUE NOT NULL,
    sources TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    event_count INTEGER NOT NULL
);

-- 4. Parse Errors & Quarantine Table
CREATE TABLE IF NOT EXISTS parse_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    raw TEXT NOT NULL,
    reason TEXT NOT NULL,
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

INSERT_EVENT = """
INSERT INTO events (
    event_id, timestamp, source, host, event_type, category,
    username, source_ip, dest_ip, action, severity,
    raw, raw_file_path, parser_version
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

INSERT_ERROR = """
INSERT INTO parse_errors (source, raw, reason) VALUES (?, ?, ?)
"""

UPSERT_ALERT = """
INSERT INTO alerts (
    rule, description, severity, source_ip, host,
    first_seen, last_seen, event_count, recommended_action, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(rule, source_ip) DO UPDATE SET
    last_seen = excluded.last_seen,
    event_count = alerts.event_count + excluded.event_count,
    status = 'open'
"""

UPSERT_INCIDENT = """
INSERT INTO incidents (source_ip, sources, first_seen, last_seen, event_count)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(source_ip) DO UPDATE SET
    sources = excluded.sources,
    first_seen = excluded.first_seen,
    last_seen = excluded.last_seen,
    event_count = excluded.event_count
"""

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_conn() as c:
        c.execute("PRAGMA journal_mode=WAL;")
        c.executescript(SCHEMA)
    print(f"Database initialized at {DB_PATH}")

def insert_event(e: dict):
    with get_conn() as c:
        c.execute(INSERT_EVENT, (
            e["event_id"], e["timestamp"], e["source"], e.get("host"),
            e["event_type"], e["category"], e.get("username"),
            e.get("source_ip"), e.get("dest_ip"), e["action"],
            e["severity"], e["raw"], e.get("raw_file_path"),
            e.get("parser_version", "1.0")
        ))

def insert_error(source: str, raw: str, reason: str):
    with get_conn() as c:
        c.execute(INSERT_ERROR, (source, raw, reason))

def upsert_alert(alert: dict):
    with get_conn() as c:
        c.execute(UPSERT_ALERT, (
            alert["rule"], alert["description"], alert["severity"],
            alert["source_ip"], alert.get("host"),
            alert["first_seen"], alert["last_seen"],
            alert["event_count"], alert.get("recommended_action", ""),
            alert.get("status", "open")
        ))

def upsert_incident(incident: dict):
    with get_conn() as c:
        c.execute(UPSERT_INCIDENT, (
            incident["source_ip"], incident["sources"],
            incident["first_seen"], incident["last_seen"],
            incident["event_count"]
        ))

if __name__ == "__main__":
    init_db()