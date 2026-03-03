"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { PatrocinadorItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl, isSvgUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

function SponsorLogo({
  item,
  lang,
}: {
  item: PatrocinadorItem;
  lang: "pt" | "en";
}) {
  const src = getPublicImageUrl(item.logoUrl);
  const name = item.name?.trim() || (lang === "pt" ? "Patrocinador" : "Sponsor");
  const href = item.link?.trim();

  const content = (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-amber-500/5">
      <div className="relative h-full w-full grayscale transition-all duration-300 group-hover:grayscale-0">
        {isSvgUrl(item.logoUrl) ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-contain object-center p-2"
            onError={(e) => {
              (e.currentTarget).style.display = "none";
            }}
          />
        ) : (
          <SmartImage
            src={src}
            alt={name}
            fill
            className="object-contain object-center p-2"
            sizes="(max-width: 640px) 120px, (max-width: 1024px) 160px, 200px"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block h-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-xl"
        aria-label={name}
      >
        {content}
      </a>
    );
  }
  return <div className="group block h-full">{content}</div>;
}

export function PatrocinadoresSection({
  block,
  lang,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const title = ((lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string)?.trim();
  const titleLogo = (block.config?.patrocinadoresTitleLogo as string)?.trim();
  const hasTitle = title && title.length > 0;
  const rawItems = (block.config?.patrocinadoresManualItems as PatrocinadorItem[] | undefined) ?? [];
  const items = rawItems.map((i) => ({
    ...i,
    logoUrl: String(i.logoUrl ?? (i as Record<string, unknown>).logo_url ?? "").trim(),
  }));
  const padTop = (block.config?.patrocinadoresPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.patrocinadoresPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  const paddingTop = PADDING_CLASSES[padTop]?.top ?? PADDING_CLASSES.compact.top;
  const paddingBottom = PADDING_CLASSES[padBottom]?.bottom ?? PADDING_CLASSES.compact.bottom;
  const containerClass = fullWidth ? "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  const displayItems = items.filter((i) => i.logoUrl?.trim());

  if (displayItems.length === 0) return null;

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden border-b border-white/5 ${paddingTop} ${paddingBottom}`}
        style={bgColor ? { backgroundColor: bgColor } : undefined}
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
        <div className={`relative ${containerClass}`}>
          {showTitle && titleLogo ? (
            <div className="mb-6 flex items-center justify-start">
              <div className="relative h-16 w-auto max-w-xs sm:h-20">
                <SmartImage
                  src={getPublicImageUrl(titleLogo)}
                  alt={title || "Patrocinadores"}
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 640px) 200px, 300px"
                />
              </div>
            </div>
          ) : showTitle && hasTitle ? (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign ?? "left"}
            />
          ) : null}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {displayItems.map((item, idx) => (
              <div key={item.id ?? idx} className="h-[100px] w-[140px] sm:h-[120px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
                <SponsorLogo item={item} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
