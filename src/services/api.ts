// ============================================================
// WAYTERO PARTNER PORTAL — AXIOS API CLIENT
// Auto token refresh + centralized error handling
// ============================================================
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
export const TOKEN_KEYS = { ACCESS: "pp_access_token", REFRESH: "pp_refresh_token" };

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    // 403 = token valid but forbidden — also clear session (shouldn't happen for partners)
    if (error.response?.status === 403) { clearSession(); return Promise.reject(error); }

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
      if (!refreshToken) { clearSession(); return Promise.reject(error); }

      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => { original.headers["Authorization"] = `Bearer ${token}`; return apiClient(original); });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        const newToken: string = res.data.access_token;
        localStorage.setItem(TOKEN_KEYS.ACCESS, newToken);
        processQueue(null, newToken);
        original.headers["Authorization"] = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

// Callback registered by authStore to reset in-memory Zustand state synchronously.
// This prevents the brief window where RequireAuth still sees isAuthenticated=true
// after token expiry (Zustand persist hydrates from localStorage on page load, but the
// in-memory store isn't updated until React re-renders after a full page reload).
let _onSessionCleared: (() => void) | null = null;
export function registerSessionClearedCallback(cb: () => void) {
  _onSessionCleared = cb;
}

export function clearSession(redirect?: string) {
  // 1. Reset in-memory Zustand state immediately (synchronous, prevents route flicker)
  if (_onSessionCleared) _onSessionCleared();
  // 2. Clear tokens from localStorage
  Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
  // 3. Clear Zustand persisted auth store so isAuthenticated=false on next page load
  try {
    const stored = localStorage.getItem("pp_auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state) {
        parsed.state.isAuthenticated = false;
        parsed.state.user = null;
        parsed.state.mustChangePassword = false;
        localStorage.setItem("pp_auth", JSON.stringify(parsed));
      }
    }
  } catch { /* ignore */ }
  // 4. Redirect (skip when already on the login page to avoid a reload loop)
  const target = redirect || "/login";
  if (window.location.pathname !== "/login") {
    window.location.href = target;
  }
}

export default apiClient;
