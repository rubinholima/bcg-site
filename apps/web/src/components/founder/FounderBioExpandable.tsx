"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const COLLAPSED_MAX_H = 420; // altura aproximada da coluna da foto (aspect-[4/5] max-w-lg)

interface FounderBioExpandableProps {
  biography: string;
  quote: string | null;
  lang: "pt" | "en";
  className?: string;
}

export function FounderBioExpandable({
  biography,
  quote,
  lang,
  className = "",
}: FounderBioExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const showMoreButton = biography.length > 400; // só mostra botão se o texto for longo

  return (
    <div className={`space-y-4 ${className}`}>
      {biography && (
        <div className="relative">
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-out"
            style={{
              maxHeight: expanded || !showMoreButton ? undefined : COLLAPSED_MAX_H,
            }}
          >
            <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed text-justify">
              {biography}
            </p>
          </div>
          {showMoreButton && (
            <>
              {!expanded && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
              >
                {expanded ? (
                  <>
                    {lang === "pt" ? "Mostrar menos" : "Show less"}
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {lang === "pt" ? "Leia mais" : "Read more"}
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
      {quote && (
        <blockquote className="border-l-4 border-amber-500/60 pl-4 py-2 italic text-zinc-300 text-lg">
          {quote}
        </blockquote>
      )}
    </div>
  );
}
