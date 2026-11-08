# 🖥️ Cyber-Shield: SOC Operations Dashboard (Frontend)

The **Cyber-Shield SOC Console** is a single-page application (SPA) built using **React 18/19**, **Vite 8**, and **Tailwind CSS**. It provides an intuitive, dark-mode cybersecurity command interface designed for Security Operations Centers (SOC).

---

## 🎨 Design Philosophy & Ergonomics

- **SOC Dark Theme**: Tuned for 24/7 low-light control rooms to minimize operator eye strain during extended shifts.
- **High-Contrast Severity Palette**:
  - `CRITICAL`: Neon Crimson (`#EF4444` / Tailwind `red-500`)
  - `HIGH`: Vibrant Amber (`#F59E0B` / Tailwind `amber-500`)
  - `MEDIUM`: Electric Blue (`#3B82F6` / Tailwind `blue-500`)
  - `LOW`: Muted Slate (`#64748B` / Tailwind `slate-500`)
- **Zero-Flicker Live Polling**: Async React hooks poll backend metrics on dynamic intervals (1s to 5s) without re-rendering unaffected DOM nodes.

---

## 🧩 Component Hierarchy

```
frontend/src/
├── App.jsx                    # Master SOC operations view
├── index.css                  # Tailwind CSS theme tokens & dark palette
├── main.jsx                   # React root entrypoint
└── components/
    ├── Navbar.jsx             # Top bar with status pill badges & quick actions
    ├── MetricCard.jsx         # KPI tile with SVG sparkline curve & percentage delta
    ├── TrafficChart.jsx       # Recharts spline curve for volumetric throughput
    ├── AttackDonutChart.jsx   # Donut breakdown of top attack classifications
    ├── AlertTriageTable.jsx   # Interactive queue with filterable status & severity pills
    └── SystemGauges.jsx       # CPU, Memory, Disk, and Network health meters
```

---

## ⚡ Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application opens at **`http://localhost:5173`**.

### 3. API Proxy Configuration
In `vite.config.js`, requests beginning with `/api` and `/ingest` are proxied to the Flask server:
```javascript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/ingest': 'http://localhost:5000'
    }
  }
})
```

### 4. Build Production Distribution
To compile an optimized static bundle for deployment:
```bash
npm run build
```
Compiled assets are generated in `frontend/dist/`. The Flask backend automatically serves these static assets when accessed at `http://localhost:5000`.

---

## 📦 Key Libraries & Dependencies

- **React 18 / 19**: Component-driven UI framework with fast virtual DOM reconciliation.
- **Vite 8**: Next-generation lightning-fast frontend tooling with Hot Module Replacement (HMR).
- **Tailwind CSS 3.4 / 4**: Utility-first CSS styling enabling bespoke dark-mode themes.
- **Recharts**: Composable SVG charting library for responsive spline and donut visualizations.
- **Lucide React**: Crisp, modern cybersecurity and networking iconography.
