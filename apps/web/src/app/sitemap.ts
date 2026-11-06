import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const customDomain = h.get("x-cup360-custom-domain") === "1";
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host")?.split(",")[0]?.trim() || "";

  if (customDomain && host) {
    const base = `https://${host}`;
    const paths = ["/", "/imprensa", "/events"].map((p) => ({
      url: `${base}${p === "/" ? "" : p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : 0.8,
    }));
    return paths;
  }

  const site = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.bostoncitygroup.biz";
  const slug = "portfolio";
  return [
    { url: site, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${site}/${slug}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];
}
