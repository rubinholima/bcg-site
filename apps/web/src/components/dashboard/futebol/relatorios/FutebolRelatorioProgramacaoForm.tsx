"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { PrintPageSize, ProgramacaoSemanalReportDto } from "@/lib/futebol-relatorios.types";
import {
  buildProgramacaoPrintHtml,
  printProgramacaoReport,
} from "@/lib/futebol-relatorios-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import {
  PageSizeSelect,
  startOfWeekMonday,
  toIsoDate,
  useFutebolRelatorioTenants,
} from "./futebol-relatorio-shared";

import { FOOTBALL_AGENDA_TYPE_LABEL } from "@/types/futebol-agenda";

/** Tipos que podem ser ocultados na impressão da programação semanal (sem aniversário — só na agenda geral). */
const PROGRAMACAO_HIDE_TYPES = [
  "treino",
  "reuniao",
  "compromisso",
  "preparacao",
  "jogo",
  "viagem",
  "outro",
] as const;

export function FutebolRelatorioProgramacaoForm() {
  const { tenants } = useFutebolRelatorioTenants();
  const { categories: allFixtureCategories } = useFixtureCategories();
  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState(toIsoDate(weekStart));
  const [to, setTo] = useState(toIsoDate(weekEnd));
  const [progCategories, setProgCategories] = useState<string[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ProgramacaoSemanalReportDto | null>(null);
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
    setProgCategories(categoryOptions.map((c) => c.value));
  }, [categoryOptions, tenantId]);

  const fetchReport = async (): Promise<ProgramacaoSemanalReportDto | null> => {
    if (!tenantId || !from || !to) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Preencha clube e período da programação.",
        variant: "warning",
      });
      return null;
    }
    try {
      const params = new URLSearchParams({ tenantId, from, to });
      if (progCategories.length > 0) params.set("categories", progCategories.join(","));
      if (hiddenTypes.length > 0) params.set("excludeTypes", hiddenTypes.join(","));
      const { data } = await api.get<ProgramacaoSemanalReportDto>(
        `/futebol-relatorios/programacao-semanal?${params.toString()}`,
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
          ? `Não foi possível carregar a programação. ${detail}`
          : "Não foi possível carregar a programação da agenda.",
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
      setPreviewHtml(buildProgramacaoPrintHtml(data, pageSize));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const data = reportData ?? (await fetchReport());
    if (data) printProgramacaoReport(data, pageSize);
    setBusy(false);
  };

  const toggleCategory = (value: string) => {
    setProgCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const toggleHiddenType = (value: string) => {
    setHiddenTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Programação Semanal</CardTitle>
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
              <Label>De</Label>
              <Input
                type="date"
                className="text-foreground"
                value={from}
                onChange={(e) => {
                  const v = e.target.value;
                  setFrom(v);
                  if (v && to && v > to) setTo(v);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Até</Label>
              <Input
                type="date"
                className="text-foreground"
                value={to}
                onChange={(e) => {
                  const v = e.target.value;
                  setTo(v);
                  if (v && from && v < from) setFrom(v);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const key = toIsoDate(new Date());
                setFrom(key);
                setTo(key);
              }}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const start = startOfWeekMonday(new Date());
                const end = new Date(start);
                end.setDate(end.getDate() + 6);
                setFrom(toIsoDate(start));
                setTo(toIsoDate(end));
              }}
            >
              Semana atual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTo(from)}
            >
              Só este dia
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Categorias no relatório</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProgCategories(categoryOptions.map((c) => c.value))}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProgCategories([])}
                >
                  Ocultar todas
                </Button>
              </div>
            </div>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-3">
              {categoryOptions.map((cat) => {
                const checked = progCategories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border border-amber-500/40 bg-amber-500/20 text-amber-200"
                        : "border border-transparent bg-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    {getCategoryLabel(cat.value, "pt", allFixtureCategories)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ocultar na impressão</Label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
              {PROGRAMACAO_HIDE_TYPES.map((type) => {
                const hidden = hiddenTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleHiddenType(type)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      hidden
                        ? "border border-zinc-500/40 bg-zinc-500/20 text-zinc-300 line-through"
                        : "border border-transparent bg-muted text-muted-foreground hover:border-border"
                    }`}
                  >
                    {FOOTBALL_AGENDA_TYPE_LABEL[type] ?? type}
                  </button>
                );
              })}
            </div>
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
        title="Pré-visualização — Programação semanal"
        html={previewHtml}
        onPrint={() => {
          if (reportData) printProgramacaoReport(reportData, pageSize);
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
