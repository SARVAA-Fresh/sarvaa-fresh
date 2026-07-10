"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildAssetUrl,
  deleteRequest,
  get,
  patch,
  post,
  postForm,
} from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type {
  Category,
  CategoryListResponse,
  CreateProductRequest,
  CreateVariantRequest,
  Product,
  ProductImage,
  ProductListResponse,
  ProductVariant,
  UpdateProductImageRequest,
  UpdateProductRequest,
  UpdateVariantRequest,
} from "@/lib/api/types";

type StatusFilter = "all" | "active" | "inactive";
type ProductMode = "create" | "edit" | null;
type VariantMode = "add" | "edit" | null;
type ConfirmKind = "product" | "variant" | "image";

interface ProductFormState {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
}

interface VariantFormState {
  sku: string;
  variantName: string;
  unit: string;
  price: string;
  mrp: string;
  weight: string;
  isActive: boolean;
  isDefault: boolean;
}

interface SelectedImage {
  file: File;
  previewUrl: string;
}

interface ConfirmationState {
  kind: ConfirmKind;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => Promise<void>;
}

const LIMIT = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INITIAL_PRODUCT_FORM: ProductFormState = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  metaTitle: "",
  metaDescription: "",
  isActive: true,
};
const INITIAL_VARIANT_FORM: VariantFormState = {
  sku: "",
  variantName: "",
  unit: "",
  price: "",
  mrp: "",
  weight: "",
  isActive: true,
  isDefault: true,
};

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.length > 0
      ? error.messages.join(" ")
      : "Something went wrong.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function formatMoney(value: string | number | null | undefined): string {
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function formatDecimal(value: string | null | undefined): string {
  if (!value) return "";
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toString();
}

function firstVariant(product: Product): ProductVariant | null {
  return product.variants[0] ?? null;
}

function primaryImage(product: Product): ProductImage | null {
  return (
    product.images.find((image) => image.isPrimary) ??
    product.images[0] ??
    null
  );
}

