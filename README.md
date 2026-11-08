# 🛡️ CYBER-SHIELD: Lightweight Enterprise SIEM & NIDS Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](tests/)
[![Tests](https://img.shields.io/badge/tests-24%20passed-brightgreen.svg)](tests/)
[![Python](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](requirements.txt)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%2F19%20%2B%20Vite%208%20%2B%20Tailwind%20CSS-indigo.svg)](frontend/)
[![Database](https://img.shields.io/badge/database-SQLite3%20%28WAL%20Mode%29-yellowgreen.svg)](cybershield.db)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **CYBER-SHIELD** is an intelligent, high-throughput, and modular Security Information and Event Management (SIEM) and Network Intrusion Detection System (NIDS). Built for small-to-medium enterprise networks, academic computing laboratories, and Security Operations Centers (SOC), Cyber-Shield ingests raw network frames and multi-source application logs, standardizes heterogeneous events into a normalized JSON schema, executes deterministic sliding-window threat correlation against declarative YAML rules, and renders a high-density, real-time dark-mode SOC dashboard.

---

## 👥 Team & Academic Project Attribution

This project was engineered as part of the **Summer Industry Internship – I** under the **Networking Cloud Virtual Internship** track supported by **EduSkills Foundation** in association with **Juniper Networks** and **Palo Alto Networks**, submitted to **Sreenidhi Institute of Science and Technology (SNIST)**, Department of Computer Science and Engineering (Cyber Security):

| Roll Number | Candidate Name | Core Project Contributions & Module Ownership |
|-------------|----------------|----------------------------------------------|
| **24311A6201** | **Poojitha Burri** | Ingestion pipeline, multi-source regex parsers (Apache, Linux `auth.log`, Windows 4624/4625), and dual forensic storage. |
| **24311A6203** | **Baby Bhavya Sri Chowdary** | Stateful sliding-window heuristic correlation engine, declarative YAML rule specifications, and cross-source IP attacker tracking. |
| **24311A6211** | **Alle Ranaveer** | Real-time dark-mode React SOC dashboard, Recharts telemetry visualizations, Flask REST API integration, and automated 39-page report generation engine. |

*Detailed task breakdowns, sprint logs, and technical deliverables are documented in [TEAM_CONTRIBUTIONS.md](TEAM_CONTRIBUTIONS.md).*

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [System Architecture](#-system-architecture)
- [Dashboard Features](#-dashboard-features)
- [Project Directory Layout](#-project-directory-layout)
- [Quick Start & Execution](#-quick-start--execution)
- [Testing & Verification](#-testing--verification)
- [Academic Internship Report (39 Pages)](#-academic-internship-report-39-pages)
- [Contributing Guidelines](#-contributing-guidelines)
- [License](#-license)

---

## 🌟 Key Highlights

- **Promiscuous Packet Capture & NIDS**: Asynchronous Layer-3 and Layer-4 packet sniffing powered by Scapy, calculating live packets-per-second (PPS) and protocol distributions (TCP, UDP, ICMP, DNS).
- **Format-Agnostic Log Normalization**: Ingests heterogeneous log structures (Syslog RFC 5424, Apache Common Log, Linux SSH traces, Windows Security CSVs, and AWS CloudTrail JSON) into an immutable, unified event model.
- **Explainable Sliding-Window Correlation**: Eliminates black-box ML unpredictability with deterministic YAML detection rules (`config/rules.yaml`), evaluating time-bucketed event frequencies (e.g. 5 SSH failures within 120s, 10 web scan errors within 60s).
- **Cross-Source Attacker Profiling**: Automatically links offending source IPs exhibiting malicious indicators across 2 or more distinct platforms to identify distributed, multi-stage attack campaigns.
- **Dual-Layer Forensic Storage**: Archives raw unmodified log payloads to `data/raw/` to ensure chain of custody while indexing structured events into SQLite utilizing Write-Ahead Logging (WAL) for concurrent read/write throughput.
- **Modern React 18/19 SOC Console**: Ergonomic, dark-theme dashboard featuring 5 KPI sparkline cards, spline traffic curves, threat distribution donut charts, filterable alert queues, and system resource monitors.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Ingestion [1. Telemetry Ingestion & Sniffing]
        A1["Linux auth.log (SSH)"]
        A2["Apache Access Logs"]
        A3["Windows Security 4624/4625"]
        A4["Palo Alto Firewall Syslog"]
        A5["AWS CloudTrail JSON"]
        A6["Scapy Live Packet Sniffer"]
    end

    subgraph Collection [2. Transport & Forwarding]
        Collector["Fluent Bit / REST Gateway<br/>(Buffer, Sanitize & Tag)"]
    end

    subgraph Processing [3. SIEM Processing Core (:5000)]
        API["Flask API Receiver<br/><code>/ingest/&lt;source&gt;</code>"]
        RawStore["Forensic Payload Archive<br/><code>data/raw/{source}_{ts}_{uuid}.log</code>"]
        Parsers["Polymorphic Normalization Suite<br/>(BaseParser, Regex, CSV, JSON)"]
        DB[("SQLite WAL Database<br/><code>cybershield.db</code>")]
        Detector["Sliding-Window Correlation Engine<br/><code>config/rules.yaml</code>"]
        Correlator["Cross-Source Threat Correlator<br/>(Composite IP Profiler)"]
    end

    subgraph Presentation [4. Presentation & Operations]
        UI["React 18/19 SOC Dashboard<br/>(Vite + Tailwind CSS)"]
    end

    A1 --> Collector
    A2 --> Collector
    A3 --> Collector
    A4 --> Collector
    A5 --> Collector
    A6 --> API

    Collector -->|HTTP POST + API Key| API
    API --> RawStore
    API --> Parsers
    Parsers --> DB
    DB --> Detector
    Detector --> DB
    DB --> Correlator
    Correlator --> DB

    DB -->|REST Endpoints| UI
```

---

## 🖥️ Dashboard Features

The Cyber-Shield SOC Console provides a high-density, single-pane-of-glass overview designed for security operations:

| Widget | Visualization | Operational Purpose |
|--------|---------------|---------------------|
| **5 KPI Metric Tiles** | Cards with real-time SVG sparklines & percentage deltas | Displays Total Alerts, Critical Alerts, Blocked Attacks, Traffic Volume, and Active Connections. |
| **Traffic Overview** | Spline multi-curve plot with area fills | Compares Normal, Suspicious, and Malicious packet rates over 7-day rolling windows. |
| **Top Attack Types** | Multi-color donut chart with centered incident counters | Visualizes proportional breakdown of DDoS, Port Scans, SQL Injections, XSS, and Brute Force. |
| **Recent Alerts Queue** | Triage table with color-coded severity pill badges | Real-time event queue showing timestamps, attack categories, offending source IPs, severity, and action status. |
| **System Status Gauges** | Animated percentage progress bars | Continuously monitors host CPU Utilization, Memory Footprint, Disk Space, and Network I/O. |
| **Quick Action Triggers** | Top-bar action triggers | Instant manual log payload injection, synthetic threat generation, and one-click forensic report exports. |

---

## 🗂️ Project Directory Layout

```
Cyber-Guard/
├── README.md                      # Master repository documentation (this file)
├── CONTRIBUTING.md                # Code contribution & development guidelines
├── TEAM_CONTRIBUTIONS.md          # Candidate role ownership & sprint deliverables
├── app.py                         # Unified Flask REST API & React Static Server (:5000)
├── database.py                    # SQLite schema, WAL configuration, and query abstractions
├── pipeline.py                    # Raw file archiving & automatic parser routing
├── detector.py                    # YAML sliding-window threat detection engine
├── correlator.py                  # Cross-source IP threat correlator
├── requirements.txt               # Python backend dependencies
├── pytest.ini                     # Pytest test execution configuration
├── cybershield.db                 # SQLite database (events, alerts, incidents, parse_errors)
├── config/
│   ├── rules.yaml                 # Configurable detection rules & temporal thresholds
│   └── fluent-bit.conf            # Fluent Bit collector inputs, filters, and outputs
├── data/
│   ├── raw/                       # Preserved original log files (forensic audit trail)
│   └── samples/                   # Synthetic attack test samples
├── parsers/                       # Dedicated parser implementations
│   ├── base.py                    # BaseParser abstract interface
│   ├── apache_parser.py           # Apache Combined Log parser (Regex)
│   ├── linux_parser.py            # Linux auth.log / sshd parser (Regex)
│   ├── windows_parser.py          # Windows Security CSV parser
│   ├── paloalto_parser.py         # Palo Alto Traffic CSV parser
│   └── aws_parser.py              # AWS CloudTrail JSON parser
├── frontend/                      # Modern React Single Page Application
│   ├── README.md                  # Frontend architecture & component documentation
│   ├── src/                       # JSX source files, hooks, and views
│   ├── index.html                 # HTML Root Document
│   ├── vite.config.js             # Vite build config with Flask API proxy
│   └── package.json               # Frontend dependencies (React, Recharts, Lucide)
├── acadamic/                      # Academic Internship Report Generation Subsystem
│   ├── generate_report.py         # Standalone 39-page report compiler (DOCX & PDF)
│   ├── 24311A6201.docx            # Compiled Word report matching senior layout 1:1
│   ├── 24311A6201.pdf             # Exported 39-page PDF
│   └── report_assets/             # Architecture, UML diagrams & 8 output screen captures
├── docs/                          # Technical Documentation Suite
│   ├── README.md                  # Documentation overview
│   ├── ARCHITECTURE.md            # In-depth architectural & data models specification
│   ├── EXECUTION_AND_RUNBOOK.md   # Step-by-step deployment and operational runbook
│   ├── API_REFERENCE.md           # Exhaustive REST API endpoint reference
│   └── REPORT_GENERATION.md       # Academic report generator engineering details
└── tests/                         # Automated unit and integration test suite
    ├── test_parsers.py            # 16 unit tests for all 5 log parsers
    └── test_detection.py          # 8 unit tests for rules, windows, and correlation
```

---

## ⚡ Quick Start & Execution

### 1. Prerequisites
- **Python 3.10+** (with pip)
- **Node.js 18+** (with npm)
- **Npcap Driver** (Required on Windows for Scapy promiscuous packet sniffing)
- **Microsoft Word** (Optional, required for compiling the 39-page report via COM)

### 2. Backend Startup
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate

# Install Python backend dependencies
pip install -r requirements.txt

# Start the Flask API server
python app.py
```
*The backend API initializes at `http://localhost:5000`.*

### 3. Frontend Startup (Development Mode)
```powershell
cd frontend
npm install

# Launch Vite development server with hot-module reload
npm run dev
```
*The React SOC Dashboard opens at `http://localhost:5173` (with `/api` proxied to port 5000).*

### 4. Production Build (Single Unified Server)
```powershell
cd frontend
npm run build
cd ..
python app.py
```
*The Flask server automatically serves the compiled React production bundle at `http://localhost:5000`.*

---

## 🧪 Testing & Verification

Run the full automated test suite covering all parsers, schema normalization, sliding windows, and correlation logic:

```powershell
pytest -v
```

All 24 automated unit and integration tests execute in ~1.8 seconds:
```text
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

## 📄 Academic Internship Report (39 Pages)

The project includes an automated Python generator that clones the senior reference template (`acadamic/22311A05L2.docx`) and exports the complete 39-page group report:

```powershell
python acadamic/generate_report.py
```

### Report Features
- **Strict Roll Number Sequence**:
  1. `24311A6201` – Poojitha Burri
  2. `24311A6203` – Baby Bhavya Sri Chowdary
  3. `24311A6211` – Alle Ranaveer
- **1:1 Senior Formatting Replication**:
  - Times New Roman 13 pt body font throughout.
  - Left alignment eliminating Word justification word-spacing gaps.
  - Headings formatted with number and title together on one line.
  - Centered page numbers with zero margins.
  - Full-page coverage eliminating awkward lower-page whitespace.
- **Artifacts Included**:
  - 5 System Architecture and UML diagrams (Architecture, Use Case, Class, Sequence, Activity).
  - 8 real high-resolution output screenshots of the React dark-mode SOC console.
  - Complete replacement of legacy text with genuine Cyber-Shield NIDS content.
  - Formatted PO/PSO mapping tables and signed batch sheets.

---

## 🤝 Contributing Guidelines

We welcome community contributions, additional log parsers, and new detection rules! Please review [CONTRIBUTING.md](CONTRIBUTING.md) for architectural rules, formatting standards, and testing procedures.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
