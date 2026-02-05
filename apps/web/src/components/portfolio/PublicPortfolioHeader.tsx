"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/media-url";

const isExternal = (href: string) => /^https?:\/\//i.test(href.trim());

type HeaderPreset = "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";

export interface PublicPortfolioHeaderProps {
  slug: string;
  tenantName: string;
  logoUrl?: string | null;
  headerBlock: HomeContentBlock | undefined;
  lang?: "pt" | "en";
}

function getHeaderConfig(headerBlock: HomeContentBlock | undefined) {
  const config = headerBlock?.config ?? {};
  const preset = (config.headerPreset as HeaderPreset) ?? "classic";
  const backgroundMode = (config.backgroundMode as string) || "solid";
  const bgColor = (config.backgroundColor as string)?.trim() || "#18181b";
  const textColor = (config.headerTextColor as string)?.trim() || "#ffffff";
  const borderBottom = !!config.borderBottom;
  const borderColor = (config.borderColor as string)?.trim() || "rgba(255,255,255,0.1)";
  const sticky = !!config.sticky;
  const showLanguage = config.showLanguage !== false;
  const showHomeLink = config.showHomeLink !== false;
  const logoSize = (config.logoSize as "sm" | "md" | "lg") || "md";
  const linkStyle = (config.linkStyle as "text" | "pill" | "button") || "text";
  const headerLinks = (Array.isArray(config.headerLinks) ? config.headerLinks : []) as Array<{ label?: string; href?: string }>;
  const filteredLinks = headerLinks.filter((l) => (l?.label ?? "").trim() && (l?.href ?? "").trim());

  return {
    preset,
    backgroundMode,
    bgColor,
    textColor,
    borderBottom,
    borderColor,
    sticky,
    showLanguage,
    showHomeLink,
    logoSize,
    linkStyle,
    filteredLinks,
  };
}

function logoSizeClass(size: "sm" | "md" | "lg") {
  switch (size) {
    case "sm":
      return "h-6 w-6";
    case "lg":
      return "h-10 w-10";
    default:
      return "h-8 w-8";
  }
}

function linkVariant(style: "text" | "pill" | "button"): "ghost" | "outline" | "default" {
  switch (style) {
    case "pill":
      return "outline";
    case "button":
      return "default";
    default:
      return "ghost";
  }
}

/** Seletor PT/EN no mesmo estilo da página principal: caixa arredondada, item selecionado em destaque. */
function PortfolioLangSelector({ slug, lang }: { slug: string; lang: "pt" | "en" }) {
  const base = `/portfolio/${slug}`;
  return (
    <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
      <Link
        href={`${base}?lang=pt`}
        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
          lang === "pt"
            ? "bg-white/20 text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        PT
      </Link>
      <Link
        href={`${base}?lang=en`}
        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
          lang === "en"
            ? "bg-white/20 text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        EN
      </Link>
    </div>
  );
}

export function PublicPortfolioHeader({
  slug,
  tenantName,
  logoUrl,
  headerBlock,
  lang = "pt",
}: PublicPortfolioHeaderProps) {
  const c = getHeaderConfig(headerBlock);
  const style: React.CSSProperties = {
    color: c.textColor,
  };
  const headerStyle: React.CSSProperties = {
    ...style,
    backgroundColor: c.backgroundMode === "solid" ? c.bgColor : c.backgroundMode === "transparent" ? "transparent" : undefined,
    borderBottom: c.borderBottom ? `1px solid ${c.borderColor}` : undefined,
    position: c.preset === "overlay" ? "absolute" : c.sticky ? "sticky" : undefined,
    top: c.sticky || c.preset === "overlay" ? 0 : undefined,
    zIndex: 50,
    backdropFilter: c.backgroundMode === "blur" ? "blur(12px)" : undefined,
    WebkitBackdropFilter: c.backgroundMode === "blur" ? "blur(12px)" : undefined,
  };

  const logoSrc = logoUrl ? getPublicImageUrl(logoUrl) : null;

  const logoEl = (
    <>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          className={`${logoSizeClass(c.logoSize)} object-contain shrink-0`}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="text-lg">{tenantName}</span>
    </>
  );

  const navLinkClass =
    "rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-block";

  const renderLink = (link: { label?: string; href?: string }, i: number) => {
    const href = (link.href ?? "").trim();
    const label = (link.label ?? "").trim();
    if (isExternal(href)) {
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={navLinkClass} style={style}>
          {label}
        </a>
      );
    }
    return (
      <Link key={i} href={href} className={navLinkClass} style={style}>
        {label}
      </Link>
    );
  };

  const navLinks = <>{c.filteredLinks.map((link, i) => renderLink(link, i))}</>;

  const actionsCompact = (
    <>
      {c.showLanguage && <PortfolioLangSelector slug={slug} lang={lang} />}
      {c.showHomeLink && (
        <Link href="/" className={navLinkClass} style={style}>
          ← Home
        </Link>
      )}
    </>
  );

  if (c.preset === "centered") {
    return (
      <header className="border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-4 sm:px-6">
          <Link
            href={`/portfolio/${slug}`}
            className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
            style={style}
          >
            {logoEl}
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {navLinks}
            {actionsCompact}
          </nav>
        </div>
      </header>
    );
  }

  if (c.preset === "minimal") {
    return (
      <header className="border-white/5 py-2 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto flex h-12 items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={`/portfolio/${slug}`}
            className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
            style={style}
          >
            {logoEl}
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {navLinks}
            {actionsCompact}
          </nav>
        </div>
      </header>
    );
  }

  if (c.preset === "overlay") {
    return (
      <header className="left-0 right-0 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={`/portfolio/${slug}`}
            className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
            style={style}
          >
            {logoEl}
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {navLinks}
            {actionsCompact}
          </nav>
        </div>
      </header>
    );
  }

  if (c.preset === "split") {
    return (
      <header className="sticky top-0 z-50 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link
            href={`/portfolio/${slug}`}
            className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
            style={style}
          >
            {logoEl}
          </Link>
          <nav className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
            {navLinks}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {actionsCompact}
          </div>
        </div>
      </header>
    );
  }

  if (c.preset === "sticky" || c.sticky) {
    return (
      <header className="sticky top-0 z-50 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={`/portfolio/${slug}`}
            className="flex shrink-0 items-center gap-2 font-semibold hover:opacity-90"
            style={style}
          >
            {logoEl}
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            {navLinks}
            {actionsCompact}
          </nav>
        </div>
      </header>
    );
  }

  // classic: igual à página principal — h-16, seletor PT/EN em caixa, links no mesmo estilo, botão Dashboard
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl"
      style={headerStyle}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={`/portfolio/${slug}`}
          className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-90"
          style={style}
        >
          {logoEl}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {c.showLanguage && <PortfolioLangSelector slug={slug} lang={lang} />}
          {navLinks}
          {c.showHomeLink && (
            <Link href="/" className={navLinkClass} style={style}>
              ← Home
            </Link>
          )}
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="ml-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              style={style}
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
