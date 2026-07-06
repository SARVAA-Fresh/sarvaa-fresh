/**
 * Browser storage helpers for the admin auth token.
 * All accessors are SSR-safe: they no-op when `window` / `localStorage`
 * are not available.
 */

export const ADMIN_TOKEN_KEY = "sarvaa-admin-token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Storage may be disabled (private mode, quota). Fail silently — the
    // caller will re-throw on the next API call if auth is required.
  }
}

export function removeAdminToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Ignore — see setAdminToken.
  }
}
