"use client";

import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useCart } from "@/lib/cart/CartProvider";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";

function Icon({
  name,
  className,
}: {
  name: "home" | "search" | "cart" | "orders" | "account";
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
      {name === "home" && <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /></>}
      {name === "search" && <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>}
      {name === "cart" && <><circle cx="9" cy="20" r="1.25" /><circle cx="17" cy="20" r="1.25" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6" /></>}
      {name === "orders" && <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M8 11h8" /></>}
      {name === "account" && <><circle cx="12" cy="8" r="3.5" /><path d="M4 20c1.8-3.5 5-5 8-5s6.2 1.5 8 5" /></>}
    </svg>
  );
}

let headerMounted = false;
const headerMountedListeners = new Set<() => void>();

function subscribeHeaderMounted(listener: () => void): () => void {
  headerMountedListeners.add(listener);
  return () => {
    headerMountedListeners.delete(listener);
  };
}

function emitHeaderMountedChange(): void {
  headerMountedListeners.forEach((listener) => listener());
}

export function StorefrontChrome({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMounted = useSyncExternalStore(
    subscribeHeaderMounted,
    () => headerMounted,
    () => false,
  );
  const { itemCount } = useCart();
  const { customer, isAuthenticated, logout } = useCustomerAuth();

  useEffect(() => {
    headerMounted = true;
    emitHeaderMountedChange();
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navItems = [
    { href: "/", label: "Home", icon: "home" as const },
    { href: "/products", label: "Shop", icon: "search" as const },
    { href: "/cart", label: "Cart", icon: "cart" as const },
    { href: "/orders", label: "Orders", icon: "orders" as const },
    { href: "/account", label: "Account", icon: "account" as const },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              <Image
                src="/sarvaa-fresh-logo-v2.png"
                alt="SARVAA Fresh"
                width={1254}
                height={1254}
                sizes="44px"
                className="h-11 w-11 object-contain"
                priority
              />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-zinc-900">
                SARVAA Fresh
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                Fresh from nearby
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                  {item.href === "/cart" && isMounted && itemCount > 0 && (
                    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  {customer?.fullName ?? "Account"}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?next=/checkout"
                  className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=register&next=/checkout"
                  className="rounded-full bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 sm:pb-10">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/96 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-zinc-600"
                }`}
              >
                <span className="relative">
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.href === "/cart" && isMounted && itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {itemCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
