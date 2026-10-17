import type { NextConfig } from "next";

const internalBackendOrigin = (
  process.env.INTERNAL_BACKEND_ORIGIN ?? "http://localhost:3001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-d31046efea204dafa6752d35faf5d02d.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${internalBackendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
