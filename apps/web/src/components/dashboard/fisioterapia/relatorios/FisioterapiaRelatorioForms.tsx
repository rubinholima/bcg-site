"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { PageSizeSelect } from "@/components/dashboard/futebol/relatorios/futebol-relatorio-shared";
import { PhysioReportFilters } from "@/components/dashboard/fisioterapia/PhysioReportFilters";
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

function defaultFromMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function usePhysioReportForm(defaultFrom: string) {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
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
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const categoryLabel = category
    ? getCategoryLabel(category, "pt", allCats)
    : "Todas";

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
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data } = await api.get<PhysioReportsDashboard>(
        `/fisioterapia/reports/dashboard?${params}`,
      );
      return data;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os dados do relatório.",
        variant: "error",
      });
      return null;
    }
  }, [tenantId, category, from, to]);

  return {
    tenantId,
    setTenantId,
    category,
    setCategory,
    from,
    setFrom,
    to,
    setTo,
    pageSize,
    setPageSize,
    busy,
    setBusy,
    previewOpen,
    setPreviewOpen,
    previewHtml,
    setPreviewHtml,
    reportData,
    setReportData,
    feedback,
    setFeedback,
    buildContext,
    fetchReport,
  };
}

function ReportActions({
  busy,
  onPreview,
  onPrint,
}: {
  busy: boolean;
  onPreview: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={onPreview}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
        Visualizar
      </Button>
      <Button
        type="button"
        className="min-h-[44px] bg-[#00205B] text-white hover:bg-[#003087]"
        disabled={busy}
        onClick={onPrint}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
        Imprimir / PDF
      </Button>
    </div>
  );
}

