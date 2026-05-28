import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { PublicFooter } from "@/components/portfolio/PublicFooter";
import { ImprensaPortfolioPageClient } from "@/components/press/ImprensaPortfolioPageClient";
import { buildBackendUrl } from "@/lib/apiProxy";
import {
  findImprensaPageBlock,
  getImprensaMenuLabel,
  getImprensaMenuLinks,
} from "@/lib/imprensa-display";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const page = await getPageBySlug(slug);
  const name = page?.tenant?.name ?? slug;
  const blocks = (page?.content?.blocks ?? []) as HomeContentBlock[];
  const imprensaBlock = findImprensaPageBlock(blocks);
  const defaultLang = (page?.content?.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;
  const sectionTitle = imprensaBlock ? getImprensaMenuLabel(imprensaBlock, lang) : lang === "en" ? "Press" : "Imprensa";
  return {
    title: `${sectionTitle} — ${name}`,
    description: page ? `${sectionTitle} — ${name}` : undefined,
  };
}

export default async function PortfolioImprensaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const page = await getPageBySlug(slug);

  if (!page?.content?.blocks?.length) {
    redirect(`/portfolio/${slug}`);
  }

  const blocks = page.content.blocks as HomeContentBlock[];
  const imprensaBlock = findImprensaPageBlock(blocks);
  if (!imprensaBlock) {
    redirect(`/portfolio/${slug}`);
  }

  const defaultLang = (page.content.theme as { defaultLang?: "pt" | "en" } | undefined)?.defaultLang ?? "pt";
  const lang = langParam === "en" ? "en" : langParam === "pt" ? "pt" : defaultLang;

  const tenant = page.tenant;
  const theme = page.content.theme ?? {};
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");
  const extraNavLinks = getImprensaMenuLinks(blocks, slug, lang);

  const bgColor = (theme.backgroundColor as string)?.trim() || "#0f0f12";
  const bgImage = (theme.backgroundImage as string)?.trim();
  const overlayOpacity =
    typeof theme.backgroundOverlayOpacity === "number"
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
      {bgImage ? (
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
      ) : null}

      <PortfolioFavicon slug={slug} logoUrl={tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenant?.name ?? slug}
        logoUrl={tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
        extraNavLinks={extraNavLinks}
      />

      <main>
        <div className="border-b border-white/5 bg-zinc-950/60 px-4 py-2.5 sm:px-6">
          <div className="container mx-auto">
            <Link
              href={`/portfolio/${slug}${lang === "en" ? "?lang=en" : ""}`}
              className="inline-flex min-h-10 items-center text-sm font-medium text-zinc-400 transition hover:text-zinc-100"
            >
              ← {lang === "pt" ? "Voltar ao site" : "Back to site"}
            </Link>
          </div>
        </div>

        <ImprensaPortfolioPageClient
          slug={slug}
          lang={lang}
          page={page}
          imprensaBlock={imprensaBlock}
          accentColor={accentColor}
        />

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
