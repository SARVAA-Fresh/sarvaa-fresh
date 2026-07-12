"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { CustomerOrderListResponse } from "@/lib/api/types";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Unable to load orders.";
  }
  if (error instanceof Error) return error.message;
  return "Unable to load orders.";
}

function formatMoney(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrdersPage() {
  const { isAuthenticated } = useCustomerAuth();
  const [data, setData] = useState<CustomerOrderListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await get<CustomerOrderListResponse>("/orders?page=1&limit=20", {
          authScope: "customer",
        });
        if (cancelled) return;
        setData(response);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(extractMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, reloadToken]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Sign in to view orders
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Order history is tied to your account.
        </p>
        <Link
          href="/auth?next=/orders"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <header className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Orders
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
          My orders
        </h1>
      </header>

      {isLoading ? (
        <div className="rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
          Loading orders...
        </div>
      ) : errorMessage ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Retry
          </button>
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-950">No orders yet</p>
          <p className="mt-2 text-sm text-zinc-600">
            When you place your first order, it will appear here.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.items.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-bold text-zinc-950">
                    {formatMoney(order.totalAmount)}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {formatLabel(order.currentStatus)} | {formatLabel(order.paymentStatus)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
