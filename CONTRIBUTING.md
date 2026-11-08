# 🤝 Contributing to Cyber-Shield

Thank you for your interest in contributing to **Cyber-Shield**! As an open-source, lightweight SIEM and NIDS platform, we welcome contributions ranging from new log parsers and detection rules to frontend visualization widgets and performance optimizations.

---

## 📜 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Workflow](#development-workflow)
- [Adding a New Log Parser](#adding-a-new-log-parser)
- [Adding New Detection Rules](#adding-new-detection-rules)
- [Frontend Development](#frontend-development)
- [Coding Standards & Style](#coding-standards--style)
- [Automated Testing](#automated-testing)
- [Submitting a Pull Request](#submitting-a-pull-request)

---

## 🛡️ Code of Conduct

All contributors and maintainers are expected to maintain a welcoming, respectful, and collaborative environment. Be respectful of different viewpoints and experiences, provide constructive feedback, and prioritize security best practices.

---

## 🛠️ Development Workflow

1. **Fork the repository** on GitHub.
2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/<your-username>/Cyber-Guard.git
   cd Cyber-Guard
   ```
3. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate       # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. **Set up the frontend**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```
5. **Create a dedicated feature branch**:
   ```bash
   git checkout -b feature/new-log-parser
   ```

---

## 🧩 Adding a New Log Parser

All log parsers in Cyber-Shield inherit from `BaseParser` in `parsers/base.py`. To introduce support for a new log source (e.g. Nginx, Suricata, Kubernetes audit logs):

1. **Create the parser module**:
   Create a new file in `parsers/`, for example `parsers/nginx_parser.py`:
   ```python
   from parsers.base import BaseParser

   class NginxParser(BaseParser):
       def __init__(self):
           super().__init__(source_name="nginx")

       def parse_line(self, line: str) -> dict:
           """Parse a raw text line into a normalized Cyber-Shield event dict."""
           # Implement regex matching or tokenization
           # Return dictionary conforming to unified schema
           pass
   ```

2. **Schema Invariant**:
   Every parsed dictionary must conform to the standard schema:
   ```python
   {
       "timestamp": "ISO-8601 UTC string",
       "source": "nginx",
       "source_ip": "192.168.1.50",
       "destination_ip": "10.0.0.1",
       "port": 443,
       "protocol": "TCP",
       "action": "allow" | "deny" | "alert",
       "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
       "event_type": "web_access",
       "raw_payload": line
   }
   ```

3. **Register the Parser in Pipeline**:
   Update `pipeline.py` to route incoming payloads for your new source to the new parser class.

4. **Add Unit Tests**:
   Add test methods in `tests/test_parsers.py` covering:
   - Successful parsing of valid log lines.
   - Graceful handling and quarantine of malformed lines.

---

## ⚡ Adding New Detection Rules

Detection rules reside in `config/rules.yaml`. You can author new rules without touching Python code!

### Rule Structure
```yaml
- id: "RULE-CUSTOM-01"
  name: "SQL Injection Probe Burst"
  source: "apache"
  severity: "CRITICAL"
  window_seconds: 60
  threshold_count: 5
  group_by: "source_ip"
  condition: "event_type == 'web_access' and ('union' in payload.lower() or 'select' in payload.lower())"
  description: "Detects 5 or more SQL injection signatures from a single IP within 60 seconds."
```

### Rule Guidelines
- **Deterministic**: Rules must rely on concrete thresholds, status codes, and attribute counts.
- **Explainable**: Provide a clear `description` explaining why an alert is fired so analysts can triage without ambiguity.
- **Test-Backed**: Add a corresponding test case in `tests/test_detection.py` to ensure the threshold triggers as expected.

---

## 🎨 Frontend Development

The frontend is a single-page application built with **React 18/19**, **Vite 8**, and **Tailwind CSS**:

1. **Start the Vite dev server**:
   ```bash
   cd frontend
   npm run dev
   ```
2. **Component Conventions**:
   - Reusable widgets live in `frontend/src/components/`.
   - Use **Lucide React** for icons.
   - Use **Recharts** for SVG data visualization.
   - Use Tailwind utility classes; do not write custom raw CSS unless defining global theme tokens in `index.css`.
3. **API Proxy**:
   The Vite dev server proxies `/api` requests directly to `http://localhost:5000`.

---

## 📐 Coding Standards & Style

- **Python**:
  - Follow PEP 8 guidelines.
  - Type hints are strongly encouraged for public functions.
  - Docstrings should describe inputs, outputs, and edge-case exceptions.
- **JavaScript / JSX**:
  - Use standard modern ES6+ syntax.
  - Use functional components with React hooks (`useState`, `useEffect`, `useMemo`).
  - Keep components modular and single-responsibility.
- **Git Commits**:
  - Use descriptive commit messages:
    - `feat(parser): add Palo Alto Traps event parser`
    - `fix(detector): fix off-by-one window expiry bug`
    - `docs: update execution runbook with Npcap setup`

---

## 🧪 Automated Testing

Before submitting any code, verify that all existing and new unit tests pass:

```bash
pytest -v
```

If you made frontend changes, verify that the production build completes without errors:
```bash
cd frontend
npm run build
```

---

## 🚀 Submitting a Pull Request

1. Push your feature branch to your fork:
   ```bash
   git push origin feature/new-log-parser
   ```
2. Navigate to the upstream repository and open a **Pull Request**.
3. Fill out the PR template describing:
   - What problem does this PR solve?
   - What modules were added or modified?
   - Test evidence (output of `pytest -v`).
4. Maintainers will review your PR and provide feedback.
