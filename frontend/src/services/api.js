import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
};

export const leadGenAPI = {
  getAll: (params) => api.get('/lead-generation', { params }),
  getById: (id) => api.get(`/lead-generation/${id}`),
  create: (data) => api.post('/lead-generation', data),
  update: (id, data) => api.put(`/lead-generation/${id}`, data),
  delete: (id) => api.delete(`/lead-generation/${id}`),
  getTargets: () => api.get('/lead-generation/targets'),
  getConnectionRanges: () => api.get('/lead-generation/connection-ranges'),
  export: (params) => api.get('/lead-generation/export', { params, responseType: 'blob' }),
};

export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  getTargets: () => api.get('/sales/targets'),
  export: (params) => api.get('/sales/export', { params, responseType: 'blob' }),
};

export const marketingAPI = {
  getAll: (params) => api.get('/marketing', { params }),
  getById: (id) => api.get(`/marketing/${id}`),
  create: (data) => api.post('/marketing', data),
  update: (id, data) => api.put(`/marketing/${id}`, data),
  delete: (id) => api.delete(`/marketing/${id}`),
  getInterviewStages: () => api.get('/marketing/interview-stages'),
  export: (params) => api.get('/marketing/export', { params, responseType: 'blob' }),
};

export default api;
