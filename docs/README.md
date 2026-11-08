# 🛡️ Cyber-Shield: Multi-Source Security Log Normalization & Threat Detection System

[![Build Status](https://img.shields.io/badge/tests-24%20passed-brightgreen.svg)](tests/)
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](requirements.txt)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%2F19%20%2B%20Vite%208%20%2B%20Tailwind-indigo.svg)](frontend/)
[![Database](https://img.shields.io/badge/database-SQLite3%20%28WAL%20Mode%29-yellowgreen.svg)](cybershield.db)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Cyber-Shield** is an enterprise-grade, lightweight Network Intrusion Detection System (NIDS) and Security Information and Event Management (SIEM) platform designed for small-to-medium enterprise networks, academic laboratories, and cybersecurity researchers. It ingests heterogeneous telemetry streams (Linux SSH auth, Apache web access, Windows Event Logs, Palo Alto Firewall traffic, and AWS CloudTrail), standardizes them into a single unified JSON schema, executes deterministic rule-based sliding-window threat correlation, tracks attacker IP profiles, and serves an intuitive, dark-mode cybersecurity operations center (SOC) dashboard.

---

## 📌 Key Capabilities

- **Unified Format-Agnostic Schema**: Converts heterogeneous raw logs (Regex, CSV, Syslog, JSON) into standard normalized events with typed attributes (`src_ip`, `dst_ip`, `port`, `action`, `severity`, `timestamp`).
- **Dual Forensic Storage**: Preserves raw unmodified log payloads in `data/raw/{source}_{timestamp}_{uuid}.log` for legal forensic integrity while writing indexed structured events to SQLite in Write-Ahead Logging (WAL) mode.
- **Rule-Based Sliding-Window Threat Detection**: Deterministic, explainable YAML rules (`config/rules.yaml`) detecting SSH brute-force campaigns, web path traversals, firewall burst anomalies, and unauthorized root cloud logins.
- **Cross-Source Offender Correlation**: Identifies threat actors appearing across 2 or more distinct sources (e.g. firewall port scan followed by web directory traversal and SSH brute force) to construct unified incident timelines.
- **Modern Cyber-Shield React SOC Dashboard**: Dark-mode operations dashboard featuring 5 KPI sparkline cards, spline Traffic Overview chart, Top Attack Types donut chart, Recent Alerts triage table with pill badges, and real-time host resource gauges.
- **39-Page Academic Group Internship Report**: Fully automated Python report generator (`acadamic/generate_report.py`) producing a 1:1 replica of the senior reference report (`24311A6201.docx` and `24311A6201.pdf`).

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Data Sources [Telemetry Sources & Collectors]
        A1["Linux auth.log / sshd"]
        A2["Apache Access Logs"]
        A3["Windows Security 4624/4625"]
        A4["Palo Alto Firewall Syslog (UDP 5140)"]
        A5["AWS CloudTrail JSON Records"]
        A6["Scapy Live Packet Sniffer"]
    end

    subgraph Collection Layer [Collection & Forwarding Layer]
        FB["Fluent Bit / Local Collector<br/>(Buffer, Filter & Route)"]
    end

    subgraph SIEM Core [Cyber-Shield SIEM Core (:5000)]
        API["Flask Ingestion Receiver<br/><code>/ingest/&lt;source&gt;</code> (API Key Validated)"]
        RawStore["Forensic Log Store<br/><code>data/raw/{source}_{ts}_{id}.log</code>"]
        Parsers["Format Auto-Detect & Parser Suite<br/>(BaseParser, Regex, CSV, JSON)"]
        DB[("SQLite Database<br/><code>cybershield.db</code> (WAL Mode)")]
        Detector["Sliding-Window Threat Detector<br/><code>config/rules.yaml</code>"]
        Correlator["Cross-Source Incident Correlator<br/>(len(sources) &ge; 2)"]
    end

    subgraph Frontend UI [Cyber-Shield Operations Dashboard]
        ReactUI["React 18/19 + Vite + Tailwind CSS SPA<br/>(Dark Mode NIDS Dashboard)"]
    end

    A1 --> FB
    A2 --> FB
    A3 --> FB
    A4 --> FB
    A5 --> FB
    A6 --> API

    FB -->|HTTP POST| API
    API --> RawStore
    API --> Parsers
    Parsers --> DB
    DB --> Detector
    Detector --> DB
    DB --> Correlator
    Correlator --> DB

    DB -->|REST API| ReactUI
```

---

## 🖥️ Cyber-Shield Operations Dashboard

The dashboard provides a single-pane-of-glass operations interface matching modern commercial NIDS displays:

| Component | Visual Presentation | Purpose |
|-----------|---------------------|---------|
| **5 KPI Metric Tiles** | Cards with real-time SVG sparklines & percentage trends | Tracks Total Alerts, Critical Alerts, Blocked Attacks, Traffic Volume, and Active Connections |
| **Traffic Overview** | Spline multi-line chart with smooth fill gradients | Compares Normal, Suspicious, and Malicious packet throughput over 7 days |
| **Top Attack Types** | Vibrant multi-color donut chart with centered total count | Breaks down DDoS, Port Scans, SQL Injections, XSS, and Brute Force incidents |
| **Recent Alerts** | Interactive table with color-coded severity pill badges | Real-time triage table with timestamp, type, IPs, severity, and action status |
| **System Status** | Color-coded progress meters | Visualizes live CPU Usage, Memory Usage, Disk Usage, and Network I/O |
| **Quick Actions** | Top-bar action triggers | Instant manual log payload ingestion and one-click report exports (JSON/CSV) |

---

## 🗂️ Project Structure

```
Cyber-Guard/
├── README.md                  # Master repository documentation
├── app.py                     # Unified Flask REST API & React Static Server (:5000)
├── database.py                # SQLite schema, WAL configuration, parameterized queries
├── pipeline.py                # Raw file archiving & automatic source routing
├── detector.py                # YAML sliding-window threat detection engine
├── correlator.py              # Cross-source IP threat correlator
├── requirements.txt           # Python backend dependencies
├── pytest.ini                 # Pytest test execution configuration
├── cybershield.db             # SQLite database (events, alerts, incidents, parse_errors)
├── config/
│   ├── rules.yaml             # Configurable detection rules & thresholds
│   └── fluent-bit.conf        # Fluent Bit collector inputs, filters, and outputs
├── data/
│   ├── raw/                   # Preserved original log files (forensic audit trail)
│   └── samples/               # Synthetic attack test samples
├── parsers/                   # Dedicated parser implementations
│   ├── base.py                # BaseParser abstract interface
│   ├── apache_parser.py       # Apache Combined Log parser (Regex)
│   ├── linux_parser.py        # Linux auth.log / sshd parser (Regex)
│   ├── windows_parser.py      # Windows Security CSV parser
│   ├── paloalto_parser.py     # Palo Alto Traffic CSV parser
│   └── aws_parser.py          # AWS CloudTrail JSON parser
├── frontend/                  # Modern React Single Page Application
│   ├── src/
│   │   ├── App.jsx            # Master Cyber-Shield Dashboard Component
│   │   ├── index.css          # Tailwind CSS Theme & Dark Palette
│   │   └── main.jsx           # React DOM Entrypoint
│   ├── index.html             # HTML Root Document
│   ├── vite.config.js         # Vite config with Flask API proxy
│   └── package.json           # Frontend dependencies (React, Recharts, Lucide)
├── acadamic/                  # Academic Internship Report Generation Subsystem
│   ├── generate_report.py     # Standalone 39-page report compiler (DOCX & PDF)
│   ├── 24311A6201.docx        # Compiled Word report matching senior layout
│   ├── 24311A6201.pdf         # Exported 39-page PDF
│   └── report_assets/         # Architecture, UML diagrams & 8 output screen captures
├── docs/                      # Technical Documentation Suite
│   ├── README.md              # Documentation Overview (this file)
│   ├── ARCHITECTURE.md        # Comprehensive Architecture & Design Specifications
│   ├── EXECUTION_AND_RUNBOOK.md# Step-by-step Runbook & Operational Procedures
│   ├── API_REFERENCE.md       # Complete REST API Endpoint Reference
│   └── REPORT_GENERATION.md   # Academic Report Automation & Senior Layout Calibration
└── tests/                     # Automated unit and integration test suite
    ├── test_parsers.py        # 16 unit tests for all 5 log parsers
    └── test_detection.py      # 8 unit tests for rules, windows, and correlation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Python 3.10+** (with pip)
- **Node.js 18+** (with npm)
- **Npcap Driver** (Required on Windows for Scapy promiscuous packet sniffing)

### 2. Backend Installation & Startup
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Start the Flask API server
python app.py
```
The backend starts at **`http://localhost:5000`**.

### 3. Frontend Installation & Startup
```powershell
cd frontend
npm install

# Start development server with hot-module reload
npm run dev
```
The React SOC Dashboard opens at **`http://localhost:5173`** (or `http://localhost:3000`).

To create the production distribution bundle served directly by Flask:
```powershell
npm run build
```

---

## 🧪 Automated Testing

Execute the comprehensive Pytest suite covering parsers, schema validation, sliding-window thresholds, and cross-source correlation:

```powershell
pytest -v
```

Expected output:
```text
============================= test session starts =============================
collected 24 items

tests/test_detection.py::test_brute_force_alert PASSED                   [  4%]
tests/test_detection.py::test_web_scan_alert PASSED                      [  8%]
tests/test_detection.py::test_repeated_401_alert PASSED                  [ 12%]
tests/test_detection.py::test_firewall_deny_burst_alert PASSED           [ 16%]
tests/test_detection.py::test_cloud_console_login_failure_alert PASSED   [ 20%]
tests/test_detection.py::test_no_alert_below_threshold PASSED            [ 25%]
tests/test_detection.py::test_correlation_multi_source PASSED            [ 29%]
tests/test_detection.py::test_alert_upsert_increments_count PASSED       [ 33%]
tests/test_parsers.py::test_apache_parser_valid PASSED                   [ 37%]
tests/test_parsers.py::test_apache_parser_404 PASSED                     [ 41%]
tests/test_parsers.py::test_apache_parser_401 PASSED                     [ 45%]
tests/test_parsers.py::test_apache_parser_malformed PASSED               [ 50%]
tests/test_parsers.py::test_linux_parser_failed PASSED                   [ 54%]
tests/test_parsers.py::test_linux_parser_accepted PASSED                 [ 58%]
tests/test_parsers.py::test_linux_parser_malformed PASSED                [ 62%]
tests/test_parsers.py::test_windows_parser_failed PASSED                 [ 66%]
tests/test_parsers.py::test_windows_parser_success PASSED                [ 70%]
tests/test_parsers.py::test_windows_parser_malformed PASSED              [ 75%]
tests/test_parsers.py::test_paloalto_parser_deny PASSED                  [ 79%]
tests/test_parsers.py::test_paloalto_parser_allow PASSED                 [ 83%]
tests/test_parsers.py::test_paloalto_parser_malformed PASSED             [ 87%]
tests/test_parsers.py::test_aws_parser_consolelogin_failure PASSED       [ 91%]
tests/test_parsers.py::test_aws_parser_consolelogin_success PASSED       [ 95%]
tests/test_parsers.py::test_aws_parser_malformed PASSED                  [100%]

============================= 24 passed in 1.77s ==============================
```

---

## 📄 Academic Group Internship Report

The project includes an automated compiler that creates a 39-page group internship report conforming 1:1 to the senior reference format:

```powershell
python acadamic/generate_report.py
```

- **Output DOCX**: `acadamic/24311A6201.docx`
- **Output PDF**: `acadamic/24311A6201.pdf`
- **Candidate Roll Numbers**:
  1. `24311A6201` – Poojitha Burri
  2. `24311A6203` – Baby Bhavya Sri Chowdary
  3. `24311A6211` – Alle Ranaveer
- **Layout Conformance**: Times New Roman 13 pt, Left alignment, zero justify gaps, centered page numbers, zero lower-page blank space, high-resolution UML diagrams and 8 output screens.

---

## 📚 In-Depth Documentation

For detailed technical guides, explore the dedicated documentation suite:

1. **[Architecture & Design Specifications](file:///c:/Users/ranua/Videos/Cyber-Guard/docs/ARCHITECTURE.md)**: Deep dive into the data pipeline, correlation algorithm, and WAL storage.
2. **[Execution & Runbook Guide](file:///c:/Users/ranua/Videos/Cyber-Guard/docs/EXECUTION_AND_RUNBOOK.md)**: Production deployment instructions, synthetic attack simulations, and troubleshooting.
3. **[API Reference](file:///c:/Users/ranua/Videos/Cyber-Guard/docs/API_REFERENCE.md)**: Detailed API specification, request/response structures, and curl examples.
4. **[Academic Report Guide](file:///c:/Users/ranua/Videos/Cyber-Guard/docs/REPORT_GENERATION.md)**: Engineering details of the 39-page academic report compiler.
5. **[Frontend Documentation](file:///c:/Users/ranua/Videos/Cyber-Guard/frontend/README.md)**: Architecture and component details for the React SOC dashboard.
