"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "amber" | "sky" | "zinc";
}

function MetricCard({ label, value, hint, accent = "zinc" }: MetricCardProps) {
  const accentClasses: Record<NonNullable<MetricCardProps["accent"]>, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
    zinc: "text-zinc-900",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${accentClasses[accent]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-5 w-5 border-2" : "h-10 w-10 border-4";
  return (
    <div
      className={`${sizeClasses} mx-auto animate-spin rounded-full border-zinc-200 border-t-emerald-600`}
      role="status"
      aria-label="Loading"
    />
  );
}

function CenteredMessage({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  const extractErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      return error.messages.length > 0
        ? error.messages.join(" ")
        : "Unable to load dashboard.";
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Unable to load dashboard.";
  };

  const runFetch = useCallback(async (requestId: number): Promise<void> => {
    try {
      const data = await get<DashboardSummary>("/admin/dashboard/summary");
      if (requestIdRef.current !== requestId) {
        return;
      }
      setSummary(data);
      setErrorMessage(null);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setErrorMessage(extractErrorMessage(error));
      setSummary(null);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    void runFetch(requestId);
  }, [runFetch]);

  const handleRetry = useCallback((): void => {
    setIsLoading(true);
    setErrorMessage(null);
    const requestId = ++requestIdRef.current;
    void runFetch(requestId);
  }, [runFetch]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-sm text-zinc-600">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <CenteredMessage
        title="Could not load dashboard"
        description={errorMessage}
        action={
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          >
            Retry
          </button>
        }
      />
    );
  }

  if (!summary) {
    return null;
  }

  const { counts, ordersToday, ordersByStatus } = summary;
  const statusEntries = Object.entries(ordersByStatus);
  const revenueDisplay = `₹${ordersToday.revenue}`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Snapshot of your store activity for today.
        </p>
      </header>

      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <MetricCard
          label="Active Products"
          value={String(counts.activeProducts)}
          accent="emerald"
        />
        <MetricCard
          label="Active Categories"
          value={String(counts.activeCategories)}
          accent="sky"
        />
        <MetricCard
          label="Low Stock Variants"
          value={String(counts.lowStockVariants)}
          accent={counts.lowStockVariants > 0 ? "amber" : "zinc"}
          hint={
            counts.lowStockVariants > 0
              ? "Needs attention"
              : "Inventory is healthy"
          }
        />
        <MetricCard
          label="Orders Today"
          value={String(ordersToday.count)}
          accent="zinc"
        />
        <MetricCard
          label="Revenue Today"
          value={revenueDisplay}
          accent="emerald"
        />
      </section>

      <section
        aria-label="Orders by status"
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-base font-semibold text-zinc-900">
          Orders by Status
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Count of today&apos;s orders grouped by their current status.
        </p>

        {statusEntries.length === 0 ? (
          <p className="mt-6 rounded-lg bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No orders
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {statusEntries.map(([status, value]) => (
              <li
                key={status}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="font-medium text-zinc-700">
                  {formatStatusLabel(status)}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {String(value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
