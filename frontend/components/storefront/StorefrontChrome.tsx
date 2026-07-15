"use client";

import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutGrid,
  MessageCircle,
  PackageCheck,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { useCart } from "@/lib/cart/CartProvider";
import { useCustomerAuth } from "@/lib/customer-auth/CustomerAuthProvider";

const whatsappChannelUrl = "https://whatsapp.com/channel/0029VbCoSLnFy72B3UiivC1k";

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
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Shop", icon: Search },
    { href: "/#categories", label: "Categories", icon: LayoutGrid },
    { href: "/orders", label: "Orders", icon: PackageCheck },
    { href: "/account", label: "Account", icon: UserRound },
  ];

  const mobileItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Shop", icon: Search },
    { href: "/cart", label: "Cart", icon: ShoppingBag },
    { href: "/orders", label: "Orders", icon: PackageCheck },
    { href: "/account", label: "Account", icon: UserRound },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-emerald-100/80 bg-[#FAFAF7]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <Image
              src="/brand/logo.png"
              alt="SARVAA Fresh"
              width={1254}
              height={1254}
              sizes="(max-width: 640px) 40px, 48px"
              className="h-10 w-10 shrink-0 object-contain transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 sm:h-12 sm:w-12"
              priority
            />
            <span className="min-w-0 leading-tight">
              <span className="block whitespace-nowrap text-sm font-black tracking-tight text-[#14532d] min-[390px]:text-base sm:text-lg">
                SARVAA Fresh
              </span>
              <span className="block max-w-[160px] truncate whitespace-nowrap text-[11px] font-bold text-zinc-500 min-[390px]:max-w-none min-[390px]:text-xs">
                Fresh Fruits & Vegetables
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-emerald-100 bg-white px-1.5 py-1.5 shadow-sm lg:flex">
            {navItems.map((item) => {
              const active = isActive(item.href.split("#")[0]);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "bg-emerald-50 text-[#14532d]"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-[#14532d]"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/products"
              aria-label="Search products"
              className="grid h-10 w-10 place-items-center rounded-full border border-emerald-100 bg-white text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:text-[#14532d]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:text-[#14532d]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Cart
              {isMounted && itemCount > 0 && (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#FF8A00] px-1.5 py-0.5 text-[11px] font-black text-white">
                  {itemCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  className="max-w-36 truncate rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:text-[#14532d]"
                >
                  {customer?.fullName ?? "Account"}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-full bg-[#14532d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f3f23]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?next=/checkout"
                  className="rounded-full border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:text-[#14532d]"
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=register&next=/checkout"
                  className="rounded-full bg-[#14532d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f3f23]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pb-10">
        {children}
      </main>

      <a
        href={whatsappChannelUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Join our WhatsApp Channel"
        title="Join our WhatsApp Channel"
        className="whatsapp-float group fixed bottom-28 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-emerald-900/25 transition duration-300 hover:-translate-y-1 hover:bg-[#1fb65a] hover:shadow-emerald-900/35 min-[390px]:h-14 min-[390px]:w-14 md:bottom-6 md:right-6"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-full bg-zinc-950 px-3 py-2 text-xs font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100 md:block">
          Join our WhatsApp Channel
        </span>
      </a>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/96 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">
          {mobileItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold ${
                  active
                    ? "bg-emerald-50 text-[#14532d]"
                    : "text-zinc-600"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.href === "/cart" && isMounted && itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#FF8A00] px-1.5 py-0.5 text-[10px] font-black text-white">
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
