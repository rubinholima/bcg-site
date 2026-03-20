import Link from "next/link";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";

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

async function getEventBySlug(slug: string): Promise<EventPublicDto | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/events/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as EventPublicDto;
  } catch {
    return null;
  }
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
  const event = await getEventBySlug(slug);
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
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const event = await getEventBySlug(slug);
  const defaultLang = (event?.content?.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;

  if (!event?.content?.blocks?.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">
          {event ? "Este evento ainda não tem conteúdo. Edite em Dashboard → Eventos." : "Evento não encontrado."}
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:opacity-90">
          ← Voltar
        </Link>
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

  const base = getServerBackendBaseUrl().replace(/\/$/, "");
  let uploadToken: string | null = null;
  try {
    const tokenRes = await fetch(`${base}/public/events/${encodeURIComponent(slug)}/upload-url`, { cache: "no-store" });
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
      <PortfolioFavicon slug={slug} logoUrl={event.logoUrl ?? event.tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={event.name}
        logoUrl={event.logoUrl ?? event.tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        basePath="/eventos"
      />

      <main>
        {contentBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} slug={slug} lang={lang} page={page} initialUploadToken={uploadToken} />
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
