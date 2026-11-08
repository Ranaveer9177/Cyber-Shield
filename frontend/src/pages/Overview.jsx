import { useEffect, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  ExternalLink,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Server,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { eventsApi, alertsApi, incidentsApi } from '../services/api';
import { formatRelativeTime, formatNumber } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  interaction: { intersect: false, mode: 'index' },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } }, beginAtZero: true },
  },
};

const COLORS = {
  primary: '#0ea5e9',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  success: '#22c55e',
};

export function Overview() {
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    activeIncidents: 0,
    sourcesOnline: 0,
    totalSources: 5,
  });
  const [sourceStatus, setSourceStatus] = useState([]);
  const [eventsBySource, setEventsBySource] = useState({ labels: [], data: [] });
  const [topIPs, setTopIPs] = useState({ labels: [], data: [] });
  const [timelineData, setTimelineData] = useState({ labels: [], datasets: [] });
  const [severityData, setSeverityData] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, alertsRes, incidentsRes, sourcesRes] = await Promise.all([
        eventsApi.getStats(),
        alertsApi.getStats(),
        incidentsApi.getStats(),
        eventsApi.getSources(),
      ]);

      setMetrics({
        totalEvents: eventsRes.data?.totalEvents || 0,
        criticalAlerts: alertsRes.data?.bySeverity?.critical || 0,
        highAlerts: alertsRes.data?.bySeverity?.high || 0,
        activeIncidents: incidentsRes.data?.active || 0,
        sourcesOnline: sourcesRes.data?.filter(s => s.state === 'ONLINE').length || 0,
        totalSources: 5,
      });

      if (eventsRes.data?.bySource) {
        const src = eventsRes.data.bySource;
        setEventsBySource({ labels: Object.keys(src), data: Object.values(src) });
      }
      if (eventsRes.data?.topIPs) {
        const ips = eventsRes.data.topIPs.slice(0, 10);
        setTopIPs({ labels: ips.map(i => i.ip), data: ips.map(i => i.count) });
      }
      if (eventsRes.data?.timeline) {
        setTimelineData(eventsRes.data.timeline);
      }
      if (alertsRes.data?.bySeverity) {
        const sev = alertsRes.data.bySeverity;
        setSeverityData({
          labels: ['Critical', 'High', 'Medium', 'Low'],
          data: [sev.critical || 0, sev.high || 0, sev.medium || 0, sev.low || 0],
        });
      }
      if (sourcesRes.data) {
        setSourceStatus(sourcesRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const KPIs = [
    { label: 'Total Events', value: formatNumber(metrics.totalEvents), icon: Activity, color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400', trend: { value: '+12%', up: true } },
    { label: 'Critical Alerts', value: metrics.criticalAlerts, icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', trend: { value: metrics.criticalAlerts > 0 ? '+2' : '0', up: metrics.criticalAlerts > 0 } },
    { label: 'High Alerts', value: metrics.highAlerts, icon: AlertTriangle, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', trend: { value: metrics.highAlerts > 0 ? '+5' : '0', up: metrics.highAlerts > 0 } },
    { label: 'Active Incidents', value: metrics.activeIncidents, icon: Users, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', trend: { value: metrics.activeIncidents > 0 ? '+1' : '0', up: metrics.activeIncidents > 0 } },
    { label: 'Sources Online', value: `${metrics.sourcesOnline}/${metrics.totalSources}`, icon: Shield, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', trend: { value: 'Stable', up: true } },
    { label: 'Events/min', value: '247', icon: TrendingUp, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', trend: { value: '+12%', up: true } },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SOC Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time security operations center dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="select w-auto">
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button className="btn btn-secondary flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPIs.map((kpi, i) => (
          <div key={i} className="kpi-tile">
            <div className="flex items-center justify-between">
              <div className={`kpi-icon ${kpi.color}`}><kpi.icon className="w-6 h-6" /></div>
              <div className={`kpi-trend ${kpi.trend.up ? 'up' : 'down'}`}><TrendingUp className="w-3 h-3" /><span>{kpi.trend.value}</span></div>
            </div>
            <div className="mt-4"><p className="kpi-value">{kpi.value}</p><p className="kpi-label">{kpi.label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Events by Source</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary-500" /> Apache</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Linux</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" /> Windows</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Palo Alto</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500" /> AWS</span>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {eventsBySource.data.length > 0 ? (
              <Doughnut data={{ labels: eventsBySource.labels, datasets: [{ data: eventsBySource.data, backgroundColor: ['#0ea5e9', '#22c55e', '#f97316', '#ef4444', '#a855f7'], borderWidth: 0, borderRadius: 8 }] }} options={{ ...chartOptions, cutout: '65%', plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 }, color: '#64748b' } } } }} />
            ) : <div className="empty-state w-full"><Activity className="empty-state-icon" /><p className="empty-state-title">No data available</p><p className="empty-state-text">Events will appear here as they are ingested</p></div>}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top 10 Offending Source IPs</h3>
          <div className="h-64">
            {topIPs.data.length > 0 ? <Bar data={{ labels: topIPs.labels, datasets: [{ label: 'Event Count', data: topIPs.data, backgroundColor: 'rgba(14, 165, 233, 0.8)', borderColor: '#0ea5e9', borderWidth: 1, borderRadius: 6, maxBarThickness: 32 }] }} options={{ ...chartOptions, indexAxis: 'y', plugins: { ...chartOptions.plugins, legend: { display: false } } }} /> : <div className="empty-state w-full h-full"><Activity className="empty-state-icon" /><p className="empty-state-title">No IP data</p></div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Events Over Time</h3>
          <div className="h-64">
            {timelineData.labels?.length > 0 ? <Line fill={true} data={{ labels: timelineData.labels, datasets: [{ label: 'Events', data: timelineData.datasets[0]?.data || [], borderColor: COLORS.primary, backgroundColor: 'rgba(14, 165, 233, 0.15)', fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 }] }} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } } }} /> : <div className="empty-state w-full h-full"><Activity className="empty-state-icon" /><p className="empty-state-title">No timeline data</p></div>}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Alert Severity Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {severityData.data.some(d => d > 0) ? <Doughnut data={{ labels: severityData.labels, datasets: [{ data: severityData.data, backgroundColor: [COLORS.critical, COLORS.high, COLORS.medium, COLORS.low], borderWidth: 0, borderRadius: 8 }] }} options={{ ...chartOptions, cutout: '60%', plugins: { ...chartOptions.plugins, legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 }, color: '#64748b' } } } }} /> : <div className="empty-state w-full"><AlertTriangle className="empty-state-icon" /><p className="empty-state-title">No alerts triggered</p><p className="empty-state-text">Alerts will appear here when detection rules match</p></div>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Connected Log Source Status</h3>
          <button className="btn btn-secondary flex items-center gap-2 text-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {sourceStatus.length > 0 ? sourceStatus.map(source => (
            <div key={source.source} className="metric-card">
              <div className="flex items-center gap-3">
                <div className={`metric-icon ${source.state === 'ONLINE' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}><Shield className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 dark:text-white capitalize">{source.source}</p><p className="text-xs text-slate-500 dark:text-slate-400">{source.state === 'ONLINE' ? 'Online' : 'Offline'}</p></div>
                <div className={`w-2.5 h-2.5 rounded-full ${source.state === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-700"><p className="text-sm text-slate-500 dark:text-slate-400">Last event</p><p className="text-sm font-medium text-slate-900 dark:text-white">{source.last ? formatRelativeTime(source.last) : 'Never'}</p></div>
              <div className="mt-2"><p className="text-sm text-slate-500 dark:text-slate-400">24h events</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(source.count_24h || 0)}</p></div>
            </div>
          )) : <div className="col-span-full empty-state"><Server className="empty-state-icon" /><p className="empty-state-title">No sources connected</p><p className="empty-state-text">Configure Fluent Bit agents to start ingesting logs</p></div>}
        </div>
      </div>
    </div>
  );
}