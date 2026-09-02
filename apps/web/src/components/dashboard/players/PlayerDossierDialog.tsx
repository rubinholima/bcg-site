"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import {
  canChooseSensitiveDossierSections,
  listSelectableOptionalSections,
  PLAYER_DOSSIER_OPTIONAL_LABELS,
} from "@/lib/player-dossier-access";
import {
  buildPlayerDossierPrintHtml,
  printPlayerDossierDocument,
} from "@/lib/player-dossier-print";
import type { PlayerDossierDto, PlayerDossierOptionalSection } from "@/lib/player-dossier.types";

interface PlayerDossierDialogProps {
  playerId: string;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerDossierDialog({
  playerId,
  playerName,
  open,
  onOpenChange,
}: PlayerDossierDialogProps) {
  const { role, modules } = useAuth();
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const canChooseOptional = canChooseSensitiveDossierSections(role);
  const selectableSections = useMemo(
    () => listSelectableOptionalSections(role, modules),
    [role, modules],
  );

  const [selectedOptional, setSelectedOptional] = useState<PlayerDossierOptionalSection[]>([]);

  const toggleOptional = useCallback((section: PlayerDossierOptionalSection) => {
    setSelectedOptional((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }, []);

  const fetchDossier = useCallback(async (): Promise<PlayerDossierDto | null> => {
    const params = new URLSearchParams();
    if (canChooseOptional && selectedOptional.length > 0) {
      params.set("sections", selectedOptional.join(","));
    }
    const qs = params.toString();
    const url = `/api/players/${encodeURIComponent(playerId)}/dossier${qs ? `?${qs}` : ""}`;
    const res = await authFetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.message === "string"
          ? err.message
          : "Não foi possível gerar o dossiê do atleta.",
      );
    }
    return res.json();
  }, [canChooseOptional, playerId, selectedOptional]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDossier();
      if (!data) return;
      const html = buildPlayerDossierPrintHtml(data);
      setPrintHtml(html);
      setPreviewOpen(true);
      onOpenChange(false);
    } catch (e) {
      setFeedback({
        title: "Erro ao gerar dossiê",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchDossier, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dossiê do Atleta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Relatório premium para apresentação externa —{" "}
              <span className="font-medium text-foreground">{playerName}</span>.
            </p>

            {canChooseOptional && selectableSections.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                  Seções opcionais (internas)
                </p>
                <p className="text-xs text-muted-foreground">
                  Desligadas por padrão. Só inclua o que for necessário para o destinatário.
                </p>
                <div className="space-y-2">
                  {selectableSections.map((section) => (
                    <label
                      key={section}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-border/60 px-3 py-2"
                    >
                      <Checkbox
                        checked={selectedOptional.includes(section)}
                        onCheckedChange={() => toggleOptional(section)}
                      />
                      <span>{PLAYER_DOSSIER_OPTIONAL_LABELS[section]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : canChooseOptional ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma seção opcional disponível com suas permissões atuais.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={loading} className="min-h-[44px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar dossiê
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`Dossiê — ${playerName}`}
        html={printHtml}
        onPrint={() => {
          if (printHtml) printPlayerDossierDocument(printHtml);
        }}
      />

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={(v) => !v && setFeedback(null)}
        variant="error"
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}

interface PlayerDossierTriggerProps {
  playerId: string;
  playerName: string;
  /** Mesmo visual dos botões de grupo (Visão Geral, Histórico, …) */
  navStyle?: boolean;
}

/** Botão na navegação da ficha — após Histórico. */
export function PlayerDossierTrigger({
  playerId,
  playerName,
  navStyle = false,
}: PlayerDossierTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {navStyle ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
            "border-violet-500/35 bg-violet-950/30 text-violet-100",
            "hover:border-violet-500/50 hover:bg-violet-500/15",
          )}
        >
          <FileText className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          Dossiê do Atleta
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] shrink-0 border-violet-500/40"
          onClick={() => setOpen(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Dossiê do Atleta
        </Button>
      )}
      <PlayerDossierDialog
        playerId={playerId}
        playerName={playerName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
