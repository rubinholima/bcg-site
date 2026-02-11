import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      { source: "/dashboard/tipos", destination: "/dashboard/cadastros/tipos", permanent: true },
      { source: "/dashboard/tipos/:path*", destination: "/dashboard/cadastros/tipos/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "bcg-platform-assets.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "bcg-platform-assets.s3.us-east-1.amazonaws.com", pathname: "/**" },
    ],
    localPatterns: [
      { pathname: "/api/media/proxy" },
    ],
  },
};

export default nextConfig;
