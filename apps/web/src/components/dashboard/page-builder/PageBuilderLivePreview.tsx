"use client";

import type { HomeContentBlock } from "@/types/home-content";
import type { Page, PageTheme } from "@/types/page";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";
import type { PreviewViewport } from "./usePageEditorSession";

const WIDTH: Record<PreviewViewport, string> = {
  desktop: "max-w-full",
  tablet: "max-w-[768px]",
  mobile: "max-w-[390px]",
};

export function PageBuilderLivePreview({
  blocks,
  theme,
  slug,
  lang = "pt",
  viewport,
  selectedBlockId,
  onSelectBlock,
}: {
  blocks: HomeContentBlock[];
  theme: PageTheme;
  slug: string;
  lang?: "pt" | "en";
  viewport: PreviewViewport;
  selectedBlockId: string | null;
  onSelectBlock?: (id: string) => void;
}) {
  const page: Page = {
    id: "preview",
    tenantId: "",
    slug: "main",
    title: null,
    content: { theme, blocks },
    createdAt: "",
    updatedAt: "",
    tenant: { id: "", name: slug, slug, logoUrl: null },
  };
  const contentBlocks = blocks.filter((b) => {
    const t = String(b.type).toLowerCase();
    return t !== "header" && t !== "footer";
  });

  return (
    <div className="rounded-lg border border-border bg-zinc-950/80 p-3">
      <div className={`mx-auto transition-all ${WIDTH[viewport]}`}>
        <div
          className="overflow-hidden rounded-md border border-white/10 bg-[var(--preview-bg,#0f0f12)]"
          style={{
            backgroundColor: (theme.backgroundColor as string) || "#0f0f12",
            color: (theme.textColor as string) || "#fafafa",
            fontFamily: theme.bodyFontFamily || theme.fontFamily,
          }}
        >
          {contentBlocks.map((block) => (
            <div
              key={block.id}
              className={`relative ${selectedBlockId === block.id ? "ring-2 ring-violet-500 ring-inset" : ""}`}
              onClick={() => onSelectBlock?.(block.id)}
              role={onSelectBlock ? "button" : undefined}
              tabIndex={onSelectBlock ? 0 : undefined}
            >
              <BlockRenderer block={block} slug={slug} lang={lang} page={page} pathBase={`/portfolio/${slug}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
