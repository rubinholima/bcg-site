import Image from "next/image";
import type { HomeContentBlock } from "@/types/home-content";
import type { Page } from "@/types/page";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { BlockRenderer } from "./BlockRenderer";

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pb-24" },
} as const;

export function SectionBlockRenderer({
  block,
  slug,
  lang,
  page,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  page: Page;
}) {
  const columns = (block.config?.sectionColumns as 1 | 2) ?? 1;
  const layout = (block.config?.sectionLayout as "50-50" | "33-66" | "66-33") ?? "50-50";
  const leftModules = (block.config?.sectionLeftModules as HomeContentBlock[] | undefined) ?? [];
  const rightModules = (block.config?.sectionRightModules as HomeContentBlock[] | undefined) ?? [];
  const padTop = (block.config?.sectionPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.sectionPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  const paddingTop = PADDING_CLASSES[padTop]?.top ?? PADDING_CLASSES.compact.top;
  const paddingBottom = PADDING_CLASSES[padBottom]?.bottom ?? PADDING_CLASSES.compact.bottom;

  const allModules = columns === 1 ? leftModules : [...leftModules, ...rightModules];

  return (
    <section
      key={block.id}
      className={`relative overflow-hidden border-b border-white/5 ${paddingTop} ${paddingBottom}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {bgImage && (
        <div className="absolute inset-0">
          <Image
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isProxyImageUrl(getPublicImageUrl(bgImage))}
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {columns === 1 ? (
          <div className="space-y-12">
            {allModules.map((m) => (
              <BlockRenderer key={m.id} block={m} slug={slug} lang={lang} page={page} />
            ))}
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 gap-8 lg:gap-12 ${
              layout === "50-50" ? "lg:grid-cols-2" : layout === "33-66" ? "lg:grid-cols-[1fr_2fr]" : "lg:grid-cols-[2fr_1fr]"
            }`}
          >
            <div className="min-w-0 space-y-12">
              {leftModules.map((m) => (
                <BlockRenderer key={m.id} block={m} slug={slug} lang={lang} page={page} />
              ))}
            </div>
            <div className="min-w-0 space-y-12">
              {rightModules.map((m) => (
                <BlockRenderer key={m.id} block={m} slug={slug} lang={lang} page={page} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
