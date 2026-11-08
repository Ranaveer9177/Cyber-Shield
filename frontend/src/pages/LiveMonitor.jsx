import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Filter,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { eventsApi } from '../services/api';
import { formatRelativeTime, formatTimestamp, getSeverityColor, getSourceColor, truncate } from '../utils/format';

export function LiveMonitor() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [filters, setFilters] = useState({ sources: [], severities: [], search: '' });
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalPages, setTotalPages] = useState(1);
  const containerRef = useRef(null);

  const fetchEvents = async (pageNum = 1) => {
    try {
      const res = await eventsApi.getAll({
        limit: pageSize,
        offset: (pageNum - 1) * pageSize,
        source: filters.sources.length ? filters.sources.join(',') : undefined,
        severity: filters.severities.length ? filters.severities.join(',') : undefined,
        search: filters.search || undefined,
      });
      setEvents(res.data.events || []);
      setTotalPages(Math.ceil((res.data.total || 0) / pageSize));
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(page);
  }, [page, filters.sources.join(','), filters.severities.join(','), filters.search]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => fetchEvents(page), 5000);
    return () => clearInterval(interval);
  }, [paused, page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ sources: [], severities: [], search: '' });
    setPage(1);
  };

  const sources = ['apache', 'linux', 'windows', 'paloalto', 'aws'];
  const severities = ['critical', 'high', 'medium', 'low', 'info'];

  if (loading && events.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Event Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time security event stream</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPaused(!paused)} className={`btn flex items-center gap-2 ${paused ? 'btn-secondary' : 'btn-primary'}`}>
            {paused ? (<><Play className="w-4 h-4" /> Resume</>) : (<><Pause className="w-4 h-4" /> Pause</>)}
          </button>
          <button className="btn btn-secondary" title="Export current view"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label>
            <input type="text" placeholder="Search events... (IP, username, message)" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="input" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sources</label>
            <select multiple value={filters.sources} onChange={e => handleFilterChange('sources', Array.from(e.target.selectedOptions).map(o => o.value))} className="select h-24">
              {sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Severities</label>
            <select multiple value={filters.severities} onChange={e => handleFilterChange('severities', Array.from(e.target.selectedOptions).map(o => o.value))} className="select h-24">
              {severities.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={clearFilters} disabled={!filters.sources.length && !filters.severities.length && !filters.search} className="btn btn-secondary">Clear Filters</button>
          </div>
        </div>
      </div>

      <div className="card flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-36">Timestamp</th>
                <th className="w-24">Source</th>
                <th className="w-28">Host</th>
                <th>Event Type</th>
                <th className="w-36">Source IP</th>
                <th className="w-24">Severity</th>
                <th className="w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.length > 0 ? events.map(event => (
                <tr key={event.event_id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                  <td className="font-mono text-xs text-slate-600 dark:text-slate-400">{formatTimestamp(event.timestamp)}</td>
                  <td><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getSourceColor(event.source)} text-white`}>{event.source}</span></td>
                  <td className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{event.host || '—'}</td>
                  <td className="text-sm text-slate-700 dark:text-slate-300 font-medium">{event.event_type?.replace(/_/g, ' ')}</td>
                  <td className="font-mono text-sm text-slate-700 dark:text-slate-300">{event.source_ip || '—'}</td>
                  <td><span className={`badge ${getSeverityColor(event.severity)}`}>{event.severity}</span></td>
                  <td className="capitalize text-sm text-slate-600 dark:text-slate-400">{event.action}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500 dark:text-slate-400"><Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 animate-spin" /><p>No events found</p><p className="text-xs mt-1">Try adjusting your filters</p></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-dark-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary p-2" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary p-2" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}