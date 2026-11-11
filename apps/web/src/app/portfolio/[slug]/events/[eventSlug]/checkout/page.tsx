import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildBackendUrl, getAppBaseUrl, getBackendOriginForServerFetch } from "@/lib/apiProxy";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BchCheckoutFlow } from "@/components/portfolio/modules/BchCheckoutFlow";
import { fetchBchPublicEventBySlug, type BchPublicEventDetail } from "@/lib/bch-public-events";
import type { Page } from "@/types/page";
import { getPortfolioPublicContextServer } from "@/components/portfolio/portfolio-public-path";

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

async function fetchEventDetail(
  eventSlug: string,
  pathBase?: string,
): Promise<BchPublicEventDetail | null> {
  const encoded = encodeURIComponent(eventSlug);
  const urls = [
    `${getBackendOriginForServerFetch()}/public/boston-city-hall/events/${encoded}`,
    `${getAppBaseUrl().replace(/\/$/, "")}/api/public/boston-city-hall/events/${encoded}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as BchPublicEventDetail | null;
      if (data && typeof data === "object" && "slug" in data) return data;
    } catch {
      /* próxima origem */
    }
  }
  return fetchBchPublicEventBySlug(eventSlug, { pathBase });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
}): Promise<Metadata> {
  const { eventSlug } = await params;
  const event = await fetchEventDetail(eventSlug);
  return {
    title: event ? `Checkout — ${event.name}` : "Checkout",
  };
}

export default async function BchCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, eventSlug } = await params;
  const { lang: langParam } = await searchParams;

  if (slug !== BCH_SLUG) notFound();

  const pathBase = (await getPortfolioPublicContextServer(slug)).pathBase;
  const eventsListHref = pathBase === "" ? "/events" : `${pathBase}/events`;
  const event = await fetchEventDetail(eventSlug, pathBase);
  const portfolioPage = await getPageBySlug(slug);
  const lang = langParam === "en" ? "en" : "pt";

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-white">
        <p>{lang === "pt" ? "Evento não encontrado." : "Event not found."}</p>
        <Link href={eventsListHref} className="text-amber-400 hover:underline">
          ← Eventos
        </Link>
      </div>
    );
  }

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
        basePath={pathBase}
      />
      <main className="px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
          {lang === "pt" ? "Comprar ingressos" : "Buy tickets"}
        </h1>
        <p className="mb-8 text-center text-zinc-400">{event.name}</p>
        <BchCheckoutFlow event={event} portfolioSlug={slug} pathBase={pathBase} lang={lang} />
      </main>
    </div>
  );
}
