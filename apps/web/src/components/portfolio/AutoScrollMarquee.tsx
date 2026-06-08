"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AutoScrollMarqueeProps {
  children: ReactNode;
  /** Quantidade de itens únicos (antes de duplicar). */
  itemCount: number;
  /** Duração em segundos para percorrer um ciclo (1/3 do track triplicado). */
  durationSec: number;
  lang?: "pt" | "en";
  gap?: number;
  className?: string;
  trackClassName?: string;
}

/**
 * Carrossel horizontal contínuo: rola sozinho, pausa no hover com setas.
 * Usa scrollTo no container — nunca scrollIntoView.
 * Sem barra de rolagem visível.
 */
export function AutoScrollMarquee({
  children,
  itemCount,
  durationSec,
  lang = "pt",
  gap = 16,
  className = "",
  trackClassName = "",
}: AutoScrollMarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const active = itemCount > 1;

  const scrollByAmount = useCallback(
    (dir: -1 | 1) => {
      const el = ref.current;
      if (!el) return;
      const first = el.querySelector(":scope > *") as HTMLElement | null;
      const step = (first?.offsetWidth ?? 280) + gap;
      el.scrollTo({ left: el.scrollLeft + dir * step, behavior: "smooth" });
    },
    [gap],
  );

  useEffect(() => {
    if (!active || paused) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const tick = () => {
      const node = ref.current;
      if (node && !paused) {
        const third = node.scrollWidth / 3;
        if (third > 0) {
          const pxPerFrame = third / (Math.max(durationSec, 1) * 60);
          node.scrollLeft += pxPerFrame;
          if (node.scrollLeft >= third - 1) {
            node.scrollLeft -= third;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, durationSec, children]);

  if (!active) {
    return (
      <div className={`flex py-2 ${className}`} style={{ gap }}>
        {children}
      </div>
    );
  }

  const prevLabel = lang === "pt" ? "Anterior" : "Previous";
  const nextLabel = lang === "pt" ? "Próximo" : "Next";

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      title={lang === "pt" ? "Passe o mouse para pausar e usar as setas" : "Hover to pause and use arrows"}
    >
      {paused && (
        <>
          <button
            type="button"
            aria-label={prevLabel}
            onClick={() => scrollByAmount(-1)}
            className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            onClick={() => scrollByAmount(1)}
            className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <div
        ref={ref}
        className={`flex overflow-x-auto overflow-y-hidden py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${trackClassName}`}
        style={{ gap }}
      >
        {children}
      </div>
    </div>
  );
}
