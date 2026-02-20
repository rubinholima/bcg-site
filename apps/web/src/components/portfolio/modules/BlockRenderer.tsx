import Image from "next/image";
import type { CSSProperties } from "react";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { AnimateInView } from "@/components/home/AnimateInView";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Globe,
  Layers,
  Linkedin,
  Instagram,
  Star,
  Target,
  Trophy,
  Twitter,
  User,
  Users,
  Zap,
} from "lucide-react";
import { FounderBioExpandable } from "@/components/founder/FounderBioExpandable";
import { LogoCarouselSection } from "@/components/portfolio/modules/LogoCarouselSection";
import { ProximosJogosSection } from "@/components/portfolio/modules/ProximosJogosSection";
import { UltimosResultadosSection } from "@/components/portfolio/modules/UltimosResultadosSection";
import { NoticiasSection } from "@/components/portfolio/modules/NoticiasSection";
import { GaleriaSection } from "@/components/portfolio/modules/GaleriaSection";
import { PatrocinadoresSection } from "@/components/portfolio/modules/PatrocinadoresSection";
import { TimesCategoriasSection } from "@/components/portfolio/modules/TimesCategoriasSection";
import { SectionBlockRenderer } from "@/components/portfolio/modules/SectionBlockRenderer";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS_ICON_MAP: Record<string, LucideIcon> = {
  Trophy,
  Globe,
  Layers,
  Award,
  Target,
  Zap,
  Building2,
  Users,
  Star,
  BarChart3,
  Briefcase,
};

