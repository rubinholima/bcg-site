"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroCarouselEffect, HeroSlide } from "@/types/home-content";
import { SmartImage } from "@/components/common/SmartImage";
import { Button } from "@/components/ui/button";

interface HeroCarouselProps {
  slides: HeroSlide[];
  effect: HeroCarouselEffect;
  overlayOpacity: number;
  intervalSeconds: 5 | 10 | 15;
  lang: "pt" | "en";
  children: React.ReactNode;
  /** overlayMode: solid | gradient-bottom | gradient-right */
  overlayMode?: "solid" | "gradient-bottom" | "gradient-right";
  overlayColor?: string;
}

function overlayStyle(
  overlayOpacity: number,
  mode?: "solid" | "gradient-bottom" | "gradient-right",
  color?: string
): React.CSSProperties {
  const c = color && /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : "rgb(9 9 11)";
  if (mode === "gradient-bottom") {
    return {
      background: `linear-gradient(to bottom, transparent 0%, ${c} ${100 - overlayOpacity * 100}%)`,
      opacity: 1,
    };
  }
  if (mode === "gradient-right") {
    return {
      background: `linear-gradient(to right, transparent 0%, ${c} ${100 - overlayOpacity * 100}%)`,
      opacity: 1,
    };
  }
  return { backgroundColor: c, opacity: overlayOpacity };
}

export function HeroCarousel({
  slides,
  effect,
  overlayOpacity,
  intervalSeconds,
  lang,
  children,
  overlayMode = "solid",
  overlayColor,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const validSlides = slides.filter((s) => s?.url?.trim());
  const count = validSlides.length;
  const currentSlide = count > 0 ? validSlides[index % count] : null;
  const intervalMs = intervalSeconds * 1000;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => clearInterval(t);
  }, [count, intervalMs]);

  const goPrev = () => {
    setIndex((i) => (i - 1 + count) % count);
  };

  const goNext = () => {
    setIndex((i) => (i + 1) % count);
  };

  if (count === 0) {
    return <div className="absolute inset-0 bg-zinc-900">{children}</div>;
  }

  if (count === 1) {
    const src = currentSlide!.url;
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 pointer-events-none">
          <SmartImage
            src={src}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0" style={overlayStyle(overlayOpacity, overlayMode, overlayColor)} />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {validSlides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 pointer-events-none transition-all duration-700 ease-in-out"
          style={{
            zIndex: 0,
            opacity: i === index ? 1 : 0,
            transform:
              effect === "slide"
                ? `translateX(${(i - index) * 100}%)`
                : effect === "zoom"
                  ? `scale(${i === index ? 1 : 1.1})`
                  : undefined,
          }}
        >
          <SmartImage
            src={slide.url}
            alt=""
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
            unoptimized
          />
        </div>
      ))}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{ ...overlayStyle(overlayOpacity, overlayMode, overlayColor), zIndex: 1 }}
      />
      <div className="absolute inset-0 z-10 flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          {children}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 text-white hover:bg-white/20 sm:left-4"
          onClick={goPrev}
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 text-white hover:bg-white/20 sm:right-4"
          onClick={goNext}
          aria-label="Próxima foto"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
