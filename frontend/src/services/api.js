import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    if (config.url?.startsWith('/candidate-auth')) {
      const candidateToken = localStorage.getItem('candidateToken');
      if (candidateToken) {
        config.headers.Authorization = `Bearer ${candidateToken}`;
      }
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isCandidateContext =
        window.location.pathname.startsWith('/candidate') ||
        error.config?.url?.includes('/candidate-auth');

      if (isCandidateContext) {
        localStorage.removeItem('candidateToken');
        localStorage.removeItem('candidateUser');
        sessionStorage.removeItem('candidateResetToken');
        // Do not redirect if already on candidate auth pages
        const isAuthPage =
          window.location.pathname === '/candidate/login' ||
          window.location.pathname === '/candidate/first-login' ||
          window.location.pathname === '/candidate/set-password';
        if (!isAuthPage) {
          window.location.href = '/candidate/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  getAuditLogs: () => api.get('/users/audit-logs'),
  getActivitySummary: (params) => api.get('/users/activity-summary', { params }),
  getUserActivityLogs: (id, params) => api.get(`/users/${id}/activity-logs`, { params }),
  getLiveActivityStream: (params) => api.get('/users/live-activity-stream', { params }),
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
  convertToCandidate: (id, data) => api.post(`/lead-generation/${id}/convert-to-candidate`, data),
  resendCandidateInvite: (id, data = {}) => api.post(`/lead-generation/${id}/resend-candidate-invite`, data),
  logCall: (id, callData) => api.post(`/lead-generation/${id}/call-log`, callData),
  getSalesTeam: () => api.get('/lead-generation/sales-team'),
  getMarketingTeam: () => api.get('/lead-generation/marketing-team'),
  getMyAssignedLeads: () => api.get('/lead-generation/my-assigned-leads'),
  getTargets: () => api.get('/lead-generation/targets'),
  getConnectionRanges: () => api.get('/lead-generation/connection-ranges'),
  export: (params) => api.get('/lead-generation/export', { params, responseType: 'blob' }),
};

export const candidateAuthAPI = {
  firstLogin: (data) => api.post('/candidate-auth/first-login', data),
  setPassword: (data, resetToken) =>
    api.post('/candidate-auth/set-password', data, {
      headers: { Authorization: `Bearer ${resetToken}` },
    }),
  login: (data) => api.post('/candidate-auth/login', data),
  me: (token) => {
    const candidateToken = token || localStorage.getItem('candidateToken');
    return api.get('/candidate-auth/me', {
      headers: candidateToken ? { Authorization: `Bearer ${candidateToken}` } : {},
    });
  },
  submitOnboarding: (formData, token) => {
    const candidateToken = token || localStorage.getItem('candidateToken');
    return api.put('/candidate-auth/onboarding', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(candidateToken ? { Authorization: `Bearer ${candidateToken}` } : {}),
      },
    });
  },
  downloadResume: (token) => {
    const candidateToken = token || localStorage.getItem('candidateToken');
    return api.get('/candidate-auth/resume', {
      responseType: 'blob',
      headers: candidateToken ? { Authorization: `Bearer ${candidateToken}` } : {},
    });
  },
  downloadAtsResume: (token) => {
    const candidateToken = token || localStorage.getItem('candidateToken');
    return api.get('/candidate-auth/ats-resume', {
      responseType: 'blob',
      headers: candidateToken ? { Authorization: `Bearer ${candidateToken}` } : {},
    });
  },
  getApplicationMetrics: (token) => {
    const candidateToken = token || localStorage.getItem('candidateToken');
    return api.get('/candidate-auth/application-metrics', {
      headers: candidateToken ? { Authorization: `Bearer ${candidateToken}` } : {},
    });
  },
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
  getAssignedCandidates: () => api.get('/marketing/assigned-candidates'),
  resendCandidateInvite: (id) => api.post(`/marketing/candidates/${id}/resend-invite`),
  downloadCandidateResume: (id) =>
    api.get(`/marketing/candidates/${id}/resume`, { responseType: 'blob' }),
  uploadCandidateAtsResume: (id, formData) =>
    api.post(`/marketing/candidates/${id}/ats-resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadCandidateAtsResume: (id) =>
    api.get(`/marketing/candidates/${id}/ats-resume`, { responseType: 'blob' }),
  export: (params) => api.get('/marketing/export', { params, responseType: 'blob' }),
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  create: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  clearAll: () => api.delete('/notifications'),
};

export default api;
