"use client";

import { formatPersonFirstLastName } from "@/lib/consultation-display";
import { cn } from "@/lib/utils";

export type WeeklyPsychReportEditLogEntry = {
  at: string;
  userId: string;
  userName: string;
  action: "created" | "updated";
  comment?: string;
};

function formatLogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function WeeklyPsychReportEditLog({
  entries,
  className,
}: {
  entries?: WeeklyPsychReportEditLogEntry[] | null;
  className?: string;
}) {
  const list = Array.isArray(entries) ? [...entries].reverse() : [];
  if (list.length === 0) return null;

  return (
    <section className={cn("rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5", className)}>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
        Histórico de edições
      </h3>
      <ul className="space-y-3">
        {list.map((entry, idx) => (
          <li
            key={`${entry.at}-${entry.userId}-${idx}`}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-sm"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-foreground">
                {formatPersonFirstLastName(entry.userName) || entry.userName}
              </span>
              <span className="text-xs text-muted-foreground">{formatLogDate(entry.at)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  entry.action === "created"
                    ? "bg-sky-500/15 text-sky-800 dark:text-sky-300"
                    : "bg-violet-500/15 text-violet-800 dark:text-violet-300"
                )}
              >
                {entry.action === "created" ? "Criação" : "Edição"}
              </span>
            </div>
            {entry.comment?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-foreground/90">{entry.comment.trim()}</p>
            ) : entry.action === "updated" ? (
              <p className="mt-1 text-xs text-muted-foreground">Conteúdo do relatório atualizado.</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
