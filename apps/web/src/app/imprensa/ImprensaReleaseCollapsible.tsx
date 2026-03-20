"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSED_MAX = "min(26rem,62vh)";

export function ImprensaReleaseCollapsible({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-10 rounded-xl border border-white/15 bg-zinc-900/35 p-5 shadow-inner shadow-black/20 sm:p-7">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Texto do release</p>
      <div
        className={cn(
          "relative transition-[max-height] duration-300 ease-out",
          !expanded && "overflow-hidden",
        )}
        style={!expanded ? { maxHeight: COLLAPSED_MAX } : { maxHeight: "none" }}
      >
        <div className="space-y-6 text-base leading-[1.75] text-zinc-300">{children}</div>
        {!expanded && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-900 from-40% to-transparent"
            aria-hidden
          />
        )}
      </div>
      <div className="mt-5 flex justify-center border-t border-white/10 pt-5">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 border-amber-500/40 bg-zinc-950/80 text-amber-100 hover:bg-zinc-800 hover:text-amber-50"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Leia mais
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
