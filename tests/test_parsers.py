import pytest
from parsers.apache_parser import ApacheParser
from parsers.linux_parser import LinuxParser
from parsers.windows_parser import WindowsParser
from parsers.paloalto_parser import PaloAltoParser
from parsers.aws_parser import AWSParser

def test_apache_parser_valid():
    parser = ApacheParser()
    raw = '198.51.100.1 - - [07/Nov/2026:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1024'
    ev = parser.parse(raw)
    assert ev is not None
    assert ev["source"] == "apache"
    assert ev["source_ip"] == "198.51.100.1"
    assert ev["event_type"] == "http_request"
    assert ev["action"] == "request"
    assert ev["severity"] == "info"

def test_apache_parser_404():
    parser = ApacheParser()
    raw = '203.0.113.50 - - [07/Nov/2026:10:20:00 +0000] "GET /admin HTTP/1.1" 404 120'
    ev = parser.parse(raw)
    assert ev["event_type"] == "http_not_found"
    assert ev["severity"] == "info"
    assert ev["action"] == "request"

def test_apache_parser_401():
    parser = ApacheParser()
    raw = '203.0.113.50 - - [07/Nov/2026:10:20:00 +0000] "POST /login HTTP/1.1" 401 85'
    ev = parser.parse(raw)
    assert ev["event_type"] == "http_unauthorized"
    assert ev["severity"] == "low"
    assert ev["action"] == "failure"

def test_apache_parser_malformed():
    parser = ApacheParser()
    assert parser.parse("corrupted log entry without tokens") is None

def test_linux_parser_failed():
    parser = LinuxParser()
    raw = "Nov  7 10:00:00 web01 sshd[123]: Failed password for invalid user admin from 198.51.100.2 port 4421 ssh2"
    ev = parser.parse(raw)
    assert ev is not None
    assert ev["source"] == "linux"
    assert ev["username"] == "admin"
    assert ev["source_ip"] == "198.51.100.2"
    assert ev["event_type"] == "failed_login"
    assert ev["action"] == "failure"
    assert ev["severity"] == "medium"

def test_linux_parser_accepted():
    parser = LinuxParser()
    raw = "Nov  7 10:00:00 web01 sshd[123]: Accepted password for admin from 198.51.100.2 port 4421 ssh2"
    ev = parser.parse(raw)
    assert ev["event_type"] == "successful_login"
    assert ev["action"] == "success"
    assert ev["severity"] == "info"

def test_linux_parser_malformed():
    parser = LinuxParser()
    assert parser.parse("not a valid sshd log line") is None

def test_windows_parser_failed():
    parser = WindowsParser()
    line = "4625,2026-11-07T10:20:00,admin,203.0.113.50,web-srv-01"
    ev = parser.parse(line)
    assert ev is not None
    assert ev["source"] == "windows"
    assert ev["event_type"] == "failed_login"
    assert ev["action"] == "failure"
    assert ev["severity"] == "medium"

def test_windows_parser_success():
    parser = WindowsParser()
    line = "4624,2026-11-07T10:20:00,admin,203.0.113.50,web-srv-01"
    ev = parser.parse(line)
    assert ev["event_type"] == "successful_login"
    assert ev["action"] == "success"

def test_windows_parser_malformed():
    parser = WindowsParser()
    assert parser.parse("not,csv,format") is None

def test_paloalto_parser_deny():
    parser = PaloAltoParser()
    parts = [""] * 31
    parts[7] = "2026/11/07 10:20:00"
    parts[8] = "203.0.113.50"
    parts[9] = "10.0.0.5"
    parts[30] = "deny"
    raw = ",".join(parts)
    ev = parser.parse(raw)
    assert ev is not None
    assert ev["source"] == "paloalto"
    assert ev["event_type"] == "traffic_deny"
    assert ev["source_ip"] == "203.0.113.50"
    assert ev["dest_ip"] == "10.0.0.5"
    assert ev["action"] == "deny"
    assert ev["severity"] == "high"

def test_paloalto_parser_allow():
    parser = PaloAltoParser()
    parts = [""] * 31
    parts[7] = "2026/11/07 10:20:00"
    parts[8] = "203.0.113.50"
    parts[9] = "10.0.0.5"
    parts[30] = "allow"
    raw = ",".join(parts)
    ev = parser.parse(raw)
    assert ev["event_type"] == "traffic_allow"
    assert ev["action"] == "allow"
    assert ev["severity"] == "info"

def test_paloalto_parser_malformed():
    parser = PaloAltoParser()
    assert parser.parse("not,enough,fields") is None

def test_aws_parser_consolelogin_failure():
    parser = AWSParser()
    rec = {"eventTime": "2026-11-07T10:20:00Z", "sourceIPAddress": "203.0.113.50",
           "userIdentity": {"userName": "admin"}, "eventName": "ConsoleLogin",
           "errorCode": "FailedAuthentication"}
    ev = parser.parse_record(rec)
    assert ev is not None
    assert ev["source"] == "aws"
    assert ev["event_type"] == "ConsoleLogin"
    assert ev["source_ip"] == "203.0.113.50"
    assert ev["username"] == "admin"
    assert ev["action"] == "failure"
    assert ev["severity"] == "medium"

def test_aws_parser_consolelogin_success():
    parser = AWSParser()
    rec = {"eventTime": "2026-11-07T10:20:00Z", "sourceIPAddress": "203.0.113.50",
           "userIdentity": {"userName": "admin"}, "eventName": "ConsoleLogin"}
    ev = parser.parse_record(rec)
    assert ev["action"] == "success"
    assert ev["severity"] == "info"

def test_aws_parser_malformed():
    parser = AWSParser()
    assert parser.parse("not valid json") is None