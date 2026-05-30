"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { SmartImage } from "@/components/common/SmartImage";
import { MapPin, ExternalLink } from "lucide-react";

interface ImovelItem {
  imageUrl?: string;
  title?: string;
  price?: string;
  area?: string;
  location?: string;
  href?: string;
}

export function ImoveisDestaqueSection({
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
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const items = (Array.isArray(block.config?.imoveisDestaqueItems)
    ? block.config.imoveisDestaqueItems
    : []) as ImovelItem[];
  const containerClass = moduleSectionContainerClass({ fullWidth });

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-12 sm:py-16`}
        style={
          (block.config?.backgroundColor as string)?.trim()
            ? { backgroundColor: (block.config?.backgroundColor as string).trim() }
            : undefined
        }
      >
        {(block.config?.backgroundImage as string)?.trim() && (
          <div className="absolute inset-0">
            <SmartImage
              src={getPublicImageUrl(block.config?.backgroundImage as string)}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div
              className="absolute inset-0 bg-zinc-950"
              style={{ opacity: (block.config?.backgroundOverlayOpacity as number) ?? 0.75 }}
            />
          </div>
        )}
        <div className={`relative ${containerClass}`}>
          {showTitle && title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          )}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((i) => (i?.title ?? "").trim())
              .map((item, i) => (
                <a
                  key={i}
                  href={(item.href ?? "").trim() || "#"}
                  target={(item.href ?? "").startsWith("http") ? "_blank" : undefined}
                  rel={(item.href ?? "").startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="relative aspect-video overflow-hidden bg-zinc-800">
                    {item.imageUrl ? (
                      <SmartImage
                        src={getPublicImageUrl(item.imageUrl)}
                        alt=""
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-500">
                        <MapPin className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    {item.price && <p className="mt-1 text-amber-400 font-medium">{item.price}</p>}
                    {(item.area || item.location) && (
                      <p className="mt-1 text-sm text-zinc-400">
                        {[item.area, item.location].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-amber-400 group-hover:underline">
                      {lang === "pt" ? "Ver detalhes" : "View details"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              ))}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
