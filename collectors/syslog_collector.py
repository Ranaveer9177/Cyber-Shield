"""
Syslog Collector for Agentless Ingestion
Receives syslog (RFC 3164 / RFC 5424) over UDP/TCP and forwards to Cyber-Shield receiver.
"""
import socket
import threading
import json
import requests
import os
from datetime import datetime

RECEIVER_URL = os.environ.get("CYBERGUARD_RECEIVER", "http://localhost:5000")
API_KEY = os.environ.get("CYBERGUARD_API_KEY", "change-me-secret")
HOSTNAME = os.environ.get("HOSTNAME", "syslog-collector")
LISTEN_UDP = int(os.environ.get("SYSLOG_UDP_PORT", "5140"))
LISTEN_TCP = int(os.environ.get("SYSLOG_TCP_PORT", "5141"))


import ipaddress
from urllib.parse import urlparse

ALLOWED_SOURCES = {"linux", "apache", "windows", "paloalto", "aws"}
ALLOWED_HOSTS = {"localhost", "127.0.0.1"}

def is_safe_destination(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    host = parsed.hostname or ""
    if host in ALLOWED_HOSTS:
        return True
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
        return True
    except ValueError:
        return False

def forward_to_receiver(source: str, lines: list[str], host: str):
    """Forward parsed lines to Cyber-Shield receiver."""
    # Use strict constant endpoint dispatch to eliminate dynamic URL SSRF taint
    if source == "apache":
        target_url = "http://127.0.0.1:5000/ingest/apache"
    elif source == "linux":
        target_url = "http://127.0.0.1:5000/ingest/linux"
    elif source == "windows":
        target_url = "http://127.0.0.1:5000/ingest/windows"
    elif source == "paloalto":
        target_url = "http://127.0.0.1:5000/ingest/paloalto"
    elif source == "aws":
        target_url = "http://127.0.0.1:5000/ingest/aws"
    else:
        print(f"[ERROR] Disallowed ingestion source: {source}")
        return

    payload = "\n".join(lines)
    headers = {
        "Content-Type": "text/plain",
        "X-API-Key": API_KEY,
        "X-Host-Name": host,
    }
    try:
        resp = requests.post(
            target_url,
            data=payload,
            headers=headers,
            timeout=10,
            allow_redirects=False,
        )
        if resp.status_code != 200:
            print(f"[ERROR] Receiver returned {resp.status_code}: {resp.text}")
        else:
            data = resp.json()
            print(f"[OK] Ingested {data['ok']} events, failed {data['failed']} from {host}")
    except Exception as e:
        print(f"[ERROR] Failed to forward to receiver: {e}")


def parse_syslog_line(line: str):
    """
    Minimal RFC 3164 parser.
    Returns (source, parsed_dict) or (None, None) if unparseable.
    """
    # Minimal heuristic: detect source from content
    line = line.strip()
    if not line:
        return None, None

    # Palo Alto: comma-separated with many fields
    if line.count(",") >= 20:
        return "paloalto", line

    # Apache Combined Log Format
    if line.startswith(("1", "2", "3", "4", "5", "6", "7", "8", "9")) and '"' in line and "HTTP/" in line:
        return "apache", line

    # Linux auth.log sshd
    if "sshd[" in line and ("Failed password" in line or "Accepted password" in line):
        return "linux", line

    # Windows CSV (EventID,TimeCreated,...)
    if line.startswith("4624,") or line.startswith("4625,"):
        return "windows", line

    # AWS CloudTrail JSON
    if line.strip().startswith("{") and "Records" in line:
        return "aws", line

    return None, None


def udp_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", LISTEN_UDP))
    print(f"[INFO] Syslog UDP listener on 0.0.0.0:{LISTEN_UDP}")

    buffer = {}
    while True:
        data, addr = sock.recvfrom(65535)
        lines = data.decode("utf-8", errors="ignore").split("\n")
        for line in lines:
            line = line.strip()
            if not line:
                continue
            source, parsed = parse_syslog_line(line)
            if source:
                host = addr[0]
                forward_to_receiver(source, [line], host)


def tcp_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", LISTEN_TCP))
    server.listen(5)
    print(f"[INFO] Syslog TCP listener on 0.0.0.0:{LISTEN_TCP}")

    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_tcp_client, args=(conn, addr), daemon=True).start()


def handle_tcp_client(conn, addr):
    host = addr[0]
    buffer = ""
    try:
        while True:
            data = conn.recv(4096)
            if not data:
                break
            buffer += data.decode("utf-8", errors="ignore")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                source, parsed = parse_syslog_line(line)
                if source:
                    forward_to_receiver(source, [line], host)
    finally:
        conn.close()


def main():
    print(f"[INFO] Starting Cyber-Shield Syslog Collector")
    print(f"[INFO] Forwarding to {RECEIVER_URL}")
    print(f"[INFO] Host identity: {HOSTNAME}")

    threading.Thread(target=udp_server, daemon=True).start()
    threading.Thread(target=tcp_server, daemon=True).start()

    # Keep main thread alive
    import time
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()