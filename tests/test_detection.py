import pytest
import pandas as pd
from datetime import datetime, timedelta, timezone
from src.database import get_conn, init_db
from src.pipeline import ingest_payload
from src.detector import run_rules
from src.correlator import run_correlation

@pytest.fixture(autouse=True)
def clean_db():
    init_db()
    with get_conn() as c:
        c.execute("DELETE FROM events")
        c.execute("DELETE FROM alerts")
        c.execute("DELETE FROM incidents")
        c.execute("DELETE FROM parse_errors")

def test_brute_force_alert():
    base = datetime.now(timezone.utc)
    for i in range(6):
        ts = (base + timedelta(seconds=i * 10)).strftime("%b %d %H:%M:%S")
        ingest_payload("linux", f"{ts} web01 sshd[123]: Failed password for invalid user root from 203.0.113.99 port 50000 ssh2")
    assert run_rules() >= 1
    with get_conn() as c:
        row = c.execute("SELECT rule, source_ip FROM alerts WHERE rule='brute_force'").fetchone()
        assert row is not None
        assert row["source_ip"] == "203.0.113.99"

def test_web_scan_alert():
    base = datetime.now(timezone.utc)
    for i in range(12):
        t = (base + timedelta(seconds=i * 5)).strftime("%d/%b/%Y:%H:%M:%S +0000")
        ingest_payload("apache", f'203.0.113.88 - - [{t}] "GET /probe{i} HTTP/1.1" 404 120')
    assert run_rules() >= 1
    with get_conn() as c:
        row = c.execute("SELECT rule, source_ip FROM alerts WHERE rule='web_scan'").fetchone()
        assert row is not None
        assert row["source_ip"] == "203.0.113.88"

def test_repeated_401_alert():
    base = datetime.now(timezone.utc)
    for i in range(6):
        t = (base + timedelta(seconds=i * 10)).strftime("%d/%b/%Y:%H:%M:%S +0000")
        ingest_payload("apache", f'203.0.113.77 - - [{t}] "POST /login HTTP/1.1" 401 85')
    assert run_rules() >= 1
    with get_conn() as c:
        row = c.execute("SELECT rule, source_ip FROM alerts WHERE rule='repeated_401'").fetchone()
        assert row is not None
        assert row["source_ip"] == "203.0.113.77"

def test_firewall_deny_burst_alert():
    base = datetime.now(timezone.utc)
    for i in range(12):
        t = (base + timedelta(seconds=i * 2)).strftime("%Y/%m/%d %H:%M:%S")
        parts = [""] * 31
        parts[7] = t
        parts[8] = "203.0.113.66"
        parts[9] = "10.0.0.5"
        parts[30] = "deny"
        ingest_payload("paloalto", ",".join(parts))
    assert run_rules() >= 1
    with get_conn() as c:
        row = c.execute("SELECT rule, source_ip FROM alerts WHERE rule='firewall_deny_burst'").fetchone()
        assert row is not None
        assert row["source_ip"] == "203.0.113.66"

def test_cloud_console_login_failure_alert():
    import json
    base = datetime.now(timezone.utc)
    records = []
    for i in range(6):
        t = (base + timedelta(seconds=i * 10)).isoformat().replace("+00:00", "Z")
        records.append({"eventTime": t, "sourceIPAddress": "203.0.113.55",
                       "userIdentity": {"userName": "admin"}, "eventName": "ConsoleLogin",
                       "errorCode": "FailedAuthentication"})
    aws_json = json.dumps({"Records": records})
    ingest_payload("aws", aws_json)
    assert run_rules() >= 1
    with get_conn() as c:
        row = c.execute("SELECT rule, source_ip FROM alerts WHERE rule='cloud_console_login_failure'").fetchone()
        assert row is not None
        assert row["source_ip"] == "203.0.113.55"

def test_no_alert_below_threshold():
    base = datetime.now(timezone.utc)
    for i in range(3):
        ts = (base + timedelta(seconds=i * 10)).strftime("%b %d %H:%M:%S")
        ingest_payload("linux", f"{ts} web01 sshd[123]: Failed password for invalid user root from 203.0.113.44 port 50000 ssh2")
    assert run_rules() == 0

def test_correlation_multi_source():
    ip = "203.0.113.33"
    base = datetime.now(timezone.utc)
    for i in range(3):
        t = (base + timedelta(seconds=i * 10)).strftime("%b %d %H:%M:%S")
        ingest_payload("linux", f"{t} web01 sshd[123]: Failed password for invalid user root from {ip} port 50000 ssh2")
    for i in range(3):
        t = (base + timedelta(seconds=i * 5)).strftime("%d/%b/%Y:%H:%M:%S +0000")
        ingest_payload("apache", f'{ip} - - [{t}] "GET /test{i} HTTP/1.1" 404 120')
    run_rules()
    assert run_correlation() >= 1
    with get_conn() as c:
        row = c.execute("SELECT source_ip, sources FROM incidents WHERE source_ip=?", (ip,)).fetchone()
        assert row is not None
        assert "linux" in row["sources"] and "apache" in row["sources"]

def test_alert_upsert_increments_count():
    base = datetime.now(timezone.utc)
    for i in range(6):
        ts = (base + timedelta(seconds=i * 10)).strftime("%b %d %H:%M:%S")
        ingest_payload("linux", f"{ts} web01 sshd[123]: Failed password for invalid user root from 203.0.113.22 port 50000 ssh2")
    run_rules()
    # Second batch
    for i in range(6):
        ts = (base + timedelta(minutes=3, seconds=i * 10)).strftime("%b %d %H:%M:%S")
        ingest_payload("linux", f"{ts} web01 sshd[123]: Failed password for invalid user root from 203.0.113.22 port 50000 ssh2")
    run_rules()
    with get_conn() as c:
        row = c.execute("SELECT event_count FROM alerts WHERE rule='brute_force' AND source_ip='203.0.113.22'").fetchone()
        assert row is not None
        assert row["event_count"] >= 6