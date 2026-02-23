import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  async redirects() {
    return [
      { source: "/dashboard/tipos", destination: "/dashboard/cadastros/tipos", permanent: true },
      { source: "/dashboard/tipos/:path*", destination: "/dashboard/cadastros/tipos/:path*", permanent: true },
      { source: "/favicon.ico", destination: "/bcg-logo.png", permanent: false },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "www.bostoncitygroup.biz", pathname: "/**" },
      { protocol: "https", hostname: "bcg-platform-assets.s3.us-east-1.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "bcg-platform-assets.s3.amazonaws.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
