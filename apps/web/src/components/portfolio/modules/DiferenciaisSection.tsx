"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import {
  Award,
  Target,
  CheckCircle,
  Building2,
  Trophy,
  Globe,
  Zap,
  Users,
  Star,
  BarChart3,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  Target,
  CheckCircle,
  Building2,
  Trophy,
  Globe,
  Zap,
  Users,
  Star,
  BarChart3,
  Briefcase,
};

interface DiferencialItem {
  icon?: string;
  titlePt?: string;
  titleEn?: string;
  bodyPt?: string;
  bodyEn?: string;
}

export function DiferenciaisSection({
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
  const items = (Array.isArray(block.config?.diferenciaisItems)
    ? block.config.diferenciaisItems
    : []) as DiferencialItem[];
  const containerClass = fullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8";

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} py-14 sm:py-20`}
        style={
          (block.config?.backgroundColor as string)?.trim()
            ? { backgroundColor: (block.config?.backgroundColor as string).trim() }
            : { backgroundColor: "rgb(39 39 42 / 0.3)" }
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
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items
              .filter((i) => (i?.titlePt ?? i?.titleEn ?? "").trim())
              .map((item, i) => {
                const Icon = ICON_MAP[item.icon ?? ""] ?? CheckCircle;
                const titleText = (lang === "pt" ? item.titlePt : item.titleEn) ?? "";
                const bodyText = (lang === "pt" ? item.bodyPt : item.bodyEn) ?? "";
                return (
                  <li
                    key={i}
                    className="rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-6 text-center transition-all hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5"
                  >
                    <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="font-semibold text-white">{titleText}</h3>
                    {bodyText && <p className="mt-2 text-sm text-zinc-400">{bodyText}</p>}
                  </li>
                );
              })}
          </ul>
        </div>
      </section>
    </AnimateInView>
  );
}
