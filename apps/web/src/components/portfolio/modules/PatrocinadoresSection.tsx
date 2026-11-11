"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { PatrocinadorItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl, isSvgUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
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
  const layout = (block.config?.patrocinadoresLayout as string) ?? "grid";
  const tiers = (block.config?.patrocinadoresTiers as Array<{ name?: string; sortOrder?: number; sponsors?: PatrocinadorItem[] }>) ?? [];
  const rawItems = tiers.length
    ? tiers
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .flatMap((t) => t.sponsors ?? [])
    : ((block.config?.patrocinadoresManualItems as PatrocinadorItem[] | undefined) ?? []);
  const items = rawItems.map((i) => {
    const logo = i.logoUrl ?? (i as unknown as Record<string, unknown>).logo_url;
    return { ...i, logoUrl: String(logo ?? "").trim() };
  });
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
  const containerClass = moduleSectionContainerClass({ fullWidth });

  const displayItems = items.filter((i) => i.logoUrl?.trim());

  if (displayItems.length === 0) return null;

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${paddingTop} ${paddingBottom}`}
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
          {layout === "tiered" && tiers.length ? (
            <div className="space-y-10">
              {tiers
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((tier, ti) => {
                  const tierItems = (tier.sponsors ?? []).filter((i) => i.logoUrl?.trim());
                  if (!tierItems.length) return null;
                  return (
                    <div key={ti}>
                      {tier.name ? (
                        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-white/70">{tier.name}</p>
                      ) : null}
                      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                        {tierItems.map((item, idx) => (
                          <div key={item.id ?? idx} className="h-[100px] w-[140px] sm:h-[120px] sm:w-[160px]">
                            <SponsorLogo item={item} lang={lang} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className={`flex flex-wrap justify-center gap-4 sm:gap-6 ${layout === "carousel" ? "overflow-x-auto pb-2" : ""}`}>
              {displayItems.map((item, idx) => (
                <div key={item.id ?? idx} className="h-[100px] w-[140px] shrink-0 sm:h-[120px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
                  <SponsorLogo item={item} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
