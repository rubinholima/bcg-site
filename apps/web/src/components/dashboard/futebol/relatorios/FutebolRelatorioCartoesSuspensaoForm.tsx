"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type {
  CartoesSuspensaoReportDto,
  DisciplineCompetitionOptionDto,
  DisciplinePhasesDto,
  PrintPageSize,
} from "@/lib/futebol-relatorios.types";
import {
  buildCartoesSuspensaoPrintHtml,
  printCartoesSuspensaoReport,
} from "@/lib/futebol-relatorios-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { PageSizeSelect, useFutebolRelatorioTenants } from "./futebol-relatorio-shared";
import { CartoesDisciplineOpeningPanel } from "./CartoesDisciplineOpeningPanel";

const MANUAL_COMPETITION = "__manual__";

export function FutebolRelatorioCartoesSuspensaoForm() {
  const searchParams = useSearchParams();
  const { tenants } = useFutebolRelatorioTenants();
  const { categories: allFixtureCategories } = useFixtureCategories();
  const currentYear = new Date().getFullYear();

  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [season, setSeason] = useState(String(currentYear));
  const [competition, setCompetition] = useState(searchParams.get("competition") ?? "");
  const [manualCompetition, setManualCompetition] = useState("");
  const [competitionOptions, setCompetitionOptions] = useState<DisciplineCompetitionOptionDto[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [phase, setPhase] = useState("auto");
  const [phaseOptions, setPhaseOptions] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<CartoesSuspensaoReportDto | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const urlCategoryHint = searchParams.get("category") ?? "";

  useEffect(() => {
    if (tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants]);

  const resolvedCompetition = useMemo(() => {
    if (competition === MANUAL_COMPETITION) return manualCompetition.trim();
    return competition.trim();
  }, [competition, manualCompetition]);

  useEffect(() => {
    if (!tenantId) {
      setCompetitionOptions([]);
      setCompetition("");
      return;
    }
    const seasonNum = Number(season);
    if (!Number.isFinite(seasonNum) || seasonNum < 2000) return;

    let cancelled = false;
    setLoadingCompetitions(true);
    const params = new URLSearchParams({
      tenantId,
      season: String(seasonNum),
    });

    api
      .get<DisciplineCompetitionOptionDto[]>(
        `/futebol-relatorios/discipline-competitions?${params.toString()}`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        const options = Array.isArray(data) ? data : [];
        setCompetitionOptions(options);

        if (competition === MANUAL_COMPETITION) return;

        const isFriendlyOption = (o: DisciplineCompetitionOptionDto) =>
          /amistoso/i.test(o.competition);

        const pickBest = (pool: DisciplineCompetitionOptionDto[]) => {
          const official = pool.filter((o) => !isFriendlyOption(o));
          const ranked = (official.length > 0 ? official : pool).slice().sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            return a.competition.localeCompare(b.competition, "pt-BR");
          });
          return ranked[0] ?? null;
        };

        const urlCompetition = searchParams.get("competition")?.trim();
        if (urlCompetition && options.some((o) => o.competition === urlCompetition)) {
          setCompetition(urlCompetition);
          return;
        }

        if (urlCategoryHint) {
          const byCategory = pickBest(
            options.filter((o) => o.referenceCategory === urlCategoryHint),
          );
          if (byCategory) {
            setCompetition(byCategory.competition);
            return;
          }
        }

        if (options.length > 0) {
          setCompetition((prev) => {
            if (prev) {
              const current = options.find((o) => o.competition === prev);
              if (current && !isFriendlyOption(current)) return prev;
              if (current && pickBest(options)?.competition === prev) return prev;
            }
            return pickBest(options)?.competition ?? "";
          });
        } else {
          setCompetition("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitionOptions([]);
          setCompetition("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCompetitions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, season, urlCategoryHint, searchParams]);

  useEffect(() => {
    if (!tenantId || !resolvedCompetition) {
      setPhaseOptions([]);
      setCurrentPhase(null);
      setPhase("auto");
      return;
    }
    const seasonNum = Number(season);
    if (!Number.isFinite(seasonNum) || seasonNum < 2000) return;

    let cancelled = false;
    setLoadingPhases(true);
    const params = new URLSearchParams({
      tenantId,
      competition: resolvedCompetition,
      season: String(seasonNum),
    });

    api
      .get<DisciplinePhasesDto>(`/futebol-relatorios/discipline-phases?${params.toString()}`)
      .then(({ data }) => {
        if (cancelled) return;
        setPhaseOptions(Array.isArray(data.phases) ? data.phases : []);
        setCurrentPhase(data.currentPhase ?? null);
        setPhase("auto");
      })
      .catch(() => {
        if (!cancelled) {
          setPhaseOptions([]);
          setCurrentPhase(null);
          setPhase("auto");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPhases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, season, resolvedCompetition]);

  const fetchReport = async (): Promise<CartoesSuspensaoReportDto | null> => {
    if (!tenantId) {
      setFeedback({
        open: true,
        title: "Clube obrigatório",
        message: "Selecione o clube para gerar o relatório.",
        variant: "warning",
      });
      return null;
    }
    if (!resolvedCompetition) {
      setFeedback({
        open: true,
        title: "Competição obrigatória",
        message: "Selecione a competição ou informe o nome manualmente.",
        variant: "warning",
      });
      return null;
    }
    const seasonNum = Number(season);
    if (!Number.isFinite(seasonNum) || seasonNum < 2000) {
      setFeedback({
        open: true,
        title: "Temporada inválida",
        message: "Informe o ano da temporada (ex.: 2026).",
        variant: "warning",
      });
      return null;
    }
    try {
      const params = new URLSearchParams({
        tenantId,
        competition: resolvedCompetition,
        season: String(seasonNum),
      });
      if (phase !== "auto") params.set("phase", phase);
      const { data } = await api.get<CartoesSuspensaoReportDto>(
        `/futebol-relatorios/cartoes-suspensao?${params.toString()}`,
      );
      return data;
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data
              ?.message
          : null;
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null;
      setFeedback({
        open: true,
        title: "Erro",
        message: detail
          ? `Não foi possível carregar o relatório. ${detail}`
          : "Não foi possível carregar o relatório de cartões e suspensão.",
        variant: "error",
      });
      return null;
    }
  };

  const handlePreview = async () => {
    setBusy(true);
    const data = await fetchReport();
    if (data) {
      setReportData(data);
      setPreviewHtml(buildCartoesSuspensaoPrintHtml(data, pageSize));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const data = reportData ?? (await fetchReport());
    if (data) printCartoesSuspensaoReport(data, pageSize);
    setBusy(false);
  };

  const selectedOption = competitionOptions.find((o) => o.competition === competition);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cartões e Suspensão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Clube</Label>
            <Select value={tenantId || "none"} onValueChange={(v) => setTenantId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o clube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione…</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Temporada</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                className="text-foreground"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Competição</Label>
              <Select
                value={competition || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setCompetition("");
                    return;
                  }
                  setCompetition(v);
                }}
                disabled={!tenantId || loadingCompetitions}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCompetitions ? "Carregando competições…" : "Selecione a competição"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {competitionOptions.map((item) => (
                    <SelectItem key={item.competition} value={item.competition}>
                      {item.competition}
                      {item.matchCount > 0 ? ` (${item.matchCount} jogos)` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_COMPETITION}>Outra (informar manualmente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {competition === MANUAL_COMPETITION ? (
            <div className="space-y-2">
              <Label>Nome da competição</Label>
              <Input
                className="text-foreground"
                value={manualCompetition}
                onChange={(e) => setManualCompetition(e.target.value)}
                placeholder="Ex.: Campeonato Mineiro Sub-20"
              />
            </div>
          ) : null}

          {selectedOption ? (
            <p className="text-sm text-muted-foreground">
              Categoria de referência:{" "}
              {getCategoryLabel(selectedOption.referenceCategory, "pt", allFixtureCategories)}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Fase</Label>
            <Select
              value={phase}
              onValueChange={setPhase}
              disabled={!tenantId || !resolvedCompetition || loadingPhases}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingPhases
                      ? "Carregando fases…"
                      : phaseOptions.length === 0
                        ? "Sem fases identificadas"
                        : "Selecione a fase"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Fase atual{currentPhase ? `: ${currentPhase}` : ""}
                </SelectItem>
                {phaseOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PageSizeSelect value={pageSize} onChange={setPageSize} />

          {tenantId && resolvedCompetition && Number(season) >= 2000 ? (
            <CartoesDisciplineOpeningPanel
              tenantId={tenantId}
              competition={resolvedCompetition}
              season={Number(season)}
              categoryHint={selectedOption?.referenceCategory ?? urlCategoryHint}
            />
          ) : null}

          {reportData?.sourceInfo?.pendingMessages?.[0] ? (
            <p className="text-xs text-amber-200/90">{reportData.sourceInfo.pendingMessages[0]}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handlePreview()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Visualizar
            </Button>
            <Button
              type="button"
              className="bg-[#00205B] text-white hover:bg-[#003087]"
              disabled={busy}
              onClick={() => void handlePrint()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pré-visualização — Cartões e Suspensão"
        html={previewHtml}
        onPrint={() => {
          if (reportData) printCartoesSuspensaoReport(reportData, pageSize);
        }}
      />

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
