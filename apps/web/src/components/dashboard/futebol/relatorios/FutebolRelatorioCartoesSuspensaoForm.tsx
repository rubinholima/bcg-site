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
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import type {
  CartoesSuspensaoReportDto,
  DisciplinePhasesDto,
  PrintPageSize,
} from "@/lib/futebol-relatorios.types";
import {
  buildCartoesSuspensaoPrintHtml,
  printCartoesSuspensaoReport,
} from "@/lib/futebol-relatorios-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { PageSizeSelect, useFutebolRelatorioTenants } from "./futebol-relatorio-shared";

export function FutebolRelatorioCartoesSuspensaoForm() {
  const searchParams = useSearchParams();
  const { tenants } = useFutebolRelatorioTenants();
  const { categories: allFixtureCategories } = useFixtureCategories();
  const currentYear = new Date().getFullYear();

  const [tenantId, setTenantId] = useState(searchParams.get("tenantId") ?? "");
  const [season, setSeason] = useState(String(currentYear));
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
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

  useEffect(() => {
    if (tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants]);

  const tenant = tenants.find((t) => t.id === tenantId);
  const categoryOptions = useMemo(() => {
    if (!tenant) return allFixtureCategories;
    return filterCategoriesForTenant(allFixtureCategories, tenant.categories);
  }, [allFixtureCategories, tenant]);

  useEffect(() => {
    if (!category && categoryOptions.length > 0) {
      setCategory(categoryOptions[0]!.value);
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    if (!tenantId || !category) {
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
      category,
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
  }, [tenantId, season, category]);

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
    if (!category) {
      setFeedback({
        open: true,
        title: "Categoria obrigatória",
        message: "Selecione a categoria do elenco.",
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
        category,
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
              <Label>Categoria</Label>
              <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {getCategoryLabel(cat.value, "pt", allFixtureCategories)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fase</Label>
            <Select
              value={phase}
              onValueChange={setPhase}
              disabled={!tenantId || !category || loadingPhases}
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
