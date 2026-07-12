import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { CustomerAuthProvider } from "@/lib/customer-auth/CustomerAuthProvider";
import { CartProvider } from "@/lib/cart/CartProvider";
import { RouteShell } from "@/components/RouteShell";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "SARVAA Fresh",
  description: "SARVAA Fresh storefront and admin portal",
  icons: {
    icon: "/sarvaa-fresh-logo-v2.png",
    apple: "/sarvaa-fresh-logo-v2.png",
  },
  openGraph: {
    title: "SARVAA Fresh",
    description: "SARVAA Fresh storefront and admin portal",
    images: ["/sarvaa-fresh-logo-v2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <RouteShell>{children}</RouteShell>
            </CartProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
