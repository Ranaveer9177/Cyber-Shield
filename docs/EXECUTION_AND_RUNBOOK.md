# 📖 Cyber-Shield: Operational Runbook & Execution Guide

This document provides step-by-step procedures for deploying, starting, testing, and maintaining the **Cyber-Shield** SIEM and NIDS platform in both development and production environments.

---

## 🛠️ System Requirements

### Hardware
- **Processor**: Intel Core i5 / AMD Ryzen 5 (minimum 4 cores, 8 threads recommended)
- **RAM**: 8 GB minimum (16 GB recommended for concurrent packet sniffing and development servers)
- **Storage**: 10 GB free disk space (NVMe or SATA SSD recommended)
- **Network Interface**: Gigabit Ethernet or Wi-Fi adapter with promiscuous mode support

### Software
- **Operating System**: Windows 10/11 (with Npcap driver) or Linux (Ubuntu 22.04 LTS, Debian 12)
- **Python**: Version 3.10, 3.11, or 3.12
- **Node.js**: Version 18.0.0 or higher (with npm)
- **Packet Capture Driver**:
  - *Windows*: [Npcap](https://npcap.com/) (install with "WinPcap API-compatible Mode" enabled)
  - *Linux*: Native raw sockets with `libpcap-dev` (`sudo apt install libpcap-dev`)

---

## 🚀 Step 1: Environment Setup

### 1.1 Clone & Enter Repository
```powershell
cd C:\Users\ranua\Videos\Cyber-Guard
```

### 1.2 Python Virtual Environment Setup
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
.\venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Upgrade pip and install production dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 1.3 Node.js Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

---

## 🖥️ Step 2: Starting the Cyber-Shield Platform

### Mode A: Development Mode (Hot Reloading)

In development mode, the Flask API runs on port 5000 and the Vite dev server runs on port 5173 with automatic Hot Module Replacement (HMR).

**Terminal 1 (Backend API)**:
```powershell
.\venv\Scripts\Activate.ps1
python app.py
```
*Output confirm*: `* Running on http://127.0.0.1:5000`

**Terminal 2 (Frontend React App)**:
```powershell
cd frontend
npm run dev
```
*Output confirm*: `  ➜  Local:   http://localhost:5173/`

Open your web browser and navigate to **`http://localhost:5173`**.

---

### Mode B: Production Mode (Single Unified Server)

In production mode, the React application is pre-compiled into static HTML/JS/CSS assets inside `frontend/dist/`. Flask serves the API and the static frontend concurrently on port 5000.

```powershell
# 1. Build the production React bundle
cd frontend
npm run build
cd ..

# 2. Launch the unified Flask server
python app.py
```

Access the complete unified SOC console at **`http://localhost:5000`**.

---

## 💉 Step 3: Synthetic Threat Simulation & Ingestion

Cyber-Shield includes synthetic log samples and attack simulators to test detection rules without exposing production systems.

### 3.1 Ingesting Pre-Packaged Sample Logs
You can simulate external collectors sending logs via HTTP POST using `curl` or PowerShell:

#### Simulating SSH Brute Force Attacks:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/ingest/linux" `
  -Method POST `
  -Headers @{ "X-API-Key" = "cyber-shield-secret-2026" } `
  -InFile "data/samples/sample_auth_bruteforce.log" `
  -ContentType "text/plain"
```

#### Simulating Apache Directory Traversal Probes:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/ingest/apache" `
  -Method POST `
  -Headers @{ "X-API-Key" = "cyber-shield-secret-2026" } `
  -InFile "data/samples/sample_apache_traversal.log" `
  -ContentType "text/plain"
```

### 3.2 Running the Synthetic Threat Injector
```powershell
# Run the synthetic traffic generator to inject randomized background noise and attack bursts
python tools/log_generator.py --rate 10 --duration 30
```

---

## 🧪 Step 4: Running Unit & Integration Tests

Execute the automated test suite to ensure all parsers, error quarantines, sliding windows, and correlation logic pass:

```powershell
pytest -v
```

To run a specific test suite:
```powershell
# Test log parsers only
pytest tests/test_parsers.py -v

# Test sliding-window rules and correlation only
pytest tests/test_detection.py -v
```

---

## 📄 Step 5: Generating the Academic Group Internship Report

To compile and export the 39-page Group Internship Report (`24311A6201.docx` and `24311A6201.pdf`):

```powershell
python acadamic/generate_report.py
```

### Generated Artifacts
1. **`acadamic/24311A6201.docx`**: Fully formatted Word report with 1:1 senior template conformance.
2. **`acadamic/24311A6201.pdf`**: 39-page PDF exported via Word COM `ExportAsFixedFormat`.
3. **`acadamic/pdf_pages_ours/`**: 39 rendered PNG preview pages (`page_01.png` to `page_39.png`).

---

## 🔧 Step 6: Troubleshooting & FAQ

### Issue 1: `Port 5000 is already in use`
- **Cause**: An existing Python instance is still running in the background.
- **Fix**:
  ```powershell
  # Find PID using port 5000
  netstat -ano | findstr :5000
  # Terminate the process (replace <PID> with process ID)
  taskkill /F /PID <PID>
  ```

### Issue 2: `Scapy WinPcap/Npcap error`
- **Cause**: Npcap driver is missing or not installed in WinPcap compatibility mode.
- **Fix**: Reinstall Npcap from [npcap.com](https://npcap.com/) and check the box **"Install Npcap in WinPcap API-compatible Mode"**.

### Issue 3: `Word COM Export error during report generation`
- **Cause**: Microsoft Word hung waiting for a background dialog.
- **Fix**:
  ```powershell
  taskkill /F /IM WINWORD.EXE
  python acadamic/generate_report.py
  ```

### Issue 4: `SQLite database is locked`
- **Cause**: A connection was opened without WAL mode enabled.
- **Fix**:
  Ensure all queries use `database.py` connection abstractions which automatically execute `PRAGMA journal_mode=WAL;`.
