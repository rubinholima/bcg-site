"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  DashboardFieldLabel,
  DashboardFilterBox,
  DashboardStatGrid,
} from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import {
  buildFisiologiaPrintHtml,
  printFisiologiaReport,
} from "@/lib/fisiologia-relatorios-print";
import {
  defaultReportPeriod,
  FISIOLOGIA_REPORT_KINDS,
  type FisiologiaReport,
  type FisiologiaReportKind,
} from "@/lib/fisiologia-types";
import { formatDurationMinutes } from "@/lib/physio-transition-labels";
import { formatDateDayMonYear } from "@/lib/format-date";

type Tenant = {
  id: string;
  name: string;
  categories?: string[] | null;
  kind?: { name?: string };
};

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
}

export function FisiologiaRelatorioPanel() {
  const searchParams = useSearchParams();
  const { categories: allCats } = useFixtureCategories();
  const defaultPeriod = useMemo(() => defaultReportPeriod(), []);
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const initialKind = (searchParams.get("kind") as FisiologiaReportKind | null) ?? "geral";
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [kind, setKind] = useState<FisiologiaReportKind>(
    FISIOLOGIA_REPORT_KINDS.some((k) => k.value === initialKind) ? initialKind : "geral",
  );
  const [from, setFrom] = useState(defaultPeriod.from);
  const [to, setTo] = useState(defaultPeriod.to);
  const [month, setMonth] = useState(defaultMonth);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<FisiologiaReport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) =>
        isFootballKind(t.kind?.name ?? ""),
      );
      setTenants(list);
      if (list.length === 1) setTenantId(list[0]!.id);
    });
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const categoriesForClub = filterCategoriesForTenant(allCats, selectedTenant?.categories);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    api
      .get<PlayerOption[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]));
  }, [tenantId]);

  const fetchReport = async (): Promise<FisiologiaReport | null> => {
    if (!tenantId) {
      setFeedback({
        open: true,
        title: "Clube obrigatório",
        message: "Selecione o clube para gerar o relatório.",
        variant: "warning",
      });
      return null;
    }
    try {
      const params = new URLSearchParams({ tenantId, kind });
      if (category) params.set("category", category);
      if (playerId) params.set("playerId", playerId);
      if (kind === "transicoes") {
        if (month) params.set("month", month);
      } else {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }
      const { data } = await api.get<FisiologiaReport>(`/fisiologia/reports/dashboard?${params}`);
      if (!data) {
        setFeedback({
          open: true,
          title: "Sem dados",
          message: "Nenhum dado encontrado para o filtro.",
          variant: "warning",
        });
        return null;
      }
      return data;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar o relatório.",
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
      setPreviewHtml(buildFisiologiaPrintHtml(data, allCats));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const data = report ?? (await fetchReport());
    if (data) {
      setReport(data);
      printFisiologiaReport(data, allCats);
    }
    setBusy(false);
  };

  return (
    <>
      <DashboardFilterBox accent="sky" className="sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Clube</DashboardFieldLabel>
          <NativeSelect
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setCategory("");
              setPlayerId("");
            }}
          >
            <option value="">Selecione…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Relatório</DashboardFieldLabel>
          <Select value={kind} onValueChange={(v) => setKind(v as FisiologiaReportKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISIOLOGIA_REPORT_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Categoria</DashboardFieldLabel>
          <NativeSelect
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!tenantId}
          >
            <option value="">Todas</option>
            {categoriesForClub.map((c) => (
              <option key={c.value} value={c.value}>
                {getCategoryLabel(c.value, "pt", allCats)}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <DashboardFieldLabel accent="sky">Atleta</DashboardFieldLabel>
          <NativeSelectField
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Todos"
            disabled={!tenantId}
            options={players.map((p) => ({
              value: p.id,
              label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
            }))}
          />
        </div>

        <div className="space-y-2">
          {kind === "transicoes" ? (
            <>
              <DashboardFieldLabel accent="sky">Mês</DashboardFieldLabel>
              <Input
                type="month"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </>
          ) : (
            <>
              <DashboardFieldLabel accent="sky">De</DashboardFieldLabel>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </>
          )}
        </div>

        {kind !== "transicoes" ? (
          <div className="space-y-2">
            <DashboardFieldLabel accent="sky">Até</DashboardFieldLabel>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="button" variant="outline" disabled={busy || !tenantId} onClick={() => void handlePreview()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Visualizar
          </Button>
          <Button
            type="button"
            className="bg-sky-600 text-white hover:bg-sky-500"
            disabled={busy || !tenantId}
            onClick={() => void handlePrint()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimir / PDF
          </Button>
        </div>
      </DashboardFilterBox>

      {report && kind === "transicoes" && report.transitionReport ? (
        <>
          <DashboardStatGrid
            items={[
              {
                label: "Entraram no mês",
                value: report.summary.transitionEnteredInMonth ?? 0,
                tone: "sky",
              },
              {
                label: "Com atividade",
                value: report.summary.transitionActivityInMonth ?? 0,
                tone: "emerald",
              },
              {
                label: "Liberados no mês",
                value: report.summary.transitionReleasedInMonth ?? 0,
                tone: "violet",
              },
              {
                label: "Ativos no fim do mês",
                value: report.summary.transitionActiveAtMonthEnd ?? 0,
                tone: "amber",
              },
              {
                label: "Sessões no mês",
                value: report.summary.transitionSessionsInMonth ?? 0,
                tone: "sky",
              },
              {
                label: "Tempo no mês",
                value: formatDurationMinutes(report.summary.transitionDurationMinutesInMonth ?? 0),
                tone: "emerald",
              },
            ]}
          />
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                  <th className="p-2">Atleta</th>
                  <th className="p-2">Origem</th>
                  <th className="p-2">Início</th>
                  <th className="p-2">Conclusão</th>
                  <th className="p-2">Sessões (mês)</th>
                  <th className="p-2">Tempo (mês)</th>
                  <th className="p-2">Status no mês</th>
                </tr>
              </thead>
              <tbody>
                {report.transitionReport.programs.map((p) => (
                  <tr key={p.programId} className="border-b border-border/40">
                    <td className="p-2 font-medium">{p.playerName}</td>
                    <td className="p-2 max-w-[180px] truncate">{p.originSummary}</td>
                    <td className="p-2">{formatDateDayMonYear(p.startedAt)}</td>
                    <td className="p-2">{p.completedAt ? formatDateDayMonYear(p.completedAt) : "—"}</td>
                    <td className="p-2">{p.sessionsInMonth}</td>
                    <td className="p-2">{formatDurationMinutes(p.durationMinutesInMonth)}</td>
                    <td className="p-2 text-xs">
                      {[
                        p.enteredInMonth ? "Entrou" : null,
                        p.releasedInMonth ? "Liberado" : null,
                        p.activeAtMonthEnd ? "Ativo fim mês" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Atividade"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : report && kind !== "transicoes" ? (
        <DashboardStatGrid
          items={[
            { label: "Avaliações", value: report.summary.assessmentCount, tone: "sky" },
            { label: "Hidratação", value: report.summary.hydrationCount, tone: "emerald" },
            { label: "Sessões", value: report.summary.loadSessionCount, tone: "violet" },
            { label: "Registros GPS", value: report.summary.loadEntryCount, tone: "amber" },
          ]}
        />
      ) : null}

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Relatório — Fisiologia"
        html={previewHtml}
        onPrint={() => report && printFisiologiaReport(report, allCats)}
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
