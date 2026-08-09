"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ApiError } from "@/lib/api/types";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Something went wrong.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function isValidRedirectPath(path: string): boolean {
  if (!path.startsWith("/")) {
    return false;
  }
  if (path.startsWith("//")) {
    return false;
  }
  const lower = path.toLowerCase();
  return !(
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("http:") ||
    lower.startsWith("https:")
  );
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
      role="status"
      aria-label="Loading"
    />
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isAuthenticated } = useCustomerAuth();
  const modeParam = searchParams.get("mode");
  const rawNext = searchParams.get("next") || "/";
  const nextPath = isValidRedirectPath(rawNext) ? rawNext : "/";
  const [mode, setMode] = useState<"login" | "register">(
    modeParam === "register" ? "register" : "login",
  );
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, router]);

  const title = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your account"),
    [mode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(mobile.trim(), password);
      } else {
        await register({
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          email: email.trim() || undefined,
          password,
        });
      }
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(extractMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-4xl items-center gap-6 lg:grid-cols-[1fr_420px]">
      <section className="rounded-[28px] border border-emerald-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          SARVAA Fresh
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          {title}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-600">
          Sign in to keep your cart, checkout, addresses, and order history in
          one place.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-emerald-700 text-white"
                : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              mode === "register"
                ? "bg-emerald-700 text-white"
                : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            Create account
          </button>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-4">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {mode === "register" && (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
          )}

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Mobile</span>
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              inputMode="numeric"
              required
              className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>

          {mode === "register" && (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Email (optional)
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
          )}

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSubmitting && <Spinner />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="text-center text-sm text-zinc-600">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <div className="flex justify-center gap-4 text-sm">
            <Link href="/" className="text-emerald-700 hover:text-emerald-800">
              Home
            </Link>
            <Link
              href="/products"
              className="text-emerald-700 hover:text-emerald-800"
            >
              Products
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid min-h-[70vh] max-w-4xl items-center gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[28px] border border-emerald-100 bg-white p-8 shadow-sm" />
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm" />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
