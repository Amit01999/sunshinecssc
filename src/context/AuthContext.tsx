import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken, onAuthFailure, getErrorMessage } from "@/lib/api";

function isTransportError(err: unknown): boolean {
  // No response at all (offline, timeout, DNS, a slow cold start) - not the server telling us
  // the session is invalid, so it must never be treated the same as a real rejection.
  return axios.isAxiosError(err) && !err.response;
}

export type Role = "super_admin" | "admin" | "academic_admin" | "teacher" | "staff" | "student" | "parent";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  profile: Record<string, unknown> | null;
  children?: Record<string, unknown>[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  activeChildId: string | null;
  setActiveChildId: (id: string) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    const res = await api.get("/auth/me");
    const me = res.data.data as AuthUser;
    setUser(me);
    if (me.children?.length) {
      setActiveChildId((prev) => prev ?? String((me.children![0] as { _id: string })._id));
    }
    return me;
  }, []);

  useEffect(() => {
    // One bounded retry, only for a genuine transport failure - a dropped connection or a slow
    // cold start must not cost someone their session the way an actually-expired/revoked refresh
    // token should. Any real rejection from the server (401, etc.) fails immediately, no retry.
    async function restoreSession(attempt = 1): Promise<void> {
      try {
        const res = await api.post("/auth/refresh");
        setAccessToken(res.data.data.accessToken);
        await fetchMe();
      } catch (err) {
        if (isTransportError(err) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return restoreSession(attempt + 1);
        }
        setAccessToken(null);
        setUser(null);
      }
    }

    restoreSession().finally(() => setIsLoading(false));
  }, [fetchMe]);

  // A background refresh (triggered by a 401 on some unrelated request) can fail after this
  // provider already rendered a logged-in session. If the server genuinely rejected it, bring
  // `user` back in sync rather than leaving the UI looking authenticated while every request
  // silently fails from here on.
  useEffect(() => {
    return onAuthFailure(() => {
      setUser(null);
      setActiveChildId(null);
      queryClient.clear();
    });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/auth/login", { email, password });
      setAccessToken(res.data.data.accessToken);
      // Wipe any cached queries from a previous session on this tab before the new user's
      // dashboard mounts - otherwise stale data (e.g. another student's attendance%) can
      // flash, or persist, under keys that don't vary by identity (like ["my-notices"]).
      queryClient.clear();
      const me = res.data.data.user as AuthUser;
      setUser(me);
      // Always set explicitly (never leave the previous account's selection in place) - a
      // parent with no children must never inherit a prior session's activeChildId.
      setActiveChildId(me.children?.length ? String((me.children[0] as { _id: string })._id) : null);
      return me;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      setActiveChildId(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, activeChildId, setActiveChildId, login, logout, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { getErrorMessage };
