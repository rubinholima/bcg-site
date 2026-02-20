"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  fetchPublicPortfolio,
  getClubSiteUrl,
  getCompanyWebsiteUrl,
  formatLocation,
  formatPhone,
  type PortfolioItem,
} from "@/lib/public-portfolio";
import { copy, type Lang } from "@/lib/home-copy";
import {
  getOrderedBlocks,
  getImagesFromBlocks,
  buildTFromBlocks,
} from "@/lib/home-content";
import { fetchGroup } from "@/lib/home-data";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { Button } from "@/components/ui/button";
import { AnimateInView } from "@/components/home/AnimateInView";
import { FounderBioExpandable } from "@/components/founder/FounderBioExpandable";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { GlobalPresenceSection } from "@/components/home/GlobalPresenceSection";
import { LogoCarouselSection } from "@/components/portfolio/modules/LogoCarouselSection";
import { LanguageSelector } from "@/components/home/LanguageSelector";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Layers,
  Linkedin,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Star,
  Target,
  Trophy,
  Twitter,
  User,
  Users,
  Zap,
} from "lucide-react";

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
  CheckCircle,
  Check,
};

const LANG_KEY = "bcg_lang";
const CLUBS_ID = "clubs";
const COMPANIES_ID = "companies";
const ABOUT_ID = "about";
const FOUNDER_ID = "founder";
const HOW_ID = "how";
const CONTACT_ID = "contact";

