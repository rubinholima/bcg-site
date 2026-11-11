"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import type { LucideIcon } from "lucide-react";
import { Award, BarChart3, Briefcase, Building2, CheckCircle, Globe, Layers, Star, Target, Trophy, Users, Zap } from "lucide-react";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass, sectionPaddingClassFromBlock } from "@/lib/module-section-container";
import { resolveFontFamily } from "@/lib/page-fonts";
import { SmartImage } from "@/components/common/SmartImage";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";

const ICON_MAP: Record<string, LucideIcon> = {
  Trophy, Globe, Layers, Award, Target, Zap, Building2, Users, Star, BarChart3, Briefcase, CheckCircle,
};

function blockOverlayOpacity(block: HomeContentBlock): number {
  const v = block.config?.backgroundOverlayOpacity;
  if (typeof v === "number" && v >= 0 && v <= 1) return v;
  return 0.75;
}

export function HowSection({
  block,
  lang,
  page,
  fullWidth,
  titleAlign = "left",
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  page: Page;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string | undefined;
  const body = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
  const bullets = (
    (lang === "pt" ? block.config?.bulletsPt : block.config?.bulletsEn) as string[] | undefined
  )?.map((b) => String(b ?? "").trim()).filter(Boolean) ?? [];
  const iconNames = (Array.isArray(block.config?.howBulletsIcons) ? block.config.howBulletsIcons : []) as string[];
  const bgImg = (block.config?.backgroundImage as string)?.trim();
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const ff = resolveFontFamily(block.config as Record<string, unknown>, page.content?.theme);

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${sectionPaddingClassFromBlock(block)}`}
        style={{
          ...(bgColor ? { backgroundColor: bgColor } : { backgroundColor: "rgb(9 9 11)" }),
          ...(ff ? { fontFamily: ff } : {}),
        }}
      >
        {bgImg && (
          <div className="absolute inset-0">
            <SmartImage src={getPublicImageUrl(bgImg)} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: blockOverlayOpacity(block) }} />
          </div>
        )}
        <div className={moduleSectionContainerClass({ fullWidth, maxContentWidth: block.config?.maxContentWidth as "narrow" | "normal" | "wide" | undefined })}>
          {title?.trim() && (
            <SectionTitle
              title={title.trim()}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign}
            />
          )}
          {body?.trim() && <p className="mt-4 text-zinc-400">{body.trim()}</p>}
          {bullets.length > 0 && (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {bullets.map((b, i) => {
                const Icon = ICON_MAP[iconNames[i] ?? ""] ?? CheckCircle;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-zinc-300"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    {b}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