export function FisioterapiaRelatorioAtendimentosForm() {
  const form = usePhysioReportForm(defaultFromMonths(3));

  const handlePreview = async () => {
    form.setBusy(true);
    const data = await form.fetchReport();
    if (data) {
      form.setReportData(data);
      form.setPreviewHtml(buildAtendimentosPrintHtml(data, form.buildContext(), form.pageSize));
      form.setPreviewOpen(true);
    }
    form.setBusy(false);
  };

  const handlePrint = async () => {
    form.setBusy(true);
    const data = form.reportData ?? (await form.fetchReport());
    if (data) printAtendimentosReport(data, form.buildContext(), form.pageSize);
    form.setBusy(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos e indicadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhysioReportFilters
            tenantId={form.tenantId}
            category={form.category}
            from={form.from}
            to={form.to}
            onTenantChange={form.setTenantId}
            onCategoryChange={form.setCategory}
            onFromChange={form.setFrom}
            onToChange={form.setTo}
            onApply={() => undefined}
            loading={form.busy}
            showApplyButton={false}
          />
          <PageSizeSelect value={form.pageSize} onChange={form.setPageSize} />
          <ReportActions busy={form.busy} onPreview={() => void handlePreview()} onPrint={() => void handlePrint()} />
          <p className="text-sm text-muted-foreground">
            Use <strong>Visualizar</strong> para abrir o relatório oficial antes de imprimir ou salvar em PDF.
          </p>
        </CardContent>
      </Card>
      <PrintPreviewDialog
        open={form.previewOpen}
        onOpenChange={form.setPreviewOpen}
        title="Pré-visualização — Atendimentos"
        html={form.previewHtml}
        onPrint={() => {
          if (form.reportData) printAtendimentosReport(form.reportData, form.buildContext(), form.pageSize);
        }}
      />
      <FeedbackModal
        open={form.feedback.open}
        onOpenChange={(open) => form.setFeedback((f) => ({ ...f, open }))}
        title={form.feedback.title}
        message={form.feedback.message}
        variant={form.feedback.variant}
      />
    </>
  );
}

export function FisioterapiaRelatorioLesionadosForm() {
  const form = usePhysioReportForm("");

  const handlePreview = async () => {
    form.setBusy(true);
    const data = await form.fetchReport();
    if (data) {
      form.setReportData(data);
      form.setPreviewHtml(buildLesionadosPrintHtml(data, form.buildContext(), form.pageSize));
      form.setPreviewOpen(true);
    }
    form.setBusy(false);
  };

  const handlePrint = async () => {
    form.setBusy(true);
    const data = form.reportData ?? (await form.fetchReport());
    if (data) printLesionadosReport(data, form.buildContext(), form.pageSize);
    form.setBusy(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lesionados em tratamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhysioReportFilters
            tenantId={form.tenantId}
            category={form.category}
            from={form.from}
            to={form.to}
            onTenantChange={form.setTenantId}
            onCategoryChange={form.setCategory}
            onFromChange={form.setFrom}
            onToChange={form.setTo}
            onApply={() => undefined}
            loading={form.busy}
            showApplyButton={false}
          />
          <PageSizeSelect value={form.pageSize} onChange={form.setPageSize} />
          <ReportActions busy={form.busy} onPreview={() => void handlePreview()} onPrint={() => void handlePrint()} />
          <p className="text-sm text-muted-foreground">
            Lista operacional de atletas com tratamento ativo. Filtros de data referem-se ao início do atendimento.
          </p>
        </CardContent>
      </Card>
      <PrintPreviewDialog
        open={form.previewOpen}
        onOpenChange={form.setPreviewOpen}
        title="Pré-visualização — Lesionados"
        html={form.previewHtml}
        onPrint={() => {
          if (form.reportData) printLesionadosReport(form.reportData, form.buildContext(), form.pageSize);
        }}
      />
      <FeedbackModal
        open={form.feedback.open}
        onOpenChange={(open) => form.setFeedback((f) => ({ ...f, open }))}
        title={form.feedback.title}
        message={form.feedback.message}
        variant={form.feedback.variant}
      />
    </>
  );
}

export function FisioterapiaRelatorioCargaForm() {
  const form = usePhysioReportForm(defaultFromMonths(1));

  const handlePreview = async () => {
    form.setBusy(true);
    const data = await form.fetchReport();
    if (data) {
      form.setReportData(data);
      form.setPreviewHtml(buildCargaFisioPrintHtml(data, form.buildContext(), form.pageSize));
      form.setPreviewOpen(true);
    }
    form.setBusy(false);
  };

  const handlePrint = async () => {
    form.setBusy(true);
    const data = form.reportData ?? (await form.fetchReport());
    if (data) printCargaFisioReport(data, form.buildContext(), form.pageSize);
    form.setBusy(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Carga por fisioterapeuta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhysioReportFilters
            tenantId={form.tenantId}
            category={form.category}
            from={form.from}
            to={form.to}
            onTenantChange={form.setTenantId}
            onCategoryChange={form.setCategory}
            onFromChange={form.setFrom}
            onToChange={form.setTo}
            onApply={() => undefined}
            loading={form.busy}
            showApplyButton={false}
          />
          <PageSizeSelect value={form.pageSize} onChange={form.setPageSize} />
          <ReportActions busy={form.busy} onPreview={() => void handlePreview()} onPrint={() => void handlePrint()} />
          <p className="text-sm text-muted-foreground">
            Atendimentos individuais e sessões de recovery registrados por profissional no período.
          </p>
        </CardContent>
      </Card>
      <PrintPreviewDialog
        open={form.previewOpen}
        onOpenChange={form.setPreviewOpen}
        title="Pré-visualização — Carga por fisio"
        html={form.previewHtml}
        onPrint={() => {
          if (form.reportData) printCargaFisioReport(form.reportData, form.buildContext(), form.pageSize);
        }}
      />
      <FeedbackModal
        open={form.feedback.open}
        onOpenChange={(open) => form.setFeedback((f) => ({ ...f, open }))}
        title={form.feedback.title}
        message={form.feedback.message}
        variant={form.feedback.variant}
      />
    </>
  );
}
