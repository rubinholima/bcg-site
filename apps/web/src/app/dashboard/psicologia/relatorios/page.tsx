"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatPersonFirstLastName } from "@/lib/consultation-display";

type WeeklyReport = {
  id: string;
  tenantId: string;
  date: string;
  time?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  categoriesLabel?: string | null;
  activities?: string | null;
  individualDemands?: string | null;
  weeklyDevelopment?: string | null;
  identifiedDemands?: string | null;
  nextWeekPlanning?: string | null;
  finalSummary?: string | null;
  generalNotes?: string | null;
  psychologistName?: string | null;
  estagiarioName?: string | null;
  status?: string | null;
  tenant?: { id: string; name: string; slug?: string } | null;
};

function formatBrDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

const REPORT_FIELDS: Array<{ key: keyof WeeklyReport; label: string }> = [
  { key: "activities", label: "Atividades realizadas" },
  { key: "individualDemands", label: "Demandas individuais (comissão)" },
  { key: "weeklyDevelopment", label: "Desenvolvimento observado na semana" },
  { key: "identifiedDemands", label: "Demandas identificadas" },
  { key: "nextWeekPlanning", label: "Planejamento próxima semana" },
  { key: "finalSummary", label: "Resumo final" },
  { key: "generalNotes", label: "Observações gerais" },
];

export default function PsicologiaRelatoriosPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WeeklyReport | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const canAccess = canAccessModule("saude");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<WeeklyReport[]>(
        "/psychology-sessions?sessionType=relatorio_semanal",
      );
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const da = `${a.date ?? ""}${a.time ?? ""}`;
        const db = `${b.date ?? ""}${b.time ?? ""}`;
        return db.localeCompare(da);
      });
      setRows(list);
    } catch {
      setRows([]);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os relatórios.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !canAccess) return;
    void load();
  }, [authLoading, canAccess, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.tenant?.name,
        r.categoriesLabel,
        r.psychologistName,
        r.estagiarioName,
        r.finalSummary,
        r.activities,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">Sem acesso ao módulo de Saúde / Psicologia.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5 px-2 print:hidden" asChild>
            <Link href="/dashboard/consultas">
              <ArrowLeft className="h-4 w-4" />
              Voltar às consultas
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Relatórios semanais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relatórios preenchidos na aba Relatório da agenda de atendimentos. Abra para ver e imprimir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/consultas">Novo relatório</Link>
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nenhum relatório encontrado."
              : `${filtered.length} relatório(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="min-h-[44px] pl-9 text-foreground"
              placeholder="Buscar por clube, categoria, psicóloga…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando relatórios…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ainda não há relatórios salvos. Preencha a aba Relatório em Consultas e clique em Salvar.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full min-h-[52px] flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-violet-400/50 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setSelected(r)}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {r.tenant?.name ?? "Clube"} · {formatBrDate(r.date)}
                        {r.time ? ` ${r.time}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          r.periodStart || r.periodEnd
                            ? `Período ${formatBrDate(r.periodStart)} – ${formatBrDate(r.periodEnd)}`
                            : null,
                          r.categoriesLabel,
                          formatPersonFirstLastName(r.estagiarioName || r.psychologistName),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                      <Eye className="h-3.5 w-3.5" />
                      Ver / imprimir
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto print:max-h-none print:max-w-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle>Relatório semanal</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div id="psych-weekly-report-print" className="space-y-4 text-sm text-foreground">
              <div className="border-b border-border pb-3">
                <h2 className="text-xl font-bold">Relatório semanal — Psicologia</h2>
                <p className="mt-1 text-muted-foreground">{selected.tenant?.name ?? "—"}</p>
                <div className="mt-3 grid gap-1 sm:grid-cols-2">
                  <p>
                    <span className="font-medium">Data do registro:</span> {formatBrDate(selected.date)}
                    {selected.time ? ` ${selected.time}` : ""}
                  </p>
                  <p>
                    <span className="font-medium">Período:</span>{" "}
                    {formatBrDate(selected.periodStart)} – {formatBrDate(selected.periodEnd)}
                  </p>
                  <p>
                    <span className="font-medium">Categorias:</span> {selected.categoriesLabel?.trim() || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Psicóloga(o):</span>{" "}
                    {selected.psychologistName?.trim() || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Estagiária(o):</span>{" "}
                    {selected.estagiarioName?.trim() || "—"}
                  </p>
                </div>
              </div>
              {REPORT_FIELDS.map((field) => {
                const value = (selected[field.key] as string | null | undefined)?.trim();
                if (!value) return null;
                return (
                  <div key={field.key}>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
                  </div>
                );
              })}
              {!REPORT_FIELDS.some((f) => (selected[f.key] as string | null | undefined)?.trim()) ? (
                <p className="text-muted-foreground">Este relatório não tem campos de texto preenchidos.</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="print:hidden gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button type="button" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #psych-weekly-report-print,
          #psych-weekly-report-print * {
            visibility: visible !important;
          }
          #psych-weekly-report-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 1rem !important;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}
