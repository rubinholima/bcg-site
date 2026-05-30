"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import {
  CheckCircle,
  Check,
  Trophy,
  Globe,
  Layers,
  Award,
  Target,
  Zap,
  Building2,
  Users,
  Star,
  BarChart3,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle,
  Check,
  Trophy,
  Globe,
  Layers,
  Award,
  Target,
  Zap,
  Building2,
  Users,
  Star,
  BarChart3,
  Briefcase,
};

export function ComoFuncionaSection({
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
  const body = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string;
  const bullets = (lang === "pt" ? block.config?.comoFuncionaBulletsPt : block.config?.comoFuncionaBulletsEn) ?? [];
  const icons = (Array.isArray(block.config?.comoFuncionaIcons) ? block.config.comoFuncionaIcons : []) as string[];
  const containerClass = moduleSectionContainerClass();

  const bulletsList = Array.isArray(bullets) ? bullets.filter((b) => (b ?? "").trim()) : [];

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
          {body?.trim() && <p className="mt-4 text-zinc-400">{body}</p>}
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {bulletsList.map((text, i) => {
              const Icon = ICON_MAP[icons[i] ?? ""] ?? CheckCircle;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-zinc-300 transition-all hover:border-amber-500/20 hover:bg-zinc-800/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </AnimateInView>
  );
}
