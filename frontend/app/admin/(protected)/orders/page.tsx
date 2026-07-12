"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

import { buildAssetUrl, get, patch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type {
  AdminOrder,
  OrderListResponse,
  OrderStatus,
  Payment,
  PaymentStatus,
  UpdateOrderStatusRequest,
} from "@/lib/api/types";

type ConfirmAction = {
  title: string;
  description: string;
  actionLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
};

const LIMIT = 10;
const ORDER_STATUSES: Array<"all" | OrderStatus> = ["all", "PENDING", "CONFIRMED", "PACKING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const PAYMENT_STATUSES: Array<"all" | PaymentStatus> = ["all", "PENDING", "PAYMENT_SUBMITTED", "PAID", "FAILED"];
const TRANSITIONS: Partial<Record<OrderStatus, Array<{ status: OrderStatus; label: string; danger?: boolean }>>> = {
  PENDING: [{ status: "CONFIRMED", label: "Confirm Order" }, { status: "CANCELLED", label: "Cancel Order", danger: true }],
  CONFIRMED: [{ status: "PACKING", label: "Start Packing" }, { status: "CANCELLED", label: "Cancel Order", danger: true }],
  PACKING: [{ status: "OUT_FOR_DELIVERY", label: "Out for Delivery" }, { status: "CANCELLED", label: "Cancel Order", danger: true }],
  OUT_FOR_DELIVERY: [{ status: "DELIVERED", label: "Mark Delivered" }],
};

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.messages.length > 0 ? error.messages.join(" ") : "Something went wrong.";
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatMoney(value: string | number): string {
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return `Rs. ${Number.isFinite(number) ? number.toFixed(2) : "0.00"}`;
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-4 w-4 border-2" : "h-10 w-10 border-4";
  return <span className={cn(sizeClasses, "inline-block animate-spin rounded-full border-zinc-200 border-t-emerald-600")} role="status" aria-label="Loading" />;
}

function Icon({ name, className }: { name: "orders" | "search" | "x" | "alert" | "check" | "eye"; className?: string }) {
  const common = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className, "aria-hidden": true };
  return (
    <svg {...common}>
      {name === "orders" && <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>}
      {name === "search" && <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>}
      {name === "x" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
      {name === "alert" && <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
      {name === "check" && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>}
      {name === "eye" && <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  );
}

function StatusBadge({ status, kind }: { status: string; kind: "order" | "payment" }) {
  const paid = status === "PAID" || status === "DELIVERED";
  const warn = status === "PENDING" || status === "PAYMENT_SUBMITTED" || status === "PACKING" || status === "OUT_FOR_DELIVERY";
  const bad = status === "FAILED" || status === "CANCELLED";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", paid && "bg-emerald-50 text-emerald-800", warn && (kind === "payment" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"), bad && "bg-red-50 text-red-700", !paid && !warn && !bad && "bg-zinc-100 text-zinc-700")}>
      {formatLabel(status)}
    </span>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative my-auto w-full rounded-2xl border border-zinc-200 bg-white shadow-lg", wide ? "max-w-5xl" : "max-w-lg")}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-zinc-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100" aria-label="Close"><Icon name="x" className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>(() => {
    const initial =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("status");
    return ORDER_STATUSES.includes(initial as "all" | OrderStatus)
      ? (initial as "all" | OrderStatus)
      : "all";
  });
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentStatus>("all");
  const [orderNumberInput, setOrderNumberInput] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [mobileInput, setMobileInput] = useState<string>("");
  const [customerMobile, setCustomerMobile] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [proofPreview, setProofPreview] = useState<Payment | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const orderSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = statusFilter !== "all" || paymentFilter !== "all" || orderNumber || customerMobile;

  const fetchOrders = useCallback(async (requestId: number, targetPage: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    const params = new URLSearchParams({ page: String(targetPage), limit: String(LIMIT) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (customerMobile.trim()) params.set("customerMobile", customerMobile.trim());
    try {
      const data = await get<OrderListResponse>(`/admin/orders?${params.toString()}`);
      if (requestIdRef.current !== requestId) return;
      setOrders(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(extractErrorMessage(error));
      setOrders([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [customerMobile, orderNumber, paymentFilter, statusFilter]);

  const triggerFetch = useCallback((targetPage: number) => {
    const requestId = ++requestIdRef.current;
    void fetchOrders(requestId, targetPage);
  }, [fetchOrders]);

  useEffect(() => {
    triggerFetch(page);
  }, [page, triggerFetch]);

  useEffect(() => {
    if (orderSearchRef.current) clearTimeout(orderSearchRef.current);
    orderSearchRef.current = setTimeout(() => { setOrderNumber(orderNumberInput); setPage(1); }, 300);
    return () => { if (orderSearchRef.current) clearTimeout(orderSearchRef.current); };
  }, [orderNumberInput]);

  useEffect(() => {
    if (mobileSearchRef.current) clearTimeout(mobileSearchRef.current);
    mobileSearchRef.current = setTimeout(() => { setCustomerMobile(mobileInput); setPage(1); }, 300);
    return () => { if (mobileSearchRef.current) clearTimeout(mobileSearchRef.current); };
  }, [mobileInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  async function openDetail(order: AdminOrder) {
    setSelectedOrder(order);
    setIsDetailLoading(true);
    setDetailError(null);
    setRemarks("");
    try {
      const detail = await get<AdminOrder>(`/admin/orders/${order.id}`);
      setSelectedOrder(detail);
    } catch (error) {
      setDetailError(extractErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function refreshDetail(orderId: string) {
    const detail = await get<AdminOrder>(`/admin/orders/${orderId}`);
    setSelectedOrder(detail);
    setOrders((current) => current.map((order) => (order.id === detail.id ? detail : order)));
  }

  function closeDetail() {
    setSelectedOrder(null);
    setDetailError(null);
    setRemarks("");
  }

  function clearFilters() {
    setStatusFilter("all");
    setPaymentFilter("all");
    setOrderNumberInput("");
    setOrderNumber("");
    setMobileInput("");
    setCustomerMobile("");
    setPage(1);
  }

  function requestStatus(order: AdminOrder, status: OrderStatus, label: string, danger?: boolean) {
    if (status === "CANCELLED") {
      setConfirmAction({
        title: "Cancel order",
        description: `Cancel order ${order.orderNumber}? Reserved stock will be released.`,
        actionLabel: "Cancel order",
        danger: true,
        onConfirm: async () => {
          await patch<AdminOrder>(`/admin/orders/${order.id}/cancel`, {});
          setSuccessMessage("Order cancelled.");
          await refreshDetail(order.id);
          triggerFetch(page);
        },
      });
      return;
    }
    setConfirmAction({
      title: label,
      description: `Move order ${order.orderNumber} to ${formatLabel(status)}?`,
      actionLabel: label,
      danger,
      onConfirm: async () => {
        const payload: UpdateOrderStatusRequest = { status, remarks: remarks.trim() || undefined };
        await patch<AdminOrder>(`/admin/orders/${order.id}/status`, payload);
        setSuccessMessage("Order status updated.");
        setRemarks("");
        await refreshDetail(order.id);
        triggerFetch(page);
      },
    });
  }

  function requestPayment(order: AdminOrder, action: "paid" | "reject") {
    setConfirmAction({
      title: action === "paid" ? "Verify payment" : "Reject payment",
      description: action === "paid" ? `Mark payment for ${order.orderNumber} as paid?` : `Reject submitted payment for ${order.orderNumber}?`,
      actionLabel: action === "paid" ? "Mark paid" : "Reject payment",
      danger: action === "reject",
      onConfirm: async () => {
        const endpoint = action === "paid" ? "mark-paid" : "reject";
        await patch<Payment>(`/admin/payments/order/${order.id}/${endpoint}`, {});
        setSuccessMessage(action === "paid" ? "Payment marked paid." : "Payment rejected.");
        await refreshDetail(order.id);
        triggerFetch(page);
      },
    });
  }

  async function runConfirm() {
    if (!confirmAction || isMutating) return;
    setIsMutating(true);
    setDetailError(null);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } catch (error) {
      setDetailError(extractErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  function paymentActions(order: AdminOrder) {
    const payment = order.payments?.[0];
    if (!payment) return null;
    if (payment.paymentStatus === "PAID" || payment.paymentStatus === "FAILED") return null;
    if (payment.paymentMethod === "COD" && payment.paymentStatus === "PENDING") {
      return <button type="button" onClick={() => requestPayment(order, "paid")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Mark Paid</button>;
    }
    if (payment.paymentMethod === "UPI" && payment.paymentStatus === "PAYMENT_SUBMITTED") {
      return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => requestPayment(order, "paid")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Verify Payment</button><button type="button" onClick={() => requestPayment(order, "reject")} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">Reject Payment</button></div>;
    }
    return null;
  }

  function itemCount(order: AdminOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  function paymentProofUrl(payment: Payment): string | null {
    return buildAssetUrl(payment.paymentProofUrl) ?? payment.paymentProofUrl;
  }

  return (
    <div className="space-y-6">
      {successMessage && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Icon name="check" className="h-5 w-5 shrink-0" />{successMessage}<button type="button" onClick={() => setSuccessMessage(null)} className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss"><Icon name="x" className="h-4 w-4" /></button></div>}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Operations</p><h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Orders</h1><p className="mt-1 text-sm text-zinc-600">Review, process, cancel, and verify payment for customer orders.</p></div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon name="search" className="h-4 w-4 text-zinc-400" /></span><input value={orderNumberInput} onChange={(e) => setOrderNumberInput(e.target.value)} placeholder="Order number" className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></div>
          <div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon name="search" className="h-4 w-4 text-zinc-400" /></span><input value={mobileInput} onChange={(e) => setMobileInput(e.target.value)} placeholder="Customer mobile" className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as "all" | OrderStatus); setPage(1); }} className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"><option value="all">All order statuses</option>{ORDER_STATUSES.filter((s) => s !== "all").map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select>
          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as "all" | PaymentStatus); setPage(1); }} className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"><option value="all">All payment statuses</option>{PAYMENT_STATUSES.filter((s) => s !== "all").map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select>
        </div>
        {hasFilters && <button type="button" onClick={clearFilters} className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Clear filters</button>}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading ? <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16"><Spinner /><p className="mt-4 text-sm text-zinc-600">Loading orders...</p></div> : errorMessage ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="alert" className="h-6 w-6" /></div><h2 className="text-lg font-semibold text-zinc-900">Could not load orders</h2><p className="mt-2 max-w-md text-sm text-zinc-600">{errorMessage}</p><button type="button" onClick={() => triggerFetch(page)} className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Retry</button></div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 shadow-sm"><Icon name="orders" className="h-6 w-6" /></span><h2 className="text-lg font-semibold text-zinc-900">{hasFilters ? "No matching orders" : "No orders yet"}</h2><p className="mt-2 max-w-md text-sm text-zinc-600">{hasFilters ? "Try changing filters or search terms." : "New customer orders will appear here."}</p></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((order) => <tr key={order.id} className="hover:bg-zinc-50/60"><td className="px-5 py-3"><p className="font-semibold text-zinc-900">{order.orderNumber}</p><p className="text-xs text-zinc-500">{formatDate(order.createdAt)}</p></td><td className="px-5 py-3"><p className="font-medium text-zinc-800">{order.user?.fullName ?? "Customer"}</p><p className="text-xs text-zinc-500">{order.user?.mobile ?? "-"}</p></td><td className="px-5 py-3 text-zinc-700">{itemCount(order)}</td><td className="px-5 py-3 font-semibold text-zinc-900">{formatMoney(order.totalAmount)}</td><td className="px-5 py-3"><StatusBadge status={order.currentStatus} kind="order" /></td><td className="px-5 py-3"><StatusBadge status={order.paymentStatus} kind="payment" /></td><td className="px-5 py-3 text-right"><button type="button" onClick={() => void openDetail(order)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Icon name="eye" className="h-3.5 w-3.5" />View</button></td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-100 md:hidden">
              {orders.map((order) => <div key={order.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-zinc-900">{order.orderNumber}</p><p className="text-xs text-zinc-500">{formatDate(order.createdAt)}</p></div><StatusBadge status={order.currentStatus} kind="order" /></div><div className="mt-3 rounded-lg bg-zinc-50 p-3"><p className="font-medium text-zinc-800">{order.user?.fullName ?? "Customer"} | {order.user?.mobile ?? "-"}</p><p className="mt-1 text-sm font-semibold text-zinc-900">{formatMoney(order.totalAmount)} <span className="font-normal text-zinc-500">/ {itemCount(order)} items</span></p><div className="mt-2"><StatusBadge status={order.paymentStatus} kind="payment" /></div></div><button type="button" onClick={() => void openDetail(order)} className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700">View detail</button></div>)}
            </div>
            {totalPages > 1 && <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-zinc-500">Showing {orders.length} of {total} orders</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button><span className="text-sm text-zinc-600">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button></div></div>}
          </>
        )}
      </section>

      {selectedOrder && (
        <Modal title={`Order ${selectedOrder.orderNumber}`} onClose={closeDetail} wide>
          {isDetailLoading ? <div className="py-12 text-center"><Spinner /><p className="mt-3 text-sm text-zinc-600">Loading order detail...</p></div> : (
            <div className="space-y-5">
              {detailError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{detailError}</p>}
              <div className="grid gap-4 lg:grid-cols-3">
                <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Order</h3><div className="mt-3 space-y-2 text-sm"><p><strong>Status:</strong> <StatusBadge status={selectedOrder.currentStatus} kind="order" /></p><p><strong>Payment:</strong> <StatusBadge status={selectedOrder.paymentStatus} kind="payment" /></p><p><strong>Created:</strong> {formatDate(selectedOrder.createdAt)}</p></div></section>
                <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Customer</h3><div className="mt-3 space-y-1 text-sm text-zinc-700"><p>{selectedOrder.user?.fullName ?? selectedOrder.deliveryName ?? "Customer"}</p><p>{selectedOrder.user?.mobile ?? selectedOrder.deliveryPhone ?? "-"}</p><p>{selectedOrder.user?.email ?? "-"}</p>{selectedOrder.notes && <p className="pt-2 text-xs"><strong>Remarks:</strong> {selectedOrder.notes}</p>}</div></section>
                <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Delivery</h3><div className="mt-3 space-y-1 text-sm text-zinc-700"><p>{selectedOrder.deliveryName ?? "-"}</p><p>{selectedOrder.deliveryPhone ?? "-"}</p><p>{selectedOrder.deliveryAddress ?? "-"}</p><p>{[selectedOrder.deliveryCity, selectedOrder.deliveryState, selectedOrder.deliveryPincode].filter(Boolean).join(", ") || "-"}</p></div></section>
              </div>

              <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Items</h3><div className="mt-3 divide-y divide-zinc-100">{selectedOrder.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-zinc-900">{item.productNameSnapshot}</p><p className="text-xs text-zinc-500">Qty {item.quantity} x {formatMoney(item.unitPrice)}</p></div><p className="font-semibold text-zinc-900">{formatMoney(item.totalPrice)}</p></div>)}</div></section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Pricing</h3><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(selectedOrder.subtotal)}</strong></div><div className="flex justify-between"><span>Delivery fee</span><strong>{formatMoney(selectedOrder.deliveryFee)}</strong></div><div className="flex justify-between border-t border-zinc-200 pt-2 text-base"><span>Total</span><strong>{formatMoney(selectedOrder.totalAmount)}</strong></div></div></section>
                <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Payment</h3>{selectedOrder.payments && selectedOrder.payments.length > 0 ? <div className="mt-3 space-y-3 text-sm text-zinc-700">{selectedOrder.payments.map((payment) => {
                  const proofUrl = paymentProofUrl(payment);
                  return (
                    <div key={payment.id} className="rounded-lg bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-3"><div><p><strong>{formatLabel(payment.paymentMethod)}</strong> / <StatusBadge status={payment.paymentStatus} kind="payment" /></p><p className="mt-1">Amount {formatMoney(payment.amount)}</p>{payment.transactionReference && <p>UTR / Ref {payment.transactionReference}</p>}<p className="text-xs text-zinc-500">Created {formatDate(payment.createdAt)}</p>{payment.paymentProofUrl && <p className="text-xs text-zinc-500">Proof uploaded {formatDate(payment.updatedAt)}</p>}{payment.verifiedAt && <p className="text-xs text-zinc-500">Verified {formatDate(payment.verifiedAt)}</p>}</div></div>
                      {proofUrl ? (
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                          <button type="button" onClick={() => setProofPreview(payment)} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white text-left">
                            <img src={proofUrl} alt={`Payment proof for ${selectedOrder.orderNumber}`} className="aspect-video w-full max-w-[220px] object-cover transition-transform group-hover:scale-[1.02]" />
                          </button>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setProofPreview(payment)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Preview proof</button>
                            <a href={proofUrl} download target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Download</a>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">No proof uploaded.</p>
                      )}
                    </div>
                  );
                })}<div className="pt-2">{paymentActions(selectedOrder)}</div></div> : <p className="mt-3 text-sm text-zinc-600">No payment record found.</p>}</section>
              </div>

              <section className="rounded-xl border border-zinc-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-semibold text-zinc-900">Operational actions</h3><p className="mt-1 text-xs text-zinc-500">Only valid transitions for the current status are shown.</p></div><div className="flex flex-wrap gap-2">{(TRANSITIONS[selectedOrder.currentStatus] ?? []).map((transition) => <button key={transition.status} type="button" onClick={() => requestStatus(selectedOrder, transition.status, transition.label, transition.danger)} className={cn("rounded-lg px-3 py-2 text-sm font-semibold text-white", transition.danger ? "bg-red-700 hover:bg-red-800" : "bg-emerald-700 hover:bg-emerald-800")}>{transition.label}</button>)}</div></div>{(TRANSITIONS[selectedOrder.currentStatus] ?? []).length > 0 && <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional remarks" className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />}</section>

              <section className="rounded-xl border border-zinc-200 p-4"><h3 className="text-sm font-semibold text-zinc-900">Status history</h3>{selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? <div className="mt-3 space-y-3">{selectedOrder.statusHistory.map((entry) => <div key={entry.id} className="rounded-lg bg-zinc-50 p-3 text-sm"><div className="flex items-center justify-between gap-3"><StatusBadge status={entry.status} kind="order" /><span className="text-xs text-zinc-500">{formatDate(entry.createdAt)}</span></div>{entry.remarks && <p className="mt-2 text-zinc-600">{entry.remarks}</p>}</div>)}</div> : <p className="mt-3 text-sm text-zinc-600">No status history yet.</p>}</section>
            </div>
          )}
        </Modal>
      )}

      {confirmAction && (
        <Modal title={confirmAction.title} onClose={() => setConfirmAction(null)}>
          <div className="space-y-4"><p className="text-sm text-zinc-600">{confirmAction.description}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setConfirmAction(null)} disabled={isMutating} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50">Cancel</button><button type="button" onClick={() => void runConfirm()} disabled={isMutating} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50", confirmAction.danger ? "bg-red-700 hover:bg-red-800" : "bg-emerald-700 hover:bg-emerald-800")}>{isMutating && <Spinner size="sm" />}{isMutating ? "Working..." : confirmAction.actionLabel}</button></div></div>
        </Modal>
      )}

      {proofPreview && paymentProofUrl(proofPreview) && (
        <Modal title="Payment proof" onClose={() => setProofPreview(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div><p className="font-semibold text-zinc-900">{formatLabel(proofPreview.paymentMethod)} payment</p><p className="text-zinc-600">{formatMoney(proofPreview.amount)} / {formatLabel(proofPreview.paymentStatus)}</p></div>
              <a href={paymentProofUrl(proofPreview)!} download target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Download proof</a>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <img src={paymentProofUrl(proofPreview)!} alt="Payment proof full preview" className="max-h-[70vh] w-full object-contain" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
