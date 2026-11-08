import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Search,
  Timeline,
  Upload,
  AlertCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  Shield,
  Server,
  Database,
  Zap,
  HelpCircle,
  LogOut,
  User,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useSocket } from '../providers/SocketProvider';

const navigation = [
  { path: '/overview', label: 'SOC Overview', icon: LayoutDashboard },
  { path: '/live-monitor', label: 'Live Monitor', icon: Activity },
  { path: '/threat-alerts', label: 'Threat Alerts', icon: AlertTriangle },
  { path: '/event-explorer', label: 'Event Explorer', icon: Search },
  { path: '/incident-timeline', label: 'Incident Timeline', icon: Timeline },
  { path: '/manual-upload', label: 'Manual Upload', icon: Upload },
  { path: '/parse-errors', label: 'Parse Errors', icon: AlertCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { apiKey, updateApiKey, isConfigured } = useAuth();
  const { connected, lastEvent } = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (lastEvent) {
      const messages = {
        new_event: 'New security event received',
        new_alert: 'New threat alert triggered',
        new_incident: 'New incident correlated',
        stats_update: 'Statistics updated',
      };
      setNotification(messages[lastEvent.type] || 'Real-time update received');
      setTimeout(() => setNotification(null), 4000);
    }
  }, [lastEvent]);

  const handleApiKeySave = () => {
    if (tempApiKey.trim()) {
      updateApiKey(tempApiKey.trim());
      setShowApiKeyModal(false);
      setNotification('API key updated successfully');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cyberguard_api_key');
    localStorage.removeItem('cyberguard_theme');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-dark-700 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-dark-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">CyberGuard</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">SOC Command Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main menu">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div className="p-4 border-t border-slate-200 dark:border-dark-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-800">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {connected ? 'Real-time Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                WebSocket {connected ? 'Active' : 'Reconnecting...'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 shadow-lg"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
      </button>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-700">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Page Title */}
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {navigation.find(n => location.pathname === n.path)?.label || 'Dashboard'}
              </h2>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {/* API Key Status */}
              {!isConfigured && (
                <button
                  onClick={() => { setTempApiKey(apiKey); setShowApiKeyModal(true); }}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  API Key Required
                </button>
              )}

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">Analyst</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1">
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-t-xl" onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 inline mr-2" /> Settings
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-700" onClick={() => {}}>
                    <HelpCircle className="w-4 h-4 inline mr-2" /> Help & Docs
                  </button>
                  <hr className="my-1 border-slate-200 dark:border-dark-700" />
                  <button className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-xl" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 inline mr-2" /> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Notification */}
        {notification && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-in px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl shadow-lg text-sm flex items-center gap-2 max-w-md">
            <Activity className="w-4 h-4 animate-spin" />
            <span>{notification}</span>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Key Configuration</h3>
              <button onClick={() => setShowApiKeyModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enter your API key to authenticate with the CyberGuard receiver. This key must match the <code className="bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header configured in Fluent Bit.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="input"
                placeholder="Enter API key..."
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowApiKeyModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleApiKeySave} className="btn btn-primary flex-1">
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}