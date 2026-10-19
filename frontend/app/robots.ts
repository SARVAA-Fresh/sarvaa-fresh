import type { MetadataRoute } from "next";

const baseUrl = "https://sarvaa-fresh.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/auth",
        "/cart",
        "/checkout",
        "/orders",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
