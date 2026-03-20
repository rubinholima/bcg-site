import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";
import { getAppBaseUrl, getBackendOriginForServerFetch } from "@/lib/apiProxy";
import { normalizeEventSlugParam, publicEventSlugLookupVariants } from "@/lib/event-slug";

export interface EventPublicDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  organizer: string;
  tenantId: string | null;
  tenantName?: string | null;
  tenant?: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  category: string;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  content: { theme?: Record<string, unknown>; blocks?: HomeContentBlock[] };
  status: string;
}

async function fetchPublishedEventOnce(slug: string): Promise<EventPublicDto | null> {
  const encoded = encodeURIComponent(slug);
  const urls = [
    `${getBackendOriginForServerFetch()}/public/events/${encoded}`,
    `${getAppBaseUrl().replace(/\/$/, "")}/api/public/events/${encoded}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as EventPublicDto;
    } catch {
      /* tenta próxima origem */
    }
  }
  return null;
}

async function fetchPublishedEventResolved(rawSlug: string): Promise<EventPublicDto | null> {
  for (const s of publicEventSlugLookupVariants(rawSlug)) {
    const ev = await fetchPublishedEventOnce(s);
    if (ev) return ev;
  }
  return null;
}

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

const GENERIC_BLOCK_TYPES = [
  "header", "footer", "section", "text", "custom",
  "proximos_jogos", "ultimos_resultados", "times_categorias", "noticias", "calendario", "tabela",
  "patrocinadores", "galeria", "galeria_eventos", "sobre", "servicos", "produtos", "equipe", "clientes", "contato",
  "hero", "highlights", "what", "founder", "how", "cta", "logo_carousel", "clubs", "companies", "eventos",
];

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchPublishedEventResolved(slug);
  const name = event?.name ?? slug;
  const logoUrl = event?.logoUrl ?? event?.tenant?.logoUrl;
  const iconUrl = logoUrl ? getPublicImageUrl(logoUrl) : "/favicon.ico";
  return {
    title: name,
    description: event?.description ?? undefined,
    icons: { icon: iconUrl },
  };
}

export default async function EventoSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const { lang: langParam } = await searchParams;
  const event = await fetchPublishedEventResolved(rawSlug);

  if (event && event.slug !== rawSlug.trim()) {
    redirect(`/eventos/${encodeURIComponent(event.slug)}`);
  }

  const defaultLang = (event?.content?.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;

  if (!event) {
    const suggestion = normalizeEventSlugParam(rawSlug);
    const showSuggestedSlug = Boolean(suggestion && suggestion !== rawSlug.trim());
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 bg-zinc-950 text-white">
        <p className="text-lg text-zinc-300">Evento não encontrado.</p>
        {showSuggestedSlug ? (
          <Link
            href={`/eventos/${encodeURIComponent(suggestion)}`}
            className="text-sm font-medium text-amber-400 hover:underline"
          >
            Tentar /eventos/{suggestion}
          </Link>
        ) : null}
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Início
        </Link>
      </div>
    );
  }

  if (!event.content?.blocks?.length) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <PortfolioFavicon slug={event.slug} logoUrl={event.logoUrl ?? event.tenant?.logoUrl} />
        <PublicPortfolioHeader
          slug={event.slug}
          tenantName={event.name}
          logoUrl={event.logoUrl ?? event.tenant?.logoUrl}
          headerBlock={undefined}
          lang={lang}
          basePath="/eventos"
        />
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
          <p className="max-w-md text-lg text-zinc-300">
            Este evento ainda não tem conteúdo público. Configure a página do evento no painel administrativo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            <Link href="/" className="text-sm font-medium text-amber-400 hover:underline">
              ← Início
            </Link>
            <Link href={`/imprensa?event=${encodeURIComponent(event.slug)}`} className="text-sm text-zinc-400 hover:text-white">
              Imprensa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /** Adapta evento para Page (BlockRenderer espera Page) */
  const page: Page = {
    id: event.id,
    tenantId: event.tenant?.id ?? event.id,
    slug: event.slug,
    title: event.name,
    content: event.content,
    createdAt: "",
    updatedAt: "",
    tenant: event.tenant ?? undefined,
  };

  const theme = event.content.theme ?? {};
  const blocks = sortBlocks(event.content.blocks);
  const contentBlocks = blocks.filter((b) => {
    const t = String(b.type ?? "").toLowerCase();
    if (t === "header" || t === "footer") return false;
    return GENERIC_BLOCK_TYPES.some((k) => String(k).toLowerCase() === t);
  });
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");

  const base = getBackendOriginForServerFetch();
  let uploadToken: string | null = null;
  try {
    const tokenRes = await fetch(
      `${base}/public/events/${encodeURIComponent(event.slug)}/upload-url`,
      { cache: "no-store" },
    );
    if (tokenRes.ok) {
      const data = (await tokenRes.json()) as { token?: string };
      uploadToken = data?.token ?? null;
    }
  } catch {
    // ignora
  }

  const bgColor = (theme.backgroundColor as string)?.trim() || "#0f0f12";
  const bgImage = (theme.backgroundImage as string)?.trim();
  const overlayOpacity = typeof theme.backgroundOverlayOpacity === "number"
    ? theme.backgroundOverlayOpacity
    : 0.75;
  const textColor = (theme.textColor as string)?.trim() || "#fafafa";
  const accentColor = (theme.accentColor as string)?.trim() || "#fbbf24";
  const fontFamily = (theme.fontFamily as string)?.trim();

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: bgImage ? undefined : bgColor,
        color: textColor,
        fontFamily: fontFamily || undefined,
        ["--portfolio-accent" as string]: accentColor,
      }}
    >
      {bgImage && (
        <div className="fixed inset-0 -z-10">
          <SmartImage
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <PortfolioFavicon slug={event.slug} logoUrl={event.logoUrl ?? event.tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={event.slug}
        tenantName={event.name}
        logoUrl={event.logoUrl ?? event.tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath="/eventos"
      />

      <main>
        {contentBlocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            slug={event.slug}
            lang={lang}
            page={page}
            initialUploadToken={uploadToken}
          />
        ))}

        <footer
          className="border-t border-white/5 px-4 py-6"
          style={{
            backgroundColor: (footerBlock?.config?.backgroundColor as string)?.trim() || undefined,
            color: (footerBlock?.config?.footerTextColor as string)?.trim() || undefined,
          }}
        >
          <div className="container mx-auto flex flex-col items-center gap-2 text-center text-sm">
            <span>{event.name}</span>
            <Link href="/" className="hover:opacity-90" style={{ color: accentColor }}>
              Boston City Group
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
