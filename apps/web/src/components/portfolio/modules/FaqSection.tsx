"use client";

import { useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  questionPt?: string;
  questionEn?: string;
  answerPt?: string;
  answerEn?: string;
}

export function FaqSection({
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
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const items = (Array.isArray(block.config?.faqItems) ? block.config.faqItems : []) as FaqItem[];
  const containerClass = fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8";

  const filtered = items.filter((i) => (i?.questionPt ?? i?.questionEn ?? "").trim());

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-14 sm:py-20`}
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
          <div className="mt-8 space-y-2">
            {filtered.map((item, i) => {
              const q = (lang === "pt" ? item.questionPt : item.questionEn) ?? "";
              const a = (lang === "pt" ? item.answerPt : item.answerEn) ?? "";
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden transition-all hover:border-amber-500/20"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-white"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                  >
                    <span className="font-medium">{q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && a && (
                    <div className="border-t border-white/10 px-4 py-3 text-zinc-400 text-sm">
                      {a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AnimateInView>
  );
}
