import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { Button } from "@/components/ui/button";
import { AnimateInView } from "@/components/home/AnimateInView";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";

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
  "text",
  "custom",
  "proximos_jogos",
  "times_categorias",
  "noticias",
  "calendario",
  "tabela",
  "patrocinadores",
  "galeria",
  "sobre",
  "servicos",
  "produtos",
  "equipe",
  "clientes",
  "contato",
  "hero",
  "highlights",
  "what",
  "founder",
  "how",
  "cta",
];

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

function blockTitle(
  block: HomeContentBlock,
  lang: "pt" | "en",
): string {
  const v = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  return (v && String(v).trim()) ? String(v) : "";
}

function blockBody(block: HomeContentBlock, lang: "pt" | "en"): string {
  const v = lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn;
  return (v && String(v).trim()) ? String(v) : "";
}

function blockBgColor(block: HomeContentBlock): string | undefined {
  return (block.config?.backgroundColor as string)?.trim() || undefined;
}

function blockOverlayOpacity(block: HomeContentBlock): number {
  const v = block.config?.backgroundOverlayOpacity;
  if (typeof v === "number" && v >= 0 && v <= 1) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
  }
  return 0.75;
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
  const lang = langParam === "en" ? "en" : "pt";

  const page = await getPageBySlug(slug);

  if (!page?.content?.blocks?.length) {
    return (
      <>
        <PortfolioFavicon logoUrl={page?.tenant?.logoUrl} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
          <p className="text-lg text-zinc-400">
            {page ? "Esta página ainda não tem conteúdo. Edite em Dashboard → Páginas." : "Perfil em breve / Profile coming soon"}
          </p>
          <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300">
            ← Voltar / Back
          </Link>
        </div>
      </>
    );
  }

  const tenant = page.tenant;
  const blocks = sortBlocks(page.content.blocks);
  const contentBlocks = blocks.filter(
    (b) => b.type !== "header" && b.type !== "footer" && GENERIC_BLOCK_TYPES.includes(b.type),
  );
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PortfolioFavicon logoUrl={tenant?.logoUrl} />
      {/* 1. Cabeçalho fixo: cor de fundo e texto do bloco header */}
      <header
        className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl"
        style={{
          backgroundColor: (headerBlock?.config?.backgroundColor as string)?.trim() || "#18181b",
          color: (headerBlock?.config?.headerTextColor as string)?.trim() || undefined,
        }}
      >
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold hover:opacity-90" style={{ color: (headerBlock?.config?.headerTextColor as string)?.trim() || undefined }}>
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
            ) : null}
            <span>{tenant?.name ?? slug}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/portfolio/${slug}?lang=pt`}>
              <Button variant={lang === "pt" ? "default" : "ghost"} size="sm">PT</Button>
            </Link>
            <Link href={`/portfolio/${slug}?lang=en`}>
              <Button variant={lang === "en" ? "default" : "ghost"} size="sm">EN</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">← Home</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Módulos no meio */}
      <main>
        {contentBlocks.map((block) => {
          const title = blockTitle(block, lang);
          const body = blockBody(block, lang);
          const imgUrl = (block.config?.imageUrl as string) || undefined;
          const bgImg = (block.config?.backgroundImage as string) || undefined;

          if (block.type === "hero") {
            const heroSlidesRaw = block.config?.heroSlides as Array<{ url?: string; titlePt?: string; titleEn?: string }> | undefined;
            const heroImagesLegacy = (block.config?.heroImages as string[] | undefined)?.filter((u) => u?.trim()) ?? [];
            const heroSlidesBase =
              Array.isArray(heroSlidesRaw) && heroSlidesRaw.length > 0
                ? heroSlidesRaw.filter((s) => s?.url?.trim()).map((s) => ({ url: s.url!, titlePt: s.titlePt, titleEn: s.titleEn }))
                : heroImagesLegacy.map((url) => ({ url, titlePt: "", titleEn: "" }));
            const heroSlides = heroSlidesBase.map((s) => ({
              url: getPublicImageUrl(s.url),
              titlePt: s.titlePt,
              titleEn: s.titleEn,
            }));
            const overlay = blockOverlayOpacity(block);
            const effect = (block.config?.heroCarouselEffect as "fade" | "slide" | "zoom") ?? "fade";
            const intervalSeconds = (block.config?.heroCarouselIntervalSeconds as 5 | 10 | 15) ?? 10;
            const singleBg =
              heroSlidesBase.length > 0
                ? getPublicImageUrl(heroSlidesBase[0].url)
                : getPublicImageUrl(bgImg);

            return (
              <section
                key={block.id}
                className="relative min-h-[70vh] overflow-hidden border-b border-white/5 flex flex-col justify-center"
                style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
              >
                {heroSlides.length > 0 ? (
                  <HeroCarousel
                    slides={heroSlides}
                    effect={effect}
                    overlayOpacity={overlay}
                    intervalSeconds={intervalSeconds}
                    lang={lang}
                  >
                    <div className="container relative mx-auto max-w-4xl px-4 py-20 text-center">
                      {title && (
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                          {title}
                        </h1>
                      )}
                      {body?.trim() && (
                        <p className="mt-4 text-zinc-300">{body}</p>
                      )}
                    </div>
                  </HeroCarousel>
                ) : (
                  <>
                    {singleBg && (
                      <div className="absolute inset-0">
                        <Image
                          src={singleBg}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="100vw"
                          unoptimized={isProxyImageUrl(singleBg)}
                        />
                        <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlay }} />
                      </div>
                    )}
                    <div className="container relative mx-auto max-w-4xl px-4 py-20 text-center">
                      {title && (
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                          {title}
                        </h1>
                      )}
                      {body?.trim() && <p className="mt-4 text-zinc-300">{body}</p>}
                    </div>
                  </>
                )}
              </section>
            );
          }

          if (!title && !body?.trim() && !imgUrl) return null;

          return (
            <AnimateInView key={block.id}>
              <section
                id={block.id}
                className="relative overflow-hidden border-b border-white/5 py-16 sm:py-20"
                style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
              >
                {bgImg && (
                  <div className="absolute inset-0">
                    <Image
                      src={getPublicImageUrl(bgImg)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100vw"
                      unoptimized={isProxyImageUrl(getPublicImageUrl(bgImg))}
                    />
                    <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
                  </div>
                )}
                <div className={`container relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 ${bgImg ? "text-center" : ""}`}>
                  {title && (
                    <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {title}
                    </h2>
                  )}
                  {body?.trim() && (
                    <p className="mt-4 whitespace-pre-wrap text-zinc-300">{body}</p>
                  )}
                  {imgUrl && (
                    <div className="relative mx-auto mt-8 aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10">
                      <Image
                        src={getPublicImageUrl(imgUrl)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 672px"
                        unoptimized={isProxyImageUrl(getPublicImageUrl(imgUrl))}
                      />
                    </div>
                  )}
                </div>
              </section>
            </AnimateInView>
          );
        })}

        {/* Rodapé fixo: cor de fundo e texto do bloco footer */}
        <footer
          className="border-t border-white/5 px-4 py-6"
          style={{
            backgroundColor: (footerBlock?.config?.backgroundColor as string)?.trim() || undefined,
            color: (footerBlock?.config?.footerTextColor as string)?.trim() || undefined,
          }}
        >
          <div className="container mx-auto flex flex-col items-center gap-2 text-center text-sm">
            <span>{tenant?.name ?? slug}</span>
            <Link href="/" className="text-amber-400 hover:text-amber-300">
              Boston City Group
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
