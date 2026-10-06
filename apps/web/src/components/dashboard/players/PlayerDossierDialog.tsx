"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Share2 } from "lucide-react";
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
  canAccessAnalysisMaterialInDossier,
  canAccessCoachReportsInDossier,
  canChooseSensitiveDossierSections,
  listSelectableOptionalSections,
  PLAYER_DOSSIER_OPTIONAL_LABELS,
} from "@/lib/player-dossier-access";
import {
  buildPlayerDossierPrintHtml,
  printPlayerDossierDocument,
} from "@/lib/player-dossier-print";
import type {
  DossierCoachReportKind,
  DossierEligibleAnalysisMaterialMeta,
  DossierEligibleCoachReportMeta,
  PlayerDossierDto,
  PlayerDossierOptionalSection,
} from "@/lib/player-dossier.types";
import {
  DEFAULT_REPORT_PRINT_CONFIG,
  type ReportOrientation,
  type ReportPaperSize,
  type ReportPrintConfig,
} from "@/lib/report-print-engine";

type CoachSelectionKey = `${DossierCoachReportKind}:${string}`;

function selectionKey(kind: DossierCoachReportKind, id: string): CoachSelectionKey {
  return `${kind}:${id}`;
}

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
  const canCoachReports = canAccessCoachReportsInDossier(role, modules);
  const canAnalysisMaterial = canAccessAnalysisMaterialInDossier(role, modules);
  const selectableSections = useMemo(
    () => listSelectableOptionalSections(role, modules),
    [role, modules],
  );

  const [selectedOptional, setSelectedOptional] = useState<PlayerDossierOptionalSection[]>([]);
  const [eligibleCoachReports, setEligibleCoachReports] = useState<DossierEligibleCoachReportMeta[]>(
    [],
  );
  const [coachReportsLoading, setCoachReportsLoading] = useState(false);
  const [selectedCoachReports, setSelectedCoachReports] = useState<CoachSelectionKey[]>([]);
  const [eligibleAnalysisMaterial, setEligibleAnalysisMaterial] = useState<
    DossierEligibleAnalysisMaterialMeta[]
  >([]);
  const [analysisMaterialLoading, setAnalysisMaterialLoading] = useState(false);
  const [selectedAnalysisMaterial, setSelectedAnalysisMaterial] = useState<string[]>([]);

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

  const groupedCoachReports = useMemo(() => {
    const groups = new Map<string, DossierEligibleCoachReportMeta[]>();
    for (const item of eligibleCoachReports) {
      const list = groups.get(item.label) ?? [];
      list.push(item);
      groups.set(item.label, list);
    }
    return [...groups.entries()];
  }, [eligibleCoachReports]);

  useEffect(() => {
    if (!open || !canCoachReports) {
      setEligibleCoachReports([]);
      setSelectedCoachReports([]);
      return;
    }
    let cancelled = false;
    setCoachReportsLoading(true);
    authFetch(`/api/players/${encodeURIComponent(playerId)}/dossier/coach-reports`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) return { items: [] };
          throw new Error("Não foi possível carregar os relatórios elegíveis.");
        }
        return res.json() as Promise<{ items: DossierEligibleCoachReportMeta[] }>;
      })
      .then((data) => {
        if (!cancelled) setEligibleCoachReports(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setEligibleCoachReports([]);
      })
      .finally(() => {
        if (!cancelled) setCoachReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canCoachReports, open, playerId]);

  useEffect(() => {
    if (!open || !canAnalysisMaterial) {
      setEligibleAnalysisMaterial([]);
      setSelectedAnalysisMaterial([]);
      return;
    }
    let cancelled = false;
    setAnalysisMaterialLoading(true);
    authFetch(`/api/players/${encodeURIComponent(playerId)}/dossier/analysis-material`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json() as Promise<{ items: DossierEligibleAnalysisMaterialMeta[] }>;
      })
      .then((data) => {
        if (!cancelled) setEligibleAnalysisMaterial(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setEligibleAnalysisMaterial([]);
      })
      .finally(() => {
        if (!cancelled) setAnalysisMaterialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAnalysisMaterial, open, playerId]);

  const toggleOptional = useCallback((section: PlayerDossierOptionalSection) => {
    setSelectedOptional((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }, []);

  const toggleCoachReport = useCallback((kind: DossierCoachReportKind, id: string) => {
    const key = selectionKey(kind, id);
    setSelectedCoachReports((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const selectAllCoachReports = useCallback(() => {
    setSelectedCoachReports(
      eligibleCoachReports.map((r) => selectionKey(r.kind, r.id)),
    );
  }, [eligibleCoachReports]);

  const clearCoachReports = useCallback(() => {
    setSelectedCoachReports([]);
  }, []);

  const coachReportsQuery = useMemo(() => {
    if (selectedCoachReports.length === 0) return "";
    return selectedCoachReports.join(",");
  }, [selectedCoachReports]);

  const toggleAnalysisMaterial = useCallback((materialItemId: string) => {
    setSelectedAnalysisMaterial((prev) =>
      prev.includes(materialItemId)
        ? prev.filter((id) => id !== materialItemId)
        : [...prev, materialItemId],
    );
  }, []);

  const selectAllAnalysisMaterial = useCallback(() => {
    setSelectedAnalysisMaterial(eligibleAnalysisMaterial.map((m) => m.materialItemId));
  }, [eligibleAnalysisMaterial]);

  const clearAnalysisMaterial = useCallback(() => {
    setSelectedAnalysisMaterial([]);
  }, []);

  const analysisMaterialQuery = useMemo(() => {
    if (selectedAnalysisMaterial.length === 0) return "";
    return selectedAnalysisMaterial.join(",");
  }, [selectedAnalysisMaterial]);

  const fetchDossier = useCallback(async (): Promise<PlayerDossierDto | null> => {
    const params = new URLSearchParams();
    if (canChooseOptional && selectedOptional.length > 0) {
      params.set("sections", selectedOptional.join(","));
    }
    if (coachReportsQuery) {
      params.set("coachReports", coachReportsQuery);
    }
    if (analysisMaterialQuery) {
      params.set("analysisMaterial", analysisMaterialQuery);
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
  }, [analysisMaterialQuery, canChooseOptional, coachReportsQuery, playerId, selectedOptional]);

  const buildPdfFilename = useCallback((data: PlayerDossierDto) => {
    const safeName =
      data.cover.name.replace(/[^\w\s-áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/gi, "").trim() || "atleta";
    const date = data.meta.generatedAt.slice(0, 10);
    return `dossie-${safeName.replace(/\s+/g, "-")}-${date}.pdf`;
  }, []);

  const downloadPdfBlob = useCallback(
    async (data: PlayerDossierDto) => {
      const coachReports = selectedCoachReports.map((key) => {
        const colon = key.indexOf(":");
        return {
          kind: key.slice(0, colon) as DossierCoachReportKind,
          id: key.slice(colon + 1),
        };
      });
      const res = await authFetch(`/api/players/${encodeURIComponent(playerId)}/dossier/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections:
            canChooseOptional && selectedOptional.length > 0
              ? selectedOptional.join(",")
              : undefined,
          coachReports,
          analysisMaterial:
            selectedAnalysisMaterial.length > 0 ? selectedAnalysisMaterial : undefined,
          paperSize,
          orientation,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.message === "string" ? err.message : "Não foi possível gerar o PDF.",
        );
      }
      const blob = await res.blob();
      const filename = buildPdfFilename(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [
      buildPdfFilename,
      canChooseOptional,
      orientation,
      paperSize,
      playerId,
      selectedAnalysisMaterial,
      selectedCoachReports,
      selectedOptional,
    ],
  );

  const sharePdf = useCallback(
    async (data: PlayerDossierDto) => {
      const coachReports = selectedCoachReports.map((key) => {
        const colon = key.indexOf(":");
        return {
          kind: key.slice(0, colon) as DossierCoachReportKind,
          id: key.slice(colon + 1),
        };
      });
      const res = await authFetch(`/api/players/${encodeURIComponent(playerId)}/dossier/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections:
            canChooseOptional && selectedOptional.length > 0
              ? selectedOptional.join(",")
              : undefined,
          coachReports,
          analysisMaterial:
            selectedAnalysisMaterial.length > 0 ? selectedAnalysisMaterial : undefined,
          paperSize,
          orientation,
        }),
      });
      if (!res.ok) {
        throw new Error("Não foi possível gerar o PDF para compartilhar.");
      }
      const blob = await res.blob();
      const filename = buildPdfFilename(data);
      const file = new File([blob], filename, { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Dossiê — ${playerName}` });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          throw e;
        }
      }
      setFeedback({
        title: "Compartilhar indisponível",
        message: "Seu dispositivo não suporta compartilhar arquivos PDF. Use Baixar PDF.",
      });
    },
    [
      buildPdfFilename,
      canChooseOptional,
      orientation,
      paperSize,
      playerId,
      playerName,
      selectedAnalysisMaterial,
      selectedCoachReports,
      selectedOptional,
    ],
  );

  const handlePreview = useCallback(async () => {
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

  const handleDownloadPdf = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDossier();
      if (!data) return;
      await downloadPdfBlob(data);
    } catch (e) {
      setFeedback({
        title: "Erro ao baixar PDF",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, [downloadPdfBlob, fetchDossier]);

  const handleShare = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDossier();
      if (!data) return;
      await sharePdf(data);
    } catch (e) {
      setFeedback({
        title: "Erro ao compartilhar",
        message: e instanceof Error ? e.message : "Use Baixar PDF como alternativa.",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchDossier, sharePdf]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(92vh,880px)] max-w-lg overflow-y-auto">
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
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="portrait">Retrato</option>
                  <option value="landscape">Paisagem</option>
                </select>
              </label>
            </div>

            {canCoachReports ? (
              <div className="space-y-3 rounded-lg border border-border/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
                    Relatórios / avaliações dos treinadores
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      onClick={selectAllCoachReports}
                      disabled={eligibleCoachReports.length === 0 || loading}
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      onClick={clearCoachReports}
                      disabled={selectedCoachReports.length === 0 || loading}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {coachReportsLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando relatórios…</p>
                ) : eligibleCoachReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum relatório finalizado disponível para este atleta.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {groupedCoachReports.map(([label, items]) => (
                      <div key={label} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        {items.map((item) => {
                          const key = selectionKey(item.kind, item.id);
                          const subtitle = [
                            item.date,
                            item.periodLabel,
                            item.coachName,
                            item.category,
                            item.opponent,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <label
                              key={key}
                              className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-2"
                            >
                              <Checkbox
                                className="mt-1"
                                checked={selectedCoachReports.includes(key)}
                                onCheckedChange={() => toggleCoachReport(item.kind, item.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{item.label}</span>
                                {subtitle ? (
                                  <span className="block text-xs text-muted-foreground">
                                    {subtitle}
                                  </span>
                                ) : null}
                                {item.summary ? (
                                  <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                                    {item.summary}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {canAnalysisMaterial ? (
              <div className="space-y-3 rounded-lg border border-border/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
                    Material da análise de desempenho
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      onClick={selectAllAnalysisMaterial}
                      disabled={eligibleAnalysisMaterial.length === 0 || loading}
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[36px]"
                      onClick={clearAnalysisMaterial}
                      disabled={selectedAnalysisMaterial.length === 0 || loading}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {analysisMaterialLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando material…</p>
                ) : eligibleAnalysisMaterial.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum material curado na análise individual deste atleta.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {eligibleAnalysisMaterial.map((item) => {
                      const subtitle = [
                        item.sessionDate,
                        item.category,
                        item.tagLabel,
                        item.outcome,
                        item.matchClockDisplay,
                        item.hasClip ? "Com clip" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <label
                          key={item.materialItemId}
                          className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-2"
                        >
                          <Checkbox
                            className="mt-1"
                            checked={selectedAnalysisMaterial.includes(item.materialItemId)}
                            onCheckedChange={() => toggleAnalysisMaterial(item.materialItemId)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{item.sessionTitle}</span>
                            {subtitle ? (
                              <span className="block text-xs text-muted-foreground">{subtitle}</span>
                            ) : null}
                            {item.analystNote ? (
                              <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                                {item.analystNote}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {canChooseOptional && selectableSections.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
                  Seções opcionais (internas)
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

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePreview}
                disabled={loading}
                className="min-h-[44px]"
              >
                Pré-visualizar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadPdf}
                disabled={loading}
                className="min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Baixar PDF
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleShare}
                disabled={loading}
                className="min-h-[44px]"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
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
  navStyle?: boolean;
}

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
