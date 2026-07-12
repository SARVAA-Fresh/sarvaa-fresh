"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ApiError } from "@/lib/api/types";
import { buildAssetUrl, get, patch, postForm } from "@/lib/api/client";
import type { CustomerOrder, Payment } from "@/lib/api/types";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";

function formatMoney(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Something went wrong.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600"
      role="status"
      aria-label="Loading"
    />
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated } = useCustomerAuth();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofSuccess, setProofSuccess] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [orderResult, paymentResult] = await Promise.allSettled([
          get<CustomerOrder>(`/orders/${params.id}`, {
            authScope: "customer",
          }),
          get<Payment>(`/payments/order/${params.id}`, {
            authScope: "customer",
          }),
        ]);
        if (cancelled) return;
        if (orderResult.status === "rejected") {
          setErrorMessage(extractMessage(orderResult.reason));
          return;
        }
        setOrder(orderResult.value);
        if (paymentResult.status === "fulfilled") {
          setPayment(paymentResult.value);
        } else {
          setPayment(null);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(extractMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (params.id) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [params.id, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const paymentSource = payment ?? order?.payments?.[0] ?? null;
  const latestStatus = useMemo(
    () => order?.statusHistory?.[0] ?? null,
    [order?.statusHistory],
  );
  const canCancel = order ? ["PENDING", "CONFIRMED", "PACKING"].includes(order.currentStatus) : false;

  async function handleUploadProof() {
    if (!paymentSource || !proofFile) {
      setProofError("Choose a proof image first.");
      return;
    }
    setIsUploadingProof(true);
    setProofError(null);
    try {
      const formData = new FormData();
      formData.set("proof", proofFile);
      const updated = await postForm<Payment>(
        `/payments/order/${paymentSource.orderId}/proof`,
        formData,
        { authScope: "customer" },
      );
      setPayment(updated);
      setProofSuccess("Proof uploaded. Verification is in progress.");
    } catch (error) {
      setProofError(extractMessage(error));
    } finally {
      setIsUploadingProof(false);
    }
  }

  async function handleCancelOrder() {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    setCancelMessage(null);
    setErrorMessage(null);
    try {
      const updated = await patch<CustomerOrder>(
        `/orders/${order.id}/cancel`,
        {},
        { authScope: "customer" },
      );
      setOrder(updated);
      setCancelMessage("Order cancelled and reserved stock released.");
    } catch (error) {
      setCancelMessage(extractMessage(error));
    } finally {
      setIsCancelling(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
          Sign in to view this order
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Order details are available after authentication.
        </p>
        <Link
          href={`/auth?next=/orders/${params.id}`}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="mx-auto max-w-xl rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-950">Order not found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {errorMessage ?? "This order may have been removed or is unavailable."}
        </p>
        <Link
          href="/orders"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/orders" className="text-sm font-semibold text-emerald-700">
          Back to orders
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          Continue shopping
        </Link>
      </div>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Order
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
          {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {latestStatus
            ? `Last updated ${new Date(latestStatus.createdAt).toLocaleString()}`
            : "Order details"}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-950">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-zinc-950">
                      {item.productNameSnapshot}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Qty {item.quantity} | {formatMoney(item.unitPrice)} each
                    </p>
                  </div>
                  <p className="font-semibold text-zinc-950">
                    {formatMoney(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {paymentSource?.paymentMethod === "UPI" && (
            <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-zinc-950">
                Payment proof
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Upload a receipt image if verification is still pending.
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (proofPreview) URL.revokeObjectURL(proofPreview);
                    setProofFile(file);
                    setProofPreview(file ? URL.createObjectURL(file) : null);
                    setProofError(null);
                    setProofSuccess(null);
                  }}
                  className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700"
                />
                {proofPreview && (
                <img
                  src={proofPreview}
                  alt="Payment proof preview"
                  className="aspect-video w-full rounded-2xl border border-zinc-200 object-cover"
                />
                )}
                {proofError && (
                  <p className="text-sm text-red-700">{proofError}</p>
                )}
                {proofSuccess && (
                  <p className="text-sm text-emerald-700">{proofSuccess}</p>
                )}
                <button
                  type="button"
                  onClick={() => void handleUploadProof()}
                  disabled={isUploadingProof || !proofFile}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isUploadingProof ? <Spinner /> : null}
                  {isUploadingProof ? "Uploading..." : "Upload proof"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-950">Status history</h2>
            <div className="mt-4 space-y-3">
              {order.statusHistory?.length ? (
                order.statusHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <p className="font-semibold text-zinc-950">{entry.remarks ?? formatLabel(entry.status)}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    {entry.remarks && entry.remarks !== entry.status && (
                      <p className="mt-1 text-sm text-zinc-600">{formatLabel(entry.status)}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No status updates yet.</p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Summary
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Status</span>
                <span className="font-semibold text-zinc-950">
                  {formatLabel(order.currentStatus)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Payment</span>
                <span className="font-semibold text-zinc-950">
                  {formatLabel(paymentSource?.paymentStatus ?? order.paymentStatus)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Total</span>
                <span className="text-base font-semibold text-zinc-950">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4 text-sm">
            <p className="font-semibold text-zinc-950">Delivery address</p>
            <p className="mt-1 text-zinc-600">{order.deliveryName}</p>
            <p className="mt-1 text-zinc-600">{order.deliveryPhone}</p>
            <p className="mt-1 text-zinc-600">{order.deliveryAddress}</p>
            <p className="mt-1 text-zinc-600">
              {order.deliveryCity}, {order.deliveryState} {order.deliveryPincode}
            </p>
          </div>

          {paymentSource && (
            <div className="rounded-2xl border border-zinc-200 p-4 text-sm">
              <p className="font-semibold text-zinc-950">Payment</p>
              <p className="mt-1 text-zinc-600">Method: {formatLabel(paymentSource.paymentMethod)}</p>
              <p className="mt-1 text-zinc-600">
                Status: {formatLabel(paymentSource.paymentStatus)}
              </p>
              {paymentSource.paymentProofUrl && (
                <a
                  href={buildAssetUrl(paymentSource.paymentProofUrl) ?? paymentSource.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-emerald-700 hover:text-emerald-800"
                >
                  View proof
                </a>
              )}
            </div>
          )}

          {cancelMessage && (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${order.currentStatus === "CANCELLED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              {cancelMessage}
            </div>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => void handleCancelOrder()}
              disabled={isCancelling}
              className="inline-flex w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? "Cancelling..." : "Cancel order"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
