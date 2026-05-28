import Link from "next/link";
import type { CSSProperties } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { PageTheme } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { resolveFontFamily } from "@/lib/page-fonts";
import { SmartImage } from "@/components/common/SmartImage";

export type PublicFooterLink = { label: string; href: string };

interface PublicFooterProps {
  block?: HomeContentBlock | null;
  theme?: PageTheme | null;
  defaultText: string;
  defaultLinks?: PublicFooterLink[];
  accentColor?: string;
  className?: string;
}

function footerLinksFromConfig(block?: HomeContentBlock | null): PublicFooterLink[] {
  const raw = block?.config?.footerLinks;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => {
      const item = l as { label?: string; href?: string };
      const label = (item.label ?? "").trim();
      const href = (item.href ?? "").trim();
      if (!label || !href) return null;
      return { label, href };
    })
    .filter(Boolean) as PublicFooterLink[];
}

export function isFooterBlockVisible(block?: HomeContentBlock | null): boolean {
  if (!block) return false;
  const v = block.config?.visible as boolean | string | undefined;
  return v !== false && v !== "false";
}

export function PublicFooter({
  block,
  theme,
  defaultText,
  defaultLinks = [],
  accentColor,
  className,
}: PublicFooterProps) {
  if (!isFooterBlockVisible(block)) return null;

  const config = block?.config ?? {};
  const bg = (config.backgroundColor as string)?.trim();
  const textColor = (config.footerTextColor as string)?.trim();
  const bgImage = (config.backgroundImage as string)?.trim();
  const overlayOpacity =
    typeof config.backgroundOverlayOpacity === "number"
      ? config.backgroundOverlayOpacity
      : typeof config.backgroundOverlayOpacity === "string"
        ? parseFloat(config.backgroundOverlayOpacity) || 0.75
        : 0.75;
  const contentWidth = (config.contentWidth as "box" | "full" | undefined) ?? theme?.contentWidth;
  const footerText = (config.footerText as string)?.trim() || defaultText;
  const links = footerLinksFromConfig(block);
  const displayLinks = links.length > 0 ? links : defaultLinks;
  const fontFamily = resolveFontFamily(config as Record<string, unknown>, theme);

  const style: CSSProperties = {
    backgroundColor: bgImage ? undefined : bg || undefined,
    color: textColor || undefined,
    fontFamily: fontFamily || undefined,
  };

  const innerClass =
    contentWidth === "full"
      ? "mx-auto flex w-full max-w-none flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6"
      : "container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8";

  return (
    <footer className={`relative border-t border-white/5 px-4 py-8 sm:px-6 ${className ?? ""}`} style={style}>
      {bgImage ? (
        <>
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <SmartImage src={getPublicImageUrl(bgImage)} alt="" fill className="object-cover" />
          </div>
          <div
            className="absolute inset-0 -z-10 bg-zinc-950"
            style={{ opacity: overlayOpacity }}
            aria-hidden
          />
        </>
      ) : null}
      <div className={innerClass}>
        <span className="text-sm opacity-90">{footerText}</span>
        {displayLinks.length > 0 ? (
          <nav className="flex flex-wrap justify-center gap-4 text-sm opacity-90 sm:gap-6">
            {displayLinks.map((link, i) => {
              const isExternal = /^https?:\/\//i.test(link.href);
              const isHash = link.href.startsWith("#");
              const linkStyle = accentColor ? { color: accentColor } : undefined;
              if (isExternal) {
                return (
                  <a
                    key={`${link.href}-${i}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-100"
                    style={linkStyle}
                  >
                    {link.label}
                  </a>
                );
              }
              if (isHash) {
                return (
                  <a key={`${link.href}-${i}`} href={link.href} className="hover:opacity-100" style={linkStyle}>
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={`${link.href}-${i}`} href={link.href} className="hover:opacity-100" style={linkStyle}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
