"use client";

import { useState, useEffect, useRef } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";

interface NumeroItem {
  value?: number;
  labelPt?: string;
  labelEn?: string;
}

function AnimatedNumber({ value, isInView }: { value: number; isInView: boolean }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInView) {
      setDisplay(0);
      startRef.current = null;
      return;
    }
    startRef.current = null;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const easeOut = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(easeOut * value));
      if (t < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, isInView]);

  return <span>{display}</span>;
}

export function NumerosSection({
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
  const [inView, setInView] = useState(false);
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const items = (Array.isArray(block.config?.numerosItems) ? block.config.numerosItems : []) as NumeroItem[];
  const containerClass = fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8";

  return (
    <AnimateInView>
      <section
        id={block.id}
        className="relative overflow-hidden border-b border-white/5 py-14 sm:py-20"
        style={
          (block.config?.backgroundColor as string)?.trim()
            ? { backgroundColor: (block.config?.backgroundColor as string).trim() }
            : undefined
        }
      >
        <div className={containerClass}>
          {showTitle && title && (
            <SectionTitle
              title={title}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          )}
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((i) => i && (i.value !== undefined || (i.labelPt ?? i.labelEn ?? "").trim()))
              .map((item, i) => (
                <div
                  key={i}
                  className="text-center"
                  ref={(el) => {
                    if (!el) return;
                    const obs = new IntersectionObserver(
                      ([e]) => e?.isIntersecting && setInView(true),
                      { threshold: 0.2 }
                    );
                    obs.observe(el);
                  }}
                >
                  <div className="text-4xl font-bold text-amber-400 sm:text-5xl">
                    <AnimatedNumber value={Number(item.value) ?? 0} isInView={inView} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-zinc-300">
                    {(lang === "pt" ? item.labelPt : item.labelEn) ?? ""}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
