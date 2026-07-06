"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { get, post } from "@/lib/api/client";
import type {
  Admin,
  LoginRequest,
  LoginResponseData,
} from "@/lib/api/types";
import {
  getAdminToken,
  removeAdminToken,
  setAdminToken,
} from "@/lib/auth/storage";

export interface AuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getAdminToken();
      if (!token) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await get<Admin>("/admin/auth/me");
        if (!cancelled) {
          setAdmin(me);
        }
      } catch {
        // 401 already clears the token in the client. For any other error
        // we also clear so we don't loop with a known-bad token.
        if (!cancelled) {
          removeAdminToken();
          setAdmin(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const payload: LoginRequest = { email, password };
      const data = await post<LoginResponseData>(
        "/admin/auth/login",
        payload,
        { skipAuth: true },
      );
      if (!mountedRef.current) {
        return;
      }
      setAdminToken(data.accessToken);
      setAdmin(data.admin);
    },
    [],
  );

  const logout = useCallback((): void => {
    removeAdminToken();
    setAdmin(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: admin !== null,
      login,
      logout,
    }),
    [admin, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
