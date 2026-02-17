import Image from "next/image";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { BlockRenderer } from "./BlockRenderer";

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

export function SectionBlockRenderer({
  block,
  slug,
  lang,
  page,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
}) {
  const columns = (block.config?.sectionColumns as 1 | 2) ?? 1;
  const layout = (block.config?.sectionLayout as "50-50" | "33-66" | "66-33") ?? "50-50";
  const leftModules = (block.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
  const rightModules = (block.config?.sectionRightModules as HomeContentBlock[] | undefined) ?? [];
  const padTop = (block.config?.sectionPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.sectionPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
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

  const visibleLeft = leftModules.filter((m) => m.config?.visible !== false);
  const visibleRight = rightModules.filter((m) => m.config?.visible !== false);
  const allModules = columns === 1 ? visibleLeft : [...visibleLeft, ...visibleRight];

  const leftColumnTitle = (lang === "pt" ? block.config?.sectionLeftColumnTitlePt : block.config?.sectionLeftColumnTitleEn) as string;
  const rightColumnTitle = (lang === "pt" ? block.config?.sectionRightColumnTitlePt : block.config?.sectionRightColumnTitleEn) as string;
  const titleAlign = (block.config?.titleAlign as "left" | "center" | "right") ?? (page.content?.theme?.titleAlign as "left" | "center" | "right") ?? "left";

  const leftColBgColor = (block.config?.sectionLeftColumnBackgroundColor as string)?.trim();
  const leftColBgImage = (block.config?.sectionLeftColumnBackgroundImage as string)?.trim();
  const leftColOverlay = (() => {
    const v = block.config?.sectionLeftColumnBackgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();
  const rightColBgColor = (block.config?.sectionRightColumnBackgroundColor as string)?.trim();
  const rightColBgImage = (block.config?.sectionRightColumnBackgroundImage as string)?.trim();
  const rightColOverlay = (() => {
    const v = block.config?.sectionRightColumnBackgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  /** Respeita "Largura do conteúdo (box ou full width)" da seção — igual aos outros módulos. */
  const sectionContentWidth = block.config?.contentWidth as "box" | "full" | undefined;
  const themeContentWidth = page.content?.theme?.contentWidth as "box" | "full" | undefined;
  const sectionFullWidth =
    sectionContentWidth === "full" || (sectionContentWidth !== "box" && themeContentWidth === "full");

  const sectionWrapperClass = sectionFullWidth
    ? "relative w-full px-4 sm:px-6 lg:px-8"
    : `relative w-full px-4 sm:px-6 lg:px-8 mx-auto ${columns === 1 ? "max-w-6xl" : "max-w-7xl"}`;

  function ColumnBg({ bgColor: colBg, bgImage: colImg, overlayOp }: { bgColor?: string; bgImage?: string; overlayOp: number }) {
    if (!colBg && !colImg) return null;
    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        {colBg && <div className="absolute inset-0" style={{ backgroundColor: colBg }} />}
        {colImg && (
          <>
            <Image
              src={getPublicImageUrl(colImg)}
              alt=""
              fill
              className="object-cover"
              sizes="50vw"
              unoptimized={isProxyImageUrl(getPublicImageUrl(colImg))}
            />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOp }} />
          </>
        )}
      </div>
    );
  }

  return (
    <section
      key={block.id}
      className={`relative overflow-hidden border-b border-white/5 ${paddingTop} ${paddingBottom}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {bgImage && (
        <div className="absolute inset-0">
          <Image
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isProxyImageUrl(getPublicImageUrl(bgImage))}
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <div className={sectionWrapperClass}>
        {columns === 1 ? (
          <div className={`relative min-h-[1px] rounded-lg ${(leftColBgColor || leftColBgImage) ? "p-4 sm:p-6" : ""}`}>
            {(leftColBgColor || leftColBgImage) && (
              <ColumnBg bgColor={leftColBgColor} bgImage={leftColBgImage} overlayOp={leftColOverlay} />
            )}
            <div className="relative space-y-12">
              {leftColumnTitle?.trim() && (
                <SectionTitle
                  title={leftColumnTitle}
                  gradientStart={(block.config?.sectionLeftColumnTitleGradientStart as string)?.trim()}
                  gradientEnd={(block.config?.sectionLeftColumnTitleGradientEnd as string)?.trim()}
                  align={titleAlign}
                />
              )}
              {allModules.map((m) => {
                const fullBleed = m.type === "proximos_jogos" && m.config?.fullBleedCarousel === true;
                return (
                  <div key={m.id} className={fullBleed ? "fullbleed-carousel-module" : undefined}>
                    <BlockRenderer block={m} slug={slug} lang={lang} page={page} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className={`grid w-full grid-cols-1 gap-8 lg:gap-12 ${
              layout === "50-50" ? "lg:grid-cols-2" : layout === "33-66" ? "lg:grid-cols-[1fr_2fr]" : "lg:grid-cols-[2fr_1fr]"
            }`}
          >
            <div className={`relative min-w-0 rounded-lg ${(leftColBgColor || leftColBgImage) ? "p-4 sm:p-6" : ""}`}>
              {(leftColBgColor || leftColBgImage) && (
                <ColumnBg bgColor={leftColBgColor} bgImage={leftColBgImage} overlayOp={leftColOverlay} />
              )}
              <div className="relative space-y-12">
                {leftColumnTitle?.trim() && (
                  <SectionTitle
                    title={leftColumnTitle}
                    gradientStart={(block.config?.sectionLeftColumnTitleGradientStart as string)?.trim()}
                    gradientEnd={(block.config?.sectionLeftColumnTitleGradientEnd as string)?.trim()}
                    align={titleAlign}
                  />
                )}
                {visibleLeft.map((m) => {
                  const fullBleed = m.type === "proximos_jogos" && m.config?.fullBleedCarousel === true;
                  return (
                    <div key={m.id} className={fullBleed ? "fullbleed-carousel-module" : undefined}>
                      <BlockRenderer block={m} slug={slug} lang={lang} page={page} inSection />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={`relative min-w-0 rounded-lg ${(rightColBgColor || rightColBgImage) ? "p-4 sm:p-6" : ""}`}>
              {(rightColBgColor || rightColBgImage) && (
                <ColumnBg bgColor={rightColBgColor} bgImage={rightColBgImage} overlayOp={rightColOverlay} />
              )}
              <div className="relative space-y-12">
                {rightColumnTitle?.trim() && (
                  <SectionTitle
                    title={rightColumnTitle}
                    gradientStart={(block.config?.sectionRightColumnTitleGradientStart as string)?.trim()}
                    gradientEnd={(block.config?.sectionRightColumnTitleGradientEnd as string)?.trim()}
                    align={titleAlign}
                  />
                )}
                {visibleRight.map((m) => {
                  const fullBleed = m.type === "proximos_jogos" && m.config?.fullBleedCarousel === true;
                  return (
                    <div key={m.id} className={fullBleed ? "fullbleed-carousel-module" : undefined}>
                      <BlockRenderer block={m} slug={slug} lang={lang} page={page} inSection />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
