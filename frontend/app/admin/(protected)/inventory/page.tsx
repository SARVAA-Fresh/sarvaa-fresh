"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

import { buildAssetUrl, get, patch, post } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type {
  InventoryAdjustmentRequest,
  InventoryItem,
  InventoryListResponse,
  InventoryTransaction,
  InventoryTransactionListResponse,
  InventoryTransactionType,
  StockStatus,
  UpdateInventoryRequest,
} from "@/lib/api/types";

type StatusFilter = "all" | StockStatus;
type DialogMode = "adjust" | "threshold" | "history" | null;

const LIMIT = 10;
const ADJUSTMENT_TYPES: Array<{
  value: InventoryTransactionType;
  label: string;
  hint: string;
}> = [
  { value: "IN", label: "Stock In", hint: "Adds to available stock" },
  { value: "OUT", label: "Stock Out", hint: "Removes from available stock" },
  { value: "PURCHASE", label: "Purchase", hint: "Adds purchased stock" },
  { value: "DAMAGE", label: "Damage", hint: "Removes damaged stock" },
  { value: "RETURN", label: "Return", hint: "Adds returned stock" },
  { value: "ADJUSTMENT", label: "Manual Adjustment", hint: "Signed correction" },
];

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.length > 0 ? error.messages.join(" ") : "Something went wrong.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatWeight(value: string | null): string {
  if (!value) return "";
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number.toString() : value;
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-4 w-4 border-2" : "h-10 w-10 border-4";
  return (
    <span className={cn(sizeClasses, "inline-block animate-spin rounded-full border-zinc-200 border-t-emerald-600")} role="status" aria-label="Loading" />
  );
}

