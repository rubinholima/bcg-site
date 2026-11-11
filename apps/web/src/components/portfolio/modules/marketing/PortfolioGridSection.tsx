"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, MapPin, Phone, User } from "lucide-react";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass, sectionPaddingClassFromBlock } from "@/lib/module-section-container";
import { publicClientFetch, toPublicClientApiPath } from "@/lib/public-client-api";
import { portfolioPublicHomeHref } from "@/lib/portfolio-public-nav-url";
import { SmartImage } from "@/components/common/SmartImage";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";

type PortfolioItem = {
  id: string;
  type: "club" | "company";
  slug: string;
  name: string;
  segment?: string | null;
  shortDescription?: string | null;
  logoUrl?: string | null;
  isClub?: boolean;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  address?: string | null;
  location?: { city?: string; state?: string; country?: string } | null;
};

function formatLocation(loc?: PortfolioItem["location"]): string {
  if (!loc) return "";
  return [loc.city, loc.state, loc.country].filter(Boolean).join(", ");
}

export function PortfolioGridSection({
  block,
  lang,
  mode,
  pathBase,
  fullWidth,
  titleAlign = "left",
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
  mode: "clubs" | "companies";
  pathBase: string;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string | undefined;
  const body = (lang === "pt" ? block.config?.bodyPt : block.config?.bodyEn) as string | undefined;
  const profileLabel =
    lang === "pt"
      ? (mode === "clubs" ? "Ver perfil do clube" : "Ver perfil")
      : mode === "clubs"
        ? "Open club profile"
        : "Open profile";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await publicClientFetch(toPublicClientApiPath("/api/public/portfolio"));
        if (!res.ok) return;
        const data = (await res.json()) as PortfolioItem[];
        if (cancelled) return;
        const filtered = (Array.isArray(data) ? data : []).filter((x) =>
          mode === "clubs" ? x.type === "club" : x.type === "company",
        );
        setItems(filtered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const bgImg = (block.config?.backgroundImage as string)?.trim();
  const bgColor = (block.config?.backgroundColor as string)?.trim();

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${sectionPaddingClassFromBlock(block)}`}
        style={bgColor ? { backgroundColor: bgColor } : { backgroundColor: "rgb(39 39 42 / 0.3)" }}
      >
        {bgImg && (
          <div className="absolute inset-0">
            <SmartImage src={getPublicImageUrl(bgImg)} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: 0.75 }} />
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
          {body?.trim() && <p className="mt-3 text-zinc-400">{body.trim()}</p>}
          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/50" />
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg transition-all hover:-translate-y-1 hover:border-amber-500/25"
                >
                  <div className="flex flex-col items-center text-center">
                    {item.logoUrl ? (
                      <SmartImage
                        src={getPublicImageUrl(item.logoUrl)}
                        alt=""
                        width={80}
                        height={80}
                        className="h-16 w-16 rounded-xl object-contain sm:h-20 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-800 text-amber-500/80 sm:h-20 sm:w-20">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-semibold text-white">{item.name}</h3>
                    {item.shortDescription && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.shortDescription}</p>
                    )}
                    {(formatLocation(item.location) || item.address) && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.address || formatLocation(item.location)}</span>
                      </p>
                    )}
                    <Link
                      href={portfolioPublicHomeHref(pathBase, item.slug)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
                    >
                      <User className="h-3.5 w-3.5" />
                      {profileLabel}
                    </Link>
                    {(item.email || item.phone) && (
                      <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-white/5 pt-3 text-xs text-zinc-500">
                        {item.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {item.email}
                          </span>
                        )}
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {item.phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </AnimateInView>
  );
}
