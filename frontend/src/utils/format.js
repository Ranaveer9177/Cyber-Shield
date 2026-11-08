export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatTimestamp(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

export function getSeverityColor(severity) {
  const colors = {
    critical: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };
  return colors[severity] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
}

export function getSeverityBadgeColor(severity) {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };
  return colors[severity] || 'bg-slate-500';
}

export function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function getSourceColor(source) {
  const colors = {
    apache: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    linux: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    windows: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    paloalto: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    aws: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };
  return colors[source] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
}

export function getSourceBadgeColor(source) {
  const colors = {
    apache: 'bg-blue-500',
    linux: 'bg-green-500',
    windows: 'bg-orange-500',
    paloalto: 'bg-red-500',
    aws: 'bg-purple-500',
  };
  return colors[source] || 'bg-slate-500';
}