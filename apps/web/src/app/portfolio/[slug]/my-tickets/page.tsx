import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BchMyTicketsClient } from "@/components/portfolio/bch/BchMyTicketsClient";
import { buildBackendUrl } from "@/lib/apiProxy";
import type { Page } from "@/types/page";

const BCH_SLUG = "boston-city-hall";

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/page-by-slug/${encodeURIComponent(slug)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return { title: "Meus ingressos — Boston City Hall" };
}

export default async function BchMyTicketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  if (slug !== BCH_SLUG) notFound();

  const lang = langParam === "en" ? "en" : "pt";
  const portfolioPage = await getPageBySlug(slug);
  const headerBlock = portfolioPage?.content?.blocks?.find((b) => b.type === "header");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PortfolioFavicon slug={slug} logoUrl={portfolioPage?.tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={portfolioPage?.tenant?.name ?? "Boston City Hall"}
        logoUrl={portfolioPage?.tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath={`/portfolio/${slug}`}
      />
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-bold text-amber-400/95">
          {lang === "pt" ? "Meus ingressos" : "My tickets"}
        </h1>
        <BchMyTicketsClient lang={lang} />
      </main>
    </div>
  );
}
