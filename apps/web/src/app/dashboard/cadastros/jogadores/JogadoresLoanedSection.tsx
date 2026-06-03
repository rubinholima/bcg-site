"use client";

import { useState } from "react";
import { ArrowRightLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { JogadoresLoanedList } from "./JogadoresLoanedList";
import type { JogadorListItem } from "./JogadoresGroupedList";

interface JogadoresLoanedSectionProps {
  players: JogadorListItem[];
}

export function JogadoresLoanedSection({ players }: JogadoresLoanedSectionProps) {
  const [open, setOpen] = useState(false);
  const total = players.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/20 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Atletas emprestados</p>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? "Nenhum em empréstimo"
                : `${total} atleta${total !== 1 ? "s" : ""} — fora da lista por categoria`}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="border-t border-border/60 px-3 py-4 sm:px-4">
          {total === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Altere a situação para &quot;Emprestado&quot; no cadastro e preencha a seção Empréstimo.
            </p>
          ) : (
            <JogadoresLoanedList players={players} />
          )}
        </div>
      ) : null}
    </div>
  );
}
