import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
