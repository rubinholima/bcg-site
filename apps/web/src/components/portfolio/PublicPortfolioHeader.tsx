"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Menu, X } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  filterVisibleHeaderNavLinks,
  getValidHeaderSubLinks,
  isExternalHeaderHref,
  isHeaderNavDropdown,
  parseHeaderNavLinks,
  type HeaderNavLink,
} from "@/lib/header-nav";
import { HeaderNavMenu } from "@/components/home/HeaderNavMenu";
import { cn } from "@/lib/utils";

type HeaderPreset = "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";

export interface PublicPortfolioHeaderProps {
  slug: string;
  tenantName: string;
  logoUrl?: string | null;
  headerBlock: HomeContentBlock | undefined;
  lang?: "pt" | "en";
  /** Base path para links (ex: /portfolio ou /eventos). Default: /portfolio */
  basePath?: string;
  /** Links extras (ex.: Imprensa) mesclados ao menu do header */
  extraNavLinks?: Array<{ label: string; href: string }>;
}

function getHeaderConfig(
  headerBlock: HomeContentBlock | undefined,
  extraNavLinks?: Array<{ label: string; href: string }>,
) {
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
  const headerLinks = parseHeaderNavLinks(config.headerLinks);
  const filteredLinks: HeaderNavLink[] = filterVisibleHeaderNavLinks(headerLinks);
  for (const extra of extraNavLinks ?? []) {
    const href = (extra.href ?? "").trim();
    const label = (extra.label ?? "").trim();
    if (!href || !label) continue;
    if (
      filteredLinks.some(
        (l) =>
          (l.href ?? "").trim() === href ||
          (l.children ?? []).some((c) => (c.href ?? "").trim() === href),
      )
    ) {
      continue;
    }
    filteredLinks.push({ label, href });
  }

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

/** Seletor PT/EN no mesmo estilo da página principal: caixa arredondada, item selecionado em destaque. */
function PortfolioLangSelector({
  slug,
  lang,
  basePath = "/portfolio",
}: {
  slug: string;
  lang: "pt" | "en";
  basePath?: string;
}) {
  const base = `${basePath}/${slug}`;
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

function MobileNavLink({
  href,
  label,
  className,
  style,
  onNavigate,
}: {
  href: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  onNavigate?: () => void;
}) {
  const cls = cn(
    "flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white",
    className,
  );
  if (isExternalHeaderHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        style={style}
        onClick={onNavigate}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} style={style} onClick={onNavigate}>
      {label}
    </Link>
  );
}

function PortfolioMobileNavPanel({
  links,
  style,
  showLanguage,
  showHomeLink,
  showDashboard,
  slug,
  lang,
  basePath,
  onNavigate,
}: {
  links: HeaderNavLink[];
  style?: React.CSSProperties;
  showLanguage: boolean;
  showHomeLink: boolean;
  showDashboard: boolean;
  slug: string;
  lang: "pt" | "en";
  basePath: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="space-y-0.5 border-t border-white/10 py-3 md:hidden">
      {links.map((link, i) => {
        const label = (link.label ?? "").trim();
        if (isHeaderNavDropdown(link)) {
          const children = getValidHeaderSubLinks(link);
          return (
            <div key={`${label}-${i}`} className="space-y-0.5">
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {label}
              </p>
              {children.map((child, j) => (
                <MobileNavLink
                  key={`${child.href}-${j}`}
                  href={child.href}
                  label={child.label}
                  style={style}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        }
        const href = (link.href ?? "").trim();
        return (
          <MobileNavLink
            key={`${label}-${i}`}
            href={href}
            label={label}
            style={style}
            onNavigate={onNavigate}
          />
        );
      })}
      {showLanguage ? (
        <div className="px-3 pt-2">
          <PortfolioLangSelector slug={slug} lang={lang} basePath={basePath} />
        </div>
      ) : null}
      {showHomeLink ? (
        <MobileNavLink href="/" label="← Home" style={style} onNavigate={onNavigate} />
      ) : null}
      {showDashboard ? (
        <div className="px-3 pt-2">
          <Link href="/dashboard" onClick={onNavigate}>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              style={style}
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}

function PortfolioHeaderNavigation({
  links,
  style,
  showLanguage,
  showHomeLink,
  showDashboard,
  slug,
  lang,
  basePath,
  navLinkClass,
  mobileOpen,
  setMobileOpen,
  desktopNavClassName,
}: {
  links: HeaderNavLink[];
  style?: React.CSSProperties;
  showLanguage: boolean;
  showHomeLink: boolean;
  showDashboard: boolean;
  slug: string;
  lang: "pt" | "en";
  basePath: string;
  navLinkClass: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  desktopNavClassName?: string;
}) {
  return (
    <>
      <nav className={cn("hidden shrink-0 items-center gap-2 sm:gap-3 md:flex", desktopNavClassName)}>
        {showLanguage ? (
          <PortfolioLangSelector slug={slug} lang={lang} basePath={basePath} />
        ) : null}
        <HeaderNavMenu links={links} linkClassName={navLinkClass} style={style} />
        {showHomeLink ? (
          <Link href="/" className={navLinkClass} style={style}>
            ← Home
          </Link>
        ) : null}
        {showDashboard ? (
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="ml-1 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              style={style}
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        ) : null}
      </nav>
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>
    </>
  );
}

export function PublicPortfolioHeader({
  slug,
  tenantName,
  logoUrl,
  headerBlock,
  lang = "pt",
  basePath = "/portfolio",
  extraNavLinks,
}: PublicPortfolioHeaderProps) {
  const c = getHeaderConfig(headerBlock, extraNavLinks);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [slug, basePath]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

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

  const fromProp = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : "";
  const headerLogoUrl = (headerBlock?.config as { headerLogoUrl?: string } | undefined)?.headerLogoUrl;
  const fromHeader = typeof headerLogoUrl === "string" && headerLogoUrl.trim() ? headerLogoUrl.trim() : "";
  const resolvedLogoRaw = fromProp || fromHeader || null;
  const logoSrc = resolvedLogoRaw ? getPublicImageUrl(resolvedLogoRaw) : null;

  const pageUrl = `${basePath}/${slug}`;
  const navLinkClass =
    "rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white";

  const logoEl = (
    <>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt=""
          className={`${logoSizeClass(c.logoSize)} shrink-0 object-contain`}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="truncate text-base sm:text-lg">{tenantName}</span>
    </>
  );

  const logoLink = (
    <Link
      href={pageUrl}
      className="flex min-w-0 max-w-[calc(100%-3rem)] items-center gap-2 font-semibold transition-opacity hover:opacity-90 sm:max-w-none"
      style={style}
    >
      {logoEl}
    </Link>
  );

  const navProps = {
    links: c.filteredLinks,
    style,
    showLanguage: c.showLanguage,
    showHomeLink: c.showHomeLink,
    slug,
    lang,
    basePath,
    navLinkClass,
    mobileOpen,
    setMobileOpen,
  };

  const mobilePanel = mobileOpen ? (
    <PortfolioMobileNavPanel
      {...navProps}
      showDashboard={c.preset === "classic"}
      onNavigate={() => setMobileOpen(false)}
    />
  ) : null;

  if (c.preset === "centered") {
    return (
      <header className="border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-center">
            {logoLink}
            <PortfolioHeaderNavigation {...navProps} showDashboard={false} desktopNavClassName="flex-wrap justify-center" />
          </div>
          {mobilePanel}
        </div>
      </header>
    );
  }

  if (c.preset === "minimal") {
    return (
      <header className="border-white/5 py-2 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-12 items-center justify-between gap-3">
            {logoLink}
            <PortfolioHeaderNavigation {...navProps} showDashboard={false} desktopNavClassName="justify-end" />
          </div>
          {mobilePanel}
        </div>
      </header>
    );
  }

  if (c.preset === "overlay") {
    return (
      <header className="left-0 right-0 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            {logoLink}
            <PortfolioHeaderNavigation {...navProps} showDashboard={false} desktopNavClassName="justify-end" />
          </div>
          {mobilePanel}
        </div>
      </header>
    );
  }

  if (c.preset === "split") {
    return (
      <header className="sticky top-0 z-50 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 items-center gap-3">
            {logoLink}
            <nav className="hidden flex-1 items-center justify-center gap-2 sm:gap-3 md:flex">
              <HeaderNavMenu links={c.filteredLinks} linkClassName={navLinkClass} style={style} />
            </nav>
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              {c.showLanguage ? (
                <PortfolioLangSelector slug={slug} lang={lang} basePath={basePath} />
              ) : null}
              {c.showHomeLink ? (
                <Link href="/" className={navLinkClass} style={style}>
                  ← Home
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
          {mobilePanel}
        </div>
      </header>
    );
  }

  if (c.preset === "sticky" || c.sticky) {
    return (
      <header className="sticky top-0 z-50 border-white/5 backdrop-blur-xl" style={headerStyle}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            {logoLink}
            <PortfolioHeaderNavigation {...navProps} showDashboard={false} desktopNavClassName="justify-end" />
          </div>
          {mobilePanel}
        </div>
      </header>
    );
  }

  // classic
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl"
      style={headerStyle}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {logoLink}
          <PortfolioHeaderNavigation {...navProps} showDashboard />
        </div>
        {mobilePanel}
      </div>
    </header>
  );
}
