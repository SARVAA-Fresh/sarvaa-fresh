export const CUSTOMER_TOKEN_KEY = "sarvaa-customer-token";

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCustomerToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures so login can still complete in memory.
  }
}

export function removeCustomerToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}
