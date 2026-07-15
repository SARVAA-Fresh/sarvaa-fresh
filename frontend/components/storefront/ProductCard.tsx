"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, Heart, ImageIcon, Plus, Sparkles } from "lucide-react";

import { buildAssetUrl } from "@/lib/api/client";
import type { Product, ProductImage, ProductVariant } from "@/lib/api/types";

function formatMoney(value: string | number | null | undefined): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  if (!Number.isFinite(numeric)) return "Rs. 0.00";
  return `Rs. ${numeric.toFixed(2)}`;
}

function primaryImage(product: Product): ProductImage | null {
  return (
    product.images.find((image) => image.isPrimary) ??
    product.images[0] ??
    null
  );
}

function firstVariant(product: Product): ProductVariant | null {
  return (
    product.variants.find((variant) => variant.isDefault && variant.isActive) ??
    product.variants.find((variant) => variant.isActive) ??
    product.variants[0] ??
    null
  );
}

function hasDiscount(variant: ProductVariant | null): boolean {
  if (!variant?.mrp) return false;
  return Number.parseFloat(variant.mrp) > Number.parseFloat(variant.price);
}

export function ProductCard({ product }: { product: Product }) {
  const image = primaryImage(product);
  const variant = firstVariant(product);
  const src = buildAssetUrl(image?.imageUrl ?? product.imageUrl);
  const isAvailable = product.isActive && Boolean(variant?.isActive ?? variant);
  const showDiscount = hasDiscount(variant);

  return (
    <article className="group overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-900/10">
      <div className="relative">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative h-44 overflow-hidden bg-[#f4f7ef] sm:aspect-[4/3] sm:h-auto">
            {src ? (
              <Image
                src={src}
                alt={image?.altText ?? product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-emerald-900/50">
                <ImageIcon className="h-10 w-10" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-[0.14em]">
                  Fresh image coming soon
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
          </div>
        </Link>
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#14532d] shadow-sm">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Fresh
        </div>
        <button
          type="button"
          aria-label={`Save ${product.name} to wishlist`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-zinc-700 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <Link href={`/products/${product.id}`} className="min-w-0">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-zinc-950 transition group-hover:text-[#14532d] sm:text-base">
                {product.name}
              </h3>
            </Link>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isAvailable
                  ? "bg-emerald-50 text-[#14532d]"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {isAvailable ? "In stock" : "Sold out"}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4CAF50]">
            {product.category.name}
          </p>
        </div>

        <p className="line-clamp-2 text-sm leading-5 text-zinc-600 sm:leading-6">
          {product.description?.trim() ||
            "Freshly selected produce with reliable daily quality."}
        </p>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-black text-zinc-950 sm:text-xl">
                {variant ? formatMoney(variant.price) : "Rs. 0.00"}
              </p>
              {showDiscount && (
                <p className="text-sm font-semibold text-zinc-400 line-through">
                  {formatMoney(variant?.mrp)}
                </p>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500">
              {variant
                ? `${variant.variantName} / ${variant.unit}`
                : "Variant unavailable"}
            </p>
          </div>
          <Link
            href={`/products/${product.id}`}
            aria-label={`Add ${product.name} to cart`}
            className="grid h-12 w-12 place-items-center rounded-full bg-[#14532d] text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-[#0f3f23] sm:h-11 sm:w-11"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-emerald-50 pt-3">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-2 text-xs font-bold text-[#14532d] transition hover:bg-emerald-50"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Quick View
          </Link>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-[#14532d] transition hover:bg-emerald-100"
          >
            Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
