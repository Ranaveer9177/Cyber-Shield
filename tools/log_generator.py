from datetime import datetime, timedelta, timezone
import os
import json

OUTPUT_DIR = "data/samples"
ATTACK_IP = "203.0.113.50"

def write_file(name: str, lines: list[str]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, name), "w") as f:
        f.write("\n".join(lines))

def generate_apache() -> list[str]:
    now = datetime.now(timezone.utc)
    lines = []
    for i in range(15):
        t = (now + timedelta(seconds=i * 3)).strftime("%d/%b/%Y:%H:%M:%S +0000")
        lines.append(f'{ATTACK_IP} - - [{t}] "GET /admin_probe_{i} HTTP/1.1" 404 120')
    for i in range(8):
        t = (now + timedelta(seconds=45 + i * 5)).strftime("%d/%b/%Y:%H:%M:%S +0000")
        lines.append(f'{ATTACK_IP} - - [{t}] "POST /login HTTP/1.1" 401 85')
    return lines

def generate_linux() -> list[str]:
    now = datetime.now(timezone.utc)
    lines = []
    for i in range(10):
        t = (now + timedelta(seconds=60 + i * 4)).strftime("%b %d %H:%M:%S")
        lines.append(f"{t} web-srv-01 sshd[4412]: Failed password for invalid user root from {ATTACK_IP} port {50000+i} ssh2")
    for i in range(3):
        t = (now + timedelta(seconds=100 + i * 2)).strftime("%b %d %H:%M:%S")
        lines.append(f"{t} web-srv-01 sshd[4413]: Failed password for invalid user admin from {ATTACK_IP} port {51000+i} ssh2")
    return lines

def generate_paloalto() -> list[str]:
    now = datetime.now(timezone.utc)
    lines = []
    for i in range(12):
        t = (now + timedelta(seconds=120 + i * 2)).strftime("%Y/%m/%d %H:%M:%S")
        parts = [""] * 31
        parts[7] = t
        parts[8] = ATTACK_IP
        parts[9] = "10.0.0.5"
        parts[24] = str(22 + i)
        parts[30] = "deny"
        lines.append(",".join(parts))
    return lines

def generate_windows() -> list[str]:
    now = datetime.now(timezone.utc)
    lines = []
    header = "EventID,TimeCreated,TargetUserName,IpAddress,WorkstationName"
    lines.append(header)
    for i in range(8):
        t = (now + timedelta(seconds=140 + i * 3)).strftime("%Y-%m-%dT%H:%M:%S")
        lines.append(f"4625,{t},admin,{ATTACK_IP},web-srv-01")
    return lines

def generate_aws() -> list[str]:
    now = datetime.now(timezone.utc)
    records = []
    for i in range(6):
        t = (now + timedelta(seconds=160 + i * 4)).isoformat().replace("+00:00", "Z")
        records.append({
            "eventTime": t,
            "sourceIPAddress": ATTACK_IP,
            "userIdentity": {"userName": "admin"},
            "eventName": "ConsoleLogin",
            "errorCode": "FailedAuthentication",
        })
    return [json.dumps({"Records": records})]

if __name__ == "__main__":
    write_file("apache_attack.log", generate_apache())
    write_file("linux_attack.log", generate_linux())
    write_file("paloalto_attack.log", generate_paloalto())
    write_file("windows_attack.csv", generate_windows())
    write_file("aws_attack.json", generate_aws())
    print(f"Attack datasets generated in {OUTPUT_DIR}")