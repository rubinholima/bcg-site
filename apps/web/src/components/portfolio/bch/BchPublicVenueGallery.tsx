"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BchVenueLang } from "@/lib/bch-public-venue-content";

type GalleryItem = {
  src: string;
  captionPt: string;
  captionEn: string;
};

export function BchPublicVenueGallery({
  items,
  lang,
}: {
  items: readonly GalleryItem[];
  lang: BchVenueLang;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(() => {
    setLightbox((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  }, [items.length]);
  const next = useCallback(() => {
    setLightbox((i) => (i === null ? null : (i + 1) % items.length));
  }, [items.length]);

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {items.map((item, index) => {
          const caption = lang === "pt" ? item.captionPt : item.captionEn;
          return (
            <button
              key={item.src}
              type="button"
              onClick={() => setLightbox(index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={caption}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-left text-[10px] leading-tight text-zinc-200 sm:text-xs">
                {caption}
              </span>
            </button>
          );
        })}
      </div>

      {lightbox !== null ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lang === "pt" ? "Galeria ampliada" : "Expanded gallery"}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={lang === "pt" ? "Fechar" : "Close"}
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
            aria-label={lang === "pt" ? "Anterior" : "Previous"}
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
            aria-label={lang === "pt" ? "Próxima" : "Next"}
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <figure className="max-h-[85vh] max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={items[lightbox].src}
              alt={lang === "pt" ? items[lightbox].captionPt : items[lightbox].captionEn}
              className="max-h-[78vh] w-auto max-w-full rounded-lg object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-zinc-300">
              {lang === "pt" ? items[lightbox].captionPt : items[lightbox].captionEn}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
