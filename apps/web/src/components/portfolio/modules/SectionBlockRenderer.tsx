import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { SmartImage } from "@/components/common/SmartImage";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import type { EventPageMetaForFixtures } from "./BlockRenderer";
import { SectionNestedModule, shouldShowSectionColumnTitle } from "./SectionNestedModule";
import type { FixturesFetchContext } from "@/lib/fixtures-shared";

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

/** Espaço entre módulos na coluna — minimal/compact = menos espaço. */
const MODULE_SPACING = {
  minimal: "space-y-4",
  compact: "space-y-6",
  normal: "space-y-10",
  large: "space-y-12",
} as const;

export function SectionBlockRenderer({
  block,
  slug,
  lang,
  page,
  fixturesContext = "tenant",
  initialUploadToken,
  eventPageMeta,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
  fixturesContext?: FixturesFetchContext;
  initialUploadToken?: string | null;
  eventPageMeta?: EventPageMetaForFixtures | null;
}) {
  const columns = (block.config?.sectionColumns as 1 | 2 | 3) ?? 1;
  const layout = (block.config?.sectionLayout as string) ?? "50-50";
  const leftModules = (block.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
  const middleModules = (block.config?.sectionMiddleModules as HomeContentBlock[] | undefined) ?? [];
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
  const moduleSpacing = MODULE_SPACING[padTop] ?? MODULE_SPACING.compact;

  const visibleLeft = leftModules.filter((m) => {
    const v = m.config?.visible as boolean | string | undefined;
    return v !== false && v !== "false";
  });
  const visibleMiddle = middleModules.filter((m) => {
    const v = m.config?.visible as boolean | string | undefined;
    return v !== false && v !== "false";
  });
  const visibleRight = rightModules.filter((m) => {
    const v = m.config?.visible as boolean | string | undefined;
    return v !== false && v !== "false";
  });
  const allModules = columns === 1 ? visibleLeft : columns === 2 ? [...visibleLeft, ...visibleRight] : [...visibleLeft, ...visibleMiddle, ...visibleRight];

  const leftColumnTitle = (lang === "pt" ? block.config?.sectionLeftColumnTitlePt : block.config?.sectionLeftColumnTitleEn) as string;
  const middleColumnTitle = (lang === "pt" ? block.config?.sectionMiddleColumnTitlePt : block.config?.sectionMiddleColumnTitleEn) as string;
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
  const middleColBgColor = (block.config?.sectionMiddleColumnBackgroundColor as string)?.trim();
  const middleColBgImage = (block.config?.sectionMiddleColumnBackgroundImage as string)?.trim();
  const middleColOverlay = (() => {
    const v = block.config?.sectionMiddleColumnBackgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();
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

  const gridColsClass =
    columns === 2
      ? layout === "50-50"
        ? "lg:grid-cols-2"
        : layout === "33-66"
          ? "lg:grid-cols-[1fr_2fr]"
          : layout === "66-33"
            ? "lg:grid-cols-[2fr_1fr]"
            : "lg:grid-cols-2"
      : columns === 3
        ? layout === "33-33-33"
          ? "lg:grid-cols-3"
          : layout === "25-50-25"
            ? "lg:grid-cols-[1fr_2fr_1fr]"
            : layout === "50-25-25"
              ? "lg:grid-cols-[2fr_1fr_1fr]"
              : layout === "25-25-50"
                ? "lg:grid-cols-[1fr_1fr_2fr]"
                : "lg:grid-cols-3"
        : "lg:grid-cols-2";

  function ColumnBg({ bgColor: colBg, bgImage: colImg, overlayOp }: { bgColor?: string; bgImage?: string; overlayOp: number }) {
    if (!colBg && !colImg) return null;
    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        {colBg && <div className="absolute inset-0" style={{ backgroundColor: colBg }} />}
        {colImg && (
          <>
            <SmartImage
              src={getPublicImageUrl(colImg)}
              alt=""
              fill
              className="object-cover"
              sizes="50vw"
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
      <div className={sectionWrapperClass}>
        {columns === 1 ? (
          <div className={`relative min-h-[1px] rounded-lg ${(leftColBgColor || leftColBgImage) ? "p-4 sm:p-6" : ""}`}>
            {(leftColBgColor || leftColBgImage) && (
              <ColumnBg bgColor={leftColBgColor} bgImage={leftColBgImage} overlayOp={leftColOverlay} />
            )}
            <div className={`relative ${moduleSpacing}`}>
              {shouldShowSectionColumnTitle(leftColumnTitle, visibleLeft) && (
                <SectionTitle
                  title={leftColumnTitle!}
                  gradientStart={(block.config?.sectionLeftColumnTitleGradientStart as string)?.trim()}
                  gradientEnd={(block.config?.sectionLeftColumnTitleGradientEnd as string)?.trim()}
                  align={titleAlign}
                />
              )}
              {allModules.map((m) => (
                <SectionNestedModule
                  key={m.id}
                  module={m}
                  slug={slug}
                  lang={lang}
                  page={page}
                  columns={columns}
                  fixturesContext={fixturesContext}
                  initialUploadToken={initialUploadToken}
                  eventPageMeta={eventPageMeta}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid w-full grid-cols-1 gap-8 lg:gap-12 ${gridColsClass}`}>
            <div className={`relative min-w-0 rounded-lg ${(leftColBgColor || leftColBgImage) ? "p-4 sm:p-6" : ""}`}>
              {(leftColBgColor || leftColBgImage) && (
                <ColumnBg bgColor={leftColBgColor} bgImage={leftColBgImage} overlayOp={leftColOverlay} />
              )}
              <div className={`relative ${moduleSpacing}`}>
                {shouldShowSectionColumnTitle(leftColumnTitle, visibleLeft) && (
                  <SectionTitle
                    title={leftColumnTitle!}
                    gradientStart={(block.config?.sectionLeftColumnTitleGradientStart as string)?.trim()}
                    gradientEnd={(block.config?.sectionLeftColumnTitleGradientEnd as string)?.trim()}
                    align={titleAlign}
                  />
                )}
                {visibleLeft.map((m) => (
                  <SectionNestedModule
                    key={m.id}
                    module={m}
                    slug={slug}
                    lang={lang}
                    page={page}
                    columns={columns}
                    fixturesContext={fixturesContext}
                    initialUploadToken={initialUploadToken}
                    eventPageMeta={eventPageMeta}
                  />
                ))}
              </div>
            </div>
            {columns === 3 && (
              <div className={`relative min-w-0 rounded-lg ${(middleColBgColor || middleColBgImage) ? "p-4 sm:p-6" : ""}`}>
                {(middleColBgColor || middleColBgImage) && (
                  <ColumnBg bgColor={middleColBgColor} bgImage={middleColBgImage} overlayOp={middleColOverlay} />
                )}
                <div className={`relative ${moduleSpacing}`}>
                  {shouldShowSectionColumnTitle(middleColumnTitle, visibleMiddle) && (
                    <SectionTitle
                      title={middleColumnTitle!}
                      gradientStart={(block.config?.sectionMiddleColumnTitleGradientStart as string)?.trim()}
                      gradientEnd={(block.config?.sectionMiddleColumnTitleGradientEnd as string)?.trim()}
                      align={titleAlign}
                    />
                  )}
                  {visibleMiddle.map((m) => (
                    <SectionNestedModule
                      key={m.id}
                      module={m}
                      slug={slug}
                      lang={lang}
                      page={page}
                      columns={columns}
                      fixturesContext={fixturesContext}
                      initialUploadToken={initialUploadToken}
                      eventPageMeta={eventPageMeta}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className={`relative min-w-0 rounded-lg ${(rightColBgColor || rightColBgImage) ? "p-4 sm:p-6" : ""}`}>
              {(rightColBgColor || rightColBgImage) && (
                <ColumnBg bgColor={rightColBgColor} bgImage={rightColBgImage} overlayOp={rightColOverlay} />
              )}
              <div className={`relative ${moduleSpacing}`}>
                {shouldShowSectionColumnTitle(rightColumnTitle, visibleRight) && (
                  <SectionTitle
                    title={rightColumnTitle!}
                    gradientStart={(block.config?.sectionRightColumnTitleGradientStart as string)?.trim()}
                    gradientEnd={(block.config?.sectionRightColumnTitleGradientEnd as string)?.trim()}
                    align={titleAlign}
                  />
                )}
                {visibleRight.map((m) => (
                  <SectionNestedModule
                    key={m.id}
                    module={m}
                    slug={slug}
                    lang={lang}
                    page={page}
                    columns={columns}
                    fixturesContext={fixturesContext}
                    initialUploadToken={initialUploadToken}
                    eventPageMeta={eventPageMeta}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
