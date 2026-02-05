import type { Metadata } from "next";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(`${apiUrl}/public/page-by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

/**
 * Favicon do portfólio: SEMPRE o logo do tenant. Definido no layout do segmento
 * para nunca ser sobrescrito pelo layout raiz ao dar refresh.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const logoUrl = page?.tenant?.logoUrl;
  const iconUrl = logoUrl ? getPublicImageUrl(logoUrl) : "/favicon.ico";
  return {
    icons: { icon: iconUrl },
  };
}

export default function PortfolioSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
