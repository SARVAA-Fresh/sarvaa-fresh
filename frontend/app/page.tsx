"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ExternalLink,
  Heart,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Truck,
  Clock,
} from "lucide-react";

import { ApiError } from "@/lib/api/types";
import { get } from "@/lib/api/client";
import type { CategoryListResponse, ProductListResponse, PublicSettings } from "@/lib/api/types";
import { ProductCard } from "@/components/storefront/ProductCard";
import {
  formatStoreHours,
  normalizeSettings,
  storeStatusMessage,
} from "@/lib/settings/settings";

const categoryChips = [
  { label: "Fruits", icon: "Apple" },
  { label: "Vegetables", icon: "Leaf" },
  { label: "Fresh Today", icon: "Sprout" },
  { label: "Best Sellers", icon: "Star" },
  { label: "Seasonal", icon: "Mango" },
];

const heroProduce = [
  {
    name: "Apples",
    src: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=520&q=80",
    className: "left-4 top-8 h-32 w-32 rotate-[-8deg] sm:h-40 sm:w-40",
  },
  {
    name: "Mangoes",
    src: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=520&q=80",
    className: "right-6 top-4 h-36 w-36 rotate-[7deg] sm:h-44 sm:w-44",
  },
  {
    name: "Tomatoes",
    src: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=520&q=80",
    className: "bottom-14 left-10 h-36 w-36 rotate-[6deg] sm:h-44 sm:w-44",
  },
  {
    name: "Carrots",
    src: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=520&q=80",
    className: "bottom-8 right-12 h-32 w-32 rotate-[-10deg] sm:h-40 sm:w-40",
  },
];

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#14532d]"
      role="status"
      aria-label="Loading"
    />
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4CAF50]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Hero({ settings }: { settings: PublicSettings }) {
  const area = settings.contact.deliveryAreaDescription || settings.business.city || "Sagwara";
  const statusMessage = storeStatusMessage(settings);

  return (
    <>
    <section className="overflow-hidden rounded-[24px] bg-[#14532d] px-5 py-6 text-white shadow-[0_18px_50px_rgba(20,83,45,0.18)] lg:hidden">
      <div className="space-y-5">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Morning-picked produce</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight tracking-tight min-[390px]:text-4xl">
            {settings.business.heroHeading}
          </h1>
          <p className="text-sm leading-6 text-emerald-50/90 min-[390px]:text-base">
            {settings.business.heroSubtitle}
          </p>
        </div>
        {statusMessage && (
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
            {statusMessage}
          </div>
        )}
        <div className="relative mx-auto h-52 max-w-sm overflow-hidden rounded-[22px] border border-white/15 bg-white/10 shadow-2xl shadow-black/15">
          <Image
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=760&q=80"
            alt="Fresh fruits and vegetables"
            fill
            sizes="(max-width: 1024px) 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14532d]/35 to-transparent" />
        </div>
        <div className="grid gap-3 min-[390px]:grid-cols-2">
          <Link
            href="/products"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#14532d] shadow-lg shadow-black/10 transition active:scale-[0.98]"
          >
            Shop Fresh
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/products"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            Browse Products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
          {[
            ["6 AM", "Daily Fresh"],
            ["Local", `${area} Delivery`],
            ["100%", "Handpicked"],
          ].map(([value, label]) => (
            <div key={label} className="min-w-0">
              <p className="text-lg font-bold leading-tight">{value}</p>
              <p className="mt-1 text-[11px] font-medium leading-4 text-emerald-50/75">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="hidden min-h-[calc(100vh-132px)] gap-8 overflow-hidden rounded-[24px] bg-[#14532d] px-5 py-8 text-white shadow-[0_24px_70px_rgba(20,83,45,0.22)] sm:px-8 lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-10">
      <div className="relative z-10 max-w-2xl space-y-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Morning-picked produce for Sagwara homes
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {settings.business.heroHeading}
          </h1>
          <p className="max-w-xl text-base leading-7 text-emerald-50/90 sm:text-lg">
            {settings.business.heroSubtitle}
          </p>
        </div>
        {statusMessage && (
          <div className="max-w-xl rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
            {statusMessage}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#14532d] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Shop Fresh
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Explore Products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid max-w-xl gap-3 sm:grid-cols-3">
          {[
            ["6 AM", "Daily sorting"],
            ["Local", `${area} delivery`],
            ["100%", "Fresh focused"],
          ].map(([value, label]) => (
            <div key={label} className="border-t border-white/15 pt-3">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium text-emerald-50/75">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-h-[420px] lg:min-h-[560px]">
        <div className="absolute inset-x-7 bottom-0 h-44 rounded-[50%] bg-black/20 blur-2xl" />
        <div className="absolute inset-x-9 bottom-5 h-28 rounded-[999px] bg-[#7a4a25]" />
        <div className="absolute inset-x-16 bottom-14 h-28 rounded-[999px] border-[18px] border-[#a66b38] bg-[#c98b4c] shadow-2xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4CAF50]/30 blur-3xl" />
        {heroProduce.map((item, index) => (
          <Image
            key={item.name}
            src={item.src}
            alt={item.name}
            width={520}
            height={520}
            className={`absolute rounded-[24px] object-cover shadow-2xl ring-1 ring-white/20 animate-float-${index + 1} ${item.className}`}
          />
        ))}
        <div className="absolute left-1/2 top-[44%] h-44 w-44 -translate-x-1/2 rounded-full border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
          <Image
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=520&q=80"
            alt="Leafy vegetables in a basket"
            width={520}
            height={520}
            className="h-full w-full rounded-full object-cover"
          />
        </div>
      </div>
    </section>
    </>
  );
}

function CategorySection({ categories }: { categories: CategoryListResponse | null }) {
  const linkedCategories = categories?.items.slice(0, 2) ?? [];

  return (
    <section id="categories" className="space-y-5">
      <SectionHeader
        eyebrow="Shop by mood"
        title="Simple categories for fresh decisions"
        description="Fast, friendly entry points for fruits, vegetables, daily arrivals, best sellers, and seasonal picks."
      />
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {categoryChips.map((chip, index) => {
          const category = linkedCategories[index];
          return (
            <Link
              key={chip.label}
              href={category ? `/products?category=${category.id}` : "/products"}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white px-5 py-3 text-sm font-bold text-zinc-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#4CAF50]/40 hover:text-[#14532d] hover:shadow-lg hover:shadow-emerald-900/10"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[#14532d] transition group-hover:bg-[#14532d] group-hover:text-white">
                {chip.icon === "Apple" && "A"}
                {chip.icon === "Leaf" && <Leaf className="h-4 w-4" aria-hidden="true" />}
                {chip.icon === "Sprout" && <Sprout className="h-4 w-4" aria-hidden="true" />}
                {chip.icon === "Star" && <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {chip.icon === "Mango" && "M"}
              </span>
              {chip.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedProducts({ products }: { products: ProductListResponse | null }) {
  const featuredProducts = products?.items.slice(0, 4) ?? [];

  return (
    <section id="shop" className="space-y-5">
      <SectionHeader
        eyebrow="Featured products"
        title="Handpicked favorites ready for your cart"
        description="Clean produce cards with freshness cues, prices, units, stock state, and quick paths into product details."
        action={
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#14532d] transition hover:text-[#4CAF50]"
          >
            See all products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
      {featuredProducts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-emerald-200 bg-white p-8 text-center text-sm font-medium text-zinc-600">
          Fresh products will appear here as soon as inventory is active.
        </div>
      )}
    </section>
  );
}

function FreshToday({ products }: { products: ProductListResponse | null }) {
  const freshProducts = products?.items.slice(0, 3) ?? [];

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Fresh today"
        title="Morning arrivals worth picking first"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {(freshProducts.length > 0 ? freshProducts : [null, null, null]).map(
          (product, index) => (
            <div
              key={product?.id ?? index}
              className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#14532d]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {index === 0 ? "Fresh Today" : index === 1 ? "Morning Arrival" : "Best Quality"}
              </span>
              <h3 className="mt-5 text-lg font-bold text-zinc-950">
                {product?.name ?? ["Apples", "Leafy greens", "Tomatoes"][index]}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {product?.description?.trim() ||
                  "Checked, sorted, and packed with care for today's delivery run."}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

function PromoBanner() {
  return (
    <section className="grid overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#14532d_0%,#2f8a45_55%,#ff8a00_100%)] text-white shadow-[0_22px_60px_rgba(20,83,45,0.2)] lg:grid-cols-[1fr_360px]">
      <div className="space-y-5 p-6 sm:p-8">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
          Mango Season
        </p>
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Fresh seasonal mangoes now available.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
            Sweet, fragrant, and selected at the right ripeness for Sagwara
            homes.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#14532d] transition hover:-translate-y-0.5 hover:bg-emerald-50"
        >
          Shop Now
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="relative min-h-52 overflow-hidden sm:min-h-64">
        <Image
          src="https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=900&q=80"
          alt="Seasonal mangoes"
          fill
          sizes="(max-width: 1024px) 100vw, 360px"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#14532d]/20" />
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const items = [
    {
      title: "Fresh Every Morning",
      text: "Products sourced daily.",
      icon: Sprout,
    },
    {
      title: "Local Delivery",
      text: "Fast delivery across Sagwara.",
      icon: Truck,
    },
    {
      title: "Handpicked Quality",
      text: "Each product is checked before delivery.",
      icon: PackageCheck,
    },
    {
      title: "Trusted Local Store",
      text: "Serving our community with care.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Why choose SARVAA Fresh"
        title="A local store experience, polished for online shopping"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#14532d]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-bold text-zinc-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="rounded-[24px] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4CAF50]">
            Stay fresh
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-950">
            Get seasonal arrivals and daily freshness updates.
          </h2>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14532d] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0f3f23]"
        >
          Browse Fresh Picks
          <Heart className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function SocialSection({ settings }: { settings: PublicSettings }) {
  const instagramUrl = settings.contact.instagramUrl?.trim();
  const whatsappChannelUrl = settings.contact.whatsappChannelUrl?.trim();

  return (
    <section className="rounded-[24px] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4CAF50]">
            Stay Connected
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-950">
            Follow our latest arrivals, seasonal fruits and daily updates.
          </h2>
        </div>
        {(instagramUrl || whatsappChannelUrl) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-white px-5 py-3 text-sm font-bold text-zinc-800 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 hover:shadow-lg hover:shadow-pink-900/10"
              >
                <Camera className="h-4 w-4 transition group-hover:scale-110" aria-hidden="true" />
                Instagram
              </a>
            )}
            {whatsappChannelUrl && (
              <a
                href={whatsappChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#14532d] px-5 py-3 text-sm font-bold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#0f3f23] hover:shadow-lg hover:shadow-emerald-900/20"
              >
                <MessageCircle className="h-4 w-4 transition group-hover:scale-110" aria-hidden="true" />
                Join WhatsApp Channel
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Footer({ settings }: { settings: PublicSettings }) {
  const instagramUrl = settings.contact.instagramUrl?.trim();
  const whatsappChannelUrl = settings.contact.whatsappChannelUrl?.trim();
  const instagramHandle = settings.contact.instagramHandle?.trim();
  const phone = settings.contact.phone?.trim();
  const supportEmail = settings.contact.supportEmail?.trim();
  const address = settings.business.address?.trim();
  const storeName = settings.business.name || "SARVAA Fresh";
  const city = settings.business.city?.trim();
  const state = settings.business.state?.trim();
  const pincode = settings.business.pincode?.trim();
  const deliveryArea = [city, state, pincode].filter(Boolean).join(", ");
  const storeStatus = storeStatusMessage(settings);
  const businessHours = storeStatus ?? formatStoreHours(settings);
  const contactItems = [
    phone ? { icon: Phone, label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` } : null,
    supportEmail ? { icon: Mail, label: supportEmail, href: `mailto:${supportEmail}` } : null,
    address ? { icon: MapPin, label: [address, deliveryArea].filter(Boolean).join(", ") } : null,
    { icon: Clock, label: businessHours },
  ].filter((item): item is { icon: typeof Phone; label: string; href?: string } => Boolean(item));
  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/products" },
    { label: "Categories", href: "/#categories" },
    { label: "Orders", href: "/orders" },
    { label: "Account", href: "/account" },
  ];

  const footerLinkClass =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 transition duration-200 hover:translate-x-0.5 hover:text-[#14532d]";

  return (
    <footer className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm">
      <div className="grid gap-8 p-6 text-center sm:p-8 sm:text-left lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="mx-auto max-w-sm sm:mx-0">
          <p className="text-2xl font-black tracking-tight text-[#14532d]">
            {storeName}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {settings.business.description || "Fresh fruits and vegetables delivered with care."}
          </p>
          {(instagramUrl || whatsappChannelUrl) && (
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group grid h-10 w-10 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-[#14532d] transition duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                  aria-label={instagramHandle ? `Instagram ${instagramHandle}` : "Instagram"}
                >
                  <Camera className="h-4 w-4 transition group-hover:scale-110" aria-hidden="true" />
                </a>
              )}
              {whatsappChannelUrl && (
                <a
                  href={whatsappChannelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group grid h-10 w-10 place-items-center rounded-full border border-emerald-100 bg-emerald-50 text-[#14532d] transition duration-300 hover:-translate-y-0.5 hover:bg-[#14532d] hover:text-white"
                  aria-label="Join our WhatsApp Channel"
                >
                  <MessageCircle className="h-4 w-4 transition group-hover:scale-110" aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-black text-zinc-950">Quick Links</h3>
          <div className="mt-4 flex flex-col items-center gap-3 sm:items-start">
            {quickLinks.map((link) => (
              <Link key={link.label} href={link.href} className={footerLinkClass}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-zinc-950">Support</h3>
          <div className="mt-4 flex flex-col items-center gap-3 sm:items-start">
            {whatsappChannelUrl && (
              <a
                href={whatsappChannelUrl}
                target="_blank"
                rel="noreferrer"
                className={footerLinkClass}
              >
                WhatsApp Channel
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className={footerLinkClass}
              >
                Instagram
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <h3 className="text-sm font-black text-zinc-950">Delivery Area</h3>
            {deliveryArea && <p className="mt-4 text-sm font-semibold text-zinc-600">{deliveryArea}</p>}
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-950">Business Hours</h3>
            <p className="mt-4 text-sm font-semibold text-zinc-600">Every Day</p>
            <p className="mt-1 text-sm text-zinc-500">{businessHours}</p>
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-950">Contact Us</h3>
            <div className="mt-4 flex flex-col items-center gap-3 sm:items-start">
              {contactItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </>
                );
                return item.href ? (
                  <a key={item.label} href={item.href} className={footerLinkClass}>
                    {content}
                  </a>
                ) : (
                  <p key={item.label} className="inline-flex items-start gap-1.5 text-sm font-semibold text-zinc-600">
                    {content}
                  </p>
                );
              })}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" className={footerLinkClass}>
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {instagramHandle || "Instagram"}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
              {whatsappChannelUrl && (
                <a href={whatsappChannelUrl} target="_blank" rel="noreferrer" className={footerLinkClass}>
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Join our WhatsApp Channel
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-emerald-100 px-6 py-4 text-sm font-semibold text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© 2026 {storeName}</p>
        <p>Built with ♥{city ? ` in ${city}` : ""}</p>
      </div>
    </footer>
  );
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
    <div className="rounded-[20px] border border-emerald-100 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#14532d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0f3f23]"
      >
        Retry
      </button>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<ProductListResponse | null>(null);
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [settings, setSettings] = useState<PublicSettings>(() =>
    normalizeSettings(null),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () =>
      products
        ? {
            ...products,
            items: products.items.filter(
              (item) =>
                item.category?.isActive !== false &&
                item.category?.deletedAt == null,
            ),
          }
        : null,
    [products],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [productData, categoryData, settingsData] = await Promise.all([
          get<ProductListResponse>(
            "/products?limit=8&page=1&isActive=true&sortBy=updatedAt&sortOrder=desc",
          ),
          get<CategoryListResponse>(
            "/categories?limit=8&page=1&isActive=true",
          ),
          get<PublicSettings>("/settings/public", { skipAuth: true }),
        ]);
        if (cancelled) return;
        setProducts(productData);
        setCategories(categoryData);
        setSettings(normalizeSettings(settingsData));
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
    <div className="space-y-12 pb-8">
      <Hero settings={settings} />
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
          <CategorySection categories={categories} />
          <FeaturedProducts products={visibleProducts} />
          <FreshToday products={visibleProducts} />
        </>
      )}
      <PromoBanner />
      <WhyChooseUs />
      <Newsletter />
      <SocialSection settings={settings} />
      <Footer settings={settings} />
    </div>
  );
}

