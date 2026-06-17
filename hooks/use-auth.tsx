"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { MOCK_SESSION_RESPONSE } from "@/lib/auth/config";
import { isAuthDisabled } from "@/lib/auth/disabled";
import { fetchSession, type SessionResponse } from "@/lib/api/client";

const PUBLIC_PATHS = ["/login", "/unauthorized"];

type AuthState = {
  session: SessionResponse | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authOff = isAuthDisabled();
  const [session, setSession] = useState<SessionResponse | null>(
    authOff ? MOCK_SESSION_RESPONSE : null
  );
  const [loading, setLoading] = useState(!authOff);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let data: SessionResponse | null = null;
      for (let i = 0; i < 3; i++) {
        data = await fetchSession();
        if (data) break;
        if (i < 2) await new Promise((r) => setTimeout(r, 300));
      }
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthDisabled()) {
      setSession(MOCK_SESSION_RESPONSE);
      setLoading(false);
      return;
    }
    if (PUBLIC_PATHS.includes(pathname)) {
      setSession(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [pathname, refresh]);

  return (
    <AuthContext.Provider value={{ session, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
