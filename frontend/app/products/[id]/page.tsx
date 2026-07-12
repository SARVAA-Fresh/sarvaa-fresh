"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ApiError } from "@/lib/api/types";
import { buildAssetUrl, get } from "@/lib/api/client";
import type { Product, ProductImage } from "@/lib/api/types";
import { useCart } from "@/lib/cart/CartProvider";

function formatMoney(value: string | number | null | undefined): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"
      role="status"
      aria-label="Loading"
    />
  );
}

function Icon({
  name,
  className,
}: {
  name: "cart" | "image" | "tag" | "check" | "arrow";
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
      {name === "image" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </>
      )}
      {name === "tag" && <path d="M20 10 10 20 4 14 14 4h6z" />}
      {name === "check" && (
        <polyline points="20 6 9 17 4 12" />
      )}
      {name === "arrow" && (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      )}
    </svg>
  );
}

function primaryImage(product: Product): ProductImage | null {
  return (
    product.images.find((image) => image.isPrimary) ??
    product.images[0] ??
    null
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { addLine } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedImageId, setSelectedImageId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await get<Product>(`/products/${params.id}`);
        if (cancelled) return;
        setProduct(data);
        const firstVariant = data.variants[0] ?? null;
        setSelectedVariantId(firstVariant?.id ?? "");
        setSelectedImageId((data.images.find((image) => image.isPrimary) ?? data.images[0] ?? null)?.id ?? "");
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.messages.join(" ") || "Product not found."
            : error instanceof Error
              ? error.message
              : "Product not found.";
        setErrorMessage(message);
        setProduct(null);
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
  }, [params.id]);

  const selectedVariant = useMemo(
    () => product?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [product, selectedVariantId],
  );

  const gallery = product?.images ?? [];
  const heroImage = useMemo(() => {
    if (!product) return null;
    return (
      product.images.find((image) => image.id === selectedImageId) ??
      primaryImage(product)
    );
  }, [product, selectedImageId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-950">Product not found</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {errorMessage ?? "This product may have been removed or is unavailable."}
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const canAdd = Boolean(selectedVariant && selectedVariant.isActive);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/products"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Back to products
        </Link>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        >
          <Icon name="cart" className="h-4 w-4" />
          View cart
        </Link>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3] bg-zinc-50">
              {buildAssetUrl(heroImage?.imageUrl ?? product.imageUrl) ? (
                <Image
                  src={buildAssetUrl(heroImage?.imageUrl ?? product.imageUrl)!}
                  alt={heroImage?.altText ?? product.name}
                  data-product-hero="true"
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-zinc-400">
                  <Icon name="image" className="h-16 w-16" />
                  <span className="text-sm font-semibold uppercase tracking-[0.14em]">
                    No image available
                  </span>
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-5">
                {gallery.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedImageId(image.id)}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    {buildAssetUrl(image.imageUrl) ? (
                      <Image
                        src={buildAssetUrl(image.imageUrl)!}
                        alt={image.altText ?? product.name}
                        width={200}
                        height={200}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-zinc-300">
                        <Icon name="image" className="h-6 w-6" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Icon name="tag" className="h-3.5 w-3.5" />
                {product.category.name}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  product.isActive
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {product.isActive ? "Available" : "Unavailable"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {product.description?.trim() ||
                  "Choose the variant that matches what you need and add it to the cart when you are ready."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Selected variant
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    selectedVariantId === variant.id
                      ? "border-emerald-300 bg-white"
                      : "border-zinc-200 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {variant.variantName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        SKU {variant.sku} | {variant.unit}
                      </p>
                    </div>
                    {variant.isDefault && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-lg font-bold text-zinc-950">
                      {formatMoney(variant.price)}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        variant.isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {variant.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-end">
            <div>
              <label
                htmlFor="quantity"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Number.parseInt(event.target.value || "1", 10)))
                }
                className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
            <button
              type="button"
              disabled={!canAdd}
              onClick={() => {
                if (!product || !selectedVariant || !selectedVariant.isActive) return;
                addLine(product, selectedVariant, quantity);
                setSuccessMessage("Added to cart.");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <Icon name="cart" className="h-4 w-4" />
              Add to cart
            </button>
          </div>

          {selectedVariant && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Price summary
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600">Total</span>
                <span className="text-xl font-bold text-zinc-950">
                  {formatMoney(Number.parseFloat(selectedVariant.price) * quantity)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
