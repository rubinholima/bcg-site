"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass, sectionPaddingClassFromBlock } from "@/lib/module-section-container";
import { resolveFontFamily } from "@/lib/page-fonts";
import { SmartImage } from "@/components/common/SmartImage";
import { AnimateInView } from "@/components/home/AnimateInView";
import { Button } from "@/components/ui/button";

type CtaButton = {
  labelPT?: string;
  labelEN?: string;
  href?: string;
  type?: string;
  openInNewTab?: boolean;
  highlighted?: boolean;
};

export function CtaSection({
  block,
  lang,
  page,
  fullWidth,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
}) {
  const cfg = block.config ?? {};
  const overlay =
    typeof cfg.ctaOverlayOpacity === "number"
      ? cfg.ctaOverlayOpacity
      : typeof block.config?.backgroundOverlayOpacity === "number"
        ? block.config.backgroundOverlayOpacity
        : 0.75;
  const layout = (cfg.ctaLayout as string) ?? "centered";
  const textAlign = (cfg.ctaTextAlign as string) ?? "center";
  const contentWidth = (cfg.ctaContentWidth as string) ?? "normal";
  const headline = (lang === "pt" ? cfg.titlePt : cfg.titleEn) as string | undefined;
  const subtitle = (lang === "pt" ? (cfg.ctaSubtitlePT as string) : (cfg.ctaSubtitleEN as string))?.trim() ?? "";
  const supportText = (lang === "pt" ? (cfg.bodyPt as string) : (cfg.bodyEn as string))?.trim() ?? "";
  const ctaButtons = (Array.isArray(cfg.ctaButtons) ? cfg.ctaButtons : []).filter(
    (b) => (b as CtaButton)?.href?.trim(),
  ) as CtaButton[];
  const bgMode = (cfg.ctaBackgroundMode as string) ?? "image";
  const bgImg =
    bgMode === "image"
      ? ((cfg.backgroundImage as string)?.trim() || (cfg.imageUrl as string)?.trim())
      : "";
  const bgColor = (cfg.backgroundColor as string)?.trim();
  const maxWClass = contentWidth === "wide" ? "max-w-4xl" : "max-w-2xl";
  const ff = resolveFontFamily(block.config as Record<string, unknown>, page.content?.theme);
  const isExternal = (href: string) => href.startsWith("http://") || href.startsWith("https://");

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${sectionPaddingClassFromBlock(block)}`}
        style={{
          ...(bgColor && !bgImg ? { backgroundColor: bgColor } : {}),
          ...(ff ? { fontFamily: ff } : {}),
        }}
      >
        {bgImg && (
          <div className="absolute inset-0">
            <SmartImage src={getPublicImageUrl(bgImg)} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlay }} />
          </div>
        )}
        <div className={moduleSectionContainerClass({ fullWidth, maxContentWidth: block.config?.maxContentWidth as "narrow" | "normal" | "wide" | undefined })}>
          <div className={`mx-auto ${maxWClass} ${textAlign === "left" ? "text-left" : "text-center"}`}>
            <div className={layout === "split" ? "flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between" : ""}>
              <div className={layout === "split" ? "lg:flex-1" : ""}>
                {headline?.trim() && (
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">{headline.trim()}</h2>
                )}
                {subtitle && <p className="mt-3 text-lg text-zinc-200">{subtitle}</p>}
                {supportText && <p className="mt-2 text-zinc-400">{supportText}</p>}
              </div>
              {ctaButtons.length > 0 && (
                <div
                  className={`mt-8 flex flex-wrap gap-4 ${layout === "split" ? "lg:mt-0 lg:shrink-0" : ""} ${textAlign === "left" ? "justify-start" : "justify-center"}`}
                >
                  {ctaButtons.map((btn, i) => {
                    const label = (lang === "pt" ? btn.labelPT : btn.labelEN)?.trim();
                    const href = (btn.href ?? "").trim() || "#";
                    if (!label) return null;
                    const openNew = !!btn.openInNewTab || isExternal(href);
                    const variant = btn.type === "ghost" ? "ghost" : btn.type === "secondary" ? "outline" : "default";
                    const className =
                      variant === "default"
                        ? `h-12 rounded-xl px-8 ${btn.highlighted ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-white text-zinc-900 hover:bg-zinc-100"}`
                        : "h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10";
                    return (
                      <Button key={i} size="lg" variant={variant} className={className} asChild>
                        <a href={href} target={openNew ? "_blank" : undefined} rel={openNew ? "noopener noreferrer" : undefined}>
                          {label}
                        </a>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
