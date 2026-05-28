import Link from "next/link";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";
import { PublicFooter } from "@/components/portfolio/PublicFooter";
import { buildBackendUrl } from "@/lib/apiProxy";
import { getImprensaMenuLinks, isImprensaPageOnlyBlock } from "@/lib/imprensa-display";

async function getTenantBySlug(slug: string): Promise<{ id: string; name: string; slug: string; logoUrl: string | null } | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/tenants/${encodeURIComponent(slug)}`), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { id: string; name: string; slug: string; logoUrl: string | null };
  } catch {
    return null;
  }
}

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/page-by-slug/${encodeURIComponent(slug)}`), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const page = (await res.json()) as Page;
    if (!page.tenant && slug) {
      const tenant = await getTenantBySlug(slug);
      if (tenant) (page as Page & { tenant?: { id: string; name: string; slug: string; logoUrl: string | null } }).tenant = tenant;
    }
    return page;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const name = page?.tenant?.name ?? slug;
  const logoUrl = page?.tenant?.logoUrl;
  // Favicon: sempre o logo do clube/empresa (nunca trocar por outro)
  const iconUrl = logoUrl ? getPublicImageUrl(logoUrl) : "/favicon.ico";
  return {
    title: name,
    description: page ? `Página oficial — ${name}` : undefined,
    icons: { icon: iconUrl },
  };
}

const GENERIC_BLOCK_TYPES = [
  "header",
  "footer",
  "section",
  "text",
  "custom",
  "proximos_jogos",
  "ultimos_resultados",
  "times_categorias",
  "noticias",
  "calendario",
  "tabela",
  "patrocinadores",
  "galeria",
  "hino",
  "imprensa",
  "sobre",
  "servicos",
  "produtos",
  "equipe",
  "clientes",
  "contato",
  "hero",
  "highlights",
  "what",
  "clubs",
  "companies",
  "eventos",
  "founder",
  "how",
  "cta",
  "logo_carousel",
  "diferenciais",
  "numeros",
  "como_funciona",
  "faq",
  "formulario_captura",
  "imoveis_destaque",
  "galeria_eventos",
];

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default async function PortfolioSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const page = await getPageBySlug(slug);
  const defaultLang = (page?.content?.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;

  if (!page?.content?.blocks?.length) {
    const emptyTheme = page?.content?.theme ?? {};
    const emptyBg = (emptyTheme.backgroundColor as string)?.trim() || "#0f0f12";
    const emptyText = (emptyTheme.textColor as string)?.trim() || "#fafafa";
    const emptyAccent = (emptyTheme.accentColor as string)?.trim() || "#fbbf24";
    return (
      <>
        <PortfolioFavicon slug={slug} logoUrl={page?.tenant?.logoUrl} />
        <div
          className="flex min-h-screen flex-col items-center justify-center px-4"
          style={{ backgroundColor: emptyBg, color: emptyText }}
        >
          <p className="text-lg opacity-80">
            {page ? "Esta página ainda não tem conteúdo. Edite em Dashboard → Páginas." : "Perfil em breve / Profile coming soon"}
          </p>
          <Link href="/" className="mt-4 text-sm font-medium hover:opacity-90" style={{ color: emptyAccent }}>
            ← Voltar / Back
          </Link>
        </div>
      </>
    );
  }

  const tenant = page.tenant;
  const theme = page.content.theme ?? {};
  const blocks = sortBlocks(page.content.blocks);
  const contentBlocks = blocks.filter((b) => {
    const t = String(b.type ?? "").toLowerCase();
    if (t === "header" || t === "footer") return false;
    const v = b.config?.visible as boolean | string | undefined;
    if (v === false || v === "false") return false;
    if (isImprensaPageOnlyBlock(b)) return false;
    return GENERIC_BLOCK_TYPES.some((k) => String(k).toLowerCase() === t);
  });
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");
  const extraNavLinks = getImprensaMenuLinks(blocks, slug, lang);

  const bgColor = (theme.backgroundColor as string)?.trim() || "#0f0f12";
  const bgImage = (theme.backgroundImage as string)?.trim();
  const overlayOpacity = typeof theme.backgroundOverlayOpacity === "number"
    ? theme.backgroundOverlayOpacity
    : typeof theme.backgroundOverlayOpacity === "string"
      ? parseFloat(theme.backgroundOverlayOpacity) || 0.75
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
          <div
            className="absolute inset-0 bg-zinc-950"
            style={{ opacity: overlayOpacity }}
          />
        </div>
      )}
      <PortfolioFavicon slug={slug} logoUrl={tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenant?.name ?? slug}
        logoUrl={tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        extraNavLinks={extraNavLinks}
      />

      {/* Módulos no meio */}
      <main>
        {contentBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} slug={slug} lang={lang} page={page} />
        ))}

        <PublicFooter
          block={footerBlock}
          theme={theme}
          defaultText={tenant?.name ?? slug}
          defaultLinks={[{ label: "Boston City Group", href: "/" }]}
          accentColor={accentColor}
        />
      </main>
    </div>
  );
}
