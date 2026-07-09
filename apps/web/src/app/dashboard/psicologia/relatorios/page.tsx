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
import {
  WeeklyPsychReportDocument,
  type WeeklyPsychReportData,
} from "@/components/dashboard/psychology/WeeklyPsychReportDocument";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatPersonFirstLastName } from "@/lib/consultation-display";
import { printWeeklyPsychReport } from "@/lib/print-weekly-psych-report";

function formatBrDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export default function PsicologiaRelatoriosPage() {
  const { canAccessModule, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WeeklyPsychReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WeeklyPsychReportData | null>(null);
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
      const { data } = await api.get<WeeklyPsychReportData[]>(
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
    if (!selected) return;
    const ok = printWeeklyPsychReport(selected);
    if (!ok) {
      setFeedback({
        open: true,
        title: "Impressão bloqueada",
        message: "Permita pop-ups neste site para abrir a visualização de impressão.",
        variant: "warning",
      });
    }
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5 px-2" asChild>
            <Link href="/dashboard/consultas">
              <ArrowLeft className="h-4 w-4" />
              Voltar às consultas
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Relatórios semanais
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Relatórios preenchidos na aba Relatório da agenda de atendimentos. Abra para visualizar em tela cheia e imprimir em PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/consultas">Novo relatório</Link>
          </Button>
        </div>
      </div>

      <Card>
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
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((r) => {
                const professional =
                  formatPersonFirstLastName(r.estagiarioName) ||
                  formatPersonFirstLastName(r.psychologistName);
                const category = r.categoriesLabel?.trim() || "Sem categoria";
                const period =
                  r.periodStart || r.periodEnd
                    ? `${formatBrDate(r.periodStart)} – ${formatBrDate(r.periodEnd)}`
                    : "Período não informado";
                const mainTitle = [category, period, professional || "—"].join(" · ");
                const secondaryLine = [
                  r.tenant?.name ?? "Clube",
                  `${formatBrDate(r.date)}${r.time ? ` ${r.time}` : ""}`,
                ].join(" · ");

                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="flex h-full w-full min-h-[88px] flex-col justify-between gap-3 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 px-5 py-4 text-left transition-all hover:border-violet-400/60 hover:shadow-md"
                      onClick={() => setSelected(r)}
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-bold leading-snug text-foreground sm:text-lg">
                          {mainTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">{secondaryLine}</p>
                      </div>
                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                          <Eye className="h-3.5 w-3.5" />
                          Abrir
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          showCloseButton
          className="!w-[min(56rem,calc(100vw-1.5rem))] !max-w-none max-h-[92vh] overflow-hidden p-0"
        >
          <div className="flex max-h-[92vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
              <DialogTitle>Visualização do relatório</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {selected ? <WeeklyPsychReportDocument report={selected} /> : null}
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Fechar
              </Button>
              <Button type="button" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
