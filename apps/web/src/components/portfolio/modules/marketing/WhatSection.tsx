"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass, sectionPaddingClassFromBlock } from "@/lib/module-section-container";
import { resolveFontFamily } from "@/lib/page-fonts";
import { SmartImage } from "@/components/common/SmartImage";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";

type Card = { title?: string; body?: string };

function blockOverlayOpacity(block: HomeContentBlock): number {
  const v = block.config?.backgroundOverlayOpacity;
  if (typeof v === "number" && v >= 0 && v <= 1) return v;
  return 0.75;
}

export function WhatSection({
  block,
  lang,
  page,
  fullWidth,
  titleAlign = "left",
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string | undefined;
  const body = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
  const cards = (
    (lang === "pt" ? block.config?.cardsPt : block.config?.cardsEn) as Card[] | undefined
  )?.filter((c) => c && (c.title?.trim() || c.body?.trim())) ?? [];
  const imageOnLeft = (block.config?.whatImagePosition as string) === "left";
  const imageUrl = (block.config?.imageUrl as string)?.trim();
  const bgImg = (block.config?.backgroundImage as string)?.trim();
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const ff = resolveFontFamily(block.config as Record<string, unknown>, page.content?.theme);

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${sectionPaddingClassFromBlock(block)}`}
        style={{
          ...(bgColor ? { backgroundColor: bgColor } : { backgroundColor: "rgb(9 9 11)" }),
          ...(ff ? { fontFamily: ff } : {}),
        }}
      >
        {bgImg && (
          <div className="absolute inset-0">
            <SmartImage src={getPublicImageUrl(bgImg)} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
          </div>
        )}
        <div className={moduleSectionContainerClass({ fullWidth, maxContentWidth: block.config?.maxContentWidth as "narrow" | "normal" | "wide" | undefined })}>
          <div className="grid items-stretch gap-12 lg:grid-cols-2 lg:gap-16">
            <div className={`flex flex-col ${imageOnLeft ? "order-2 lg:order-2" : "order-2 lg:order-1"}`}>
              {title?.trim() && (
                <SectionTitle
                  title={title.trim()}
                  gradientStart={(block.config?.titleGradientStart as string)?.trim()}
                  gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
                  align={titleAlign}
                />
              )}
              {body?.trim() && <p className="mt-4 max-w-xl text-zinc-400">{body.trim()}</p>}
              {cards.length > 0 && (
                <div className="mt-8 grid flex-1 gap-4 sm:grid-cols-2 content-start">
                  {cards.map((card, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-colors hover:border-amber-500/30 hover:bg-zinc-800/80"
                    >
                      {card.title?.trim() && <h3 className="font-semibold text-white">{card.title.trim()}</h3>}
                      {card.body?.trim() && <p className="mt-2 text-sm text-zinc-400">{card.body.trim()}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {imageUrl && (
              <div className={`${imageOnLeft ? "order-1 lg:order-1" : "order-1 lg:order-2"} min-h-[280px]`}>
                <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-2xl">
                  <SmartImage
                    src={getPublicImageUrl(imageUrl)}
                    alt={title?.trim() || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
