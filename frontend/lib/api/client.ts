import { ApiError, type ApiErrorResponse, type ApiResponse } from "@/lib/api/types";
import { getAdminToken, removeAdminToken } from "@/lib/auth/storage";
import {
  getCustomerToken,
  removeCustomerToken,
} from "@/lib/customer-auth/storage";

const DEFAULT_BASE_URL = "http://localhost:3001/api/v1";

function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
}

function normalizeMessages(message: string | string[] | undefined): string[] {
  if (Array.isArray(message)) {
    return message.filter((m) => typeof m === "string" && m.length > 0);
  }
  if (typeof message === "string" && message.length > 0) {
    return [message];
  }
  return ["Request failed"];
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function buildHeaders(init: HeadersInit, includeJsonContentType: boolean): Headers {
  const headers = new Headers(init);
  if (includeJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = getBaseUrl().replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

type AuthScope = "admin" | "customer";
type RequestOptions = { skipAuth?: boolean; authScope?: AuthScope };

export function buildApiUrl(path: string): string {
  return buildUrl(path);
}

export function buildAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return path;
  }
  const apiUrl = new URL(getBaseUrl());
  const origin = `${apiUrl.protocol}//${apiUrl.host}`;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${suffix}`;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path);
  const headers = buildHeaders(
    {},
    method === "POST" || method === "PATCH",
  );

  if (!options.skipAuth) {
    const token =
      options.authScope === "customer"
        ? getCustomerToken()
        : getAdminToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method === "POST" || method === "PATCH") {
    init.body = body === undefined ? "{}" : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      ["Network error. Please check your connection and try again."],
      "NetworkError",
      "Network error. Please check your connection and try again.",
    );
  }
  const payload = await parseJsonSafely(response);

  if (response.status === 401) {
    if (!options.skipAuth) {
      if (options.authScope === "customer") {
        removeCustomerToken();
      } else {
        removeAdminToken();
      }
    }
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorResponse>;
    const messages = normalizeMessages(errorPayload.message);
    const errorName =
      typeof errorPayload.error === "string" && errorPayload.error.length > 0
        ? errorPayload.error
        : response.statusText || "Error";
    throw new ApiError(
      response.status,
      messages,
      errorName,
      messages[0] ?? errorName,
    );
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const wrapped = payload as ApiResponse<T>;
    return wrapped.data;
  }

  return payload as T;
}

export function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

export function post<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("POST", path, body, options);
}

export function patch<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PATCH", path, body, options);
}

export async function postForm<T>(
  path: string,
  formData: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const headers = buildHeaders({}, false);

  if (!options.skipAuth) {
    const token =
      options.authScope === "customer"
        ? getCustomerToken()
        : getAdminToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: formData,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      ["Network error. Please check your connection and try again."],
      "NetworkError",
      "Network error. Please check your connection and try again.",
    );
  }

  const payload = await parseJsonSafely(response);

  if (response.status === 401) {
    if (!options.skipAuth) {
      if (options.authScope === "customer") {
        removeCustomerToken();
      } else {
        removeAdminToken();
      }
    }
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorResponse>;
    const messages = normalizeMessages(errorPayload.message);
    const errorName =
      typeof errorPayload.error === "string" && errorPayload.error.length > 0
        ? errorPayload.error
        : response.statusText || "Error";
    throw new ApiError(
      response.status,
      messages,
      errorName,
      messages[0] ?? errorName,
    );
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const wrapped = payload as ApiResponse<T>;
    return wrapped.data;
  }

  return payload as T;
}

/**
 * Exported as `deleteRequest` because `delete` is a reserved word in JavaScript.
 * Consumers can alias the import to `delete` for ergonomics, e.g.:
 *   import { deleteRequest as del } from "@/lib/api/client";
 */
export function deleteRequest<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("DELETE", path, undefined, options);
}
