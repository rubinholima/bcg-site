import { cn } from "@/lib/utils";

/** Classes canônicas dos botões de grupo na ficha do atleta (Visão Geral, Histórico, Dossiê…). */
export function playerRecordGroupButtonClass(active: boolean): string {
  return cn(
    "shrink-0 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
    active
      ? "border-violet-500/50 bg-violet-500/15 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
      : "border-border/70 bg-zinc-900/40 text-zinc-300 hover:border-violet-500/30 hover:bg-zinc-800/70 hover:text-zinc-100",
  );
}
