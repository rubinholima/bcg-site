import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    localPatterns: [
      { pathname: "/api/media/proxy" },
    ],
  },
};

export default nextConfig;
