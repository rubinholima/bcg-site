"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
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
import {
  MEDICAL_DEPARTURE_CARE_TYPE_LABEL,
  MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS,
  MEDICAL_DEPARTURE_STATUS_LABEL,
  MEDICAL_DEPARTURE_STATUS_OPTIONS,
  MEDICAL_DEPARTURE_TRANSPORT_LABEL,
  MEDICAL_DEPARTURE_TRANSPORT_OPTIONS,
  defaultMedicalDepartureReportPeriod,
  formatMedicalDepartureDateTime,
} from "@/lib/medical-departure-labels";
import {
  buildMedicalDeparturePrintHtml,
  printMedicalDepartureReport,
} from "@/lib/medical-departure-relatorios-print";
import type { MedicalDepartureReportsDashboard } from "@/types/medical-departure";
import { useAdmRelatorioTenants } from "@/components/dashboard/adm/relatorios/adm-relatorio-shared";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

type PlayerOpt = { id: string; name: string };

export function MedicalDepartureRelatorioPanel() {
  const { tenants, loading: tenantsLoading } = useAdmRelatorioTenants();
  const { categories: allCats } = useFixtureCategories();
  const defaultPeriod = useMemo(() => defaultMedicalDepartureReportPeriod(), []);

  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [careType, setCareType] = useState("");
  const [transportMode, setTransportMode] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(defaultPeriod.from);
  const [to, setTo] = useState(defaultPeriod.to);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<MedicalDepartureReportsDashboard | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    if (tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants]);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    api
      .get<PlayerOpt[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]));
  }, [tenantId]);

  const loadReport = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (playerId) params.set("playerId", playerId);
      if (careType) params.set("careType", careType);
      if (transportMode) params.set("transportMode", transportMode);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data } = await api.get<MedicalDepartureReportsDashboard>(
        `/medical-departures/reports/dashboard?${params}`,
      );
      setReport(data);
    } catch {
      setReport(null);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar o relatório.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [tenantId, category, playerId, careType, transportMode, status, from, to]);

  useEffect(() => {
    if (tenantsLoading) return;
    void loadReport();
  }, [tenantsLoading, loadReport]);

  const tenantName = tenants.find((t) => t.id === tenantId)?.name;

  const handlePrint = () => {
    if (!report) return;
    const html = buildMedicalDeparturePrintHtml(report, {
      tenantName,
      from,
      to,
      status,
      careType,
      transportMode,
    });
    if (!printMedicalDepartureReport(html)) {
      setPreviewHtml(html);
      setPreviewOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardFilterBox>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <DashboardFieldLabel>Clube</DashboardFieldLabel>
            <NativeSelectField
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="Todos"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>Categoria</DashboardFieldLabel>
            <NativeSelectField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Todas"
              options={allCats.map((c) => ({ value: c.value, label: getCategoryLabel(c.value, "pt", allCats) }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>Atleta</DashboardFieldLabel>
            <NativeSelectField
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Todos"
              options={players.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>Status</DashboardFieldLabel>
            <NativeSelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={MEDICAL_DEPARTURE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>Atendimento</DashboardFieldLabel>
            <NativeSelectField
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
              placeholder="Todos"
              options={MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>Transporte</DashboardFieldLabel>
            <NativeSelectField
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              placeholder="Todos"
              options={MEDICAL_DEPARTURE_TRANSPORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <DashboardFieldLabel>De</DashboardFieldLabel>
            <Input type="date" className="text-foreground" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <DashboardFieldLabel>Até</DashboardFieldLabel>
            <Input type="date" className="text-foreground" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void loadReport()} disabled={busy} className="min-h-[44px]">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Atualizar
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!report || busy} className="min-h-[44px]">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </DashboardFilterBox>

      {report ? (
        <>
          <DashboardStatGrid
            items={[
              { label: "Total de saídas", value: String(report.summary.total) },
              { label: "Atletas distintos", value: String(report.summary.uniquePlayers) },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Por atendimento", rows: report.byCareType.map((x) => ({ k: MEDICAL_DEPARTURE_CARE_TYPE_LABEL[x.careType] ?? x.careType, v: x.count })) },
              { title: "Por categoria", rows: report.byCategory.map((x) => ({ k: x.category, v: x.count })) },
              { title: "Por transporte", rows: report.byTransport.map((x) => ({ k: MEDICAL_DEPARTURE_TRANSPORT_LABEL[x.transportMode] ?? x.transportMode, v: x.count })) },
              { title: "Por status", rows: report.byStatus.map((x) => ({ k: MEDICAL_DEPARTURE_STATUS_LABEL[x.status] ?? x.status, v: x.count })) },
            ].map((block) => (
              <DashboardDeptSection key={block.title} title={block.title}>
                <ul className="space-y-1 text-sm">
                  {block.rows.map((r) => (
                    <li key={r.k} className="flex justify-between gap-2">
                      <span>{r.k}</span>
                      <strong>{r.v}</strong>
                    </li>
                  ))}
                </ul>
              </DashboardDeptSection>
            ))}
          </div>
          <DashboardDeptSection title="Listagem">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Saída</TableHead>
                    <TableHead>Atleta</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Atendimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Retorno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.departures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhuma saída no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.departures.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{formatMedicalDepartureDateTime(d.departedAt)}</TableCell>
                        <TableCell>{d.player?.name ?? "—"}</TableCell>
                        <TableCell>{d.category ? getCategoryLabel(d.category, "pt", allCats) : "—"}</TableCell>
                        <TableCell>{MEDICAL_DEPARTURE_CARE_TYPE_LABEL[d.careType] ?? d.careType}</TableCell>
                        <TableCell>{MEDICAL_DEPARTURE_STATUS_LABEL[d.status] ?? d.status}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{d.destination}</TableCell>
                        <TableCell>{formatMedicalDepartureDateTime(d.returnedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DashboardDeptSection>
        </>
      ) : busy ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <PrintPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} html={previewHtml} title="Saídas do CT" />
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