function blockTitle(block: HomeContentBlock, lang: "pt" | "en"): string {
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

function getHeroOverlayStyle(block: HomeContentBlock): CSSProperties {
  const op = blockOverlayOpacity(block);
  const mode = (block.config?.overlayMode as "solid" | "gradient-bottom" | "gradient-right") || "solid";
  const c = (block.config?.overlayColor as string)?.trim();
  const color = c && /^#[0-9A-Fa-f]{3,8}$/.test(c) ? c : "rgb(9 9 11)";
  if (mode === "gradient-bottom") {
    return { background: `linear-gradient(to bottom, transparent 0%, ${color} ${100 - op * 100}%)`, opacity: 1 };
  }
  if (mode === "gradient-right") {
    return { background: `linear-gradient(to right, transparent 0%, ${color} ${100 - op * 100}%)`, opacity: 1 };
  }
  return { backgroundColor: color, opacity: op };
}

function getEffectiveFullWidth(
  block: HomeContentBlock,
  page: Page,
  inSection?: boolean,
): boolean {
  if (inSection) return true;
  const blockMode = block.config?.contentWidth as "box" | "full" | undefined;
  const themeMode = page.content?.theme?.contentWidth as "box" | "full" | undefined;
  if (blockMode === "full") return true;
  if (blockMode === "box") return false;
  return themeMode === "full";
}

function getEffectiveTitleAlign(
  block: HomeContentBlock,
  page: Page,
): "left" | "center" | "right" {
  const blockAlign = block.config?.titleAlign as "left" | "center" | "right" | undefined;
  const themeAlign = page.content?.theme?.titleAlign as "left" | "center" | "right" | undefined;
  return blockAlign ?? themeAlign ?? "left";
}

export function BlockRenderer({
  block,
  slug,
  lang,
  page,
  inSection,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
  inSection?: boolean;
}) {
  const visible = block.config?.visible !== false;
  if (!visible) return null;

  const fullWidth = getEffectiveFullWidth(block, page, inSection);
  const titleAlign = getEffectiveTitleAlign(block, page);
  const tenant = page.tenant;
  const title = blockTitle(block, lang);
  const body = blockBody(block, lang);
  const imgUrl = (block.config?.imageUrl as string) || undefined;
  const bgImg = (block.config?.backgroundImage as string) || undefined;

  if (block.type === "section") {
    return (
      <SectionBlockRenderer block={block} slug={slug} lang={lang} page={page} />
    );
  }

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

    const align = (block.config?.contentAlign as "left" | "center" | "right") || "center";
    const vAlign = (block.config?.verticalAlign as "top" | "center" | "bottom") || "center";
    const titleSize = (block.config?.titleSize as "xl" | "2xl" | "3xl") || "2xl";
    const subStyle = (block.config?.subtitleStyle as "normal" | "uppercase" | "highlighted") || "normal";
    const heightClass =
      (block.config?.heroHeight as string) === "screen"
        ? "min-h-screen"
        : (block.config?.heroHeight as string) === "large"
          ? "min-h-[80vh]"
          : (block.config?.heroHeight as string) === "compact"
            ? "min-h-[50vh]"
            : "min-h-[60vh]";
    const heroSubtitle = (lang === "pt" ? (block.config?.subtitlePT as string) : (block.config?.subtitleEN as string))?.trim() || "";
    const heroDesc = (lang === "pt" ? (block.config?.descriptionPT as string) : (block.config?.descriptionEN as string))?.trim() || "";
    const primary = (block.config?.primaryCTA as { labelPT?: string; labelEN?: string; href?: string }) || {};
    const secondary = (block.config?.secondaryCTA as { labelPT?: string; labelEN?: string; href?: string; variant?: string }) || {};
    const primaryLabel = (lang === "pt" ? primary.labelPT : primary.labelEN)?.trim();
    const primaryHref = primary.href?.trim() || "#";
    const secondaryLabel = (lang === "pt" ? secondary.labelPT : secondary.labelEN)?.trim();
    const secondaryHref = secondary.href?.trim() || "#";
    const secondaryVariant = secondary.variant === "ghost" ? "ghost" : "outline";
    const isExternal = (href: string) => href.startsWith("http://") || href.startsWith("https://");
    const titleSizeClass =
      titleSize === "xl"
        ? "text-2xl sm:text-3xl md:text-4xl"
        : titleSize === "3xl"
          ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
          : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
    const justifyClass = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
    const textAlignClass = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
    const itemsClass = vAlign === "top" ? "justify-start" : vAlign === "bottom" ? "justify-end" : "justify-center";

    const heroContent = (
      <div className={`relative z-10 flex min-h-full w-full flex-col px-6 py-20 sm:px-10 sm:py-24 lg:px-14 ${itemsClass} ${heroSlides.length === 0 ? heightClass : ""}`}>
        <div className={`w-full ${textAlignClass} flex flex-col gap-1 ${align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center"}`}>
          {title && (
            <h1 className={`hero-title animate-hero-reveal font-bold text-white leading-tight ${titleSizeClass}`}>
              {title}
            </h1>
          )}
          {heroSubtitle && (
            <p
              className={`animate-hero-reveal animate-delay-200 text-base leading-relaxed text-zinc-200 sm:text-lg ${
                subStyle === "uppercase" ? "uppercase tracking-wider" : subStyle === "highlighted" ? "border-l-4 border-amber-500 pl-4 mt-1" : "mt-1"
              }`}
              style={subStyle === "highlighted" ? { textShadow: "0 2px 12px rgba(0,0,0,0.4)" } : undefined}
            >
              {heroSubtitle}
            </p>
          )}
          {(body?.trim() || heroDesc) && (
            <p className="mt-3 animate-hero-reveal animate-delay-300 text-sm text-zinc-300/90 leading-relaxed sm:text-base">
              {heroDesc || body}
            </p>
          )}
          {(primaryLabel || secondaryLabel) && (
            <div className={`mt-6 flex flex-wrap gap-3 animate-hero-reveal animate-delay-400 ${justifyClass}`}>
              {primaryLabel && (
                <a href={primaryHref} target={isExternal(primaryHref) ? "_blank" : undefined} rel={isExternal(primaryHref) ? "noopener noreferrer" : undefined}>
                  <Button size="lg" className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-black shadow-lg hover:bg-amber-400">
                    {primaryLabel}
                  </Button>
                </a>
              )}
              {secondaryLabel && (
                <a href={secondaryHref} target={isExternal(secondaryHref) ? "_blank" : undefined} rel={isExternal(secondaryHref) ? "noopener noreferrer" : undefined}>
                  <Button variant={secondaryVariant as "outline" | "ghost"} size="lg" className="h-12 rounded-xl border-white/20 bg-white/5 px-8 text-white hover:bg-white/10">
                    {secondaryLabel}
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <section
        key={block.id}
        className={`relative overflow-hidden border-b border-white/5 ${heightClass}`}
        style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
      >
        {heroSlides.length > 0 ? (
          <HeroCarousel
            slides={heroSlides}
            effect={effect}
            overlayOpacity={overlay}
            intervalSeconds={intervalSeconds}
            lang={lang}
            overlayMode={(block.config?.overlayMode as "solid" | "gradient-bottom" | "gradient-right") || "solid"}
            overlayColor={(block.config?.overlayColor as string)?.trim() || undefined}
          >
            {heroContent}
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
                <div className="absolute inset-0" style={getHeroOverlayStyle(block)} />
              </div>
            )}
            {heroContent}
          </>
        )}
      </section>
    );
  }

  if (block.type === "highlights") {
    const highlightsArr = (lang === "pt" ? (block.config?.highlightsPt as string[]) : (block.config?.highlightsEn as string[])) ?? [];
    const texts: [string, string, string] = [
      highlightsArr[0] ?? "",
      highlightsArr[1] ?? "",
      highlightsArr[2] ?? "",
    ];
    const iconNames = (Array.isArray(block.config?.highlightsIcons) ? block.config.highlightsIcons : ["Trophy", "Globe", "Layers"]) as string[];
    const defaultIcons = [Trophy, Globe, Layers] as const;
    const containerClass = fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8";
    return (
      <AnimateInView key={block.id}>
        <section
          className={`border-b border-white/5 py-14 sm:py-20`}
          style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
        >
          <div className={containerClass}>
            <ul className="grid gap-6 sm:grid-cols-3">
              {texts.map((text, i) => {
                const IconComponent = HIGHLIGHTS_ICON_MAP[iconNames[i] ?? ""] ?? defaultIcons[i];
                return (
                  <li
                    key={i}
                    className="rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-6 text-center transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                  >
                    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <IconComponent className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-medium text-zinc-300 sm:text-base">{text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </AnimateInView>
    );
  }

  if (block.type === "logo_carousel") {
    return <LogoCarouselSection key={block.id} block={block} lang={lang} />;
  }

  if (block.type === "noticias") {
    return <NoticiasSection key={block.id} block={block} lang={lang} fullWidth={fullWidth} titleAlign={titleAlign} />;
  }

  if (block.type === "galeria") {
    return <GaleriaSection key={block.id} block={block} lang={lang} fullWidth={fullWidth} titleAlign={titleAlign} />;
  }

  if (block.type === "patrocinadores") {
    return <PatrocinadoresSection key={block.id} block={block} lang={lang} fullWidth={fullWidth} titleAlign={titleAlign} />;
  }

  if (block.type === "times_categorias") {
    return <TimesCategoriasSection key={block.id} block={block} lang={lang} fullWidth={fullWidth} titleAlign={titleAlign} />;
  }

  if (block.type === "proximos_jogos") {
    return (
      <ProximosJogosSection
        key={block.id}
        block={block}
        slug={slug}
        lang={lang}
        ourTeamName={tenant?.name}
        ourTeamLogoUrl={tenant?.logoUrl}
        fullWidth={fullWidth}
        titleAlign={titleAlign}
      />
    );
  }

  if (block.type === "ultimos_resultados") {
    return (
      <UltimosResultadosSection
        key={block.id}
        block={block}
        slug={slug}
        lang={lang}
        ourTeamName={tenant?.name}
        ourTeamLogoUrl={tenant?.logoUrl}
        fullWidth={fullWidth}
        titleAlign={titleAlign}
      />
    );
  }

  if (String(block.type).toLowerCase() === "founder") {
    const cfg = block.config ?? {};
    const founderName = title;
    const role = (lang === "pt" ? (cfg.rolePT as string) : (cfg.roleEN as string))?.trim() || "";
    const foundedYear = (cfg.foundedYear as string)?.trim() || "";
    const biography = (lang === "pt" ? (cfg.biographyPT as string) : (cfg.biographyEN as string))?.trim() || "";
    const quote = (lang === "pt" ? (cfg.highlightQuotePT as string) : (cfg.highlightQuoteEN as string))?.trim() || "";
    const photoUrl = (cfg.founderPhoto as string)?.trim() || (cfg.imageUrl as string)?.trim() || "";
    const socials = {
      linkedin: (cfg.socialLinkedIn as string)?.trim() || "",
      instagram: (cfg.socialInstagram as string)?.trim() || "",
      twitter: (cfg.socialTwitter as string)?.trim() || "",
      website: (cfg.socialWebsite as string)?.trim() || "",
    };

    return (
      <AnimateInView key={block.id}>
        <section
          id={block.id}
          className="relative overflow-hidden border-b border-white/5 py-20 sm:py-24"
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
          <div className={`relative px-4 sm:px-6 lg:px-8 ${fullWidth ? "w-full" : "container mx-auto max-w-6xl"}`}>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 lg:items-center">
              <div className="order-2 space-y-5 lg:order-1 lg:col-span-7 lg:min-h-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
                    {lang === "pt" ? "Fundador" : "Founder"}
                  </p>
                  {founderName && (
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {founderName}
                    </h2>
                  )}
                  {(role || foundedYear) && (
                    <>
                      <div className="mt-2 h-px w-12 bg-amber-500/50" />
                      <p className="mt-2 text-zinc-400 text-sm sm:text-base">
                        {[role, foundedYear ? (lang === "pt" ? `Fundado em ${foundedYear}` : `Founded ${foundedYear}`) : ""].filter(Boolean).join(" · ")}
                      </p>
                    </>
                  )}
                </div>
                <FounderBioExpandable biography={biography} quote={quote || null} lang={lang} />
                {(socials.linkedin || socials.instagram || socials.twitter || socials.website) && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {socials.linkedin && (
                      <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-400" aria-label="LinkedIn">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {socials.instagram && (
                      <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-400" aria-label="Instagram">
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {socials.twitter && (
                      <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-400" aria-label="Twitter">
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {socials.website && (
                      <a href={socials.website} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-400" aria-label="Website">
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="order-1 flex justify-center lg:order-2 lg:col-span-5 lg:justify-end">
                {photoUrl ? (
                  <div className="relative w-full max-w-md sm:max-w-lg">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-2 ring-amber-500/20 ring-offset-2 ring-offset-zinc-900">
                      <Image
                        src={getPublicImageUrl(photoUrl)}
                        alt={founderName || "Fundador"}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 1024px) 100vw, 480px"
                        unoptimized={isProxyImageUrl(getPublicImageUrl(photoUrl))}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent pointer-events-none" />
                    </div>
                    {foundedYear && (
                      <div className="absolute -bottom-3 -right-3 flex h-16 w-16 items-center justify-center rounded-xl bg-amber-500/90 text-lg font-bold text-zinc-950 shadow-lg">
                        {foundedYear}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] w-full max-w-md sm:max-w-lg items-center justify-center rounded-2xl bg-zinc-800/80 ring-2 ring-white/10 ring-offset-2 ring-offset-zinc-900">
                    <User className="h-28 w-28 text-zinc-500" strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </AnimateInView>
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
        <div className={`relative px-4 sm:px-6 lg:px-8 ${fullWidth ? "w-full" : "container mx-auto max-w-4xl"} ${bgImg ? "text-center" : ""}`}>
          {title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
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
}
