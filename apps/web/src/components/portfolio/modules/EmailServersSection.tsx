"use client";

import { ExternalLink, Mail, Server } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import type { EmailServerItem } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { SmartImage } from "@/components/common/SmartImage";
import { getPublicImageUrl, isSvgUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { emailServerDisplayName, parseEmailServersItems } from "@/lib/email-servers";

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

function EmailServerCard({ item, lang }: { item: EmailServerItem; lang: "pt" | "en" }) {
  const name = emailServerDisplayName(item, lang);
  const logo = item.logoUrl?.trim();

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[44px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 transition-all duration-300 hover:border-amber-500/40 hover:bg-zinc-900 hover:shadow-lg hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8 text-center sm:px-6 sm:py-10">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950/80 sm:h-24 sm:w-24">
          {logo ? (
            isSvgUrl(logo) ? (
              <img
                src={getPublicImageUrl(logo)}
                alt=""
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <SmartImage
                src={getPublicImageUrl(logo)}
                alt=""
                fill
                className="object-contain p-3"
                sizes="96px"
              />
            )
          ) : (
            <Mail className="h-10 w-10 text-amber-400/90" aria-hidden />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-zinc-100 group-hover:text-amber-300 sm:text-xl">
            {name}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 sm:text-sm">
            <Server className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {lang === "pt" ? "Abrir webmail" : "Open webmail"}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </p>
        </div>
      </div>
    </a>
  );
}

export function EmailServersSection({
  block,
  lang,
  fullWidth,
  titleAlign = "center",
  inSection,
  showTitle = true,
  hubMode,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
  /** Página dedicada /email-server — layout mais espaçoso */
  hubMode?: boolean;
}) {
  const title = ((lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string)?.trim();
  const subtitle = ((lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string)?.trim();
  const items = parseEmailServersItems(block);
  const padTop =
    (block.config?.emailServersPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom =
    (block.config?.emailServersPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
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
  const titleGradientStart = (block.config?.titleGradientStart as string)?.trim() || "#fcd34d";
  const titleGradientEnd = (block.config?.titleGradientEnd as string)?.trim() || "#ffffff";

  const paddingTop = PADDING_CLASSES[padTop]?.top ?? PADDING_CLASSES.compact.top;
  const paddingBottom = PADDING_CLASSES[padBottom]?.bottom ?? PADDING_CLASSES.compact.bottom;
  const containerClass = moduleSectionContainerClass({ fullWidth });

  if (items.length === 0) {
    if (!hubMode) return null;
    return (
      <div className={`relative ${paddingTop} ${paddingBottom}`}>
        <div className={containerClass}>
          <p className="text-center text-sm text-zinc-500">
            {lang === "pt"
              ? "Nenhum servidor configurado. Adicione empresas no editor da Home do Grupo."
              : "No servers configured. Add organizations in the Group Home editor."}
          </p>
        </div>
      </div>
    );
  }

  const gridClass = hubMode
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6"
    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <AnimateInView>
      <section
        id="email-servers"
        className={`relative ${paddingTop} ${paddingBottom} ${inSection ? "" : moduleBottomBorderClass(block.config)}`}
        style={{ backgroundColor: bgImage ? undefined : bgColor || undefined }}
      >
        {bgImage ? (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <SmartImage src={getPublicImageUrl(bgImage)} alt="" fill className="object-cover" />
            </div>
            <div
              className="absolute inset-0 bg-zinc-950"
              style={{ opacity: overlayOpacity }}
              aria-hidden
            />
          </>
        ) : null}
        <div className={`relative ${containerClass}`}>
          {showTitle && title ? (
            <div className={hubMode ? "mb-10 sm:mb-12" : "mb-8 sm:mb-10"}>
              <SectionTitle
                title={title}
                align={titleAlign}
                gradientStart={titleGradientStart}
                gradientEnd={titleGradientEnd}
              />
              {subtitle ? (
                <p className="mt-3 text-center text-sm text-zinc-400 sm:text-base">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
          <div className={gridClass}>
            {items.map((item) => (
              <EmailServerCard key={item.id ?? item.url} item={item} lang={lang} />
            ))}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
