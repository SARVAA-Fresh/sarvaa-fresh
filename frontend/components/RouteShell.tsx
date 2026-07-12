"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";

export function RouteShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return <StorefrontChrome>{children}</StorefrontChrome>;
}
