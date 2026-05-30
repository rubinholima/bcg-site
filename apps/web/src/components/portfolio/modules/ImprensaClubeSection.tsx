"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { SmartImage } from "@/components/common/SmartImage";
import { ImprensaPressHub } from "@/components/press/ImprensaPressHub";

export function ImprensaClubeSection({
  block,
  slug,
  lang,
  page,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const padTop =
    block.config?.imprensaPaddingTop === "minimal"
      ? "pt-8 sm:pt-10"
      : block.config?.imprensaPaddingTop === "large"
        ? "pt-20 sm:pt-28"
        : "pt-14 sm:pt-20";
  const padBottom =
    block.config?.imprensaPaddingBottom === "minimal"
      ? "pb-8 sm:pb-10"
      : block.config?.imprensaPaddingBottom === "large"
        ? "pb-20 sm:pb-28"
        : "pb-14 sm:pb-20";

  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    return 0.75;
  })();

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${padTop} ${padBottom}`}
        style={bgColor && !bgImage ? { backgroundColor: bgColor } : undefined}
      >
        {bgImage ? (
          <>
            <div className="absolute inset-0">
              <SmartImage src={getPublicImageUrl(bgImage)} alt="" fill className="object-cover" sizes="100vw" />
            </div>
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </>
        ) : null}
        <div
          className={moduleSectionContainerClass({ inSection, fullWidth })}
        >
          {showTitle && title?.trim() ? (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          ) : null}
          <ImprensaPressHub
            slug={slug}
            entityName={page.tenant?.name ?? slug}
            logoUrl={page.tenant?.logoUrl}
            lang={lang}
            block={block}
            showTitle={!title?.trim()}
          />
        </div>
      </section>
    </AnimateInView>
  );
}
