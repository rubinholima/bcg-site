"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import {
  DashboardDeptSection,
  DashboardFieldLabel,
  DashboardFilterBox,
  DashboardStatGrid,
} from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  buildComprasEstoquePrintHtml,
  printComprasEstoqueReport,
} from "@/lib/compras-relatorios-print";
import {
  COMPRAS_REPORT_SCOPES,
  defaultReportPeriod,
  scopeLabel,
  type ComprasEstoqueReport,
  type ComprasReportScope,
} from "@/lib/compras-relatorios-types";
import { useAdmRelatorioTenants } from "./adm-relatorio-shared";

function fmtMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtQty(qty: number, unit: string | null): string {
  const sign = qty > 0 ? "+" : "";
  const u = unit?.trim() ? ` ${unit.trim()}` : "";
  return `${sign}${qty}${u}`;
}

export function ComprasEstoqueRelatorioPanel() {
  const { tenants, loading: tenantsLoading } = useAdmRelatorioTenants();
  const defaultPeriod = useMemo(() => defaultReportPeriod(), []);

  const [tenantId, setTenantId] = useState("");
  const [scope, setScope] = useState<ComprasReportScope>("geral");
  const [from, setFrom] = useState(defaultPeriod.from);
  const [to, setTo] = useState(defaultPeriod.to);
  const [departmentName, setDepartmentName] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ComprasEstoqueReport | null>(null);
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
      setDepartments([]);
      setDepartmentName("");
      return;
    }
    let cancelled = false;
    setLoadingDepts(true);
    api
      .get<string[]>(`/compras/reports/departments?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setDepartments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDepts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (scope !== "saidas_departamento") setDepartmentName("");
  }, [scope]);

  const fetchReport = async (): Promise<ComprasEstoqueReport | null> => {
    if (!tenantId) {
      setFeedback({
        open: true,
        title: "Empresa obrigatória",
        message: "Selecione o clube/empresa para gerar o relatório.",
        variant: "warning",
      });
      return null;
    }
    if (scope === "saidas_departamento" && !departmentName.trim()) {
      setFeedback({
        open: true,
        title: "Departamento obrigatório",
        message: "Selecione o departamento para filtrar as saídas.",
        variant: "warning",
      });
      return null;
    }
    try {
      const params = new URLSearchParams({
        tenantId,
        scope,
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (departmentName.trim()) params.set("departmentName", departmentName.trim());
      const { data } = await api.get<ComprasEstoqueReport>(
        `/compras/reports/estoque-compras?${params.toString()}`,
      );
      return data;
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null;
      setFeedback({
        open: true,
        title: "Erro",
        message: detail
          ? `Não foi possível carregar o relatório. ${detail}`
          : "Não foi possível carregar o relatório de estoque e compras.",
        variant: "error",
      });
      return null;
    }
  };

  const handlePreview = async () => {
    setBusy(true);
    const data = await fetchReport();
    if (data) {
      setReport(data);
      setPreviewHtml(buildComprasEstoquePrintHtml(data));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const data = report ?? (await fetchReport());
    if (data) {
      setReport(data);
      printComprasEstoqueReport(data);
    }
    setBusy(false);
  };

  const showMovements =
    !report ||
    report.scope === "geral" ||
    report.scope === "entradas" ||
    report.scope === "saidas" ||
    report.scope === "saidas_departamento" ||
    report.scope === "cozinha";
  const showRequisitions = report && (report.scope === "geral" || report.scope === "requisicoes");
  const showOrders =
    report && (report.scope === "geral" || report.scope === "compras" || report.scope === "entradas");

  if (tenantsLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <>
      <DashboardFilterBox accent="emerald" className="sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <DashboardFieldLabel htmlFor="adm-rel-tenant" accent="emerald">
            Clube / Empresa
          </DashboardFieldLabel>
          <Select value={tenantId || "none"} onValueChange={(v) => setTenantId(v === "none" ? "" : v)}>
            <SelectTrigger id="adm-rel-tenant">
              <SelectValue placeholder="Selecione…" />
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

        <div className="space-y-2 lg:col-span-2">
          <DashboardFieldLabel htmlFor="adm-rel-scope" accent="emerald">
            Escopo
          </DashboardFieldLabel>
          <Select value={scope} onValueChange={(v) => setScope(v as ComprasReportScope)}>
            <SelectTrigger id="adm-rel-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPRAS_REPORT_SCOPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <DashboardFieldLabel htmlFor="adm-rel-from" accent="emerald">
            De
          </DashboardFieldLabel>
          <Input
            id="adm-rel-from"
            type="date"
            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <DashboardFieldLabel htmlFor="adm-rel-to" accent="emerald">
            Até
          </DashboardFieldLabel>
          <Input
            id="adm-rel-to"
            type="date"
            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {scope === "saidas_departamento" ? (
          <div className="space-y-2 sm:col-span-2">
            <DashboardFieldLabel accent="emerald">Departamento</DashboardFieldLabel>
            <NativeSelectField
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              placeholder={loadingDepts ? "Carregando…" : "Selecione…"}
              options={departments.map((d) => ({ value: d, label: d }))}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !tenantId}
            onClick={() => void handlePreview()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Visualizar
          </Button>
          <Button
            type="button"
            className="bg-emerald-700 text-white hover:bg-emerald-600"
            disabled={busy || !tenantId}
            onClick={() => void handlePrint()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimir / PDF
          </Button>
        </div>
      </DashboardFilterBox>

      {report ? (
        <div className="space-y-6">
          <DashboardStatGrid
            items={[
              { label: "Movimentos", value: report.summary.movementCount, tone: "emerald" },
              { label: "Entradas", value: report.summary.entriesCount, tone: "sky" },
              { label: "Saídas", value: report.summary.exitsCount, tone: "amber" },
              { label: "Requisições", value: report.summary.requisitionCount, tone: "violet" },
            ]}
          />

          {showMovements ? (
            <DashboardDeptSection
              title="Movimentações"
              aside={
                <span className="text-xs text-muted-foreground">
                  {scopeLabel(report.scope)} · {report.movements.length} registro(s)
                </span>
              }
            >
              {report.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2">Data</th>
                        <th className="px-2 py-2">Tipo</th>
                        <th className="px-2 py-2">Produto</th>
                        <th className="px-2 py-2 text-right">Qtd</th>
                        <th className="px-2 py-2">Dept.</th>
                        <th className="px-2 py-2">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.movements.slice(0, 50).map((row) => (
                        <tr key={row.id} className="border-b border-border/40">
                          <td className="px-2 py-2 whitespace-nowrap">
                            {formatDateDayMonYear(new Date(row.date))}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={
                                row.quantity > 0
                                  ? "rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-500/10"
                                  : "rounded px-1.5 py-0.5 text-xs font-medium text-rose-700 bg-rose-500/10"
                              }
                            >
                              {row.direction}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div>{row.productName}</div>
                            {row.inventoryKindLabel !== "—" ? (
                              <div className="text-xs text-muted-foreground">{row.inventoryKindLabel}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtQty(row.quantity, row.unit)}</td>
                          <td className="px-2 py-2">{row.departmentName ?? "—"}</td>
                          <td className="max-w-[200px] truncate px-2 py-2 text-muted-foreground">
                            {row.notes ?? row.referenceLabel ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.movements.length > 50 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Mostrando 50 de {report.movements.length}. Imprima para ver a lista completa.
                    </p>
                  ) : null}
                </div>
              )}
            </DashboardDeptSection>
          ) : null}

          {showRequisitions ? (
            <DashboardDeptSection title="Requisições" aside={<span className="text-xs text-muted-foreground">{report.requisitions.length} registro(s)</span>}>
              {report.requisitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma requisição no período.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2">Data</th>
                        <th className="px-2 py-2">Departamento</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2 text-right">Valor</th>
                        <th className="px-2 py-2">Itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.requisitions.slice(0, 30).map((row) => (
                        <tr key={row.id} className="border-b border-border/40">
                          <td className="px-2 py-2">{formatDateDayMonYear(new Date(row.date))}</td>
                          <td className="px-2 py-2">{row.departmentName ?? "—"}</td>
                          <td className="px-2 py-2">{row.statusLabel}</td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {fmtMoney(row.approvedTotal ?? row.totalEstimated)}
                          </td>
                          <td className="max-w-[240px] truncate px-2 py-2 text-muted-foreground">{row.itemsSummary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardDeptSection>
          ) : null}

          {showOrders ? (
            <DashboardDeptSection title="Pedidos de compra" aside={<span className="text-xs text-muted-foreground">{report.orders.length} registro(s)</span>}>
              {report.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                        <th className="px-2 py-2">Data</th>
                        <th className="px-2 py-2">Pedido</th>
                        <th className="px-2 py-2">Fornecedor</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.orders.slice(0, 30).map((row) => (
                        <tr key={row.id} className="border-b border-border/40">
                          <td className="px-2 py-2">{formatDateDayMonYear(new Date(row.date))}</td>
                          <td className="px-2 py-2">{row.orderNumber ?? row.id.slice(0, 8)}</td>
                          <td className="px-2 py-2">{row.supplierName}</td>
                          <td className="px-2 py-2">{row.statusLabel}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(row.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardDeptSection>
          ) : null}
        </div>
      ) : null}

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        title="Estoque e Compras"
        onPrint={() => {
          if (report) printComprasEstoqueReport(report);
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
