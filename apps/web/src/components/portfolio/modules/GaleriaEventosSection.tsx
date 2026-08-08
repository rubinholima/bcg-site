"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { HomeContentBlock } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { SmartImage } from "@/components/common/SmartImage";
import { Button } from "@/components/ui/button";
import { Loader2, Newspaper, Upload } from "lucide-react";

type EventPhoto = { id: string; url: string; caption: string | null; sortOrder: number };

function blockTitle(block: HomeContentBlock, lang: "pt" | "en"): string {
  const v = lang === "pt" ? block.config?.titlePt : block.config?.titleEn;
  return (v && String(v).trim()) ? String(v) : "";
}

export function GaleriaEventosSection({
  block,
  slug,
  lang,
  fullWidth,
  titleAlign,
  inSection,
  showTitle = true,
  initialUploadToken,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
  initialUploadToken?: string | null;
}) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [uploadUrl, setUploadUrl] = useState<string | null>(() =>
    initialUploadToken ? `/eventos/upload/${initialUploadToken}` : null
  );
  const [loading, setLoading] = useState(true);

  const safeJson = (r: Response) =>
    r.ok ? r.json().catch(() => null) : Promise.resolve(null);

  useEffect(() => {
    let cancelled = false;
    // Token público por slug foi removido — só usa link privado (initialUploadToken / dashboard).
    fetch(`/api/public/events/${encodeURIComponent(slug)}/photos`)
      .then(safeJson)
      .then((photosData) => {
        if (!cancelled && Array.isArray(photosData)) setPhotos(photosData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = blockTitle(block, lang) || (lang === "pt" ? "Galeria de fotos" : "Photo gallery");
  const bgColor = (block.config?.backgroundColor as string)?.trim() || "#0f0f12";
  const overlayOpacity = typeof block.config?.backgroundOverlayOpacity === "number"
    ? block.config.backgroundOverlayOpacity
    : 0.75;
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const gradientStart = (block.config?.titleGradientStart as string)?.trim() || "#fcd34d";
  const gradientEnd = (block.config?.titleGradientEnd as string)?.trim() || "#ffffff";

  if (loading) {
    return (
      <AnimateInView>
        <section
          className="relative py-12 md:py-16"
          style={{ backgroundColor: bgColor }}
        >
          <div className={moduleSectionContainerClass({ fullWidth })}>
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando galeria…</span>
            </div>
          </div>
        </section>
      </AnimateInView>
    );
  }

  return (
    <AnimateInView>
      <section
        className="relative py-12 md:py-16"
        style={{ backgroundColor: bgColor }}
      >
        {bgImage && (
          <>
            <div className="absolute inset-0">
              <SmartImage
                src={getPublicImageUrl(bgImage)}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
            <div
              className="absolute inset-0 bg-zinc-950"
              style={{ opacity: overlayOpacity }}
            />
          </>
        )}
        <div className={moduleSectionContainerClass({ inSection, fullWidth })}>
          {showTitle && title && (
            <div className="mb-8">
              <SectionTitle
                title={title}
                align={titleAlign ?? "left"}
                gradientStart={gradientStart}
                gradientEnd={gradientEnd}
              />
            </div>
          )}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {uploadUrl ? (
              <Button asChild size="lg" className="min-h-11 gap-2">
                <Link href={uploadUrl}>
                  <Upload className="h-5 w-5" />
                  {lang === "pt" ? "Enviar fotos" : "Upload photos"}
                </Link>
              </Button>
            ) : (
              <p className="w-full text-sm text-muted-foreground sm:mr-auto sm:w-auto">
                {lang === "pt"
                  ? "O envio pelo fotógrafo aparece quando o organizador ativar o link."
                  : "Photographer upload appears when the organizer enables the link."}
              </p>
            )}
            <Button asChild size="lg" variant="outline" className="min-h-11 gap-2 border-white/25 bg-white/5 hover:bg-white/10">
              <Link href="/imprensa">
                <Newspaper className="h-5 w-5" />
                {lang === "pt" ? "Imprensa" : "Press"}
              </Link>
            </Button>
          </div>
          {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={getPublicImageUrl(photo.url) || photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-900"
              >
                <SmartImage
                  src={getPublicImageUrl(photo.url) || photo.url}
                  alt={photo.caption ?? ""}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white line-clamp-2">{photo.caption}</p>
                  </div>
                )}
              </a>
            ))}
          </div>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
