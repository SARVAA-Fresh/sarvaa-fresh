"use client";

import Image from "next/image";
import Link from "next/link";

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
  return product.variants[0] ?? null;
}

function Icon({
  name,
  className,
}: {
  name: "arrow" | "image" | "spark";
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
      {name === "arrow" && (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      )}
      {name === "image" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </>
      )}
      {name === "spark" && (
        <>
          <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5Z" />
        </>
      )}
    </svg>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const image = primaryImage(product);
  const variant = firstVariant(product);
  const src = buildAssetUrl(image?.imageUrl ?? product.imageUrl);

  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
          {src ? (
            <Image
              src={src}
              alt={image?.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-zinc-400">
              <Icon name="image" className="h-10 w-10" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                No image available
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm">
            <Icon name="spark" className="h-3.5 w-3.5" />
            {product.category.name}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-base font-semibold leading-snug text-zinc-900">
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
              {product.description?.trim() ||
                "Fresh catalog item with reliable variant options."}
            </p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-zinc-900">
                {variant ? formatMoney(variant.price) : "Rs. 0.00"}
              </p>
              <p className="text-xs text-zinc-500">
                {variant
                  ? `${variant.variantName} | ${variant.unit}`
                  : "No active variant yet"}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                product.isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {product.isActive ? "Available" : "Unavailable"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="text-xs text-zinc-500">View details and variants</span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
              Explore
              <Icon name="arrow" className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
