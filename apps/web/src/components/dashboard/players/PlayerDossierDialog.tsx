"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { playerRecordGroupButtonClass } from "@/lib/player-record-nav.styles";
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
import {
  DEFAULT_REPORT_PRINT_CONFIG,
  type ReportOrientation,
  type ReportPaperSize,
  type ReportPrintConfig,
} from "@/lib/report-print-engine";

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
  const [paperSize, setPaperSize] = useState<ReportPaperSize>(
    DEFAULT_REPORT_PRINT_CONFIG.paperSize,
  );
  const [orientation, setOrientation] = useState<ReportOrientation>(
    DEFAULT_REPORT_PRINT_CONFIG.orientation,
  );

  const printConfig = useMemo<ReportPrintConfig>(
    () => ({ ...DEFAULT_REPORT_PRINT_CONFIG, paperSize, orientation }),
    [orientation, paperSize],
  );

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
      const html = buildPlayerDossierPrintHtml(data, printConfig);
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
  }, [fetchDossier, onOpenChange, printConfig]);

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

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-medium">
                <span>Papel</span>
                <select
                  value={paperSize}
                  onChange={(event) => setPaperSize(event.target.value as ReportPaperSize)}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium">
                <span>Orientação</span>
                <select
                  value={orientation}
                  onChange={(event) => setOrientation(event.target.value as ReportOrientation)}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="portrait">Retrato</option>
                  <option value="landscape">Paisagem</option>
                </select>
              </label>
            </div>

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
        landscape={orientation === "landscape"}
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
            playerRecordGroupButtonClass(open),
            "inline-flex items-center gap-2",
          )}
        >
          <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
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
