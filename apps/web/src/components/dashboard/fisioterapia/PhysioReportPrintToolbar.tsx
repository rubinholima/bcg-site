"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { PageSizeSelect } from "@/components/dashboard/futebol/relatorios/futebol-relatorio-shared";
import { api } from "@/lib/api";
import type { PrintPageSize } from "@/lib/futebol-relatorios.types";
import {
  buildAtendimentosPrintHtml,
  buildCargaFisioPrintHtml,
  buildLesionadosPrintHtml,
  printAtendimentosReport,
  printCargaFisioReport,
  printLesionadosReport,
  type FisioterapiaPrintContext,
} from "@/lib/fisioterapia-relatorios-print";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import type { PhysioReportsDashboard } from "@/types/fisioterapia";

type Tenant = {
  id: string;
  name: string;
  logoUrl?: string | null;
  categories?: string[] | null;
  kind?: { name?: string };
};

type ReportKind = "atendimentos" | "lesionados" | "carga";

interface PhysioReportPrintToolbarProps {
  kind: ReportKind;
  tenantId: string;
  category: string;
  from: string;
  to: string;
  /** Dados já carregados na tela — evita refetch desnecessário ao imprimir. */
  data?: PhysioReportsDashboard | null;
  previewTitle: string;
}

export function PhysioReportPrintToolbar({
  kind,
  tenantId,
  category,
  from,
  to,
  data,
  previewTitle,
}: PhysioReportPrintToolbarProps) {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<PhysioReportsDashboard | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data: list }) => {
      setTenants((Array.isArray(list) ? list : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const categoryLabel = category ? getCategoryLabel(category, "pt", allCats) : "Todas";

  const periodLabel =
    from && to
      ? `${from.split("-").reverse().join("/")} — ${to.split("-").reverse().join("/")}`
      : from
        ? `A partir de ${from.split("-").reverse().join("/")}`
        : to
          ? `Até ${to.split("-").reverse().join("/")}`
          : "Período completo";

  const buildContext = useCallback((): FisioterapiaPrintContext => {
    const formatCategory = (value: string) => getCategoryLabel(value, "pt", allCats) || value;
    return {
      clubName: selectedTenant?.name ?? "Todos os clubes",
      logoUrl: selectedTenant?.logoUrl,
      categoryLabel,
      periodLabel,
      formatCategory,
    };
  }, [allCats, categoryLabel, periodLabel, selectedTenant]);

  const fetchReport = useCallback(async (): Promise<PhysioReportsDashboard | null> => {
    if (data) return data;
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data: res } = await api.get<PhysioReportsDashboard>(
        `/fisioterapia/reports/dashboard?${params}`,
      );
      return res;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os dados do relatório.",
        variant: "error",
      });
      return null;
    }
  }, [data, tenantId, category, from, to]);

  const buildHtml = (payload: PhysioReportsDashboard) => {
    const ctx = buildContext();
    if (kind === "atendimentos") return buildAtendimentosPrintHtml(payload, ctx, pageSize);
    if (kind === "lesionados") return buildLesionadosPrintHtml(payload, ctx, pageSize);
    return buildCargaFisioPrintHtml(payload, ctx, pageSize);
  };

  const printReport = (payload: PhysioReportsDashboard) => {
    const ctx = buildContext();
    if (kind === "atendimentos") printAtendimentosReport(payload, ctx, pageSize);
    else if (kind === "lesionados") printLesionadosReport(payload, ctx, pageSize);
    else printCargaFisioReport(payload, ctx, pageSize);
  };

  const handlePreview = async () => {
    setBusy(true);
    const payload = await fetchReport();
    if (payload) {
      setReportData(payload);
      setPreviewHtml(buildHtml(payload));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const payload = reportData ?? data ?? (await fetchReport());
    if (payload) printReport(payload);
    setBusy(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:items-end">
        <PageSizeSelect value={pageSize} onChange={setPageSize} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => void handlePreview()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Visualizar
          </Button>
          <Button
            type="button"
            className="min-h-[44px] bg-[#00205B] text-white hover:bg-[#003087]"
            disabled={busy}
            onClick={() => void handlePrint()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimir / PDF
          </Button>
        </div>
      </div>
      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        html={previewHtml}
        onPrint={() => {
          const payload = reportData ?? data;
          if (payload) printReport(payload);
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
