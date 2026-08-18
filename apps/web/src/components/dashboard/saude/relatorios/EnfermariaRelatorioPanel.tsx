"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import {
  DashboardDeptSection,
  DashboardFieldLabel,
  DashboardFilterBox,
  DashboardStatGrid,
} from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelectField } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  buildEnfermariaPrintHtml,
  printEnfermariaReport,
} from "@/lib/enfermaria-relatorios-print";
import {
  defaultNursingReportPeriod,
  monthLabel,
  NURSING_STATUS_LABEL,
  type NursingReportsDashboard,
} from "@/lib/enfermaria-relatorios-types";
import { formatNursingExemptFromTraining } from "@/lib/enfermaria-labels";
import { useAdmRelatorioTenants } from "@/components/dashboard/adm/relatorios/adm-relatorio-shared";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

export function EnfermariaRelatorioPanel() {
  const { tenants, loading: tenantsLoading } = useAdmRelatorioTenants();
  const { categories: allCats } = useFixtureCategories();
  const defaultPeriod = useMemo(() => defaultNursingReportPeriod(), []);

  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(defaultPeriod.from);
  const [to, setTo] = useState(defaultPeriod.to);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<NursingReportsDashboard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const categoriesForClub = useMemo(() => allCats, [allCats]);

  useEffect(() => {
    if (tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants]);

  const loadReport = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data } = await api.get<NursingReportsDashboard>(`/enfermaria/reports/dashboard?${params}`);
      setReport(data);
    } catch {
      setReport(null);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar o relatório de enfermaria.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [tenantId, category, status, from, to]);

  useEffect(() => {
    if (tenantsLoading) return;
    void loadReport();
  }, [tenantsLoading, loadReport]);

  const tenantName = tenants.find((t) => t.id === tenantId)?.name;

  const printMeta = useMemo(
    () => ({ tenantName, from, to, status }),
    [tenantName, from, to, status],
  );

  const handlePreview = () => {
    if (!report) return;
    setPreviewHtml(buildEnfermariaPrintHtml(report, printMeta));
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    if (!report) return;
    const ok = printEnfermariaReport(buildEnfermariaPrintHtml(report, printMeta));
    if (!ok) {
      setFeedback({
        open: true,
        title: "Pop-up bloqueado",
        message: "Permita pop-ups para imprimir o relatório.",
        variant: "warning",
      });
    }
  };

  return (
    <div className="space-y-6">
      <DashboardFilterBox accent="violet">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="grid gap-1.5 sm:col-span-2">
            <DashboardFieldLabel accent="violet">Clube</DashboardFieldLabel>
            <NativeSelectField
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setCategory("");
              }}
              placeholder="Todos os clubes"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
              disabled={tenantsLoading}
            />
          </div>
          <div className="grid gap-1.5">
            <DashboardFieldLabel accent="violet">Categoria</DashboardFieldLabel>
            <NativeSelectField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Todas"
              options={categoriesForClub.map((c) => ({
                value: c.value,
                label: getCategoryLabel(c.value, "pt", allCats),
              }))}
              disabled={!tenantId}
            />
          </div>
          <div className="grid gap-1.5">
            <DashboardFieldLabel accent="violet">Status</DashboardFieldLabel>
            <NativeSelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Em tratamento" },
                { value: "completed", label: "Alta" },
                { value: "cancelled", label: "Cancelados" },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <DashboardFieldLabel accent="violet">De</DashboardFieldLabel>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <DashboardFieldLabel accent="violet">Até</DashboardFieldLabel>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="min-h-[44px]" disabled={busy} onClick={() => void loadReport()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Atualizar
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px]"
            disabled={!report || busy}
            onClick={handlePreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px]"
            disabled={!report || busy}
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir / PDF
          </Button>
        </div>
      </DashboardFilterBox>

      {report ? (
        <>
          <DashboardStatGrid
            items={[
              { label: "Atendimentos", value: report.summary.total, tone: "violet" },
              { label: "Ativos", value: report.summary.active, tone: "amber" },
              { label: "Altas", value: report.summary.completed, tone: "emerald" },
              { label: "Atletas", value: report.summary.uniquePlayers, tone: "sky" },
            ]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardDeptSection title="Por diagnóstico">
              <ul className="space-y-1 text-sm">
                {report.byDiagnosis.slice(0, 8).map((row) => (
                  <li key={row.label} className="flex justify-between gap-2">
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </DashboardDeptSection>
            <DashboardDeptSection title="Por medicamento / tratamento">
              <ul className="space-y-1 text-sm">
                {report.byTreatment.slice(0, 8).map((row) => (
                  <li key={row.label} className="flex justify-between gap-2">
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </DashboardDeptSection>
          </div>

          <DashboardDeptSection title="Atendimentos">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Diagnósticos</TableHead>
                    <TableHead>Medicamentos</TableHead>
                    <TableHead>Treino</TableHead>
                    <TableHead>Enfermeiro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum atendimento no filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{formatDateDayMonYear(s.attendedAt)}</TableCell>
                        <TableCell>{s.playerName}</TableCell>
                        <TableCell>{s.category ?? "—"}</TableCell>
                        <TableCell>{NURSING_STATUS_LABEL[s.status] ?? s.status}</TableCell>
                        <TableCell>{s.diagnoses.join(" · ") || "—"}</TableCell>
                        <TableCell>{s.treatments.join(" · ") || "—"}</TableCell>
                        <TableCell>{formatNursingExemptFromTraining(s.exemptFromTraining)}</TableCell>
                        <TableCell>{s.nurseName ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DashboardDeptSection>

          {report.byMonth.length > 0 ? (
            <DashboardDeptSection title="Por mês">
              <ul className="flex flex-wrap gap-2 text-sm">
                {report.byMonth.map((row) => (
                  <li
                    key={row.month}
                    className="rounded-full border border-violet-500/30 px-3 py-1"
                  >
                    {monthLabel(row.month)}: <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </DashboardDeptSection>
          ) : null}
        </>
      ) : busy ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pré-visualização — Enfermaria"
        html={previewHtml}
        onPrint={handlePrint}
      />

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