export default function Home() {
  const [lang, setLang] = useState<Lang>("pt");
  const [portfolio, setPortfolio] = useState<PortfolioItem[] | null>(null);
  const [groupHome, setGroupHome] = useState<Page | null>(null);
  const [groupMaster, setGroupMaster] = useState<Awaited<ReturnType<typeof fetchGroup>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "pt") setLang(stored);
  }, []);

  const group = groupMaster;
  const blocks = getOrderedBlocks(groupHome?.content ?? null);
  const t = buildTFromBlocks(blocks, lang === "pt" ? copy.pt : copy.en, lang);
  const images = getImagesFromBlocks(blocks);
  const contentBlocks = blocks.filter(
    (b) => b.type !== "header" && b.type !== "footer",
  );
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");

  const rawBlocks = groupHome?.content?.blocks;
  const rawHeader = Array.isArray(rawBlocks)
    ? rawBlocks.find((b: { type?: string }) => b.type === "header")
    : null;
  const rawConfig = (rawHeader as { config?: Record<string, unknown> } | null)?.config ?? {};
  const headerLanguageSelectedBg =
    typeof rawConfig.headerLanguageSelectedBg === "string" && rawConfig.headerLanguageSelectedBg.trim() !== ""
      ? rawConfig.headerLanguageSelectedBg.trim()
      : undefined;
  const headerLanguageSelectedText =
    typeof rawConfig.headerLanguageSelectedText === "string" && rawConfig.headerLanguageSelectedText.trim() !== ""
      ? rawConfig.headerLanguageSelectedText.trim()
      : undefined;
  const clubs = portfolio?.filter((p) => p.type === "club") ?? [];
  const companies = portfolio?.filter((p) => p.type === "company") ?? [];

  useEffect(() => {
    if (typeof document !== "undefined")
      document.title = group?.name ?? "Boston City Group";
  }, [group?.name]);

  useEffect(() => {
    const groupHomeUrl = "/api/public/group-home";
    setApiUnavailable(false);
    Promise.all([
      fetchPublicPortfolio(),
      fetch(`${groupHomeUrl}?nocache=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      }).then(async (r) => {
        if (r.status === 503) {
          const body = await r.json().catch(() => ({}));
          if (body?.error === "api_unavailable") return { __apiUnavailable: true };
        }
        return r.ok ? r.json() : null;
      }),
      fetchGroup(),
    ])
      .then(([portfolioData, pageData, groupData]: [PortfolioItem[] | null, Page | null | { __apiUnavailable: true }, Awaited<ReturnType<typeof fetchGroup>>]) => {
        const isUnavailable = pageData && typeof pageData === "object" && "__apiUnavailable" in pageData;
        if (isUnavailable) {
          setApiUnavailable(true);
          setGroupHome(null);
        } else {
          setGroupHome(pageData as Page | null);
        }
        setPortfolio(portfolioData ?? null);
        setGroupMaster(groupData ?? null);
        setError(false);
      })
      .catch(() => {
        setError(true);
        setApiUnavailable(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const setLangAndStore = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem(LANG_KEY, l);
  };

  const blockTitle = (block: HomeContentBlock, fallback: string) => {
    const override = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
    return (override && String(override).trim()) ? String(override) : fallback;
  };
  const blockImage = (block: HomeContentBlock, key: "hero" | "cta") =>
    (block.config?.backgroundImage as string) || images[key];
  const blockBgColor = (block: HomeContentBlock) =>
    (block.config?.backgroundColor as string)?.trim() || undefined;
  const blockOverlayOpacity = (block: HomeContentBlock) => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  };

  const getHeroOverlayStyle = (block: HomeContentBlock): React.CSSProperties => {
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
  };

  const heroContentAlign = (block: HomeContentBlock) =>
    (block.config?.contentAlign as "left" | "center" | "right") || "center";
  const heroVerticalAlign = (block: HomeContentBlock) =>
    (block.config?.verticalAlign as "top" | "center" | "bottom") || "center";
  const heroMaxWidth = (block: HomeContentBlock) =>
    (block.config?.maxContentWidth as "narrow" | "normal" | "wide") || "normal";
  const heroTitleSize = (block: HomeContentBlock) =>
    (block.config?.titleSize as "xl" | "2xl" | "3xl") || "2xl";
  const heroHeight = (block: HomeContentBlock) =>
    (block.config?.heroHeight as "screen" | "large" | "medium" | "compact") || "medium";

  /** Padding vertical da seção conforme "Tamanho do módulo" (compact | normal | large). */
  const sectionPaddingClass = (block: HomeContentBlock): string => {
    const size = (block.config?.sectionSize as "compact" | "normal" | "large") || "normal";
    if (size === "compact") return "py-8 sm:py-10";
    if (size === "large") return "py-20 sm:py-28";
    return "py-14 sm:py-20";
  };

  if (!loading && !groupHome) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">
        <p className="text-zinc-400 text-center">
          {apiUnavailable
            ? "Serviço temporariamente indisponível. Inicie o backend (ex: pnpm --filter api dev na raiz do projeto)."
            : "Group Home not configured."}
        </p>
        <Link href="/dashboard" className="mt-4 text-amber-400 hover:text-amber-300 text-sm">
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* 1. Cabeçalho fixo: cor de fundo e texto vêm do bloco header (se existir) */}
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 backdrop-blur-xl"
        style={{
          backgroundColor: (headerBlock?.config?.backgroundColor as string)?.trim() || "#18181b",
          color: (headerBlock?.config?.headerTextColor as string)?.trim() || undefined,
        }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-90"
            style={{ color: (headerBlock?.config?.headerTextColor as string)?.trim() || undefined }}
          >
            <>
              <img
                src="/bcg-logo.png"
                alt="Boston City Group"
                width={32}
                height={32}
                className="h-8 w-8 object-contain flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="text-lg">{group?.name || "Boston City Group"}</span>
            </>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <LanguageSelector
              key={`lang-${headerLanguageSelectedBg ?? ""}-${headerLanguageSelectedText ?? ""}`}
              lang={lang}
              onSelect={setLangAndStore}
              headerBg={(headerBlock?.config?.backgroundColor as string)?.trim() || "#18181b"}
              headerTextColor={(headerBlock?.config?.headerTextColor as string)?.trim() || "#ffffff"}
              selectedBg={headerLanguageSelectedBg}
              selectedTextColor={headerLanguageSelectedText}
            />
            <a
              href={`#${CLUBS_ID}`}
              className="hidden rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-block"
            >
              {t.nav.clubs}
            </a>
            <a
              href={`#${COMPANIES_ID}`}
              className="hidden rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-block"
            >
              {t.nav.companies}
            </a>
            <a
              href={`#${CONTACT_ID}`}
              className="hidden rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-block"
            >
              {t.nav.contact}
            </a>
            {/* Guardrail: use Button asChild + Link so the link is the clickable element (avoid <a><button> invalid markup that can block navigation in some browsers). */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="ml-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                {t.nav.dashboard}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Módulos (hero, destaques, clubes, etc.) no meio */}
      <main>
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200"
          >
            {t.errorBanner}
          </div>
        )}

        {contentBlocks.map((block) => {
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
            const heroBg =
              heroSlidesBase.length > 0
                ? getPublicImageUrl(heroSlidesBase[0].url)
                : getPublicImageUrl(blockImage(block, "hero") as string);
            const overlay = blockOverlayOpacity(block);
            const effect = (block.config?.heroCarouselEffect as "fade" | "slide" | "zoom") ?? "fade";
            const intervalSeconds = (block.config?.heroCarouselIntervalSeconds as 5 | 10 | 15) ?? 10;
            const align = heroContentAlign(block);
            const vAlign = heroVerticalAlign(block);
            const maxW = heroMaxWidth(block);
            const titleSize = heroTitleSize(block);
            const subStyle = (block.config?.subtitleStyle as "normal" | "uppercase" | "highlighted") || "normal";
            const heightClass =
              heroHeight(block) === "screen"
                ? "min-h-screen"
                : heroHeight(block) === "large"
                  ? "min-h-[80vh]"
                  : heroHeight(block) === "compact"
                    ? "min-h-[50vh]"
                    : "min-h-[60vh]";
            const heroTitle =
              (lang === "pt" ? (block.config?.titlePt as string) : (block.config?.titleEn as string))?.trim() ||
              (lang === "pt" ? t.hero.headline : t.hero.headline);
            const heroSubtitle =
              (lang === "pt" ? (block.config?.subtitlePT as string) : (block.config?.subtitleEN as string))?.trim() ||
              (lang === "pt" ? t.hero.subheadline : t.hero.subheadline);
            const heroDesc = (lang === "pt" ? (block.config?.descriptionPT as string) : (block.config?.descriptionEN as string))?.trim() || "";
            const primary = (block.config?.primaryCTA as { labelPT?: string; labelEN?: string; href?: string }) || {};
            const secondary = (block.config?.secondaryCTA as { labelPT?: string; labelEN?: string; href?: string; variant?: string }) || {};
            const primaryLabel = (lang === "pt" ? primary.labelPT : primary.labelEN)?.trim() || (lang === "pt" ? t.hero.ctaClubs : t.hero.ctaCompanies);
            const primaryHref = primary.href?.trim() || `#${CLUBS_ID}`;
            const secondaryLabel = (lang === "pt" ? secondary.labelPT : secondary.labelEN)?.trim() || (lang === "pt" ? t.hero.ctaCompanies : t.hero.ctaCompanies);
            const secondaryHref = secondary.href?.trim() || `#${COMPANIES_ID}`;
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
              <div
                className={`relative z-10 flex min-h-full w-full flex-col px-6 pt-20 pb-20 sm:px-10 sm:pt-24 sm:pb-24 lg:px-14 ${itemsClass} ${heightClass}`}
              >
                <div className={`w-full ${textAlignClass} flex flex-col gap-1 ${align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center"}`}>
                  {heroTitle && (
                    <h1 className={`hero-title animate-hero-reveal font-bold text-white leading-tight ${titleSizeClass}`}>
                      {heroTitle}
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
                  {heroDesc && (
                    <p className="mt-3 animate-hero-reveal animate-delay-300 text-sm text-zinc-300/90 leading-relaxed sm:text-base">
                      {heroDesc}
                    </p>
                  )}
                  {(primaryLabel || secondaryLabel) && (
                    <div className={`mt-6 flex flex-wrap gap-3 animate-hero-reveal animate-delay-400 ${justifyClass}`}>
                      {primaryLabel && (
                        <a
                          href={primaryHref}
                          target={isExternal(primaryHref) ? "_blank" : undefined}
                          rel={isExternal(primaryHref) ? "noopener noreferrer" : undefined}
                        >
                          <Button
                            size="lg"
                            className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 hover:bg-amber-400 hover:shadow-amber-500/30"
                          >
                            {primaryHref === `#${CLUBS_ID}` ? (
                              <><span>{primaryLabel}</span><ChevronDown className="ml-2 h-5 w-5" /></>
                            ) : (
                              primaryLabel
                            )}
                          </Button>
                        </a>
                      )}
                      {secondaryLabel && (
                        <a
                          href={secondaryHref}
                          target={isExternal(secondaryHref) ? "_blank" : undefined}
                          rel={isExternal(secondaryHref) ? "noopener noreferrer" : undefined}
                        >
                          <Button
                            variant={secondaryVariant as "outline" | "ghost"}
                            size="lg"
                            className="h-12 rounded-xl border-white/20 bg-white/5 px-8 text-white transition hover:scale-105 hover:bg-white/10"
                          >
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
                className={`relative overflow-hidden ${heightClass}`}
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
                    {/* Guardrail: pointer-events-none so background/overlay never capture clicks (nav/links must remain clickable). */}
                    <div className="absolute inset-0 pointer-events-none">
                      <Image
                        src={heroBg}
                        alt=""
                        fill
                        className="object-cover"
                        priority
                        sizes="100vw"
                        unoptimized={isProxyImageUrl(heroBg)}
                      />
                      <div className="absolute inset-0" style={getHeroOverlayStyle(block)} />
                    </div>
                    {heroBg && (
                      <>
                        <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[100px] animate-float pointer-events-none" />
                        <div className="absolute bottom-1/4 right-1/4 h-[250px] w-[250px] rounded-full bg-emerald-500/10 blur-[80px] animate-float-slow pointer-events-none" />
                      </>
                    )}
                    {heroContent}
                  </>
                )}
              </section>
            );
          }
          if (block.type === "highlights") {
            const iconNames = (Array.isArray(block.config?.highlightsIcons) ? block.config.highlightsIcons : ["Trophy", "Globe", "Layers"]) as string[];
            return (
        <AnimateInView key={block.id}>
          <section className={`border-y border-white/5 ${sectionPaddingClass(block)}`} style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}>
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <ul className="grid gap-6 sm:grid-cols-3">
                {t.highlights.map((text, i) => {
                  const IconComponent = HIGHLIGHTS_ICON_MAP[iconNames[i] ?? ""] ?? [Trophy, Globe, Layers][i];
                  return (
                    <li
                      key={i}
                      className={`animate-on-scroll rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-6 text-center transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 ${i === 0 ? "animate-delay-100" : i === 1 ? "animate-delay-200" : "animate-delay-300"}`}
                    >
                      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                        <IconComponent className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-medium text-zinc-300 sm:text-base">
                        {text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </AnimateInView>
            );
          }
          if ((block as HomeContentBlock).type === "logo_carousel") {
            return <LogoCarouselSection key={block.id} block={block as HomeContentBlock} lang={lang} />;
          }
          if (block.type === "what") {
            const imageOnLeft = (block.config?.whatImagePosition as string) === "left";
            const textOrder = imageOnLeft ? "order-2 lg:order-2" : "order-2 lg:order-1";
            const imageOrder = imageOnLeft ? "order-1 lg:order-1" : "order-1 lg:order-2";
            return (
        <AnimateInView key={block.id}>
          <section
            id={ABOUT_ID}
            className={`relative scroll-mt-24 border-b border-white/5 overflow-hidden ${sectionPaddingClass(block)}`}
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image
                  src={getPublicImageUrl(block.config.backgroundImage as string)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-stretch gap-12 lg:grid-cols-2 lg:gap-16">
                <div className={`animate-on-scroll flex flex-col ${textOrder}`}>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {blockTitle(block, t.what.title)}
                  </h2>
                  <p className="mt-4 max-w-xl text-zinc-400">{t.what.body}</p>
                  <div className="mt-8 grid flex-1 gap-4 sm:grid-cols-2 content-start">
                    {t.what.cards.map((card, i) => (
                      <div
                        key={i}
                        className={`animate-on-scroll rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all duration-200 hover:border-amber-500/30 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-amber-500/10 ${i === 0 ? "animate-delay-200" : i === 1 ? "animate-delay-300" : i === 2 ? "animate-delay-400" : "animate-delay-500"}`}
                      >
                        <h3 className="font-semibold text-white">{card.title}</h3>
                        <p className="mt-2 text-sm text-zinc-400">{card.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`animate-on-scroll ${imageOrder} animate-delay-100 h-full min-h-[280px]`}>
                  <div className="relative w-full h-full min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-2xl">
                    <Image
                      src={getPublicImageUrl(images.what)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      unoptimized={isProxyImageUrl(getPublicImageUrl(images.what))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimateInView>
            );
          }
          if (block.type === "clubs") {
            return (
        <AnimateInView key={block.id}>
          <section
            id={CLUBS_ID}
            className={`relative scroll-mt-24 border-b border-white/5 overflow-hidden ${sectionPaddingClass(block)}`}
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image
                  src={getPublicImageUrl(block.config.backgroundImage as string)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="animate-on-scroll text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {blockTitle(block, t.clubs.title)}
              </h2>
              <p className="animate-on-scroll mt-3 text-zinc-400 animate-delay-100">
                {t.clubs.subtext}
              </p>
              {loading ? (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-56 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/50"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {clubs.map((item, i) => (
                    <div
                      key={item.id}
                      className={`animate-on-scroll ${["animate-delay-200", "animate-delay-300", "animate-delay-400", "animate-delay-500", "animate-delay-600", "animate-delay-700"][i % 6]}`}
                    >
                      <PortfolioCard
                        item={item}
                        visitLabel={t.clubs.visitSite}
                        profileLabel={t.clubs.openProfile}
                        isClub
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </AnimateInView>
            );
          }
          if (block.type === "companies") {
            return (
        <AnimateInView key={block.id}>
          <section
            id={COMPANIES_ID}
            className={`relative scroll-mt-24 border-b border-white/5 overflow-hidden ${sectionPaddingClass(block)}`}
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image
                  src={getPublicImageUrl(block.config.backgroundImage as string)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="animate-on-scroll text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {blockTitle(block, t.companies.title)}
              </h2>
              <p className="animate-on-scroll mt-3 text-zinc-400 animate-delay-100">
                {t.companies.subtext}
              </p>
              {loading ? (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-56 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/50"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {companies.map((item, i) => (
                    <div
                      key={item.id}
                      className={`animate-on-scroll ${["animate-delay-200", "animate-delay-300", "animate-delay-400", "animate-delay-500", "animate-delay-600", "animate-delay-700"][i % 6]}`}
                    >
                      <PortfolioCard
                        item={item}
                        visitLabel={t.companies.visitWebsite}
                        profileLabel={t.companies.openProfile}
                        isClub={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </AnimateInView>
            );
          }
          if (block.type === "founder") {
            const cfg = block.config ?? {};
            const founderName = blockTitle(block, t.founder.title);
            const role = (lang === "pt" ? (cfg.rolePT as string) : (cfg.roleEN as string))?.trim() || "";
            const foundedYear = (cfg.foundedYear as string)?.trim() || "";
            const biography = (lang === "pt" ? (cfg.biographyPT as string) : (cfg.biographyEN as string))?.trim() || (t.founder.body ?? "");
            const quote = (lang === "pt" ? (cfg.highlightQuotePT as string) : (cfg.highlightQuoteEN as string))?.trim() || (t.founder.quote ?? "");
            const photoUrl = (cfg.founderPhoto as string)?.trim() || (cfg.imageUrl as string)?.trim() || images.founder || "";
            const founderImgSrc = getPublicImageUrl(photoUrl);
            const socials = {
              linkedin: (cfg.socialLinkedIn as string)?.trim() || "",
              instagram: (cfg.socialInstagram as string)?.trim() || "",
              twitter: (cfg.socialTwitter as string)?.trim() || "",
              website: (cfg.socialWebsite as string)?.trim() || "",
            };
            const bullets = lang === "pt" ? (t.founder.bullets ?? []) : (t.founder.bullets ?? []);
            return (
        <AnimateInView key={block.id}>
          <section
            id={FOUNDER_ID}
            className={`relative scroll-mt-24 border-b border-white/5 overflow-hidden ${sectionPaddingClass(block)}`}
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image
                  src={getPublicImageUrl(block.config.backgroundImage as string)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 lg:items-center">
                <div className="animate-on-scroll order-2 space-y-5 lg:order-1 lg:col-span-7 lg:min-h-0">
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
                  {bullets.length > 0 && (
                    <ul className="space-y-2">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-zinc-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
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
                <div className="animate-on-scroll order-1 flex justify-center lg:order-2 lg:col-span-5 lg:justify-end">
                  {founderImgSrc ? (
                    <div className="relative w-full max-w-md sm:max-w-lg">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-2 ring-amber-500/20 ring-offset-2 ring-offset-zinc-900">
                        <Image
                          src={founderImgSrc}
                          alt={founderName || "Fundador"}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 1024px) 100vw, 480px"
                          unoptimized={isProxyImageUrl(founderImgSrc)}
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
          if (block.type === "how") {
            return (
        <AnimateInView key={block.id}>
          <section
            id={HOW_ID}
            className={`relative scroll-mt-24 border-b border-white/5 overflow-hidden ${sectionPaddingClass(block)}`}
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image
                  src={getPublicImageUrl(block.config.backgroundImage as string)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <h2 className="animate-on-scroll text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {blockTitle(block, t.how.title)}
              </h2>
              <p className="animate-on-scroll mt-4 text-zinc-400 animate-delay-100">
                {t.how.body}
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {t.how.bullets.map((b, i) => {
                  const iconNames = (Array.isArray(block.config?.howBulletsIcons) ? block.config.howBulletsIcons : []) as string[];
                  const IconComponent = HIGHLIGHTS_ICON_MAP[iconNames[i] ?? ""] ?? CheckCircle;
                  return (
                    <li
                      key={i}
                      className={`animate-on-scroll flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-zinc-300 transition-all hover:border-amber-500/20 hover:bg-zinc-800/80 ${i === 0 ? "animate-delay-200" : i === 1 ? "animate-delay-300" : i === 2 ? "animate-delay-400" : "animate-delay-500"}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <IconComponent className="h-4 w-4" />
                      </span>
                      {b}
                    </li>
                  );
                })}
              </ul>
              <div className="animate-on-scroll mt-10 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 animate-delay-600">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-amber-400/60"
                  style={{ width: "75%" }}
                />
              </div>
            </div>
          </section>
        </AnimateInView>
            );
          }
          if (block.type === "global_presence") {
            return (
              <AnimateInView key={block.id}>
                <GlobalPresenceSection block={block} lang={lang} />
              </AnimateInView>
            );
          }
          if (block.type === "cta") {
            const cfg = block.config ?? {};
            const bgMode = (cfg.ctaBackgroundMode as string) ?? "image";
            const overlay = typeof cfg.ctaOverlayOpacity === "number" ? cfg.ctaOverlayOpacity : blockOverlayOpacity(block);
            const layout = (cfg.ctaLayout as string) ?? "centered";
            const textAlign = (cfg.ctaTextAlign as string) ?? "center";
            const contentWidth = (cfg.ctaContentWidth as string) ?? "normal";
            const headline = blockTitle(block, t.cta.title);
            const subtitle = (lang === "pt" ? (cfg.ctaSubtitlePT as string) : (cfg.ctaSubtitleEN as string))?.trim() ?? "";
            const supportText = (lang === "pt" ? (cfg.ctaSupportTextPT as string) : (cfg.ctaSupportTextEN as string))?.trim() ?? (t.cta.body ?? "");
            const ctaButtons = (Array.isArray(cfg.ctaButtons) ? cfg.ctaButtons : []).filter((b) => (b?.href ?? "").trim());
            const maxWClass = contentWidth === "wide" ? "max-w-4xl" : "max-w-2xl";
            const textAlignClass = textAlign === "left" ? "text-left" : "text-center";
            const isExternal = (href: string) => href.startsWith("http://") || href.startsWith("https://");

            const ctaContent = (
              <>
                <div className={layout === "split" ? "flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-12" : ""}>
                  <div className={layout === "split" ? "lg:flex-1" : ""}>
                    {headline && (
                      <h2 className="animate-on-scroll text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                        {headline}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="animate-on-scroll mt-3 text-lg text-zinc-200 animate-delay-100">
                        {subtitle}
                      </p>
                    )}
                    {supportText && (
                      <p className="animate-on-scroll mt-2 text-zinc-400 animate-delay-150">
                        {supportText}
                      </p>
                    )}
                  </div>
                  {ctaButtons.length > 0 && (
                    <div className={`animate-on-scroll mt-8 flex flex-wrap gap-4 animate-delay-200 ${layout === "split" ? "lg:mt-0 lg:shrink-0" : "justify-center"} ${textAlign === "left" ? "justify-start" : "justify-center"}`}>
                      {ctaButtons.map((btn, i) => {
                        const label = (lang === "pt" ? btn.labelPT : btn.labelEN)?.trim() || (lang === "pt" ? btn.labelPT : btn.labelEN) || "";
                        const href = (btn.href ?? "").trim() || "#";
                        const openNew = !!btn.openInNewTab || isExternal(href);
                        const variant = btn.type === "ghost" ? "ghost" : btn.type === "secondary" ? "outline" : "default";
                        const className = variant === "default"
                          ? `h-12 rounded-xl px-8 ${btn.highlighted ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg" : "bg-white text-zinc-900 hover:bg-zinc-100"} transition hover:scale-105`
                          : "h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 transition hover:scale-105";
                        if (!label) return null;
                        const Btn = (
                          <Button size="lg" variant={variant} className={className} asChild>
                            <a href={href} target={openNew ? "_blank" : undefined} rel={openNew ? "noopener noreferrer" : undefined}>
                              {label}
                            </a>
                          </Button>
                        );
                        return <span key={i}>{Btn}</span>;
                      })}
                    </div>
                  )}
                </div>
              </>
            );

            return (
              <AnimateInView key={block.id}>
                <section
                  id={CONTACT_ID}
                  className={`relative scroll-mt-24 overflow-hidden border-t border-white/5 ${sectionPaddingClass(block)} min-h-[280px] flex flex-col justify-center`}
                  style={bgMode === "solid" && (cfg.backgroundColor as string) ? { backgroundColor: (cfg.backgroundColor as string).trim() } : undefined}
                >
                  {bgMode === "image" && (() => {
                    const ctaBg = (cfg.backgroundImage as string)?.trim() || blockImage(block, "cta");
                    return (
                      <div className="absolute inset-0">
                        <Image
                          src={getPublicImageUrl(ctaBg)}
                          alt=""
                          fill
                          className={`object-cover ${cfg.ctaBlur ? "blur-sm" : ""}`}
                          sizes="100vw"
                          unoptimized={isProxyImageUrl(getPublicImageUrl(ctaBg))}
                        />
                        <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlay }} />
                      </div>
                    );
                  })()}
                  {bgMode === "gradient" && (() => {
                    const start = (cfg.ctaGradientStart as string)?.trim() || "#18181b";
                    const end = (cfg.ctaGradientEnd as string)?.trim() || "#3f3f46";
                    return (
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` }}
                      />
                    );
                  })()}
                  <div className={`container relative mx-auto ${maxWClass} px-4 py-16 sm:px-6 sm:py-20 lg:px-8 ${textAlignClass}`}>
                    {layout === "boxed" ? (
                      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm px-8 py-10 sm:px-12 sm:py-12">
                        {ctaContent}
                      </div>
                    ) : (
                      ctaContent
                    )}
                  </div>
                </section>
              </AnimateInView>
            );
          }
          if (block.type === "custom") {
            const customTitle = blockTitle(block, "");
            const customBody = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
            const customBg = (block.config?.backgroundImage as string) || undefined;
            const customImg = (block.config?.imageUrl as string) || undefined;
            if (!customTitle && !customBody?.trim()) return null;
            return (
              <AnimateInView key={block.id}>
                <section
                  id={block.id}
                  className={`relative scroll-mt-24 overflow-hidden border-b border-white/5 ${sectionPaddingClass(block)}`}
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {customBg && (
                    <div className="absolute inset-0">
                      <Image
                        src={getPublicImageUrl(customBg)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="100vw"
                        unoptimized={isProxyImageUrl(getPublicImageUrl(customBg))}
                      />
                      <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
                    </div>
                  )}
                  <div className={`container relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 ${customBg ? "text-center" : ""}`}>
                    {customTitle && (
                      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {customTitle}
                      </h2>
                    )}
                    {customBody?.trim() && (
                      <p className="mt-4 text-zinc-300 whitespace-pre-wrap">{customBody}</p>
                    )}
                    {customImg && (
                      <div className="relative mx-auto mt-8 w-full max-w-2xl aspect-video overflow-hidden rounded-2xl border border-white/10">
                        <Image
                          src={getPublicImageUrl(customImg)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 672px"
                          unoptimized={isProxyImageUrl(getPublicImageUrl(customImg))}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </AnimateInView>
            );
          }
          if (block.type === "text") {
            const textTitle = blockTitle(block, "");
            const textBody = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
            if (!textTitle && !textBody?.trim()) return null;
            return (
              <AnimateInView key={block.id}>
                <section
                  id={block.id}
                  className={`relative scroll-mt-24 overflow-hidden border-b border-white/5 ${sectionPaddingClass(block)}`}
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {block.config?.backgroundImage && (
                    <div className="absolute inset-0">
                      <Image
                        src={getPublicImageUrl(block.config.backgroundImage as string)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="100vw"
                        unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                      />
                      <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
                    </div>
                  )}
                  <div className={`container relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 ${block.config?.backgroundImage ? "text-center" : ""}`}>
                    {textTitle && (
                      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {textTitle}
                      </h2>
                    )}
                    {textBody?.trim() && (
                      <p className="mt-4 text-zinc-300 whitespace-pre-wrap">{textBody}</p>
                    )}
                  </div>
                </section>
              </AnimateInView>
            );
          }
          // Módulos clube/empresa: próximos jogos, times, notícias, sobre, serviços, etc. (título + corpo; depois dados específicos)
          const genericTypes = [
            "proximos_jogos", "times_categorias", "noticias", "calendario", "tabela",
            "patrocinadores", "galeria", "sobre", "servicos", "produtos", "equipe", "clientes", "contato",
          ];
          if (genericTypes.includes(block.type)) {
            const genTitle = blockTitle(block, "");
            const genBody = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
            const genImg = (block.config?.imageUrl as string) || undefined;
            return (
              <AnimateInView key={block.id}>
                <section
                  id={block.id}
                  className={`relative scroll-mt-24 overflow-hidden border-b border-white/5 ${sectionPaddingClass(block)}`}
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {block.config?.backgroundImage && (
                    <div className="absolute inset-0">
                      <Image
                        src={getPublicImageUrl(block.config.backgroundImage as string)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="100vw"
                        unoptimized={isProxyImageUrl(getPublicImageUrl(block.config.backgroundImage as string))}
                      />
                      <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
                    </div>
                  )}
                  <div className={`container relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 ${block.config?.backgroundImage ? "text-center" : ""}`}>
                    {genTitle && (
                      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        {genTitle}
                      </h2>
                    )}
                    {genBody?.trim() && (
                      <p className="mt-4 text-zinc-300 whitespace-pre-wrap">{genBody}</p>
                    )}
                    {genImg && (
                      <div className="relative mx-auto mt-8 w-full max-w-2xl aspect-video overflow-hidden rounded-2xl border border-white/10">
                        <Image
                          src={getPublicImageUrl(genImg)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 672px"
                          unoptimized={isProxyImageUrl(getPublicImageUrl(genImg))}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </AnimateInView>
            );
          }
          return null;
        })}

        {/* Rodapé fixo: cor de fundo e texto vêm do bloco footer (se existir) */}
        <footer
          className="border-t border-white/5 px-4 py-8 sm:px-6"
          style={{
            backgroundColor: (footerBlock?.config?.backgroundColor as string)?.trim() || undefined,
            color: (footerBlock?.config?.footerTextColor as string)?.trim() || undefined,
          }}
        >
          <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row lg:px-8">
            <span className="text-sm opacity-90">{group?.name ?? "Boston City Group"}</span>
            <nav className="flex gap-6 text-sm opacity-90">
              <a href={`#${CLUBS_ID}`} className="hover:opacity-100">
                {t.nav.clubs}
              </a>
              <a href={`#${COMPANIES_ID}`} className="hover:opacity-100">
                {t.nav.companies}
              </a>
              <a href={`#${CONTACT_ID}`} className="hover:opacity-100">
                {t.nav.contact}
              </a>
              <Link href="/dashboard" className="hover:opacity-100">
                {t.nav.dashboard}
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}

function PortfolioCard({
  item,
  visitLabel,
  profileLabel,
  isClub,
}: {
  item: PortfolioItem;
  visitLabel: string;
  profileLabel: string;
  isClub: boolean;
}) {
  const siteUrl = isClub
    ? getClubSiteUrl(item)
    : getCompanyWebsiteUrl(item);
  const locationStr = formatLocation(item.location);
  const phoneStr = formatPhone(item);

  return (
    <article className="group flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/10">
      <div className="flex flex-col items-center text-center">
        {item.logoUrl ? (
          <img
            src={item.logoUrl}
            alt=""
            className="h-16 w-16 rounded-xl object-contain sm:h-20 sm:w-20"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-800 text-amber-500/80 sm:h-20 sm:w-20">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        )}
        <h3 className="mt-4 text-lg font-semibold text-white">{item.name}</h3>
        {item.segment && (
          <p className="mt-1 text-sm text-zinc-500">{item.segment}</p>
        )}
        {item.shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
            {item.shortDescription}
          </p>
        )}
        {(locationStr || item.address) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{item.address || locationStr}</span>
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 hover:text-amber-300"
            >
              {visitLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Link
            href={`/portfolio/${item.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <User className="h-3.5 w-3.5" />
            {profileLabel}
          </Link>
        </div>
        {(item.email || phoneStr || item.contactName) && (
          <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-white/5 pt-3 text-xs text-zinc-500">
            {item.contactName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.contactName}
              </span>
            )}
            {item.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {item.email}
              </span>
            )}
            {phoneStr && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {phoneStr}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
