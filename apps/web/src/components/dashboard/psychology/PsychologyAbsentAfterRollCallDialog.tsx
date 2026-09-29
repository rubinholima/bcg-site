"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PsychologyAttendanceRow } from "@/types/psychology-session";
import { formatPsychologyAbsentListText } from "@/lib/psychology-attendance.util";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  categoryLabel: string;
  tenantName?: string;
  absent: PsychologyAttendanceRow[];
  totalRoster: number;
};

export function PsychologyAbsentAfterRollCallDialog({
  open,
  onOpenChange,
  date,
  categoryLabel,
  tenantName,
  absent,
  totalRoster,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyText = formatPsychologyAbsentListText({
    date,
    categoryLabel,
    tenantName,
    absent,
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const presentCount = Math.max(0, totalRoster - absent.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {absent.length > 0 ? "Atletas ausentes na chamada" : "Chamada finalizada"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {presentCount} presente{presentCount !== 1 ? "s" : ""} · {absent.length} ausente
            {absent.length !== 1 ? "s" : ""} · {totalRoster} na lista
          </p>
          {absent.length > 0 ? (
            <ol className="max-h-[min(50vh,320px)] list-decimal space-y-1.5 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 py-3 pl-9 pr-3">
              {absent.map((row) => (
                <li key={row.playerId} className="font-medium text-foreground pr-1">
                  {row.playerName?.trim() || "Atleta"}
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-foreground">
              Todos os atletas da categoria foram marcados como presentes.
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {absent.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar lista
                </>
              )}
            </Button>
          ) : null}
          <Button type="button" className="min-h-[44px] w-full sm:mr-0 sm:w-auto" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
