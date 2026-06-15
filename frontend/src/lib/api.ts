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

const isRefreshUrl = (url?: string) => !!url && url.includes('/refresh');

// Guarda para garantir que o encerramento de sessão (e o redirect) rode UMA vez.
// Sem isso, a falha de refresh dispara limparSessao 2x e a 2ª chamada (já com
// auth_tipo removido) sobrescreve o destino, mandando o Super Admin para /login.
let encerrandoSessao = false;

const limparSessao = () => {
  if (typeof window === 'undefined' || encerrandoSessao) return;
  encerrandoSessao = true;

  const authTipo = localStorage.getItem('auth_tipo');
  const destino = authTipo === 'platform' ? '/super-admin/login' : '/login';

  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_tipo');
  localStorage.removeItem('workspace_nome');
  localStorage.removeItem('impersonacao');
  localStorage.removeItem('plat_token');
  localStorage.removeItem('plat_refresh');

  // Evita loop de redirecionamento se já estamos na tela de login
  if (!window.location.pathname.startsWith(destino)) {
    window.location.href = destino;
  }
};

// Response interceptor - handle 401 and refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Se a PRÓPRIA chamada de refresh falhou (401/403), não tente refrescar de novo:
    // encerra a sessão. Isso elimina o loop infinito de /refresh.
    if ((status === 401 || status === 403) && isRefreshUrl(originalRequest?.url)) {
      limparSessao();
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (!refreshToken) {
        limparSessao();
        return Promise.reject(error);
      }

      try {
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
      } catch (refreshError) {
        limparSessao();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
