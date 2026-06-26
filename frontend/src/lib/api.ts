import axios from 'axios';

const DEFAULT_LOCAL_API_URL = 'http://localhost:5001';
const PRODUCTION_API_URL = 'https://api.douglasgermano.com';

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

// Chave não sensível usada apenas para escolher a tela de login no redirect.
const SCOPE_KEY = 'auth_scope';
const REFRESH_URL = '/api/v1/core/auth/refresh';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envia/recebe cookies httpOnly de sessão
});

function lerCookie(nome: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const METODOS_MUTANTES = ['post', 'put', 'patch', 'delete'];

// Request interceptor — anexa o token CSRF (double-submit) nas requisições mutantes.
api.interceptors.request.use((config) => {
  const metodo = (config.method || 'get').toLowerCase();
  if (METODOS_MUTANTES.includes(metodo)) {
    const ehRefresh = (config.url || '').includes('/auth/refresh');
    const csrf = lerCookie(ehRefresh ? 'csrf_refresh_token' : 'csrf_access_token');
    if (csrf) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-TOKEN'] = csrf;
    }
  }
  return config;
});

let encerrandoSessao = false;

const redirecionarLogin = () => {
  if (typeof window === 'undefined' || encerrandoSessao) return;
  encerrandoSessao = true;
  const scope = localStorage.getItem(SCOPE_KEY);
  localStorage.removeItem(SCOPE_KEY);
  const destino = scope === 'platform' ? '/super-admin/login' : '/login';
  if (!window.location.pathname.startsWith(destino)) {
    window.location.href = destino;
  }
};

// Response interceptor — em 401, tenta um refresh único; se falhar, vai para o login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url || '';

    // Falha no próprio refresh → encerra (evita loop)
    if (status === 401 && url.includes('/auth/refresh')) {
      redirecionarLogin();
      return Promise.reject(error);
    }

    // Não tenta refrescar em rotas públicas de login
    const ehLogin = url.includes('/login');

    if (status === 401 && original && !original._retry && !ehLogin) {
      original._retry = true;
      try {
        await api.post(REFRESH_URL);
        return api(original); // cookie de access renovado automaticamente
      } catch (refreshError) {
        redirecionarLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
