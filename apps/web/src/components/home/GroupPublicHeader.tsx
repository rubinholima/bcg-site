"use client";

import Link from "next/link";
import type { HomeContentBlock } from "@/types/home-content";
import { LanguageSelector } from "@/components/home/LanguageSelector";
import type { Lang } from "@/lib/home-copy";

const isExternal = (href: string) => /^https?:\/\//i.test(href.trim());

interface GroupPublicHeaderProps {
  groupName: string;
  headerBlock?: HomeContentBlock | null;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export function GroupPublicHeader({
  groupName,
  headerBlock,
  lang,
  onLangChange,
}: GroupPublicHeaderProps) {
  const config = headerBlock?.config ?? {};
  const textColor = (config.headerTextColor as string)?.trim() || undefined;
  const bgColor = (config.backgroundColor as string)?.trim() || "#18181b";
  const selectedBg =
    typeof config.headerLanguageSelectedBg === "string" && config.headerLanguageSelectedBg.trim()
      ? config.headerLanguageSelectedBg.trim()
      : undefined;
  const selectedText =
    typeof config.headerLanguageSelectedText === "string" &&
    config.headerLanguageSelectedText.trim()
      ? config.headerLanguageSelectedText.trim()
      : undefined;

  const headerLinks = (
    Array.isArray(config.headerLinks) ? config.headerLinks : []
  ) as Array<{ label?: string; href?: string }>;
  const links = headerLinks.filter((l) => (l?.label ?? "").trim() && (l?.href ?? "").trim());

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-[44px] min-w-0 shrink items-center gap-2 font-semibold transition-opacity hover:opacity-90"
          style={{ color: textColor }}
        >
          <img
            src="/bcg-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="truncate text-base sm:text-lg">{groupName}</span>
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
          <LanguageSelector
            lang={lang}
            onSelect={onLangChange}
            headerBg={bgColor}
            headerTextColor={(config.headerTextColor as string)?.trim() || "#ffffff"}
            selectedBg={selectedBg}
            selectedTextColor={selectedText}
          />
          {links.map((link, i) => {
            const href = (link.href ?? "").trim();
            const label = (link.label ?? "").trim();
            const cls =
              "hidden min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex";
            if (isExternal(href)) {
              return (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                  style={{ color: textColor }}
                >
                  {label}
                </a>
              );
            }
            if (href.startsWith("#")) {
              return (
                <a key={i} href={`/${href}`} className={cls} style={{ color: textColor }}>
                  {label}
                </a>
              );
            }
            return (
              <Link key={i} href={href} className={cls} style={{ color: textColor }}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
