import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const DISALLOW = ["/dashboard/", "/login/", "/api/", "/_next/"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const customDomain = h.get("x-cup360-custom-domain") === "1";
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.split(",")[0]?.trim() || "";

  if (customDomain && host) {
    const base = `https://${host}`;
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }],
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  }

  const site = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.bostoncitygroup.biz";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOW }],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
