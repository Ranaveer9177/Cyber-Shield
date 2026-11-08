import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, User, Clock, MapPin, Wifi, ChevronDown, ChevronUp, RefreshCw, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { alertsApi } from '../services/api';
import { formatRelativeTime, formatTimestamp, getSeverityColor, getSeverityBadgeColor } from '../utils/format';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function ThreatAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severities: [], status: 'all', search: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'first_seen', direction: 'desc' });

  const fetchAlerts = async () => {
    try {
      const res = await alertsApi.getAll();
      setAlerts(res.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleAcknowledge = async (id) => {
    try {
      await alertsApi.acknowledge(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
    } catch (error) { console.error('Failed to acknowledge alert:', error); }
  };

  const handleReopen = async (id) => {
    try {
      await alertsApi.reopen(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'open' } : a));
    } catch (error) { console.error('Failed to reopen alert:', error); }
  };

  const filteredAlerts = alerts
    .filter(alert => {
      if (filters.severities.length && !filters.severities.includes(alert.severity)) return false;
      if (filters.status !== 'all' && alert.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return alert.rule.toLowerCase().includes(search) || alert.source_ip.toLowerCase().includes(search) || (alert.host?.toLowerCase().includes(search) || false) || alert.description.toLowerCase().includes(search);
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const severityCounts = alerts.reduce((acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Threat Alerts</h1><p className="text-slate-500 dark:text-slate-400 mt-1">Detected security threats requiring attention</p></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {['critical', 'high', 'medium', 'low', 'info'].map(sev => (
          <div key={sev} className={`p-3 rounded-xl text-center cursor-pointer transition-all ${filters.severities.includes(sev) ? `bg-${sev === 'info' ? 'blue' : sev}-100 dark:bg-${sev}-900/30` : 'bg-white dark:bg-dark-800'} border border-slate-200 dark:border-dark-700`} onClick={() => setFilters(prev => ({ ...prev, severities: prev.severities.includes(sev) ? prev.severities.filter(s => s !== sev) : [...prev.severities, sev] }))} >
            <div className={`w-8 h-8 mx-auto rounded-full ${getSeverityBadgeColor(sev)} flex items-center justify-center`} />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 capitalize">{sev}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{severityCounts[sev] || 0}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label><input type="text" placeholder="Search alerts... (rule, IP, host, description)" value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} className="input" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label><select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} className="select"><option value="all">All Statuses</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option></select></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div> : alerts.length === 0 ? <div className="empty-state h-64"><AlertTriangle className="empty-state-icon" /><p className="empty-state-title">No alerts found</p><p className="empty-state-text">Adjust your filters or wait for detection rules to trigger</p></div> : (
          <div className="overflow-x-auto">
            <table className="data-table"><thead><tr>
              <th className="w-10"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" aria-label="Select all" /></th>
              <th onClick={() => handleSort('rule')} className="cursor-pointer select-none"><div className="flex items-center gap-1"><span>Threat Name</span>{sortConfig.key === 'rule' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}</div></th>
              <th onClick={() => handleSort('source_ip')} className="cursor-pointer select-none"><div className="flex items-center gap-1"><span>Source IP</span>{sortConfig.key === 'source_ip' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}</div></th>
              <th onClick={() => handleSort('host')} className="cursor-pointer select-none hidden md:table-cell"><div className="flex items-center gap-1"><span>Affected System</span>{sortConfig.key === 'host' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}</div></th>
              <th onClick={() => handleSort('first_seen')} className="cursor-pointer select-none hidden lg:table-cell"><div className="flex items-center gap-1"><span>Detection Time</span>{sortConfig.key === 'first_seen' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}</div></th>
              <th className="w-24">Severity</th>
              <th className="w-24">Status</th>
              <th className="w-48">Recommended Action</th>
              <th className="w-12">Actions</th>
            </tr></thead><tbody>
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                  <td><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" /></td>
                  <td className="font-medium text-slate-900 dark:text-white">{alert.rule}</td>
                  <td className="font-mono text-sm text-slate-700 dark:text-slate-300">{alert.source_ip}</td>
                  <td className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{alert.host || '—'}</td>
                  <td className="hidden lg:table-cell text-sm text-slate-600 dark:text-slate-400">{formatRelativeTime(alert.first_seen)}</td>
                  <td><span className={`badge ${getSeverityColor(alert.severity)}`}>{alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}</span></td>
                  <td><span className={`badge ${alert.status === 'acknowledged' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>{alert.status}</span></td>
                  <td className="text-sm text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={alert.recommended_action}>{alert.recommended_action || 'Investigate activity from this source IP.'}</td>
                  <td><div className="flex items-center gap-1">{alert.status === 'open' ? <button onClick={() => handleAcknowledge(alert.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Acknowledge"><Check className="w-4 h-4" /></button> : <button onClick={() => handleReopen(alert.id)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Reopen"><X className="w-4 h-4" /></button>}</div></td>
                </tr>
              ))}
            </tbody></table></div>)}
      </div>
    </div>
  );
}