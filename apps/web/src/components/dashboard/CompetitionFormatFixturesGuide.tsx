"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CompetitionFormat } from "@/lib/competition-formats";
import { getCompetitionFormatFixturesGuideLines } from "@/lib/competition-format-fixtures-guide";

export function CompetitionFormatFixturesGuide({
  format,
  eventEditHref,
  compact,
}: {
  format: CompetitionFormat;
  eventEditHref: string;
  /** Menos padding/lista curta (ex.: Últimos resultados). */
  compact?: boolean;
}) {
  const lines = useMemo(() => getCompetitionFormatFixturesGuideLines(format), [format]);

  return (
    <div
      className={`rounded-lg border border-violet-500/35 bg-violet-500/10 ${compact ? "px-2 py-2" : "px-3 py-3"} space-y-2`}
    >
      <p className={`font-medium text-violet-100 ${compact ? "text-xs" : "text-sm"}`}>
        Alinhado ao formato da disputa
      </p>
      <ul
        className={`text-muted-foreground list-disc pl-4 space-y-1 ${compact ? "text-[11px] leading-snug" : "text-xs"}`}
      >
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <Link
        href={eventEditHref}
        className={`inline-block text-violet-300 underline hover:text-violet-200 ${compact ? "text-[11px]" : "text-xs"}`}
      >
        Editar formato da disputa no cadastro do evento →
      </Link>
    </div>
  );
}
