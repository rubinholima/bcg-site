"use client";

import type { HomeContentBlock } from "@/types/home-content";
import { moduleHasOwnTitle, moduleTitleGradientStyle } from "@/components/dashboard/page-builder/ModuleTitleGradientFields";
import { BlockRenderer, type EventPageMetaForFixtures } from "./BlockRenderer";
import type { Page } from "@/types/page";
import type { FixturesFetchContext } from "@/lib/fixtures-shared";

interface SectionNestedModuleProps {
  module: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
  columns: 1 | 2 | 3;
  fixturesContext: FixturesFetchContext;
  initialUploadToken?: string | null;
  eventPageMeta?: EventPageMetaForFixtures | null;
}

/** Renderiza módulo dentro de seção colunas — título e cores vêm sempre do próprio módulo. */
export function SectionNestedModule({
  module: m,
  slug,
  lang,
  page,
  columns,
  fixturesContext,
  initialUploadToken,
  eventPageMeta,
}: SectionNestedModuleProps) {
  const fullBleed =
    (m.type === "proximos_jogos" || m.type === "proximos_eventos") &&
    m.config?.fullBleedCarousel === true;

  return (
    <div
      key={m.id}
      className={fullBleed ? "fullbleed-carousel-module" : undefined}
      style={moduleTitleGradientStyle(m.config as Record<string, unknown>)}
    >
      <BlockRenderer
        block={m}
        slug={slug}
        lang={lang}
        page={page}
        inSection
        sectionColumns={columns}
        showModuleTitle={moduleHasOwnTitle(m)}
        fixturesContext={fixturesContext}
        initialUploadToken={initialUploadToken}
        eventPageMeta={eventPageMeta}
      />
    </div>
  );
}

export function shouldShowSectionColumnTitle(
  columnTitle: string | undefined,
  modules: HomeContentBlock[],
): boolean {
  if (!columnTitle?.trim() || modules.length !== 1) return false;
  return !moduleHasOwnTitle(modules[0]!);
}
