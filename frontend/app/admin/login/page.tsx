"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isAuthLoading) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      router.replace("/admin/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600" />
          <p className="text-sm text-zinc-600">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            SARVAA Fresh
          </h1>
          <p className="mt-2 text-sm font-medium text-emerald-700">
            Admin Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-zinc-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="admin@sarvaafresh.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isAuthLoading}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Authorized personnel only.
        </p>
      </div>
    </main>
  );
}
