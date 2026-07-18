"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { get } from "@/lib/api/client";
import type { PublicSettings } from "@/lib/api/types";
import { useCart } from "@/lib/cart/CartProvider";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";
import {
  calculateDeliveryPolicy,
  normalizeSettings,
  storeStatusMessage,
} from "@/lib/settings/settings";

function formatMoney(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function Icon({
  name,
  className,
}: {
  name: "cart" | "arrow" | "trash";
  className?: string;
}) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  return (
    <svg {...common}>
      {name === "cart" && (
        <>
          <circle cx="9" cy="20" r="1.25" />
          <circle cx="17" cy="20" r="1.25" />
          <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6" />
        </>
      )}
      {name === "arrow" && (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      )}
      {name === "trash" && (
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      )}
    </svg>
  );
}

export default function CartPage() {
  const { lines, subtotal, itemCount, setQuantity, removeLine, clearCart } =
    useCart();
  const { isAuthenticated } = useCustomerAuth();
  const [settings, setSettings] = useState<PublicSettings>(() =>
    normalizeSettings(null),
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      try {
        const data = await get<PublicSettings>("/settings/public", {
          skipAuth: true,
        });
        if (!cancelled) setSettings(normalizeSettings(data));
      } catch {
        if (!cancelled) setSettings(normalizeSettings(null));
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const policy = calculateDeliveryPolicy(subtotal, settings);
  const statusMessage = storeStatusMessage(settings);
  const total = subtotal + policy.deliveryCharge;
  const checkoutDisabled = policy.checkoutDisabled || lines.length === 0;

  return (
    <div className="space-y-6 pb-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Your cart
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
            {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart is empty"}
          </h1>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          <Icon name="arrow" className="h-4 w-4" />
          Continue shopping
        </Link>
      </header>

      {lines.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Icon name="cart" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-zinc-950">
            Nothing in the cart yet
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Browse the catalog and add a variant when you&apos;re ready.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-3">
            {lines.map((line) => (
              <article
                key={line.key}
                className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-zinc-950">
                      {line.product.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {line.variant.variantName} | SKU {line.variant.sku}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {line.variant.unit}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-zinc-950">
                      {formatMoney(Number.parseFloat(line.variant.price) * line.quantity)}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatMoney(line.variant.price)} each
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variant.id, line.quantity - 1)}
                      className="h-9 w-9 rounded-full text-zinc-600 hover:bg-white"
                    >
                      -
                    </button>
                    <span className="min-w-10 px-3 text-center text-sm font-semibold text-zinc-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.variant.id, line.quantity + 1)}
                      className="h-9 w-9 rounded-full text-zinc-600 hover:bg-white"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(line.variant.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Order summary
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                Ready to checkout
              </h2>
            </div>

            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Items</span>
                <span className="font-medium text-zinc-950">{itemCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-medium text-zinc-950">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Delivery</span>
                <span className="font-medium text-zinc-950">
                  {policy.deliveryCharge > 0 ? formatMoney(policy.deliveryCharge) : "FREE"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                <span className="font-semibold text-zinc-700">Total</span>
                <span className="font-bold text-zinc-950">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {statusMessage ?? policy.message}
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Clear cart
            </button>

            {checkoutDisabled ? (
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-zinc-300 px-4 py-3 text-sm font-semibold text-white"
              >
                Checkout unavailable
              </button>
            ) : (
              <Link
                href={isAuthenticated ? "/checkout" : "/auth?next=/checkout"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Proceed to checkout
              </Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