function Icon({ name, className }: { name: "box" | "plus" | "history" | "edit" | "x" | "alert" | "check" | "image"; className?: string }) {
  const common = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className, "aria-hidden": true };
  return (
    <svg {...common}>
      {name === "box" && <><path d="M20 7 12 3 4 7l8 4 8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></>}
      {name === "plus" && <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
      {name === "history" && <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></>}
      {name === "edit" && <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>}
      {name === "x" && <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
      {name === "alert" && <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>}
      {name === "check" && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>}
      {name === "image" && <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>}
    </svg>
  );
}

function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", status === "IN_STOCK" && "bg-emerald-50 text-emerald-800", status === "LOW_STOCK" && "bg-amber-50 text-amber-800", status === "OUT_OF_STOCK" && "bg-red-50 text-red-700")}>
      {formatStatus(status)}
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
      <div className={cn("relative my-auto w-full rounded-2xl border border-zinc-200 bg-white shadow-lg", wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ProductImage({ item }: { item: InventoryItem }) {
  const src = buildAssetUrl(item.variant.product?.imageUrl);
  if (!src) {
    return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400"><Icon name="image" className="h-5 w-5" /></span>;
  }
  return <img src={src} alt={item.variant.product?.name ?? item.variant.variantName} className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover" />;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const initial =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("stockStatus");
    return initial === "IN_STOCK" || initial === "LOW_STOCK" || initial === "OUT_OF_STOCK"
      ? initial
      : "all";
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [adjustType, setAdjustType] = useState<InventoryTransactionType>("IN");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [threshold, setThreshold] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(0);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);

  const fetchInventory = useCallback(async (requestId: number, targetPage: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    const params = new URLSearchParams({ page: String(targetPage), limit: String(LIMIT), sortBy: "updatedAt", sortOrder: "desc" });
    if (statusFilter !== "all") params.set("stockStatus", statusFilter);
    try {
      const data = await get<InventoryListResponse>(`/inventory?${params.toString()}`);
      if (requestIdRef.current !== requestId) return;
      setItems(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(extractErrorMessage(error));
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [statusFilter]);

  const triggerFetch = useCallback((targetPage: number) => {
    const requestId = ++requestIdRef.current;
    void fetchInventory(requestId, targetPage);
  }, [fetchInventory]);

  useEffect(() => {
    triggerFetch(page);
  }, [page, triggerFetch]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  async function fetchHistory(item: InventoryItem, targetPage = 1) {
    setIsHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10", variantId: item.variantId });
      const data = await get<InventoryTransactionListResponse>(`/inventory/transactions?${params.toString()}`);
      setTransactions(data.items);
      setHistoryPage(data.page);
      setHistoryTotalPages(data.totalPages);
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function openAdjust(item: InventoryItem) {
    setSelectedItem(item);
    setDialogMode("adjust");
    setAdjustType("IN");
    setQuantity("");
    setReason("");
    setFormError(null);
  }

  function openThreshold(item: InventoryItem) {
    setSelectedItem(item);
    setDialogMode("threshold");
    setThreshold(String(item.lowStockThreshold));
    setFormError(null);
  }

  function openHistory(item: InventoryItem) {
    setSelectedItem(item);
    setDialogMode("history");
    setFormError(null);
    void fetchHistory(item, 1);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedItem(null);
    setFormError(null);
  }

  async function submitAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem || isSubmitting) return;
    const numericQuantity = Number.parseInt(quantity, 10);
    if (!Number.isInteger(numericQuantity) || numericQuantity === 0) {
      setFormError("Quantity must be a non-zero integer.");
      return;
    }
    if (adjustType !== "ADJUSTMENT" && numericQuantity < 0) {
      setFormError("Use a positive quantity for this operation.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: InventoryAdjustmentRequest = {
        variantId: selectedItem.variantId,
        quantity: numericQuantity,
        type: adjustType,
        reason: reason.trim() || undefined,
      };
      await post<InventoryItem>("/inventory/adjust", payload);
      setSuccessMessage("Inventory adjusted successfully.");
      closeDialog();
      triggerFetch(page);
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitThreshold(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem || isSubmitting) return;
    const nextThreshold = Number.parseInt(threshold, 10);
    if (!Number.isInteger(nextThreshold) || nextThreshold < 0) {
      setFormError("Threshold must be a non-negative integer.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: UpdateInventoryRequest = { lowStockThreshold: nextThreshold };
      await patch<InventoryItem>(`/inventory/variant/${selectedItem.variantId}`, payload);
      setSuccessMessage("Low-stock threshold updated.");
      closeDialog();
      triggerFetch(page);
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderActions(item: InventoryItem) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openAdjust(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"><Icon name="plus" className="h-3.5 w-3.5" />Adjust</button>
        <button type="button" onClick={() => openThreshold(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Icon name="edit" className="h-3.5 w-3.5" />Threshold</button>
        <button type="button" onClick={() => openHistory(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Icon name="history" className="h-3.5 w-3.5" />History</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Icon name="check" className="h-5 w-5 shrink-0" />
          {successMessage}
          <button type="button" onClick={() => setSuccessMessage(null)} className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss"><Icon name="x" className="h-4 w-4" /></button>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Operations</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Inventory</h1>
          <p className="mt-1 text-sm text-zinc-600">Track variant stock, thresholds, and movement history.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as StatusFilter[]).map((value) => (
            <button key={value} type="button" onClick={() => { setStatusFilter(value); setPage(1); }} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", statusFilter === value ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "text-zinc-600 hover:bg-zinc-100")}>
              {value === "all" ? "All" : formatStatus(value)}
            </button>
          ))}
          {statusFilter !== "all" && <button type="button" onClick={() => { setStatusFilter("all"); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Reset</button>}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16"><Spinner /><p className="mt-4 text-sm text-zinc-600">Loading inventory...</p></div>
        ) : errorMessage ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="alert" className="h-6 w-6" /></div>
            <h2 className="text-lg font-semibold text-zinc-900">Could not load inventory</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">{errorMessage}</p>
            <button type="button" onClick={() => triggerFetch(page)} className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 shadow-sm"><Icon name="box" className="h-6 w-6" /></span>
            <h2 className="text-lg font-semibold text-zinc-900">{statusFilter === "all" ? "No inventory records" : "No matching inventory"}</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">Variants create inventory automatically when products are set up.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Variant</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">Reserved</th><th className="px-5 py-3">Threshold</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><ProductImage item={item} /><div><p className="font-semibold text-zinc-900">{item.variant.product?.name ?? "Unknown product"}</p><p className="text-xs text-zinc-500">{item.variant.product?.category?.name ?? "Uncategorized"}</p></div></div></td>
                      <td className="px-5 py-3 text-zinc-600"><span className="font-medium text-zinc-800">{item.variant.variantName}</span><span className="block text-xs text-zinc-500">SKU {item.variant.sku} | {item.variant.unit}{item.variant.weight ? ` | ${formatWeight(item.variant.weight)}` : ""}</span></td>
                      <td className="px-5 py-3 text-lg font-bold text-zinc-900">{item.availableStock}</td>
                      <td className="px-5 py-3 font-semibold text-zinc-700">{item.reservedStock}</td>
                      <td className="px-5 py-3 text-zinc-700">{item.lowStockThreshold}</td>
                      <td className="px-5 py-3"><StockBadge status={item.stockStatus} /></td>
                      <td className="px-5 py-3">{renderActions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-100 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex gap-3">
                    <ProductImage item={item} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-zinc-900">{item.variant.product?.name ?? "Unknown product"}</p><p className="text-xs text-zinc-500">{item.variant.variantName} | SKU {item.variant.sku}</p></div><StockBadge status={item.stockStatus} /></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-zinc-50 p-3 text-center"><div><p className="text-lg font-bold text-zinc-900">{item.availableStock}</p><p className="text-[11px] text-zinc-500">Available</p></div><div><p className="text-lg font-bold text-zinc-900">{item.reservedStock}</p><p className="text-[11px] text-zinc-500">Reserved</p></div><div><p className="text-lg font-bold text-zinc-900">{item.lowStockThreshold}</p><p className="text-[11px] text-zinc-500">Low</p></div></div>
                      <div className="mt-3">{renderActions(item)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">Showing {items.length} of {total} inventory records</p>
                <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">Previous</button><span className="text-sm text-zinc-600">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">Next</button></div>
              </div>
            )}
          </>
        )}
      </section>

      {dialogMode === "adjust" && selectedItem && (
        <Modal title="Adjust stock" onClose={closeDialog}>
          <form onSubmit={submitAdjustment} className="space-y-4">
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">Current: <strong>{selectedItem.availableStock}</strong> available, <strong>{selectedItem.reservedStock}</strong> reserved</div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Operation</label><select value={adjustType} onChange={(e) => setAdjustType(e.target.value as InventoryTransactionType)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">{ADJUSTMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label} - {type.hint}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Quantity</label><input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder={adjustType === "ADJUSTMENT" ? "Use positive or negative" : "Positive quantity"} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Reason</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={closeDialog} disabled={isSubmitting} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800">Cancel</button><button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting && <Spinner size="sm" />}Save adjustment</button></div>
          </form>
        </Modal>
      )}

      {dialogMode === "threshold" && selectedItem && (
        <Modal title="Edit low-stock threshold" onClose={closeDialog}>
          <form onSubmit={submitThreshold} className="space-y-4">
            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <p className="text-sm text-zinc-600">{selectedItem.variant.product?.name} / {selectedItem.variant.variantName}</p>
            <div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Low-stock threshold</label><input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" min={0} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={closeDialog} disabled={isSubmitting} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800">Cancel</button><button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting && <Spinner size="sm" />}Save threshold</button></div>
          </form>
        </Modal>
      )}

      {dialogMode === "history" && selectedItem && (
        <Modal title="Transaction history" onClose={closeDialog} wide>
          {formError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          {isHistoryLoading ? <div className="py-10 text-center"><Spinner /><p className="mt-3 text-sm text-zinc-600">Loading history...</p></div> : transactions.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">No transactions for this variant yet.</p> : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-zinc-900">{formatStatus(transaction.type)}</p><p className="text-xs text-zinc-500">{formatDate(transaction.createdAt)}</p></div><span className={cn("text-sm font-bold", transaction.quantityChange >= 0 ? "text-emerald-700" : "text-red-700")}>{transaction.quantityChange >= 0 ? "+" : ""}{transaction.quantityChange}</span></div>
                  <p className="mt-2 text-sm text-zinc-600">After: {transaction.availableStockAfter} available, {transaction.reservedStockAfter} reserved</p>
                  {transaction.reason && <p className="mt-1 text-sm text-zinc-500">{transaction.reason}</p>}
                </div>
              ))}
              {historyTotalPages > 1 && <div className="flex items-center justify-end gap-2 pt-2"><button type="button" onClick={() => selectedItem && void fetchHistory(selectedItem, Math.max(1, historyPage - 1))} disabled={historyPage <= 1} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button><span className="text-sm text-zinc-600">Page {historyPage} of {historyTotalPages}</span><button type="button" onClick={() => selectedItem && void fetchHistory(selectedItem, Math.min(historyTotalPages, historyPage + 1))} disabled={historyPage >= historyTotalPages} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button></div>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
