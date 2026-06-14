import axios from 'axios';

const DEFAULT_LOCAL_API_URL = 'http://localhost:5001';
const PRODUCTION_API_URL = 'https://crm-production-0b91.up.railway.app';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_LOCAL_API_URL : PRODUCTION_API_URL;
  }

  return DEFAULT_LOCAL_API_URL;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const authTipo = localStorage.getItem('auth_tipo');
          const refreshUrl = authTipo === 'platform'
            ? '/api/v1/core/super-admin/refresh'
            : '/api/v1/core/usuarios/refresh';
          const response = await api.post(refreshUrl, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });

          const { access_token } = response.data;
          localStorage.setItem('token', access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch {
        const authTipo = typeof window !== 'undefined' ? localStorage.getItem('auth_tipo') : null;
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_tipo');
        if (typeof window !== 'undefined') {
          window.location.href = authTipo === 'platform' ? '/super-admin/login' : '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
