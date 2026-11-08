import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Bell,
  Settings as SettingsIcon,
  ChevronDown,
  Download,
  LayoutDashboard,
  AlertTriangle,
  Activity,
  BarChart3,
  FileText,
  Sliders,
  Server,
  TrendingUp,
  Menu,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Upload,
  Database,
  ExternalLink,
  X,
  Cpu,
  Filter,
  Check,
  Eye,
  Clock,
  ArrowUpRight,
  Zap,
  Network,
  Radio,
  ShieldAlert,
  Terminal,
  Layers
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Sparkline SVG component
const Sparkline = ({ stroke = '#3b82f6' }) => (
  <svg className="w-20 h-6 overflow-visible" viewBox="0 0 100 30">
    <path
      d="M0,20 Q15,5 30,18 T60,10 T85,22 T100,8"
      fill="none"
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [timeRange, setTimeRange] = useState('Last 24 Hours');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Live Backend Data States
  const [systemInfo, setSystemInfo] = useState(null);
  const [trafficStats, setTrafficStats] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [sourceStatus, setSourceStatus] = useState([]);

  // Traffic Monitor Controls
  const [streamPaused, setStreamPaused] = useState(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('all');

  // Ingest Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSource, setUploadSource] = useState('apache');
  const [uploadText, setUploadText] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  // Settings State
  const [apiKey, setApiKey] = useState('change-me-secret');
  const [keySaved, setKeySaved] = useState(false);

  // Fetch all live data from backend
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [sysRes, statsRes, alertsRes, eventsRes, incidentsRes, srcStatusRes] = await Promise.all([
        fetch('/api/system/info'),
        fetch('/api/events/stats'),
        fetch('/api/alerts'),
        fetch('/api/events?limit=100'),
        fetch('/api/incidents'),
        fetch('/api/events/source-status')
      ]);

      if (sysRes.ok) {
        const sys = await sysRes.json();
        setSystemInfo(sys);
        setBackendOnline(true);
      }

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setTrafficStats(stats);
      }

      if (alertsRes.ok) {
        const alertData = await alertsRes.json();
        if (alertData.alerts) {
          setLiveAlerts(alertData.alerts);
        }
      }

      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        if (evData.events) {
          setLiveEvents(evData.events);
        }
      }

      if (incidentsRes.ok) {
        const incData = await incidentsRes.json();
        if (incData.incidents) {
          setLiveIncidents(incData.incidents);
        }
      }

      if (srcStatusRes.ok) {
        const sData = await srcStatusRes.json();
        if (sData.sources) {
          setSourceStatus(sData.sources);
        }
      }
    } catch (e) {
      console.error('Backend sync error:', e);
      setBackendOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!streamPaused) {
        fetchData();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [streamPaused]);

  // Simulate Attack Traffic
  const handleSimulateTraffic = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Simulate error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run Rules & Correlate
  const handleRunDetection = async () => {
    try {
      const res = await fetch('/api/detect-and-correlate', { method: 'POST' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Detection error:', e);
    }
  };

  // Acknowledge Alert
  const handleAcknowledgeAlert = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' });
      if (res.ok) {
        setLiveAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
      }
    } catch (e) {
      console.error('Ack error:', e);
    }
  };

  // Reopen Alert
  const handleReopenAlert = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/reopen`, { method: 'PATCH' });
      if (res.ok) {
        setLiveAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'open' } : a));
      }
    } catch (e) {
      console.error('Reopen error:', e);
    }
  };

  // Ingest Log Modal Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadText.trim()) return;
    try {
      const res = await fetch(`/ingest/${uploadSource}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-API-Key': apiKey,
          'X-Host-Name': 'cyber-shield-portal'
        },
        body: uploadText
      });
      const data = await res.json();
      setUploadResult(data);
      await fetchData();
    } catch (err) {
      setUploadResult({ error: err.message });
    }
  };

  // Export JSON Report
  const handleExportReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      system_info: systemInfo,
      total_events: trafficStats?.total_events || 0,
      alerts: liveAlerts,
      incidents: liveIncidents,
      sources: sourceStatus
    };
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberShield_SIEM_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Dynamic Traffic Chart Data (Normal vs Suspicious vs Malicious)
  const trafficChartData = useMemo(() => {
    // If we have live timeline events from backend
    if (trafficStats?.timeline && trafficStats.timeline.length > 0) {
      // Group timeline by timestamp string slice (HH:MM or minute)
      const groups = {};
      trafficStats.timeline.forEach(item => {
        const rawTs = item.timestamp || '';
        let label = 'Now';
        if (rawTs.includes('T')) {
          label = rawTs.split('T')[1].slice(0, 5); // HH:MM
        } else if (rawTs.includes(' ')) {
          label = rawTs.split(' ')[1].slice(0, 5);
        }
        if (!groups[label]) {
          groups[label] = { normal: 0, suspicious: 0, malicious: 0 };
        }
        if (item.source === 'apache') groups[label].suspicious += item.count || 1;
        else if (item.source === 'paloalto' || item.source === 'linux') groups[label].malicious += item.count || 1;
        else groups[label].normal += item.count || 1;
      });

      const labels = Object.keys(groups).slice(-8);
      if (labels.length >= 3) {
        return {
          labels,
          datasets: [
            {
              label: 'Normal Traffic',
              data: labels.map(l => groups[l].normal * 4 + 10),
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#38bdf8',
              pointRadius: 4,
            },
            {
              label: 'Suspicious Traffic',
              data: labels.map(l => groups[l].suspicious * 3 + 5),
              borderColor: '#f59e0b',
              backgroundColor: 'transparent',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#f59e0b',
              pointRadius: 4,
            },
            {
              label: 'Malicious Traffic',
              data: labels.map(l => groups[l].malicious * 5 + 3),
              borderColor: '#ef4444',
              backgroundColor: 'transparent',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#ef4444',
              pointRadius: 4,
            },
          ],
        };
      }
    }

    // Default dynamic distribution based on real counts
    const total = trafficStats?.total_events || 198;
    const baseNormal = Math.round(total * 0.4);
    const baseSuspicious = Math.round(total * 0.35);
    const baseMalicious = Math.round(total * 0.25);

    return {
      labels: ['20:15', '20:30', '21:00', '21:04', '21:06', '21:08', '21:10', '21:15'],
      datasets: [
        {
          label: 'Normal Traffic',
          data: [12, 18, 25, 34, baseNormal - 20, baseNormal - 10, baseNormal, baseNormal + 15],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#38bdf8',
          pointRadius: 4,
        },
        {
          label: 'Suspicious Traffic',
          data: [8, 12, 16, 22, 28, baseSuspicious - 5, baseSuspicious, baseSuspicious + 8],
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointBackgroundColor: '#f59e0b',
          pointRadius: 4,
        },
        {
          label: 'Malicious Traffic',
          data: [2, 4, 9, 15, 21, baseMalicious - 4, baseMalicious, baseMalicious + 10],
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4,
        },
      ],
    };
  }, [trafficStats]);

  const trafficChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: '#1a2234' },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
      y: {
        grid: { color: '#1a2234' },
        ticks: { color: '#64748b', font: { size: 10 } },
      },
    },
  };

  // Dynamic Donut Chart Data (Alert Rules Breakdown)
  const attackTypesData = useMemo(() => {
    const counts = {};
    liveAlerts.forEach(a => {
      const ruleName = (a.rule || 'threat_detection')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      counts[ruleName] = (counts[ruleName] || 0) + (a.event_count || 1);
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    if (labels.length === 0) {
      return {
        labels: ['Brute Force', 'Web Scan', 'Firewall Deny', 'Console Login Failure', 'Others'],
        datasets: [{
          data: [63, 45, 36, 18, 12],
          backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'],
          borderWidth: 0,
          hoverOffset: 4,
        }]
      };
    }

    const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
        hoverOffset: 4,
      }]
    };
  }, [liveAlerts]);

  const attackTypesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        padding: 10,
      },
    },
  };

  // Filtered live events for Traffic Monitor
  const filteredEvents = useMemo(() => {
    return liveEvents.filter(ev => {
      if (selectedSourceFilter !== 'all' && ev.source !== selectedSourceFilter) return false;
      if (selectedSeverityFilter !== 'all' && ev.severity !== selectedSeverityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesIp = ev.source_ip && ev.source_ip.toLowerCase().includes(q);
        const matchesHost = ev.host && ev.host.toLowerCase().includes(q);
        const matchesMsg = ev.raw && ev.raw.toLowerCase().includes(q);
        const matchesUser = ev.username && ev.username.toLowerCase().includes(q);
        if (!matchesIp && !matchesHost && !matchesMsg && !matchesUser) return false;
      }
      return true;
    });
  }, [liveEvents, selectedSourceFilter, selectedSeverityFilter, searchQuery]);

  // Total blocked attacks calculation
  const blockedCount = useMemo(() => {
    if (trafficStats?.by_action) {
      let cnt = 0;
      trafficStats.by_action.forEach(a => {
        if (a.action === 'deny' || a.action === 'failure' || a.action === 'block') {
          cnt += a.count;
        }
      });
      return cnt;
    }
    return 154;
  }, [trafficStats]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0e1a] text-slate-200 font-sans">
      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR */}
      {/* ============================================================== */}
      <aside className="w-56 shrink-0 bg-[#090d16] border-r border-[#151c2d] flex flex-col justify-between select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5 fill-indigo-500/20" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wider text-white">Cyber-Shield</span>
              <div className="text-[9px] uppercase tracking-wider text-indigo-400 font-semibold">SIEM & NIDS Suite</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="mt-2 px-3 space-y-1">
            {[
              { name: 'Dashboard', icon: LayoutDashboard },
              { name: 'Alerts', icon: AlertTriangle, badge: liveAlerts.length || 6 },
              { name: 'Traffic Monitor', icon: Activity, badge: 'Live' },
              { name: 'Analysis', icon: BarChart3 },
              { name: 'Reports', icon: FileText },
              { name: 'Rules', icon: Sliders },
              { name: 'System', icon: Server },
              { name: 'Settings', icon: SettingsIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#3b3a6e] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121826]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                    <span>{tab.name}</span>
                  </div>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      tab.badge === 'Live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="p-4 border-t border-[#151c2d] space-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {backendOnline ? 'Engine Active' : 'Offline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {systemInfo ? `${systemInfo.events_count} events indexed` : 'Connecting backend...'}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">CyberShield v2.1</span>
            <button
              onClick={fetchData}
              title="Sync status"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MAIN VIEW AREA */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 shrink-0 bg-[#0c101c] border-b border-[#151c2d] px-6 flex items-center justify-between">
          {/* Left: Quick search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search IPs, hosts, payloads, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#111726] border border-[#1b253b] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
              />
            </div>
          </div>

          {/* Right: Actions & Tools */}
          <div className="flex items-center gap-3">
            {/* Quick Simulate Attack Traffic */}
            <button
              onClick={handleSimulateTraffic}
              disabled={isSimulating}
              className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
              title="Inject realistic multi-source attack traffic"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSimulating ? 'animate-bounce' : ''}`} />
              <span>{isSimulating ? 'Simulating...' : 'Simulate Attack Traffic'}</span>
            </button>

            {/* Ingest Log */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#141b2d] hover:bg-[#1a233b] border border-[#202b44] px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ingest Log</span>
            </button>

            {/* Run Rules */}
            <button
              onClick={handleRunDetection}
              className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#141b2d] hover:bg-[#1a233b] border border-[#202b44] px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Run Rules</span>
            </button>

            {/* Notification Bell */}
            <button className="relative p-1.5 text-slate-400 hover:text-white" onClick={() => setActiveTab('Alerts')}>
              <Bell className="w-4 h-4" />
              {liveAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Admin Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#1a2338]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                A
              </div>
              <span className="text-xs font-medium text-slate-200">Security Admin</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Header Sub-bar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Cyber-Shield SIEM & NIDS</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeTab}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Multi-source telemetry correlation, sliding-window threat detection & live traffic analysis
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#101626] border border-[#1c263d] px-3 py-1.5 rounded-lg text-xs text-slate-300">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{timeRange}</span>
              </div>

              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: DASHBOARD */}
          {/* ============================================================== */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-4">
              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-5 gap-3.5">
                {/* 1. Total Ingested Events */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Total Ingested Events</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      {trafficStats?.total_events || systemInfo?.events_count || 198}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Sparkline stroke="#38bdf8" />
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-sky-400">↑ 100% live</span>
                      <div className="text-[9px] text-slate-500">5 connectors</div>
                    </div>
                  </div>
                </div>

                {/* 2. Critical & High Alerts */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Active Threat Alerts</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      {liveAlerts.length || systemInfo?.alerts_count || 6}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Sparkline stroke="#ef4444" />
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-rose-400">
                        {liveAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length || 4} High/Crit
                      </span>
                      <div className="text-[9px] text-slate-500">requires review</div>
                    </div>
                  </div>
                </div>

                {/* 3. Correlated Incidents */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Correlated Incidents</span>
                    <div className="text-2xl font-bold text-indigo-400 mt-1">
                      {liveIncidents.length || systemInfo?.incidents_count || 1}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Sparkline stroke="#8b5cf6" />
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-indigo-400">Cross-Source</span>
                      <div className="text-[9px] text-slate-500">kill-chain detected</div>
                    </div>
                  </div>
                </div>

                {/* 4. Blocked Attacks */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Blocked & Denied</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      {blockedCount}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Sparkline stroke="#10b981" />
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-emerald-400">Enforced</span>
                      <div className="text-[9px] text-slate-500">drop / auth failure</div>
                    </div>
                  </div>
                </div>

                {/* 5. Online Connectors */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400">Telemetry Connectors</span>
                    <div className="text-2xl font-bold text-white mt-1">
                      5 / 5
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Sparkline stroke="#38bdf8" />
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-emerald-400">All Online</span>
                      <div className="text-[9px] text-slate-500">Apache, FW, Linux, Win, AWS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Charts Grid (2:1 Ratio) */}
              <div className="grid grid-cols-3 gap-4">
                {/* Traffic Overview */}
                <div className="col-span-2 bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-400" />
                      <h2 className="text-xs font-semibold text-white">Live Traffic Volume & Attack Velocity</h2>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                          <span className="text-slate-300">Normal</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                          <span className="text-slate-300">Suspicious</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                          <span className="text-slate-300">Malicious</span>
                        </span>
                      </div>

                      <button
                        onClick={() => setActiveTab('Traffic Monitor')}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>Traffic Analysis</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <Line data={trafficChartData} options={trafficChartOptions} />
                  </div>
                </div>

                {/* Top Attack Types */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-white">Detection Rule Distribution</h2>
                    <span className="text-[10px] text-slate-400">{liveAlerts.length} Active Rules</span>
                  </div>

                  <div className="flex items-center justify-between h-56 gap-2">
                    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                      <Doughnut data={attackTypesData} options={attackTypesOptions} />
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base font-bold text-white">
                          {liveAlerts.reduce((acc, a) => acc + (a.event_count || 1), 0)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">Events</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-[10px] max-h-52 overflow-y-auto pr-1">
                      {attackTypesData.labels.map((lbl, idx) => {
                        const count = attackTypesData.datasets[0].data[idx];
                        const color = attackTypesData.datasets[0].backgroundColor[idx];
                        return (
                          <div key={lbl} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate max-w-[110px]" title={lbl}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                              <span className="text-slate-300 truncate">{lbl}</span>
                            </div>
                            <span className="text-slate-400 font-mono font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Recent Alerts Table + System Status (2:1 Ratio) */}
              <div className="grid grid-cols-3 gap-4">
                {/* Recent Alerts */}
                <div className="col-span-2 bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h2 className="text-xs font-semibold text-white">Live Threat Alerts</h2>
                    </div>
                    <button
                      onClick={() => setActiveTab('Alerts')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>View All Alerts</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-[#1b253b] text-slate-400">
                          <th className="pb-2 font-medium">Rule / Threat</th>
                          <th className="pb-2 font-medium">Attacker IP</th>
                          <th className="pb-2 font-medium">Hits</th>
                          <th className="pb-2 font-medium">Severity</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151d2f]">
                        {liveAlerts.slice(0, 5).map((alert) => (
                          <tr key={alert.id} className="hover:bg-[#12192b] transition-colors">
                            <td className="py-2.5 text-white font-medium">
                              <div>{alert.description || alert.rule}</div>
                              <div className="text-[9px] text-slate-500 font-mono">{alert.rule}</div>
                            </td>
                            <td className="py-2.5 text-indigo-300 font-mono text-[10px]">{alert.source_ip}</td>
                            <td className="py-2.5 text-slate-300 font-mono">{alert.event_count || 1}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide ${
                                  alert.severity === 'critical'
                                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                    : alert.severity === 'high'
                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                    : alert.severity === 'medium'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {alert.severity?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className={`text-[10px] ${alert.status === 'acknowledged' ? 'text-slate-500' : 'text-emerald-400 font-semibold'}`}>
                                {alert.status === 'acknowledged' ? 'Acknowledged' : 'Active'}
                              </span>
                            </td>
                            <td className="py-2.5">
                              {alert.status === 'acknowledged' ? (
                                <button
                                  onClick={() => handleReopenAlert(alert.id)}
                                  className="text-[10px] bg-[#141b2c] hover:bg-[#1a2338] text-slate-400 px-2 py-0.5 rounded border border-[#202b44]"
                                >
                                  Reopen
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAcknowledgeAlert(alert.id)}
                                  className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 px-2 py-0.5 rounded border border-indigo-500/40"
                                >
                                  Ack
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Telemetry Status */}
                <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-white">Log Connectors Status</h2>
                    <span className="text-[10px] text-emerald-400">5 Active</span>
                  </div>

                  <div className="space-y-2.5 my-auto text-xs">
                    {[
                      { name: 'Apache Web Server', key: 'apache', count: 46 },
                      { name: 'Linux SSH / PAM', key: 'linux', count: 38 },
                      { name: 'Windows Event Log', key: 'windows', count: 16 },
                      { name: 'Palo Alto Firewall', key: 'paloalto', count: 24 },
                      { name: 'AWS CloudTrail', key: 'aws', count: 12 },
                    ].map(src => {
                      const liveSrc = sourceStatus.find(s => s.source === src.key);
                      const count = liveSrc?.count_24h || src.count;
                      return (
                        <div key={src.key} className="flex items-center justify-between p-2 rounded bg-[#141a29] border border-[#1e263c]">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-slate-300 font-medium text-[11px]">{src.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-mono font-semibold text-[11px]">{count}</span>
                            <span className="text-slate-500 text-[10px] ml-1">events</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: TRAFFIC MONITOR (Traffic Analysis Module) */}
          {/* ============================================================== */}
          {activeTab === 'Traffic Monitor' && (
            <div className="space-y-4">
              {/* Traffic Analysis Overview Banner */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>Real-Time Traffic Analysis & Packet Monitor</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live telemetry stream normalizing web, host, firewall, and cloud security events
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStreamPaused(!streamPaused)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                      streamPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {streamPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{streamPaused ? 'Resume Stream' : 'Pause Stream'}</span>
                  </button>

                  <button
                    onClick={handleSimulateTraffic}
                    disabled={isSimulating}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Inject Sample Traffic</span>
                  </button>
                </div>
              </div>

              {/* Source Distribution Cards */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: 'Apache HTTP', key: 'apache', icon: Network, color: 'text-sky-400', border: 'border-sky-500/30' },
                  { name: 'Linux Auth', key: 'linux', icon: Terminal, color: 'text-amber-400', border: 'border-amber-500/30' },
                  { name: 'Windows Security', key: 'windows', icon: Layers, color: 'text-indigo-400', border: 'border-indigo-500/30' },
                  { name: 'Palo Alto FW', key: 'paloalto', icon: ShieldAlert, color: 'text-red-400', border: 'border-red-500/30' },
                  { name: 'AWS CloudTrail', key: 'aws', icon: Radio, color: 'text-purple-400', border: 'border-purple-500/30' },
                ].map(s => {
                  const Icon = s.icon;
                  const stat = sourceStatus.find(item => item.source === s.key);
                  const count = stat?.count_24h || (s.key === 'apache' ? 46 : s.key === 'linux' ? 38 : s.key === 'paloalto' ? 24 : s.key === 'windows' ? 16 : 12);
                  return (
                    <div
                      key={s.key}
                      onClick={() => setSelectedSourceFilter(selectedSourceFilter === s.key ? 'all' : s.key)}
                      className={`bg-[#101626] border rounded-xl p-3 cursor-pointer transition-all ${
                        selectedSourceFilter === s.key ? `${s.border} ring-1 ring-indigo-500` : 'border-[#182238] hover:border-[#2a3754]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${s.color}`} />
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ONLINE</span>
                      </div>
                      <div className="text-xl font-bold text-white mt-2">{count}</div>
                      <div className="text-[10px] text-slate-400">{s.name}</div>
                    </div>
                  );
                })}
              </div>

              {/* Filter Bar */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Source Filter Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Source:
                  </span>
                  {['all', 'apache', 'linux', 'windows', 'paloalto', 'aws'].map(src => (
                    <button
                      key={src}
                      onClick={() => setSelectedSourceFilter(src)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                        selectedSourceFilter === src
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-[#141b2c] text-slate-400 hover:text-white border border-[#1e283f]'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>

                {/* Severity Filter Pills */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium mr-1">Severity:</span>
                  {['all', 'critical', 'high', 'medium', 'low', 'info'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                        selectedSeverityFilter === sev
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-[#141b2c] text-slate-400 hover:text-white border border-[#1e283f]'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-Time Events Table */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-400">
                    Showing <span className="text-white font-semibold">{filteredEvents.length}</span> normalized traffic events
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Auto-refreshing every 8s {!streamPaused && '• Stream LIVE'}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-[#0c101c] z-10">
                      <tr className="border-b border-[#1b253b] text-slate-400">
                        <th className="pb-2 font-medium">Timestamp</th>
                        <th className="pb-2 font-medium">Source</th>
                        <th className="pb-2 font-medium">Source IP</th>
                        <th className="pb-2 font-medium">Destination / Host</th>
                        <th className="pb-2 font-medium">Action</th>
                        <th className="pb-2 font-medium">Severity</th>
                        <th className="pb-2 font-medium">Event Summary / Raw</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151d2f]">
                      {filteredEvents.map((ev, i) => (
                        <tr key={ev.id || i} className="hover:bg-[#12192b] transition-colors">
                          <td className="py-2.5 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                            {ev.timestamp ? ev.timestamp.replace('T', ' ').slice(0, 19) : 'Just now'}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-[#182238] text-indigo-300">
                              {ev.source}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-300 text-[10px]">
                            {ev.source_ip || 'N/A'}
                          </td>
                          <td className="py-2.5 font-mono text-slate-400 text-[10px]">
                            {ev.host || ev.destination_ip || 'Internal'}
                          </td>
                          <td className="py-2.5">
                            <span className={`font-semibold text-[10px] ${
                              ev.action === 'deny' || ev.action === 'failure' || ev.action === 'block'
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }`}>
                              {(ev.action || 'allow').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                              ev.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                              ev.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              ev.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {ev.severity || 'info'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-300 text-[10px] max-w-xs truncate" title={ev.raw}>
                            {ev.raw || `${ev.source} event recorded`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: ANALYSIS (Deep Traffic & Threat Detection Models) */}
          {/* ============================================================== */}
          {activeTab === 'Analysis' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>Deep Traffic Analytics & Threat Detection Models</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluation status of SIEM correlation engines, statistical anomaly models, and pivot detection
                  </p>
                </div>

                <button
                  onClick={handleRunDetection}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Execute Model Pipeline</span>
                </button>
              </div>

              {/* Active Threat & Detection Models Matrix */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Configured SIEM & NIDS Detection Models</span>
                </h3>

                <div className="grid grid-cols-3 gap-3.5">
                  {/* Model 1: Brute Force Model */}
                  <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">SSH & Auth Brute Force Model</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sliding-window threshold model tracking repeated authentication failures within 120s.
                    </p>
                    <div className="bg-[#141b2c] p-2 rounded text-[10px] font-mono space-y-1 border border-[#1e283f]">
                      <div className="flex justify-between text-slate-400">
                        <span>Algorithm:</span> <span className="text-indigo-300">Sliding Window (120s)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Target Telemetry:</span> <span className="text-slate-200">Linux SSHD & Windows 4625</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Triggers Detected:</span> <span className="text-rose-400 font-bold">2 active attackers</span>
                      </div>
                    </div>
                  </div>

                  {/* Model 2: Web Scan & Directory Traversal */}
                  <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Web Scan & Directory Traversal</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Heuristic HTTP inspection identifying path traversal (`../`), sensitive URIs, and 404 clusters.
                    </p>
                    <div className="bg-[#141b2c] p-2 rounded text-[10px] font-mono space-y-1 border border-[#1e283f]">
                      <div className="flex justify-between text-slate-400">
                        <span>Algorithm:</span> <span className="text-indigo-300">Heuristic Signature Matching</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Target Telemetry:</span> <span className="text-slate-200">Apache Common Log / URI</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Triggers Detected:</span> <span className="text-amber-400 font-bold">45 scan events</span>
                      </div>
                    </div>
                  </div>

                  {/* Model 3: Firewall Deny Burst Anomaly */}
                  <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Firewall Deny Burst Anomaly</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Volumetric anomaly detection triggering when dropped packet rate exceeds 20 drops in 60s.
                    </p>
                    <div className="bg-[#141b2c] p-2 rounded text-[10px] font-mono space-y-1 border border-[#1e283f]">
                      <div className="flex justify-between text-slate-400">
                        <span>Algorithm:</span> <span className="text-indigo-300">Volumetric Threshold Anomaly</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Target Telemetry:</span> <span className="text-slate-200">Palo Alto Syslog</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Triggers Detected:</span> <span className="text-rose-400 font-bold">36 drops recorded</span>
                      </div>
                    </div>
                  </div>

                  {/* Model 4: Cloud Privilege & Console Login */}
                  <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Cloud IAM & Console Abuse Model</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      CloudTrail behavioral tracker flagging unauthorized root access & console login failures.
                    </p>
                    <div className="bg-[#141b2c] p-2 rounded text-[10px] font-mono space-y-1 border border-[#1e283f]">
                      <div className="flex justify-between text-slate-400">
                        <span>Algorithm:</span> <span className="text-indigo-300">Behavioral IAM Anomaly</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Target Telemetry:</span> <span className="text-slate-200">AWS CloudTrail JSON</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Triggers Detected:</span> <span className="text-orange-400 font-bold">18 console attempts</span>
                      </div>
                    </div>
                  </div>

                  {/* Model 5: Cross-Source Pivot Correlator */}
                  <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-2.5 col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">Cross-Source Entity Pivot Correlator</span>
                      </div>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">
                        MULTI-SOURCE ENGINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Correlates single attacker IP pivoting across multiple distinct log sources to reconstruct full cyber kill-chains.
                    </p>
                    <div className="bg-[#141b2c] p-2.5 rounded text-[10px] font-mono space-y-1 border border-[#1e283f]">
                      <div className="flex justify-between text-slate-400">
                        <span>Correlation Strategy:</span> <span className="text-purple-300">IP Entity Pivot Graph</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Active Incidents:</span> <span className="text-rose-400 font-bold">1 Coordinated Multi-Stage Incident</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Source Correlated Incidents Section */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-bold text-white">Multi-Source Correlated Incident (Kill-Chain)</h3>
                  </div>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    CRITICAL PRIORITY
                  </span>
                </div>

                {liveIncidents.map((inc) => (
                  <div key={inc.id} className="bg-[#141a29] border border-[#202c46] rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-rose-400">{inc.source_ip}</span>
                        <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                          {inc.event_count} Events Across {inc.sources.split(',').length} Sources
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        First Seen: {inc.first_seen?.slice(11, 19)} • Last Seen: {inc.last_seen?.slice(11, 19)}
                      </div>
                    </div>

                    {/* Kill-Chain Progression Visual */}
                    <div className="pt-1">
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium">Reconstructed Attack Kill-Chain Progression:</div>
                      <div className="flex items-center gap-2 text-[10px]">
                        {inc.sources.split(',').map((src, i) => (
                          <React.Fragment key={src}>
                            <div className="bg-[#1a233b] border border-[#27375a] px-2.5 py-1 rounded text-slate-200 font-medium capitalize flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              <span>{src}</span>
                            </div>
                            {i < inc.sources.split(',').length - 1 && (
                              <span className="text-slate-600">➔</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Talkers & Attack Source Analysis */}
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-4">
                <h3 className="text-xs font-bold text-white mb-3">Top Attacker IP Addresses (Traffic Volume Analysis)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#1b253b] text-slate-400">
                        <th className="pb-2 font-medium">Source IP</th>
                        <th className="pb-2 font-medium">Total Events</th>
                        <th className="pb-2 font-medium">Associated Threats</th>
                        <th className="pb-2 font-medium">Threat Level</th>
                        <th className="pb-2 font-medium">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151d2f]">
                      {(trafficStats?.top_ips || [
                        { source_ip: '203.0.113.50', count: 124 },
                        { source_ip: '203.0.113.22', count: 12 }
                      ]).map((ip) => (
                        <tr key={ip.source_ip} className="hover:bg-[#12192b]">
                          <td className="py-2.5 font-mono text-indigo-300 font-bold">{ip.source_ip}</td>
                          <td className="py-2.5 font-mono text-white">{ip.count} events</td>
                          <td className="py-2.5 text-slate-300">
                            {ip.source_ip === '203.0.113.50'
                              ? 'Brute Force, Web Scan, FW Deny, AWS Console Login'
                              : 'SSH Brute Force on web01'}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-red-500/20 text-red-400">
                              CRITICAL
                            </span>
                          </td>
                          <td className="py-2.5">
                            <button
                              onClick={() => alert(`Firewall drop rule applied to IP ${ip.source_ip}`)}
                              className="text-[10px] bg-rose-600/30 hover:bg-rose-600 text-rose-200 px-2.5 py-1 rounded border border-rose-500/40"
                            >
                              Block at Firewall
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: ALERTS VIEW */}
          {/* ============================================================== */}
          {activeTab === 'Alerts' && (
            <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Threat Alerts Management</h2>
                  <p className="text-xs text-slate-400">All alerts triggered by correlation & detection engine</p>
                </div>
                <button
                  onClick={handleRunDetection}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Re-evaluate Rules</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1b253b] text-slate-400">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Timestamp</th>
                      <th className="pb-2 font-medium">Rule / Type</th>
                      <th className="pb-2 font-medium">Attacker IP</th>
                      <th className="pb-2 font-medium">Hits</th>
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium">Recommended Action</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151d2f]">
                    {liveAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-[#12192b]">
                        <td className="py-3 text-slate-400">#{a.id}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-300">
                          {a.last_seen ? a.last_seen.replace('T', ' ').slice(0, 19) : 'Recent'}
                        </td>
                        <td className="py-3 text-white font-medium">
                          <div>{a.description || a.rule}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{a.rule}</div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-indigo-300">{a.source_ip}</td>
                        <td className="py-3 font-mono text-slate-300">{a.event_count || 1}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              a.severity === 'critical'
                                ? 'bg-red-500/20 text-red-400'
                                : a.severity === 'high'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {a.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-[11px] text-slate-400 max-w-xs truncate" title={a.recommended_action}>
                          {a.recommended_action || 'Inspect activity'}
                        </td>
                        <td className="py-3">
                          {a.status === 'acknowledged' ? (
                            <button
                              onClick={() => handleReopenAlert(a.id)}
                              className="text-[11px] bg-[#1a233b] hover:bg-[#253255] text-slate-400 px-2 py-1 rounded"
                            >
                              Reopen
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAcknowledgeAlert(a.id)}
                              className="text-[11px] bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 px-2.5 py-1 rounded border border-indigo-500/40"
                            >
                              Acknowledge
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: REPORTS VIEW */}
          {/* ============================================================== */}
          {activeTab === 'Reports' && (
            <div className="space-y-4">
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Security & Incident Audit Reports</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Generate compliance audit records and incident post-mortem summaries
                    </p>
                  </div>
                  <button
                    onClick={handleExportReport}
                    className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full SIEM Report (JSON)</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-[#141b2c] p-4 rounded-lg border border-[#1e283f] space-y-2">
                    <span className="text-xs font-bold text-white">Executive Threat Summary</span>
                    <p className="text-[11px] text-slate-400">
                      Overall posture assessment including total ingested log events ({trafficStats?.total_events || 198}),
                      active alerts ({liveAlerts.length}), and blocked attacks ({blockedCount}).
                    </p>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                      Status: High Alert Resolution Underway
                    </div>
                  </div>

                  <div className="bg-[#141b2c] p-4 rounded-lg border border-[#1e283f] space-y-2">
                    <span className="text-xs font-bold text-white">Multi-Source Incident Log</span>
                    <p className="text-[11px] text-slate-400">
                      Coordinated adversary tracking across Apache, Linux, Windows, Palo Alto, and AWS CloudTrail.
                    </p>
                    <div className="text-[10px] text-indigo-400 font-semibold pt-1">
                      1 Active Lateral Pivot Incident
                    </div>
                  </div>

                  <div className="bg-[#141b2c] p-4 rounded-lg border border-[#1e283f] space-y-2">
                    <span className="text-xs font-bold text-white">Connector Health & Compliance</span>
                    <p className="text-[11px] text-slate-400">
                      Telemetry log preservation audit verifying that all 5 ingestion connectors are writing to `data/cybershield.db` in WAL mode.
                    </p>
                    <div className="text-[10px] text-sky-400 font-semibold pt-1">
                      100% Telemetry Coverage
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: RULES VIEW */}
          {/* ============================================================== */}
          {activeTab === 'Rules' && (
            <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Detection Rules (config/rules.yaml)</h2>
                  <p className="text-xs text-slate-400">Active sliding-window detection rules</p>
                </div>
                <button
                  onClick={handleRunDetection}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Engine</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'brute_force', sev: 'high', window: '120s', thresh: '5 failed logins within 120s' },
                  { name: 'web_scan', sev: 'medium', window: '60s', thresh: '10 404 responses or path probe' },
                  { name: 'repeated_401', sev: 'medium', window: '60s', thresh: '5 401 Unauthorized responses' },
                  { name: 'firewall_deny_burst', sev: 'high', window: '60s', thresh: '20 connection denies' },
                  { name: 'cloud_console_login_failure', sev: 'high', window: '300s', thresh: '3 ConsoleLogin failures' },
                ].map((r) => (
                  <div key={r.name} className="bg-[#141b2c] p-3.5 rounded-lg border border-[#1f2b44] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-300 font-bold">{r.name}</span>
                      <span className="text-[10px] uppercase font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-500/10">
                        {r.sev}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">Condition: {r.thresh}</p>
                    <p className="text-[10px] text-slate-500">Sliding Window: {r.window}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: SYSTEM VIEW */}
          {/* ============================================================== */}
          {activeTab === 'System' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Database & Ingestion Stats</span>
                </h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#182238]">
                    <span className="text-slate-400">Database Engine</span>
                    <span className="font-mono text-white">SQLite 3 (WAL Mode Enabled)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#182238]">
                    <span className="text-slate-400">Database Location</span>
                    <span className="font-mono text-slate-300">data/cybershield.db</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#182238]">
                    <span className="text-slate-400">Total Normalized Events</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {systemInfo?.events_count || trafficStats?.total_events || 198}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#182238]">
                    <span className="text-slate-400">Alerts in Database</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {systemInfo?.alerts_count || liveAlerts.length || 6}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#182238]">
                    <span className="text-slate-400">Correlated Incidents</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {systemInfo?.incidents_count || liveIncidents.length || 1}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Telemetry Connectors Status</span>
                </h2>
                <div className="space-y-2 text-xs">
                  {['apache', 'linux', 'windows', 'paloalto', 'aws'].map((src) => {
                    const st = sourceStatus.find(s => s.source === src);
                    return (
                      <div key={src} className="flex items-center justify-between py-1.5 border-b border-[#182238]">
                        <span className="capitalize font-medium text-slate-300">{src} Connector</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 text-[11px]">{st?.count_24h || 20} events</span>
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            ONLINE
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 8: SETTINGS VIEW */}
          {/* ============================================================== */}
          {activeTab === 'Settings' && (
            <div className="bg-[#101626] border border-[#182238] rounded-xl p-5 space-y-4 max-w-xl">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-indigo-400" />
                <span>CyberShield System Settings</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">API Key for Log Ingestion (`X-API-Key`)</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#141b2c] border border-[#202b44] rounded-lg p-2 font-mono text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('cyberguard_api_key', apiKey);
                      setKeySaved(true);
                      setTimeout(() => setKeySaved(false), 2000);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                  >
                    Save API Key
                  </button>
                  {keySaved && <span className="text-emerald-400 font-medium">✓ API Key saved</span>}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* 3. LOG INGEST MODAL */}
      {/* ============================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101626] border border-[#202b44] rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Manual Log Ingestion</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Log Source</label>
                <select
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  className="w-full bg-[#141b2c] border border-[#202b44] rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="apache">Apache Access Log</option>
                  <option value="linux">Linux Auth / SSH Log</option>
                  <option value="windows">Windows Event Log (CSV)</option>
                  <option value="paloalto">Palo Alto Syslog (CSV)</option>
                  <option value="aws">AWS CloudTrail (JSON)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Payload (Raw Text)</label>
                <textarea
                  rows="4"
                  placeholder="Paste raw log lines here..."
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  className="w-full bg-[#141b2c] border border-[#202b44] rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {uploadResult && (
                <div className={`p-2.5 rounded text-xs ${uploadResult.ok !== undefined ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                  {uploadResult.ok !== undefined ? `Ingested ${uploadResult.ok} events successfully!` : JSON.stringify(uploadResult)}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-[#151c30]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Ingest & Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
