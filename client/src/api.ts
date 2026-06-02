import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AuthSession } from './types';

export const sessionStorageKey = 'school-intranet-session';
const REQUEST_TIMEOUT_MS = 30000;
const NETWORK_ERROR_MESSAGE = 'Sin conexión al servidor. Verifica tu conexión a internet.';
const SERVICE_UNAVAILABLE_MESSAGE = 'El servidor no está disponible temporalmente. Intenta de nuevo en unos minutos.';
const REQUEST_TIMEOUT_MESSAGE = 'La solicitud tardó demasiado. Intenta de nuevo.';

type ApiRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _timeoutId?: ReturnType<typeof setTimeout>;
  _timedOut?: boolean;
};

function isNotificationStream(url?: string) {
  return Boolean(url?.includes('/notifications/stream'));
}

function clearRequestTimeout(config?: ApiRequestConfig) {
  if (config?._timeoutId) {
    clearTimeout(config._timeoutId);
    delete config._timeoutId;
  }
}

function isFetchNetworkTypeError(error: unknown) {
  if (!(error instanceof TypeError)) return false;
  const message = error.message.toLowerCase();
  return message.includes('fetch') || message.includes('network');
}

export function getAccessToken() {
  const raw = localStorage.getItem(sessionStorageKey);
  if (!raw) return null;
  return (JSON.parse(raw) as AuthSession).accessToken;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: REQUEST_TIMEOUT_MS
});

api.interceptors.request.use((config) => {
  const requestConfig = config as ApiRequestConfig;
  const accessToken = getAccessToken();
  if (accessToken) {
    requestConfig.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (isNotificationStream(requestConfig.url)) {
    requestConfig.timeout = 0;
  } else if (!requestConfig.signal) {
    const controller = new AbortController();
    requestConfig._timeoutId = setTimeout(() => {
      requestConfig._timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    requestConfig.signal = controller.signal;
  }
  return requestConfig;
});

api.interceptors.response.use(
  (response) => {
    clearRequestTimeout(response.config as ApiRequestConfig);
    return response;
  },
  async (error) => {
    const original = error.config as ApiRequestConfig | undefined;
    clearRequestTimeout(original);
    const raw = localStorage.getItem(sessionStorageKey);
    if (error.response?.status === 401 && raw && original && !original._retry) {
      original._retry = true;
      const current = JSON.parse(raw) as AuthSession;
      try {
        const { data } = await axios.post<AuthSession>('/api/auth/refresh', { refreshToken: current.refreshToken });
        const nextSession = { ...current, ...data };
        localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
        original.headers.Authorization = `Bearer ${nextSession.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem(sessionStorageKey);
        window.dispatchEvent(new CustomEvent('school-session-expired'));
      }
    }
    if (original?._timedOut || error.response?.status === 408 || error.code === 'ECONNABORTED') {
      return Promise.reject(new Error(REQUEST_TIMEOUT_MESSAGE));
    }
    if (error.response?.status === 503) {
      return Promise.reject(new Error(SERVICE_UNAVAILABLE_MESSAGE));
    }
    if (isFetchNetworkTypeError(error) || isFetchNetworkTypeError(error?.cause) || error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error(NETWORK_ERROR_MESSAGE));
    }
    return Promise.reject(error);
  }
);

export * from './api/auth.api';
export * from './api/grades.api';
export * from './api/attendance.api';
export * from './api/communications.api';
export * from './api/requests.api';
export * from './api/admin.api';
export * from './api/schedule.api';
