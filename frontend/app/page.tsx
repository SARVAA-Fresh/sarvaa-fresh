"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { CategoryListResponse, ProductListResponse } from "@/lib/api/types";
import { ProductCard } from "@/components/storefront/ProductCard";

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
  name: "arrow" | "leaf" | "truck" | "shield";
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
      {name === "leaf" && (
        <path d="M5 19c6 0 14-6 14-14-8 0-14 8-14 14Z" />
      )}
      {name === "truck" && (
        <>
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </>
      )}
      {name === "shield" && (
        <path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
      )}
    </svg>
  );
}

function HomeSection({ children }: { children: ReactNode }) {
  return <section className="space-y-5">{children}</section>;
}

function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Retry
      </button>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<ProductListResponse | null>(null);
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const featuredProducts = useMemo(
    () => products?.items.slice(0, 4) ?? [],
    [products],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [productData, categoryData] = await Promise.all([
          get<ProductListResponse>(
            "/products?limit=8&page=1&isActive=true&sortBy=updatedAt&sortOrder=desc",
          ),
          get<CategoryListResponse>(
            "/categories?limit=8&page=1&isActive=true",
          ),
        ]);
        if (cancelled) return;
        setProducts({
          ...productData,
          items: productData.items.filter(
            (item) =>
              item.category?.isActive !== false &&
              item.category?.deletedAt == null,
          ),
        });
        setCategories(categoryData);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.messages.join(" ") || "Unable to load storefront."
            : error instanceof Error
              ? error.message
              : "Unable to load storefront.";
        setErrorMessage(message);
        setProducts(null);
        setCategories(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10 pb-6">
      <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <Icon name="leaf" className="h-3.5 w-3.5" />
              Fresh produce, household staples, and daily essentials
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                SARVAA Fresh
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
                A calm, reliable grocery storefront for customers who want to
                browse products quickly, choose the right variant, and finish
                checkout without friction.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Shop now
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Sign in
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Fresh picks",
                  text: "Browse the active catalog and jump into product details.",
                  icon: "leaf" as const,
                },
                {
                  title: "Fast delivery flow",
                  text: "Add to cart, choose an address, and place the order.",
                  icon: "truck" as const,
                },
                {
                  title: "Secure checkout",
                  text: "UPI proof upload and order tracking are built in.",
                  icon: "shield" as const,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[28px] bg-emerald-50" />
            <div className="grid gap-3 rounded-[28px] border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                <Image
                  src="/sarvaa-fresh-logo-v2.png"
                  alt="SARVAA Fresh"
                  width={1254}
                  height={1254}
                  sizes="(max-width: 1024px) 50vw, 320px"
                  className="aspect-square w-full object-contain p-6"
                  priority
                />
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Today&apos;s active products
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-950">
                    {products?.total ?? "--"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Available for customers right now.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Active categories
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-950">
                    {categories?.total ?? "--"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Curated for the current storefront.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load the storefront"
          description={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            setIsLoading(true);
            window.location.reload();
          }}
        />
      ) : (
        <>
          <HomeSection>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Shop by category
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  Popular categories
                </h2>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Browse all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories?.items.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.id}`}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </HomeSection>

          <HomeSection>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Featured products
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  Fresh from the catalog
                </h2>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                See all products
              </Link>
            </div>
            {featuredProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
                No active products yet.
              </div>
            )}
          </HomeSection>
        </>
      )}
    </div>
  );
}
