"use client";

import { useState, useEffect } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl, isSvgUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { fetchPublicTenants, type PublicTenantCarouselItem } from "@/lib/public-tenants";

function buildTenantUrl(item: PublicTenantCarouselItem): string {
  if (item.websiteUrl?.trim()) return item.websiteUrl.trim();
  if (typeof window !== "undefined") return `/portfolio/${item.slug}`;
  const base = process.env.NEXT_PUBLIC_PORTFOLIO_BASE_URL ?? "";
  return base ? `${base.replace(/\/$/, "")}/portfolio/${item.slug}` : `/portfolio/${item.slug}`;
}

function LogoStrip({
  items,
  fallbackLogo,
  cardHeight,
  cardWidthRatio,
  cardRadius,
  cardBackground,
  cardStyle,
  showShadow,
  gap,
  speedKey,
  direction,
  pauseOnHover,
  openInNewTab,
}: {
  items: PublicTenantCarouselItem[];
  fallbackLogo?: string;
  cardHeight: number;
  cardWidthRatio: number;
  cardRadius: number;
  cardBackground: string;
  cardStyle: string;
  showShadow: boolean;
  gap: number;
  speedKey: string;
  direction: "left-to-right" | "right-to-left";
  pauseOnHover: boolean;
  openInNewTab: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const isStrobe = speedKey.startsWith("strobe");
  const duration = isStrobe
    ? (speedKey === "strobe-05" ? 0.9 : speedKey === "strobe-1" ? 1.4 : speedKey === "strobe-2" ? 2.4 : 0.9)
    : (speedKey === "slow" ? 60 : speedKey === "fast" ? 25 : 40);
  const animationName = isStrobe ? `logo-marquee-${speedKey}` : "logo-marquee-6x";
  const minCardWidth = cardHeight * cardWidthRatio;
  const logoSize = Math.round(cardHeight * 0.8);

  const cardStyleObj: React.CSSProperties = {
    height: `${cardHeight}px`,
    minWidth: `${minCardWidth}px`,
    borderRadius: `${cardRadius}px`,
    boxShadow: showShadow ? "0 4px 14px rgba(0,0,0,0.12)" : undefined,
  };
  if (cardBackground.startsWith("linear-gradient")) {
    cardStyleObj.background = cardBackground;
  } else {
    cardStyleObj.backgroundColor = cardBackground;
  }
  if (cardStyle === "bordered") {
    cardStyleObj.border = "1px solid rgba(255,255,255,0.2)";
  }
  if (cardStyle === "outline") {
    cardStyleObj.border = "2px solid rgba(255,255,255,0.35)";
  }

  if (items.length === 0) return null;

  const copies = 6;
  const duplicated = Array.from({ length: copies }, () => items).flat();

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex py-2"
        style={{
          gap: `${gap}px`,
          animation: `${animationName} ${duration}s linear infinite`,
          animationDirection: direction === "right-to-left" ? "reverse" : "normal",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {duplicated.map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={buildTenantUrl(item)}
            target={openInNewTab ? "_blank" : undefined}
            rel={openInNewTab ? "noopener noreferrer" : undefined}
            className="flex shrink-0 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-105 hover:shadow-lg overflow-hidden px-3"
            style={cardStyleObj}
          >
            {item.logoUrl ? (
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: logoSize,
                  height: logoSize,
                }}
              >
                {isSvgUrl(item.logoUrl) ? (
                  <img
                    src={getPublicImageUrl(item.logoUrl)}
                    alt={item.name}
                    width={Math.round(logoSize)}
                    height={Math.round(logoSize)}
                    className="object-contain"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <SmartImage
                    src={getPublicImageUrl(item.logoUrl)}
                    alt={item.name}
                    width={Math.round(logoSize)}
                    height={Math.round(logoSize)}
                    className="object-contain"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                )}
              </span>
            ) : fallbackLogo ? (
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: logoSize,
                  height: logoSize,
                }}
              >
                {isSvgUrl(fallbackLogo) ? (
                  <img
                    src={getPublicImageUrl(fallbackLogo)}
                    alt={item.name}
                    width={Math.round(logoSize)}
                    height={Math.round(logoSize)}
                    className="object-contain"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <SmartImage
                    src={getPublicImageUrl(fallbackLogo)}
                    alt={item.name}
                    width={Math.round(logoSize)}
                    height={Math.round(logoSize)}
                    className="object-contain"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                )}
              </span>
            ) : (
              <span className="text-sm font-medium text-zinc-500 truncate">{item.name}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

export function LogoCarouselSection({
  block,
  lang,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
}) {
  const config = block.config ?? {};
  const [allItems, setAllItems] = useState<PublicTenantCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = (config.logoCarouselCardStyle as string) ?? "fifa";
  const cardHeight = Number(config.logoCarouselCardHeight) || 260;
  const cardWidthRatio = Number(config.logoCarouselCardWidthRatio) || 1.6;
  const cardRadius = Number(config.logoCarouselCardRadius) ?? 12;
  const cardBackgroundFromConfig = (config.logoCarouselCardBackground as string)?.trim() || "#FFFFFF";
  const showShadow = config.logoCarouselShowShadow !== false;

  const cardBackground =
    cardStyle === "glass"
      ? "rgba(255,255,255,0.08)"
      : cardStyle === "dark"
        ? "#18181b"
        : cardStyle === "outline"
          ? "transparent"
          : cardStyle === "gradient"
            ? "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)"
            : cardBackgroundFromConfig;
  const gap = Number(config.logoCarouselGapBetweenCards) || 16;
  const paddingTop = Number(config.logoCarouselPaddingTop) ?? 24;
  const paddingBottom = Number(config.logoCarouselPaddingBottom) ?? 24;
  const speedKey = (config.logoCarouselAnimationSpeed as string) ?? "normal";
  const direction = (config.logoCarouselDirection as "left-to-right" | "right-to-left") ?? "left-to-right";
  const pauseOnHover = config.logoCarouselPauseOnHover !== false;
  const openInNewTab = config.logoCarouselOpenInNewTab !== false;

  const clubsEnabled = config.logoCarouselClubsEnabled !== false;
  const clubsLimit = Number(config.logoCarouselClubsLimit) || 50;
  const clubsFallback = (config.logoCarouselClubsFallbackLogo as string)?.trim();
  const companiesEnabled = config.logoCarouselCompaniesEnabled !== false;
  const companiesLimit = Number(config.logoCarouselCompaniesLimit) || 50;
  const companiesFallback = (config.logoCarouselCompaniesFallbackLogo as string)?.trim();
  const fallbackLogo = clubsFallback || companiesFallback;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [clubList, companyList] = await Promise.all([
        clubsEnabled ? fetchPublicTenants("club", clubsLimit) : [],
        companiesEnabled ? fetchPublicTenants("company", companiesLimit) : [],
      ]);
      if (!cancelled) {
        setAllItems([...clubList, ...companyList]);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clubsEnabled, companiesEnabled, clubsLimit, companiesLimit]);

  const bgColor = (config.backgroundColor as string)?.trim() || undefined;
  const bgImage = (config.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = config.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  if (!clubsEnabled && !companiesEnabled) return null;

  return (
    <section
      className="relative w-full overflow-hidden border-b border-white/5"
      style={{
        ...(bgColor ? { backgroundColor: bgColor } : {}),
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
        minHeight: `${cardHeight + paddingTop + paddingBottom}px`,
      }}
    >
      {bgImage && (
        <div className="absolute inset-0">
          <SmartImage
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center w-full py-12 text-zinc-500">
          <span>Carregando…</span>
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex items-center justify-center w-full py-12 text-zinc-500">
          <span>Nenhum clube ou empresa publicado com logo.</span>
        </div>
      ) : (
        <div className="relative">
        <LogoStrip
          items={allItems}
          fallbackLogo={fallbackLogo}
          cardHeight={cardHeight}
          cardWidthRatio={cardWidthRatio}
          cardRadius={cardRadius}
          cardBackground={cardBackground}
          cardStyle={cardStyle}
          showShadow={showShadow}
          gap={gap}
          speedKey={speedKey}
          direction={direction}
          pauseOnHover={pauseOnHover}
          openInNewTab={openInNewTab}
        />
        </div>
      )}
    </section>
  );
}
