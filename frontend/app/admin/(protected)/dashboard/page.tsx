"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

type MetricAccent = "emerald" | "amber" | "sky" | "zinc";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: MetricAccent;
  icon?: React.ReactNode;
  attention?: boolean;
}

const ACCENT_TEXT: Record<MetricAccent, string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  sky: "text-sky-700",
  zinc: "text-zinc-900",
};

const ACCENT_BG: Record<MetricAccent, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  sky: "bg-sky-50 text-sky-700",
  zinc: "bg-zinc-100 text-zinc-700",
};

function MetricCard({
  label,
  value,
  hint,
  accent = "zinc",
  icon,
  attention = false,
}: MetricCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition-shadow sm:p-6 ${
        attention
          ? "border-amber-200 ring-1 ring-amber-100"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_BG[accent]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${ACCENT_TEXT[accent]}`}
      >
        {value}
      </p>
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            attention ? "font-medium text-amber-700" : "text-zinc-500"
          }`}
        >
          {hint}
        </p>
      )}
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

function formatRevenue(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return "₹0.00";
  }
  return `₹${numeric.toFixed(2)}`;
}

function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function CategoriesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function StockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function RevenueIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);
  const { admin } = useAuth();

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

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
  const lowStockAttention = counts.lowStockVariants > 0;
  const firstName = admin?.fullName.split(/\s+/).filter(Boolean)[0] ?? "";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative hidden h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:flex">
            <Image
              src="/sarvaa-fresh-logo-v2.png"
              alt="SARVAA Fresh logo"
              width={1254}
              height={1254}
              sizes="56px"
              className="h-14 w-14 object-contain"
              priority
            />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Snapshot of your store activity for today.
            </p>
          </div>
        </div>
      </header>

      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <MetricCard
          label="Active Products"
          value={String(counts.activeProducts)}
          accent="emerald"
          icon={<ProductsIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Active Categories"
          value={String(counts.activeCategories)}
          accent="sky"
          icon={<CategoriesIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Low Stock Variants"
          value={String(counts.lowStockVariants)}
          accent={lowStockAttention ? "amber" : "zinc"}
          icon={<StockIcon className="h-5 w-5" />}
          hint={
            lowStockAttention
              ? "Needs attention"
              : "Inventory is healthy"
          }
          attention={lowStockAttention}
        />
        <MetricCard
          label="Orders Today"
          value={String(ordersToday.count)}
          accent="zinc"
          icon={<OrdersIcon className="h-5 w-5" />}
        />
        <MetricCard
          label="Revenue Today"
          value={formatRevenue(ordersToday.revenue)}
          accent="emerald"
          icon={<RevenueIcon className="h-5 w-5" />}
        />
      </section>

      <section
        aria-label="Operational shortcuts"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Link
          href="/admin/inventory?stockStatus=LOW_STOCK"
          className="rounded-2xl border border-amber-200 bg-white p-4 text-sm font-semibold text-amber-800 shadow-sm transition-colors hover:bg-amber-50"
        >
          Review low-stock inventory
        </Link>
        <Link
          href="/admin/orders?status=PENDING"
          className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50"
        >
          Review pending orders
        </Link>
      </section>

      <section
        aria-label="Orders by status"
        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Orders by Status
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Count of all active orders grouped by their current status.
            </p>
          </div>
        </div>

        {statusEntries.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm">
              <InboxIcon className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-zinc-700">
              No orders yet
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              New orders will appear here as they come in.
            </p>
          </div>
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
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
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
