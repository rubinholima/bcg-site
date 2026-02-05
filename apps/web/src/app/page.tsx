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
import { fetchGroup } from "@/lib/home-data";
import { copy, type Lang } from "@/lib/home-copy";
import { fetchHomeContent, mergeHomeContent } from "@/lib/home-content";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { AnimateInView } from "@/components/home/AnimateInView";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  LayoutDashboard,
  User,
  MapPin,
  Mail,
  Phone,
  Trophy,
  Globe,
  Layers,
} from "lucide-react";

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
  const [homeContent, setHomeContent] = useState<Awaited<ReturnType<typeof fetchHomeContent>>>(null);
  const [group, setGroup] = useState<Awaited<ReturnType<typeof fetchGroup>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "pt") setLang(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = group?.name ?? "Boston City Group";
  }, [group]);

  useEffect(() => {
    Promise.all([fetchPublicPortfolio(), fetchHomeContent(), fetchGroup()])
      .then(([portfolioData, contentData, groupData]) => {
        setPortfolio(portfolioData);
        setHomeContent(contentData);
        setGroup(groupData ?? null);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const setLangAndStore = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem(LANG_KEY, l);
  };

  const merged = mergeHomeContent(homeContent ?? null);
  const t = merged[lang];
  const images = merged.images;
  const blocks = merged.blocks;
  const contentBlocks = blocks.filter(
    (b) => b.type !== "header" && b.type !== "footer",
  );
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");
  const clubs = portfolio?.filter((p) => p.type === "club") ?? [];
  const companies = portfolio?.filter((p) => p.type === "company") ?? [];

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
            {group?.logoUrl ? (
              <>
                <img
                  src={group.logoUrl}
                  alt=""
                  className="h-8 w-8 object-contain flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="text-lg">{group.name || "Boston City Group"}</span>
              </>
            ) : (
              <span className="text-lg">Boston City Group</span>
            )}
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => setLangAndStore("pt")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                  lang === "pt"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setLangAndStore("en")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
                  lang === "en"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
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
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="ml-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                {t.nav.dashboard}
              </Button>
            </Link>
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
            return (
              <section
                key={block.id}
                className="relative min-h-[90vh] overflow-hidden px-4 pt-24 pb-20 sm:px-6 sm:pt-28 lg:px-8"
                style={
                  blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined
                }
              >
                {heroSlides.length > 0 ? (
                  <HeroCarousel
                    slides={heroSlides}
                    effect={effect}
                    overlayOpacity={overlay}
                    intervalSeconds={intervalSeconds}
                    lang={lang}
                  >
                    <div className="container relative mx-auto flex min-h-[80vh] flex-col justify-center text-center">
                      <h1 className="animate-fade-in-up text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                        {t.hero.headline}
                      </h1>
                      <p className="mt-6 animate-fade-in-up text-base leading-relaxed text-zinc-300 sm:text-lg animate-delay-200">
                        {t.hero.subheadline}
                      </p>
                      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up animate-delay-400">
                        <a href={`#${CLUBS_ID}`}>
                          <Button
                            size="lg"
                            className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 hover:bg-amber-400 hover:shadow-amber-500/30"
                          >
                            {t.hero.ctaClubs}
                            <ChevronDown className="ml-2 h-5 w-5" />
                          </Button>
                        </a>
                        <a href={`#${COMPANIES_ID}`}>
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-12 rounded-xl border-white/20 bg-white/5 px-8 text-white transition hover:scale-105 hover:bg-white/10"
                          >
                            {t.hero.ctaCompanies}
                          </Button>
                        </a>
                      </div>
                    </div>
                  </HeroCarousel>
                ) : (
                  <>
                    <div className="absolute inset-0">
                      <Image
                        src={heroBg}
                        alt=""
                        fill
                        className="object-cover"
                        priority
                        sizes="100vw"
                        unoptimized={isProxyImageUrl(heroBg)}
                      />
                      <div
                        className="absolute inset-0 bg-zinc-950"
                        style={{ opacity: overlay }}
                      />
                    </div>
                    <div className="absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[100px] animate-float" />
                    <div className="absolute bottom-1/4 right-1/4 h-[250px] w-[250px] rounded-full bg-emerald-500/10 blur-[80px] animate-float-slow" />
                    <div
                      className="absolute top-1/2 left-1/4 h-[200px] w-[200px] rounded-full bg-amber-600/10 blur-[60px] animate-float"
                      style={{ animationDelay: "2s" }}
                    />
                    <div className="container relative mx-auto flex min-h-[80vh] flex-col justify-center text-center">
                      <h1 className="animate-fade-in-up text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                        {t.hero.headline}
                      </h1>
                      <p className="mt-6 animate-fade-in-up text-base leading-relaxed text-zinc-300 sm:text-lg animate-delay-200">
                        {t.hero.subheadline}
                      </p>
                      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up animate-delay-400">
                        <a href={`#${CLUBS_ID}`}>
                          <Button
                            size="lg"
                            className="h-12 rounded-xl bg-amber-500 px-8 text-base font-semibold text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 hover:bg-amber-400 hover:shadow-amber-500/30"
                          >
                            {t.hero.ctaClubs}
                            <ChevronDown className="ml-2 h-5 w-5" />
                          </Button>
                        </a>
                        <a href={`#${COMPANIES_ID}`}>
                          <Button
                            variant="outline"
                            size="lg"
                            className="h-12 rounded-xl border-white/20 bg-white/5 px-8 text-white transition hover:scale-105 hover:bg-white/10"
                          >
                            {t.hero.ctaCompanies}
                          </Button>
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </section>
            );
          }
          if (block.type === "highlights") {
            return (
        <AnimateInView key={block.id}>
          <section className="border-y border-white/5 py-14 sm:py-20" style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}>
            <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <ul className="grid gap-6 sm:grid-cols-3">
                {t.highlights.map((text, i) => (
                  <li
                    key={i}
                    className={`animate-on-scroll rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-6 text-center transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 ${i === 0 ? "animate-delay-100" : i === 1 ? "animate-delay-200" : "animate-delay-300"}`}
                  >
                    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      {i === 0 ? (
                        <Trophy className="h-6 w-6" />
                      ) : i === 1 ? (
                        <Globe className="h-6 w-6" />
                      ) : (
                        <Layers className="h-6 w-6" />
                      )}
                    </span>
                    <p className="text-sm font-medium text-zinc-300 sm:text-base">
                      {text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </AnimateInView>
            );
          }
          if (block.type === "what") {
            return (
        <AnimateInView key={block.id}>
          <section
            id={ABOUT_ID}
            className="relative scroll-mt-24 border-b border-white/5 overflow-hidden py-16 sm:py-20"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="animate-on-scroll order-2 lg:order-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {blockTitle(block, t.what.title)}
                  </h2>
                  <p className="mt-4 max-w-xl text-zinc-400">{t.what.body}</p>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {t.what.cards.map((card, i) => (
                      <div
                        key={i}
                        className={`animate-on-scroll rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 ${i === 0 ? "animate-delay-200" : i === 1 ? "animate-delay-300" : i === 2 ? "animate-delay-400" : "animate-delay-500"}`}
                      >
                        <h3 className="font-semibold text-white">{card.title}</h3>
                        <p className="mt-2 text-sm text-zinc-400">{card.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="animate-on-scroll order-1 lg:order-2 animate-delay-100">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-2xl">
                  <Image
                    src={images.what}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
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
            className="relative scroll-mt-24 border-b border-white/5 overflow-hidden py-16 sm:py-20"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
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
            className="relative scroll-mt-24 border-b border-white/5 overflow-hidden py-16 sm:py-20"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
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
            return (
        <AnimateInView key={block.id}>
          <section
            id={FOUNDER_ID}
            className="relative scroll-mt-24 border-b border-white/5 overflow-hidden py-16 sm:py-20"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
                <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
              </div>
            )}
            <div className="container relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="animate-on-scroll order-2 lg:order-1">
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {blockTitle(block, t.founder.title)}
                  </h2>
                  <p className="mt-6 text-zinc-400">{t.founder.body}</p>
                  <ul className="mt-6 space-y-2">
                    {t.founder.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-zinc-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <blockquote className="mt-8 border-l-2 border-amber-500/50 pl-6 text-lg font-medium italic text-amber-200/90">
                    {t.founder.quote}
                  </blockquote>
                </div>
                <div className="animate-on-scroll order-1 lg:order-2 animate-delay-200">
                  <div className="relative aspect-[3/4] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-2xl">
                    <Image
                      src={images.founder}
                      alt=""
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 1024px) 100vw, 400px"
                    />
                  </div>
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
            className="relative scroll-mt-24 border-b border-white/5 overflow-hidden py-16 sm:py-20"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : { backgroundColor: "rgb(9 9 11)" }}
          >
            {block.config?.backgroundImage && (
              <div className="absolute inset-0">
                <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
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
                {t.how.bullets.map((b, i) => (
                  <li
                    key={i}
                    className={`animate-on-scroll flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-zinc-300 transition-all hover:border-amber-500/20 ${i === 0 ? "animate-delay-200" : i === 1 ? "animate-delay-300" : i === 2 ? "animate-delay-400" : "animate-delay-500"}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
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
          if (block.type === "cta") {
            const ctaBg = blockImage(block, "cta");
            return (
        <AnimateInView key={block.id}>
          <section
            id={CONTACT_ID}
            className="relative scroll-mt-24 overflow-hidden border-t border-white/5 py-20 sm:py-24"
            style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
          >
            <div className="absolute inset-0">
              <Image
                src={ctaBg}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
            </div>
            <div className="container relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
              <h2 className="animate-on-scroll text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {blockTitle(block, t.cta.title)}
              </h2>
              <p className="animate-on-scroll mt-4 text-zinc-300 animate-delay-100">
                {t.cta.body}
              </p>
              <div className="animate-on-scroll mt-8 flex flex-wrap items-center justify-center gap-4 animate-delay-200">
                <a href={`#${CONTACT_ID}`}>
                  <Button
                    size="lg"
                    className="h-12 rounded-xl bg-amber-500 px-8 text-black transition hover:scale-105 hover:bg-amber-400"
                  >
                    {t.cta.contact}
                  </Button>
                </a>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-xl border-white/20 bg-white/5 text-white transition hover:scale-105 hover:bg-white/10"
                  >
                    {t.cta.dashboard}
                  </Button>
                </Link>
              </div>
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
                  className="relative scroll-mt-24 overflow-hidden border-b border-white/5 py-16 sm:py-20"
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {customBg && (
                    <div className="absolute inset-0">
                      <Image src={customBg} alt="" fill className="object-cover" sizes="100vw" />
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
                        <Image src={customImg} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
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
                  className="relative scroll-mt-24 overflow-hidden border-b border-white/5 py-16 sm:py-20"
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {block.config?.backgroundImage && (
                    <div className="absolute inset-0">
                      <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
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
                  className="relative scroll-mt-24 overflow-hidden border-b border-white/5 py-16 sm:py-20"
                  style={blockBgColor(block) ? { backgroundColor: blockBgColor(block) } : undefined}
                >
                  {block.config?.backgroundImage && (
                    <div className="absolute inset-0">
                      <Image src={block.config.backgroundImage as string} alt="" fill className="object-cover" sizes="100vw" />
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
                        <Image src={genImg} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
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
