import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('cyberguard_api_key') || 'change-me-secret';
  config.headers['X-API-Key'] = apiKey;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cyberguard_api_key');
    }
    return Promise.reject(error);
  }
);

export const eventsApi = {
  getAll: (params = {}) => api.get('/api/events', { params }),
  getById: (id) => api.get(`/api/events/${id}`),
  getStats: () => api.get('/api/events/stats'),
  getSources: () => api.get('/api/events/sources'),
  getSourceStatus: () => api.get('/api/events/source-status'),
};

export const alertsApi = {
  getAll: (params = {}) => api.get('/api/alerts', { params }),
  getById: (id) => api.get(`/api/alerts/${id}`),
  acknowledge: (id) => api.patch(`/api/alerts/${id}/acknowledge`),
  reopen: (id) => api.patch(`/api/alerts/${id}/reopen`),
  getStats: () => api.get('/api/alerts/stats'),
};

export const incidentsApi = {
  getAll: () => api.get('/api/incidents'),
  getById: (id) => api.get(`/api/incidents/${id}`),
  getEvents: (sourceIp) => api.get(`/api/incidents/${sourceIp}/events`),
  getStats: () => api.get('/api/incidents/stats'),
};

export const parseErrorsApi = {
  getAll: () => api.get('/api/parse-errors'),
  clear: () => api.delete('/api/parse-errors'),
};

export const engineApi = {
  runDetection: () => api.post('/api/detect'),
  runCorrelation: () => api.post('/api/correlate'),
  runBoth: () => api.post('/api/detect-and-correlate'),
};

export const ingestionApi = {
  ingest: (source, content) => api.post(`/ingest/${source}`, content, {
    headers: { 'Content-Type': 'text/plain' },
  }),
  uploadFile: (source, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/ingest/${source}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  detectSource: (sample) => api.post('/api/detect-source', { sample }),
};

export const healthApi = {
  check: () => api.get('/health'),
  getSystemInfo: () => api.get('/api/system/info'),
};

export const configApi = {
  getRules: () => api.get('/api/config/rules'),
  updateRules: (rules) => api.put('/api/config/rules', rules),
  getApiKey: () => api.get('/api/config/api-key'),
  updateApiKey: (key) => api.put('/api/config/api-key', { key }),
};

export default api;