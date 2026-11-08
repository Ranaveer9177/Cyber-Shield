# 📡 Cyber-Shield: REST API Reference

The Cyber-Shield backend exposes a modular REST API built on **Python Flask 3.0** with **Flask-CORS** support, handling telemetry ingestion, real-time KPI metrics, alert triage queues, detection rules, and forensic reporting.

---

## 🔐 Authentication

- **Ingestion Endpoints**: Require the `X-API-Key` header matching the server's configured authentication secret (default: `cyber-shield-secret-2026`).
- **Telemetry Query Endpoints**: Open for read operations by the authenticated SOC console dashboard.

---

## 📑 Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|:-------|:---------|:------------|:-------------:|
| `POST` | `/ingest/<source>` | Ingest raw log streams from external forwarders | Yes (`X-API-Key`) |
| `GET` | `/api/stats` | Retrieve 5 core KPI metric tiles and sparkline historical trends | No |
| `GET` | `/api/alerts` | Retrieve active threat alerts with severity, IP, and status | No |
| `PATCH`| `/api/alerts/<id>` | Update alert triage lifecycle status (Open, Investigating, Resolved) | No |
| `GET` | `/api/traffic` | Retrieve 7-day rolling network throughput and protocol curve data | No |
| `GET` | `/api/recent_events`| Retrieve live raw normalized security events | No |
| `GET` | `/api/system` | Retrieve host resource metrics (CPU, RAM, Disk, Network I/O) | No |
| `GET` | `/api/rules` | List all active declarative YAML detection rules | No |
| `POST` | `/api/rules` | Author or hot-reload a detection rule in memory | Yes (`X-API-Key`) |
| `GET` | `/api/report/export` | Generate and download forensic incident shift summary (JSON/CSV) | No |

---

## 🔍 Detailed Endpoint Documentation

### 1. Ingest Telemetry Stream
`POST /ingest/<source>`

Receives raw text logs from forwarders (Fluent Bit, rsyslog, or custom agents), writes raw payloads to `data/raw/`, parses attributes into normalized events, and triggers sliding-window correlation.

#### Parameters
- `<source>`: Path variable specifying the source type (`linux`, `apache`, `windows`, `paloalto`, `aws`, `network`).

#### Headers
```http
X-API-Key: ${CYBERSHIELD_API_KEY}
Content-Type: text/plain
```

#### Request Payload Example
```text
Nov 08 14:20:11 web01 sshd[1234]: Failed password for invalid user root from 192.168.1.105 port 54321 ssh2
Nov 08 14:20:13 web01 sshd[1235]: Failed password for invalid user admin from 192.168.1.105 port 54322 ssh2
```

#### Response Example
```json
{
  "status": "success",
  "source": "linux",
  "raw_file": "data/raw/linux_20261108_142011_a1b2c3d4.log",
  "events_processed": 2,
  "events_parsed": 2,
  "parse_errors": 0,
  "alerts_triggered": 0
}
```

---

### 2. Retrieve SOC KPI Stats
`GET /api/stats`

Returns aggregated counters for the 5 dashboard metric cards, including sparkline historical curves and percentage trends.

#### Response Example
```json
{
  "total_alerts": 2458,
  "critical_alerts": 156,
  "blocked_attacks": 1324,
  "traffic_analyzed_tb": 2.45,
  "active_connections": 8547,
  "trends": {
    "total_alerts_delta": "+12.5%",
    "critical_alerts_delta": "+8.2%",
    "blocked_attacks_delta": "+15.3%",
    "traffic_delta": "+23.1%",
    "connections_delta": "-5.4%"
  },
  "sparklines": {
    "alerts": [12, 19, 15, 25, 22, 30, 28],
    "critical": [2, 5, 3, 8, 4, 9, 7],
    "blocked": [10, 14, 12, 20, 18, 26, 24]
  }
}
```

---

### 3. Retrieve Alert Triage Queue
`GET /api/alerts`

Retrieves active correlated security incidents filterable by severity, status, and time range.

#### Query Parameters
- `status` *(optional)*: Filter by `open`, `in_progress`, or `resolved`.
- `severity` *(optional)*: Filter by `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- `limit` *(optional)*: Number of records to return (default: 50).

#### Response Example
```json
[
  {
    "id": 101,
    "timestamp": "2026-11-08T14:32:21Z",
    "rule_id": "BRUTE-FORCE-01",
    "type": "SSH Brute Force",
    "source_ip": "192.168.1.105",
    "destination_ip": "10.0.0.5",
    "severity": "CRITICAL",
    "occurrence_count": 8,
    "status": "open",
    "action_taken": "Blocked"
  },
  {
    "id": 102,
    "timestamp": "2026-11-08T14:31:45Z",
    "rule_id": "WEB-SCAN-02",
    "type": "Directory Traversal",
    "source_ip": "192.168.1.110",
    "destination_ip": "10.0.0.8",
    "severity": "HIGH",
    "occurrence_count": 14,
    "status": "open",
    "action_taken": "Logged"
  }
]
```

---

### 4. Update Alert Status
`PATCH /api/alerts/<id>`

Updates the investigation lifecycle state of a specific incident.

#### Request Payload
```json
{
  "status": "in_progress",
  "analyst_notes": "Under active investigation. Quarantining source IP on perimeter firewall."
}
```

#### Response Example
```json
{
  "status": "success",
  "alert_id": 101,
  "new_status": "in_progress",
  "updated_at": "2026-11-08T14:35:10Z"
}
```

---

### 5. Retrieve Traffic Trends
`GET /api/traffic`

Returns volume time-series data for rendering spline throughput curves over a 7-day rolling window.

#### Response Example
```json
{
  "labels": ["May 14", "May 15", "May 16", "May 17", "May 18", "May 19", "May 20"],
  "series": {
    "normal": [28000, 32000, 31000, 36000, 34000, 39000, 42000],
    "suspicious": [4200, 5100, 4800, 6200, 5900, 6800, 7100],
    "malicious": [1200, 1800, 1500, 2400, 2100, 2900, 3100]
  }
}
```

---

### 6. Retrieve System Resource Metrics
`GET /api/system`

Provides live host machine resource utilization for the dashboard progress meters.

#### Response Example
```json
{
  "cpu_usage_pct": 32.4,
  "memory_usage_pct": 65.2,
  "memory_used_gb": 10.4,
  "memory_total_gb": 16.0,
  "disk_usage_pct": 78.1,
  "network_io_kbps": 450.8,
  "sqlite_db_size_mb": 48.2,
  "wal_mode_active": true
}
```
