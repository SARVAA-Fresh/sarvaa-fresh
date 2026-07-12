"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { CategoryListResponse, ProductListResponse } from "@/lib/api/types";
import { ProductCard } from "@/components/storefront/ProductCard";

const LIMIT = 12;

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"
      role="status"
      aria-label="Loading"
    />
  );
}

function extractMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.messages.join(" ") || "Unable to load products.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to load products.";
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState(
    searchParams.get("category") ?? "",
  );
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductListResponse | null>(null);
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(LIMIT));
        query.set("isActive", "true");
        query.set("sortBy", "updatedAt");
        query.set("sortOrder", "desc");
        if (searchQuery.trim()) {
          query.set("search", searchQuery.trim());
        }
        if (categoryId) {
          query.set("categoryId", categoryId);
        }

        const [productData, categoryData] = await Promise.all([
          get<ProductListResponse>(`/products?${query.toString()}`),
          get<CategoryListResponse>("/categories?limit=100&isActive=true"),
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
        setErrorMessage(extractMessage(error));
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
  }, [categoryId, page, reloadToken, searchQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const hasFilters = searchQuery.trim().length > 0 || categoryId.length > 0;
  const totalPages = products?.totalPages ?? 0;

  return (
    <div className="space-y-6 pb-6">
      <header className="space-y-4 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Browse products
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Search the active catalog
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Find the product you need, open its variants, and add the right one
            to your cart in a couple of taps.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-center">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products"
              className="block w-full rounded-2xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className="block w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          >
            <option value="">All categories</option>
            {categories?.items.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setCategoryId("");
                  setPage(1);
                }}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Clear
              </button>
            )}
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              View cart
            </Link>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Could not load products
            </h2>
            <p className="mt-2 text-sm text-zinc-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setReloadToken((value) => value + 1)}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Retry
            </button>
          </div>
        ) : (products?.items.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              {hasFilters ? "No matching products" : "No products available"}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {hasFilters
                ? "Try a different search or category."
                : "Check back again soon for fresh inventory."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setCategoryId("");
                  setPage(1);
                }}
                className="mt-6 inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-600">
                  Showing {products?.items.length ?? 0} of {products?.total ?? 0}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      page <= 1
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
                    )}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page >= totalPages}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      page >= totalPages
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                        : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-6">
          <header className="space-y-4 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-zinc-100" />
              <div className="h-8 w-80 max-w-full rounded-full bg-zinc-100" />
              <div className="h-4 w-full max-w-2xl rounded-full bg-zinc-100" />
            </div>
          </header>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
