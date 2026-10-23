import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// AuthContext owns `user`, this module owns `accessToken` - they're deliberately separate
// (avoids a circular import), but that means a background refresh failure here wouldn't
// otherwise be reflected in `user`, leaving the UI looking logged in while every request
// silently 401s. AuthContext subscribes to this to resync itself when a refresh is genuinely
// rejected by the server (not just a dropped connection) - never for a transient network error.
type AuthFailureListener = () => void;
let authFailureListeners: AuthFailureListener[] = [];
export function onAuthFailure(listener: AuthFailureListener) {
  authFailureListeners.push(listener);
  return () => {
    authFailureListeners = authFailureListeners.filter((l) => l !== listener);
  };
}

api.interceptors.request.use((config) => {
  // "/public" endpoints (notices, events, etc.) must render identically for every visitor.
  // Without this, a still-logged-in admin browsing the public marketing site gets a different,
  // role-filtered response than an anonymous visitor would - e.g. a "students only" notice would
  // show for the admin and then vanish the moment their in-memory token is gone (a hard reload).
  const isPublicEndpoint = config.url?.endsWith("/public");
  if (accessToken && !isPublicEndpoint) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string | null> | null = null;

// Exported only so tests can drive this directly (e.g. firing several "concurrent" calls and
// asserting exactly one network request happened) - every real caller still goes through the
// response interceptor below.
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data?.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch((err) => {
        setAccessToken(null);
        // A real response (e.g. 401 "session no longer valid") means the server genuinely
        // rejected the refresh - sync the rest of the app to logged-out. No response at all
        // (offline, timeout, a slow cold start) is a transport failure, not a verdict on the
        // session, so it's left alone: this one request fails, but nothing forces a logout.
        if (axios.isAxiosError(err) && err.response) {
          authFailureListeners.forEach((l) => l());
        }
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthRoute = config?.url?.includes("/auth/login") || config?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && config && !config._retried && !isAuthRoute) {
      config._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { path: string; message: string }[] } | undefined;
    if (data?.errors?.length) {
      return data.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join("; ");
    }
    return data?.message ?? fallback;
  }
  return fallback;
}
