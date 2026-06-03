"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DRAG_THRESHOLD_PX = 6;

interface HorizontalScrollCarouselProps {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
  gap?: number;
  lang?: "pt" | "en";
  /** Mostrar setas quando houver overflow (padrão: true). */
  showArrows?: boolean;
}

/**
 * Carrossel horizontal: scroll nativo, setas esquerda/direita e arrastar com o mouse.
 * Usa scrollTo no container — nunca scrollIntoView (regra do projeto).
 */
export function HorizontalScrollCarousel({
  children,
  className = "",
  trackClassName = "",
  gap = 16,
  lang = "pt",
  showArrows = true,
}: HorizontalScrollCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, children]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(240, Math.floor(el.clientWidth * 0.72));
    el.scrollTo({ left: el.scrollLeft + dir * step, behavior: "smooth" });
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.active) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
      dragState.current.moved = true;
    }
    el.scrollLeft = dragState.current.startScrollLeft - dx;
  }, []);

  const endDrag = useCallback(() => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    updateScrollButtons();
  }, [updateScrollButtons]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", endDrag);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endDrag);
    };
  }, [handleMouseMove, endDrag]);

  const handleClickCapture = (e: ReactMouseEvent) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  const hasOverflow = canScrollLeft || canScrollRight;
  const prevLabel = lang === "pt" ? "Anterior" : "Previous";
  const nextLabel = lang === "pt" ? "Próximo" : "Next";
  const dragHint =
    lang === "pt"
      ? "Arraste para os lados ou use as setas"
      : "Drag sideways or use arrows";

  return (
    <div className={`group relative ${className}`} title={hasOverflow ? dragHint : undefined}>
      {showArrows && canScrollLeft && (
        <button
          type="button"
          aria-label={prevLabel}
          onClick={() => scrollByAmount(-1)}
          className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:left-2 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {showArrows && canScrollRight && (
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => scrollByAmount(1)}
          className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:right-2 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div
        ref={ref}
        className={`flex cursor-grab overflow-x-auto overflow-y-hidden scroll-smooth py-2 scrollbar-thin active:cursor-grabbing ${hasOverflow && showArrows ? "md:px-12" : ""} ${trackClassName}`}
        style={{ gap, scrollSnapType: "x mandatory", scrollbarWidth: "thin" }}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        role="region"
        aria-label={dragHint}
      >
        {children}
      </div>
    </div>
  );
}
