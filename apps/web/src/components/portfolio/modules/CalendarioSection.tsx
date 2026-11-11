"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { ProximosJogosSection } from "@/components/portfolio/modules/ProximosJogosSection";

/** Calendário público — reutiliza fixtures de Próximos Jogos com título do bloco. */
export function CalendarioSection({
  block,
  slug,
  lang,
  fullWidth,
  titleAlign,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  pathBase?: string;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  return (
    <ProximosJogosSection
      block={block}
      slug={slug}
      lang={lang}
      fullWidth={fullWidth}
      titleAlign={titleAlign}
      fixturesContext="tenant"
    />
  );
}
