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
  CustomerLoginResponseData,
  CustomerProfile,
  CustomerRegisterRequest,
} from "@/lib/api/types";
import {
  getCustomerToken,
  removeCustomerToken,
  setCustomerToken,
} from "@/lib/customer-auth/storage";

export interface CustomerAuthValue {
  customer: CustomerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  register: (payload: CustomerRegisterRequest) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthValue | undefined>(
  undefined,
);

export function useCustomerAuth(): CustomerAuthValue {
  const value = useContext(CustomerAuthContext);
  if (!value) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return value;
}

export function CustomerAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
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
      const token = getCustomerToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const me = await get<CustomerProfile>("/auth/me", {
          authScope: "customer",
        });
        if (!cancelled) setCustomer(me);
      } catch {
        if (!cancelled) {
          removeCustomerToken();
          setCustomer(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (mobile: string, password: string) => {
    const data = await post<CustomerLoginResponseData>(
      "/auth/login",
      { mobile, password },
      { skipAuth: true },
    );
    if (!mountedRef.current) return;
    setCustomerToken(data.access_token);
    setCustomer(data.user);
  }, []);

  const register = useCallback(async (payload: CustomerRegisterRequest) => {
    await post("/auth/register", payload, { skipAuth: true });
    await login(payload.mobile, payload.password);
  }, [login]);

  const logout = useCallback(() => {
    removeCustomerToken();
    setCustomer(null);
  }, []);

  const value = useMemo<CustomerAuthValue>(
    () => ({
      customer,
      isLoading,
      isAuthenticated: customer !== null,
      login,
      register,
      logout,
    }),
    [customer, isLoading, login, register, logout],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}