function buildProductsQuery(
  page: number,
  search: string,
  categoryId: string,
  statusFilter: StatusFilter,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(LIMIT));
  params.set("sortBy", "updatedAt");
  params.set("sortOrder", "desc");
  if (search.trim()) params.set("search", search.trim());
  if (categoryId) params.set("categoryId", categoryId);
  if (statusFilter === "active") params.set("isActive", "true");
  if (statusFilter === "inactive") params.set("isActive", "false");
  return `?${params.toString()}`;
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "h-4 w-4 border-2" : "h-10 w-10 border-4";
  return (
    <span
      className={cn(
        sizeClasses,
        "inline-block animate-spin rounded-full border-zinc-200 border-t-emerald-600",
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

function Icon({
  name,
  className,
}: {
  name: "search" | "plus" | "edit" | "trash" | "x" | "image" | "alert" | "check" | "box" | "upload";
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
      {name === "search" && (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      )}
      {name === "plus" && (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      )}
      {name === "edit" && (
        <>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
      {name === "x" && (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      )}
      {name === "image" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </>
      )}
      {name === "alert" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </>
      )}
      {name === "check" && (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </>
      )}
      {name === "box" && (
        <>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </>
      )}
      {name === "upload" && (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </>
      )}
    </svg>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-800"
          : "bg-zinc-100 text-zinc-600",
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative my-auto w-full rounded-2xl border border-zinc-200 bg-white shadow-lg",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-3xl",
          size === "xl" && "max-w-5xl",
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-zinc-200 bg-white px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
      />
    </div>
  );
}

function ImageTile({ product }: { product: Product }) {
  const image = primaryImage(product);
  const src = buildAssetUrl(image?.imageUrl ?? product.imageUrl);
  if (!src) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
        <Icon name="image" className="h-5 w-5" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={image?.altText ?? product.name}
      className="h-14 w-14 shrink-0 rounded-xl border border-zinc-200 object-cover"
    />
  );
}

function ProductForm({
  mode,
  form,
  variantForm,
  categories,
  imageSelections,
  imageError,
  isSubmitting,
  error,
  onFormChange,
  onVariantChange,
  onImagesChange,
  onRemoveImage,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  form: ProductFormState;
  variantForm: VariantFormState;
  categories: Category[];
  imageSelections: SelectedImage[];
  imageError: string | null;
  isSubmitting: boolean;
  error: string | null;
  onFormChange: (patchValue: Partial<ProductFormState>) => void;
  onVariantChange: (patchValue: Partial<VariantFormState>) => void;
  onImagesChange: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <section className="rounded-xl border border-zinc-200 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-900">Product information</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="product-name"
            label="Name"
            value={form.name}
            onChange={(value) => onFormChange({ name: value })}
            required
            disabled={isSubmitting}
            placeholder="e.g. Organic Tomato"
          />
          <TextField
            id="product-slug"
            label="Slug"
            value={form.slug}
            onChange={(value) => onFormChange({ slug: value })}
            required
            disabled={isSubmitting}
            placeholder="organic-tomato"
          />
          <div>
            <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="product-category"
              value={form.categoryId}
              onChange={(event) => onFormChange({ categoryId: event.target.value })}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end rounded-lg border border-zinc-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onFormChange({ isActive: event.target.checked })}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30"
            />
            <span className="text-sm font-medium text-zinc-700">Product is active</span>
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="product-description" className="mb-1.5 block text-sm font-medium text-zinc-700">
              Description
            </label>
            <textarea
              id="product-description"
              value={form.description}
              onChange={(event) => onFormChange({ description: event.target.value })}
              disabled={isSubmitting}
              rows={3}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-100"
            />
          </div>
          <TextField
            id="product-meta-title"
            label="Meta title"
            value={form.metaTitle}
            onChange={(value) => onFormChange({ metaTitle: value })}
            disabled={isSubmitting}
          />
          <TextField
            id="product-meta-description"
            label="Meta description"
            value={form.metaDescription}
            onChange={(value) => onFormChange({ metaDescription: value })}
            disabled={isSubmitting}
          />
        </div>
      </section>

      {mode === "create" && (
        <section className="rounded-xl border border-zinc-200 p-4">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900">First variant</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField id="variant-sku" label="SKU" value={variantForm.sku} onChange={(value) => onVariantChange({ sku: value })} required disabled={isSubmitting} />
            <TextField id="variant-name" label="Variant name" value={variantForm.variantName} onChange={(value) => onVariantChange({ variantName: value })} required disabled={isSubmitting} placeholder="500 g pack" />
            <TextField id="variant-unit" label="Unit" value={variantForm.unit} onChange={(value) => onVariantChange({ unit: value })} required disabled={isSubmitting} placeholder="kg, g, pack" />
            <TextField id="variant-price" label="Price" value={variantForm.price} onChange={(value) => onVariantChange({ price: value })} required disabled={isSubmitting} type="number" />
            <TextField id="variant-mrp" label="MRP" value={variantForm.mrp} onChange={(value) => onVariantChange({ mrp: value })} disabled={isSubmitting} type="number" />
            <TextField id="variant-weight" label="Weight" value={variantForm.weight} onChange={(value) => onVariantChange({ weight: value })} disabled={isSubmitting} type="number" />
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5">
              <input type="checkbox" checked={variantForm.isActive} onChange={(event) => onVariantChange({ isActive: event.target.checked })} disabled={isSubmitting} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30" />
              <span className="text-sm font-medium text-zinc-700">Variant is active</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5">
              <input type="checkbox" checked={variantForm.isDefault} onChange={(event) => onVariantChange({ isDefault: event.target.checked })} disabled={isSubmitting} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30" />
              <span className="text-sm font-medium text-zinc-700">Default variant</span>
            </label>
          </div>
        </section>
      )}

      {mode === "create" && (
        <section className="rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Images</h3>
              <p className="mt-1 text-xs text-zinc-500">JPEG, PNG, or WebP. Up to 5 files per upload, 5 MB each.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100">
              <Icon name="upload" className="h-4 w-4" />
              Choose images
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => onImagesChange(event.target.files)} disabled={isSubmitting} />
            </label>
          </div>
          {imageError && <p className="mt-3 text-sm text-red-700">{imageError}</p>}
          {imageSelections.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {imageSelections.map((image, index) => (
                <div key={image.previewUrl} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <img src={image.previewUrl} alt={image.file.name} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => onRemoveImage(index)} disabled={isSubmitting} className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-zinc-700 shadow-sm hover:bg-white" aria-label="Remove image">
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50">
          {isSubmitting && <Spinner size="sm" />}
          {isSubmitting ? "Saving..." : mode === "create" ? "Create product" : "Save product"}
        </button>
      </div>
    </form>
  );
}

function VariantManager({
  product,
  activeVariantId,
  form,
  mode,
  error,
  isSaving,
  onOpenAdd,
  onOpenEdit,
  onCancel,
  onChange,
  onSubmit,
  onDelete,
}: {
  product: Product;
  activeVariantId: string | null;
  form: VariantFormState;
  mode: VariantMode;
  error: string | null;
  isSaving: boolean;
  onOpenAdd: () => void;
  onOpenEdit: (variant: ProductVariant) => void;
  onCancel: () => void;
  onChange: (patchValue: Partial<VariantFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (variant: ProductVariant) => void;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Variants</h3>
          <p className="mt-1 text-xs text-zinc-500">{product.variants.length} variant{product.variants.length === 1 ? "" : "s"} configured</p>
        </div>
        <button type="button" onClick={onOpenAdd} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          <Icon name="plus" className="h-4 w-4" />
          Add variant
        </button>
      </div>

      <div className="space-y-3">
        {product.variants.map((variant) => (
          <div key={variant.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{variant.variantName}</p>
                  {variant.isDefault && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Default</span>}
                  <StatusBadge isActive={variant.isActive} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">SKU {variant.sku} | {variant.unit}{variant.weight ? ` | ${formatDecimal(variant.weight)} weight` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">{formatMoney(variant.price)}</span>
                {variant.mrp && <span className="text-xs text-zinc-500">MRP {formatMoney(variant.mrp)}</span>}
                <button type="button" onClick={() => onOpenEdit(variant)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                  <Icon name="edit" className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(variant)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mode && (
        <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">{mode === "add" ? "Add variant" : "Edit variant"}</h4>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TextField id="variant-edit-sku" label="SKU" value={form.sku} onChange={(value) => onChange({ sku: value })} required disabled={isSaving} />
            <TextField id="variant-edit-name" label="Variant name" value={form.variantName} onChange={(value) => onChange({ variantName: value })} required disabled={isSaving} />
            <TextField id="variant-edit-unit" label="Unit" value={form.unit} onChange={(value) => onChange({ unit: value })} required disabled={isSaving} />
            <TextField id="variant-edit-price" label="Price" value={form.price} onChange={(value) => onChange({ price: value })} required disabled={isSaving} type="number" />
            <TextField id="variant-edit-mrp" label="MRP" value={form.mrp} onChange={(value) => onChange({ mrp: value })} disabled={isSaving} type="number" />
            <TextField id="variant-edit-weight" label="Weight" value={form.weight} onChange={(value) => onChange({ weight: value })} disabled={isSaving} type="number" />
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
              <input type="checkbox" checked={form.isActive} onChange={(event) => onChange({ isActive: event.target.checked })} disabled={isSaving} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30" />
              <span className="text-sm font-medium text-zinc-700">Active</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
              <input type="checkbox" checked={form.isDefault} onChange={(event) => onChange({ isDefault: event.target.checked })} disabled={isSaving} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/30" />
              <span className="text-sm font-medium text-zinc-700">Default</span>
            </label>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving || !activeVariantId && mode === "edit"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {isSaving && <Spinner size="sm" />}
              {isSaving ? "Saving..." : "Save variant"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ImageManager({
  product,
  selections,
  imageError,
  isUploading,
  onImagesChange,
  onRemoveSelected,
  onUpload,
  onSetPrimary,
  onDelete,
}: {
  product: Product;
  selections: SelectedImage[];
  imageError: string | null;
  isUploading: boolean;
  onImagesChange: (files: FileList | null) => void;
  onRemoveSelected: (index: number) => void;
  onUpload: () => void;
  onSetPrimary: (image: ProductImage) => void;
  onDelete: (image: ProductImage) => void;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Images</h3>
          <p className="mt-1 text-xs text-zinc-500">Primary image syncs to the product catalog image.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
            <Icon name="upload" className="h-4 w-4" />
            Choose
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => onImagesChange(event.target.files)} disabled={isUploading} />
          </label>
          <button type="button" onClick={onUpload} disabled={isUploading || selections.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            {isUploading && <Spinner size="sm" />}
            Upload
          </button>
        </div>
      </div>
      {imageError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{imageError}</p>}
      {selections.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {selections.map((image, index) => (
            <div key={image.previewUrl} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <img src={image.previewUrl} alt={image.file.name} className="aspect-square w-full object-cover" />
              <button type="button" onClick={() => onRemoveSelected(index)} disabled={isUploading} className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-zinc-700 shadow-sm hover:bg-white" aria-label="Remove image">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {product.images.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
          <Icon name="image" className="h-7 w-7 text-zinc-400" />
          <p className="mt-2 text-sm font-medium text-zinc-700">No images uploaded</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {product.images.map((image) => {
            const src = buildAssetUrl(image.imageUrl);
            return (
              <div key={image.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {src ? (
                  <img src={src} alt={image.altText ?? product.name} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-zinc-50 text-zinc-400"><Icon name="image" className="h-6 w-6" /></div>
                )}
                <div className="space-y-2 p-2">
                  {image.isPrimary ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">Primary</span>
                  ) : (
                    <button type="button" onClick={() => onSetPrimary(image)} className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50">Set primary</button>
                  )}
                  <button type="button" onClick={() => onDelete(image)} className="w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [productMode, setProductMode] = useState<ProductMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(INITIAL_PRODUCT_FORM);
  const [variantForm, setVariantForm] = useState<VariantFormState>(INITIAL_VARIANT_FORM);
  const [variantMode, setVariantMode] = useState<VariantMode>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isVariantSaving, setIsVariantSaving] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [imageSelections, setImageSelections] = useState<SelectedImage[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const requestIdRef = useRef<number>(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = Boolean(searchQuery || categoryFilter || statusFilter !== "all");

  const clearImageSelections = useCallback(() => {
    setImageSelections((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }, []);

  const fetchProducts = useCallback(async (requestId: number, targetPage: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const query = buildProductsQuery(targetPage, searchQuery, categoryFilter, statusFilter);
      const [productData, categoryData] = await Promise.all([
        get<ProductListResponse>(`/products${query}`),
        get<CategoryListResponse>("/categories?limit=100&isActive=true"),
      ]);
      if (requestIdRef.current !== requestId) return;
      setProducts(productData.items);
      setPage(productData.page);
      setTotalPages(productData.totalPages);
      setTotal(productData.total);
      setCategories(categoryData.items);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(extractErrorMessage(error));
      setProducts([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, statusFilter]);

  const triggerFetch = useCallback((targetPage: number) => {
    const requestId = ++requestIdRef.current;
    void fetchProducts(requestId, targetPage);
  }, [fetchProducts]);

  useEffect(() => {
    triggerFetch(page);
  }, [page, triggerFetch]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => clearImageSelections, [clearImageSelections]);

  function setProductFormPatch(patchValue: Partial<ProductFormState>) {
    setProductForm((current) => {
      const next = { ...current, ...patchValue };
      if (
        productMode === "create" &&
        patchValue.name !== undefined &&
        !slugManuallyEdited
      ) {
        next.slug = generateSlug(patchValue.name);
      }
      if (patchValue.slug !== undefined && productMode === "create") {
        setSlugManuallyEdited(true);
      }
      return next;
    });
  }

  function validateProductForm(includeVariant: boolean): string | null {
    if (!productForm.name.trim()) return "Product name is required.";
    if (!productForm.slug.trim()) return "Slug is required.";
    if (!/^[a-z0-9-]+$/.test(productForm.slug.trim())) {
      return "Slug may only contain lowercase letters, numbers, and hyphens.";
    }
    if (!productForm.categoryId) return "Category is required.";
    if (productForm.name.length > 200 || productForm.slug.length > 200) {
      return "Name and slug must be 200 characters or fewer.";
    }
    if (productForm.description.length > 2000) return "Description must be 2000 characters or fewer.";
    if (productForm.metaTitle.length > 200) return "Meta title must be 200 characters or fewer.";
    if (productForm.metaDescription.length > 500) return "Meta description must be 500 characters or fewer.";
    return includeVariant ? validateVariantForm() : null;
  }

  function validateVariantForm(): string | null {
    if (!variantForm.sku.trim()) return "SKU is required.";
    if (!variantForm.variantName.trim()) return "Variant name is required.";
    if (!variantForm.unit.trim()) return "Unit is required.";
    const price = Number.parseFloat(variantForm.price);
    if (!Number.isFinite(price) || price < 0) return "Price must be a non-negative number.";
    const mrp = variantForm.mrp.trim() ? Number.parseFloat(variantForm.mrp) : null;
    if (mrp !== null && (!Number.isFinite(mrp) || mrp < 0)) return "MRP must be a non-negative number.";
    if (mrp !== null && mrp < price) return "MRP should be greater than or equal to price.";
    const weight = variantForm.weight.trim() ? Number.parseFloat(variantForm.weight) : null;
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) return "Weight must be a non-negative number.";
    return null;
  }

  function variantPayload(): CreateVariantRequest {
    return {
      sku: variantForm.sku.trim(),
      variantName: variantForm.variantName.trim(),
      unit: variantForm.unit.trim(),
      price: Number.parseFloat(variantForm.price),
      mrp: variantForm.mrp.trim() ? Number.parseFloat(variantForm.mrp) : undefined,
      weight: variantForm.weight.trim() ? Number.parseFloat(variantForm.weight) : undefined,
      isActive: variantForm.isActive,
      isDefault: variantForm.isDefault,
    };
  }

  function productPayload(): UpdateProductRequest {
    return {
      categoryId: productForm.categoryId,
      name: productForm.name.trim(),
      slug: productForm.slug.trim(),
      description: productForm.description.trim() || undefined,
      metaTitle: productForm.metaTitle.trim() || undefined,
      metaDescription: productForm.metaDescription.trim() || undefined,
      isActive: productForm.isActive,
    };
  }

  function validateAndAddImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError(null);
    const nextFiles = Array.from(files);
    if (nextFiles.length > 5) {
      setImageError("Upload a maximum of 5 images at a time.");
      return;
    }
    for (const file of nextFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setImageError("Only JPEG, PNG, and WebP images are supported.");
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setImageError(`"${file.name}" is larger than 5 MB.`);
        return;
      }
    }
    clearImageSelections();
    setImageSelections(nextFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
  }

  function removeSelectedImage(index: number) {
    setImageSelections((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function uploadImages(productId: string, files: File[]): Promise<ProductImage[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    return postForm<ProductImage[]>(`/admin/products/${productId}/images`, formData);
  }

  async function refreshProductDetail(productId: string): Promise<Product> {
    const product = await get<Product>(`/products/${productId}`);
    setSelectedProduct(product);
    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...product } : item)));
    return product;
  }

  function openCreate() {
    setProductMode("create");
    setSelectedProduct(null);
    setProductForm({ ...INITIAL_PRODUCT_FORM, categoryId: categories[0]?.id ?? "" });
    setVariantForm(INITIAL_VARIANT_FORM);
    setVariantMode(null);
    setFormError(null);
    setImageError(null);
    setSlugManuallyEdited(false);
    clearImageSelections();
  }

  async function openEdit(product: Product) {
    setProductMode("edit");
    setSelectedProduct(product);
    setFormError(null);
    setVariantError(null);
    setImageError(null);
    setVariantMode(null);
    clearImageSelections();
    try {
      const detail = await get<Product>(`/products/${product.id}`);
      setSelectedProduct(detail);
      setProductForm({
        name: detail.name,
        slug: detail.slug,
        categoryId: detail.categoryId,
        description: detail.description ?? "",
        metaTitle: detail.metaTitle ?? "",
        metaDescription: detail.metaDescription ?? "",
        isActive: detail.isActive,
      });
    } catch (error) {
      setFormError(extractErrorMessage(error));
      setProductForm({
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        description: product.description ?? "",
        metaTitle: product.metaTitle ?? "",
        metaDescription: product.metaDescription ?? "",
        isActive: product.isActive,
      });
    }
  }

  function closeProductModal() {
    setProductMode(null);
    setSelectedProduct(null);
    setFormError(null);
    setVariantError(null);
    setImageError(null);
    setVariantMode(null);
    clearImageSelections();
  }

  async function handleProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productMode || isSubmitting) return;
    const validationError = validateProductForm(productMode === "create");
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (productMode === "create") {
        const payload: CreateProductRequest = {
          ...productPayload(),
          categoryId: productForm.categoryId,
          name: productForm.name.trim(),
          slug: productForm.slug.trim(),
          variants: [variantPayload()],
        };
        const created = await post<Product>("/products", payload);
        if (imageSelections.length > 0) {
          try {
            await uploadImages(created.id, imageSelections.map((image) => image.file));
            setSuccessMessage("Product created successfully with images.");
          } catch (error) {
            setSuccessMessage(`Product created, but image upload failed: ${extractErrorMessage(error)} Open the product to retry images.`);
          }
        } else {
          setSuccessMessage("Product created successfully.");
        }
        closeProductModal();
        triggerFetch(1);
      } else if (selectedProduct) {
        await patch<Product>(`/products/${selectedProduct.id}`, productPayload());
        setSuccessMessage("Product updated successfully.");
        await refreshProductDetail(selectedProduct.id);
        triggerFetch(page);
      }
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVariantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct || !variantMode || isVariantSaving) return;
    const validationError = validateVariantForm();
    if (validationError) {
      setVariantError(validationError);
      return;
    }
    setIsVariantSaving(true);
    setVariantError(null);
    try {
      const payload = variantPayload();
      let targetId = editingVariantId;
      if (variantMode === "add") {
        const createPayload = payload.isDefault ? { ...payload, isDefault: false } : payload;
        const created = await post<ProductVariant>(`/products/${selectedProduct.id}/variants`, createPayload);
        targetId = created.id;
      } else if (editingVariantId) {
        const updatePayload: UpdateVariantRequest = payload.isDefault ? { ...payload, isDefault: false } : payload;
        await patch<ProductVariant>(`/variants/${editingVariantId}`, updatePayload);
      }

      if (payload.isDefault && targetId) {
        const demotions = selectedProduct.variants
          .filter((variant) => variant.id !== targetId && variant.isDefault)
          .map((variant) => patch<ProductVariant>(`/variants/${variant.id}`, { isDefault: false }));
        await Promise.all(demotions);
        await patch<ProductVariant>(`/variants/${targetId}`, { isDefault: true });
      }

      setVariantMode(null);
      setEditingVariantId(null);
      setSuccessMessage("Variant saved successfully.");
      await refreshProductDetail(selectedProduct.id);
      triggerFetch(page);
    } catch (error) {
      setVariantError(extractErrorMessage(error));
    } finally {
      setIsVariantSaving(false);
    }
  }

  async function handleImageUpload() {
    if (!selectedProduct || imageSelections.length === 0 || isImageUploading) return;
    setIsImageUploading(true);
    setImageError(null);
    try {
      await uploadImages(selectedProduct.id, imageSelections.map((image) => image.file));
      clearImageSelections();
      setSuccessMessage("Images uploaded successfully.");
      await refreshProductDetail(selectedProduct.id);
      triggerFetch(page);
    } catch (error) {
      setImageError(extractErrorMessage(error));
    } finally {
      setIsImageUploading(false);
    }
  }

  function openVariantAdd() {
    setVariantMode("add");
    setEditingVariantId(null);
    setVariantError(null);
    setVariantForm({ ...INITIAL_VARIANT_FORM, isDefault: selectedProduct?.variants.length === 0 });
  }

  function openVariantEdit(variant: ProductVariant) {
    setVariantMode("edit");
    setEditingVariantId(variant.id);
    setVariantError(null);
    setVariantForm({
      sku: variant.sku,
      variantName: variant.variantName,
      unit: variant.unit,
      price: formatDecimal(variant.price),
      mrp: formatDecimal(variant.mrp),
      weight: formatDecimal(variant.weight),
      isActive: variant.isActive,
      isDefault: variant.isDefault,
    });
  }

  function confirmDeleteProduct(product: Product) {
    setConfirmation({
      kind: "product",
      title: "Delete product",
      description: `Delete "${product.name}" and its variants from the active catalog?`,
      actionLabel: "Delete product",
      onConfirm: async () => {
        await deleteRequest<Product>(`/products/${product.id}`);
        setSuccessMessage("Product deleted successfully.");
        const nextPage = products.length === 1 && page > 1 ? page - 1 : page;
        setPage(nextPage);
        triggerFetch(nextPage);
      },
    });
  }

  function confirmDeleteVariant(variant: ProductVariant) {
    if (!selectedProduct) return;
    setConfirmation({
      kind: "variant",
      title: "Delete variant",
      description: `Delete variant "${variant.variantName}" with SKU ${variant.sku}?`,
      actionLabel: "Delete variant",
      onConfirm: async () => {
        await deleteRequest<ProductVariant>(`/variants/${variant.id}`);
        setSuccessMessage("Variant deleted successfully.");
        await refreshProductDetail(selectedProduct.id);
        triggerFetch(page);
      },
    });
  }

  function confirmDeleteImage(image: ProductImage) {
    if (!selectedProduct) return;
    setConfirmation({
      kind: "image",
      title: "Delete image",
      description: image.isPrimary ? "Delete this primary image? The backend will promote the next image if one exists." : "Delete this product image?",
      actionLabel: "Delete image",
      onConfirm: async () => {
        await deleteRequest<void>(`/admin/products/${selectedProduct.id}/images/${image.id}`);
        setSuccessMessage("Image deleted successfully.");
        await refreshProductDetail(selectedProduct.id);
        triggerFetch(page);
      },
    });
  }

  async function setPrimaryImage(image: ProductImage) {
    if (!selectedProduct || image.isPrimary) return;
    setImageError(null);
    try {
      const payload: UpdateProductImageRequest = { isPrimary: true };
      await patch<ProductImage>(`/admin/products/${selectedProduct.id}/images/${image.id}`, payload);
      setSuccessMessage("Primary image updated.");
      await refreshProductDetail(selectedProduct.id);
      triggerFetch(page);
    } catch (error) {
      setImageError(extractErrorMessage(error));
    }
  }

  async function runConfirmation() {
    if (!confirmation || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmation.onConfirm();
      setConfirmation(null);
      if (confirmation.kind === "product") closeProductModal();
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }

  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Catalog</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-zinc-600">Manage sellable items, variants, and product imagery.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800">
          <Icon name="plus" className="h-4 w-4" />
          Add product
        </button>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon name="search" className="h-4 w-4 text-zinc-400" />
            </span>
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products..." className="block w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
          </div>
          <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "active", "inactive"] as StatusFilter[]).map((value) => (
              <button key={value} type="button" onClick={() => { setStatusFilter(value); setPage(1); }} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", statusFilter === value ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "text-zinc-600 hover:bg-zinc-100")}>
                {value === "all" ? "All" : value === "active" ? "Active" : "Inactive"}
              </button>
            ))}
            {hasFilters && (
              <button type="button" onClick={() => { setSearchInput(""); setSearchQuery(""); setCategoryFilter(""); setStatusFilter("all"); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Clear</button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
            <Spinner />
            <p className="mt-4 text-sm text-zinc-600">Loading products...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon name="alert" className="h-6 w-6" /></div>
            <h2 className="text-lg font-semibold text-zinc-900">Could not load products</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">{errorMessage}</p>
            <button type="button" onClick={() => triggerFetch(page)} className="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Retry</button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 shadow-sm"><Icon name="box" className="h-6 w-6" /></span>
            <h2 className="text-lg font-semibold text-zinc-900">{hasFilters ? "No matching products" : "No products yet"}</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600">{hasFilters ? "Try adjusting your search or filters." : "Create your first catalog item with a sellable variant."}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {hasFilters && <button type="button" onClick={() => { setSearchInput(""); setSearchQuery(""); setCategoryFilter(""); setStatusFilter("all"); setPage(1); }} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Clear filters</button>}
              <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Icon name="plus" className="h-4 w-4" />Add product</button>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Default variant</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map((product) => {
                    const variant = firstVariant(product);
                    return (
                      <tr key={product.id} className="bg-white hover:bg-zinc-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <ImageTile product={product} />
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900">{product.name}</p>
                              <p className="truncate text-xs text-zinc-500">/{product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-zinc-600">{product.category?.name ?? categoryNameById.get(product.categoryId) ?? "-"}</td>
                        <td className="px-5 py-3 text-zinc-600">{variant ? <span>{variant.variantName}<span className="block text-xs text-zinc-500">SKU {variant.sku}</span></span> : "-"}</td>
                        <td className="px-5 py-3 font-semibold text-zinc-900">{variant ? formatMoney(variant.price) : "Rs. 0.00"}</td>
                        <td className="px-5 py-3"><StatusBadge isActive={product.isActive} /></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => void openEdit(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"><Icon name="edit" className="h-3.5 w-3.5" />Edit</button>
                            <button type="button" onClick={() => confirmDeleteProduct(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"><Icon name="trash" className="h-3.5 w-3.5" />Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-100 md:hidden">
              {products.map((product) => {
                const variant = firstVariant(product);
                return (
                  <div key={product.id} className="p-4">
                    <div className="flex gap-3">
                      <ImageTile product={product} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-zinc-900">{product.name}</p>
                            <p className="text-xs text-zinc-500">{product.category?.name ?? "-"}</p>
                          </div>
                          <StatusBadge isActive={product.isActive} />
                        </div>
                        <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-900">{variant ? formatMoney(variant.price) : "Rs. 0.00"}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">{variant ? `${variant.variantName} | SKU ${variant.sku}` : "No variant found"}</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={() => void openEdit(product)} className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700">Edit</button>
                          <button type="button" onClick={() => confirmDeleteProduct(product)} className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">Showing {products.length} of {total} products</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">Previous</button>
                  <span className="text-sm text-zinc-600">Page {page} of {totalPages}</span>
                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Modal isOpen={productMode === "create"} onClose={closeProductModal} title="Add product" size="xl">
        <ProductForm mode="create" form={productForm} variantForm={variantForm} categories={categories} imageSelections={imageSelections} imageError={imageError} isSubmitting={isSubmitting} error={formError} onFormChange={setProductFormPatch} onVariantChange={(patchValue) => setVariantForm((current) => ({ ...current, ...patchValue }))} onImagesChange={validateAndAddImages} onRemoveImage={removeSelectedImage} onSubmit={handleProductSubmit} onCancel={closeProductModal} />
      </Modal>

      <Modal isOpen={productMode === "edit"} onClose={closeProductModal} title={selectedProduct ? `Edit ${selectedProduct.name}` : "Edit product"} size="xl">
        <div className="space-y-5">
          <ProductForm mode="edit" form={productForm} variantForm={variantForm} categories={categories} imageSelections={[]} imageError={null} isSubmitting={isSubmitting} error={formError} onFormChange={setProductFormPatch} onVariantChange={() => undefined} onImagesChange={() => undefined} onRemoveImage={() => undefined} onSubmit={handleProductSubmit} onCancel={closeProductModal} />
          {selectedProduct && (
            <>
              <VariantManager product={selectedProduct} activeVariantId={editingVariantId} form={variantForm} mode={variantMode} error={variantError} isSaving={isVariantSaving} onOpenAdd={openVariantAdd} onOpenEdit={openVariantEdit} onCancel={() => { setVariantMode(null); setEditingVariantId(null); setVariantError(null); }} onChange={(patchValue) => setVariantForm((current) => ({ ...current, ...patchValue }))} onSubmit={handleVariantSubmit} onDelete={confirmDeleteVariant} />
              <ImageManager product={selectedProduct} selections={imageSelections} imageError={imageError} isUploading={isImageUploading} onImagesChange={validateAndAddImages} onRemoveSelected={removeSelectedImage} onUpload={() => void handleImageUpload()} onSetPrimary={(image) => void setPrimaryImage(image)} onDelete={confirmDeleteImage} />
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={confirmation !== null} onClose={() => setConfirmation(null)} title={confirmation?.title ?? ""} size="md">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{confirmation?.description}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmation(null)} disabled={isConfirming} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void runConfirmation()} disabled={isConfirming} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
              {isConfirming && <Spinner size="sm" />}
              {isConfirming ? "Deleting..." : confirmation?.actionLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
