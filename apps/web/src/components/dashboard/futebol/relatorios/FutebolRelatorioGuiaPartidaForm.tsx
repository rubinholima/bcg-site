"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { api } from "@/lib/api";
import type { GuiaPartidaReportDto, PrintPageSize } from "@/lib/futebol-relatorios.types";
import {
  buildGuiaPartidaPrintHtml,
  printGuiaPartidaReport,
} from "@/lib/guia-partida-print";
import {
  PageSizeSelect,
  formatTravelLabel,
  useFutebolRelatorioTenants,
  useFutebolRelatorioTravels,
} from "./futebol-relatorio-shared";

export function FutebolRelatorioGuiaPartidaForm() {
  const searchParams = useSearchParams();
  const { tenants } = useFutebolRelatorioTenants();
  const [tenantId, setTenantId] = useState("");
  const [travelId, setTravelId] = useState("");
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [loadingReport, setLoadingReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<GuiaPartidaReportDto | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const { travels, loading: loadingTravels } = useFutebolRelatorioTravels(tenantId);
  const selectedTravel = useMemo(
    () => travels.find((t) => t.id === travelId) ?? null,
    [travels, travelId],
  );
  const isHomeMatch = selectedTravel?.isHomeMatch === true;

  useEffect(() => {
    const qTenant = searchParams.get("tenantId")?.trim() ?? "";
    const qTravel = searchParams.get("travelId")?.trim() ?? "";
    if (qTenant) setTenantId(qTenant);
    if (qTravel) setTravelId(qTravel);
  }, [searchParams]);

  useEffect(() => {
    if (!tenantId && tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants, tenantId]);

  useEffect(() => {
    if (!travelId) {
      setReportData(null);
      return;
    }
    let cancelled = false;
    setLoadingReport(true);
    void api
      .get<GuiaPartidaReportDto>(
        `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
      )
      .then(({ data }) => {
        if (!cancelled) setReportData(data);
      })
      .catch(() => {
        if (!cancelled) {
          setReportData(null);
          setFeedback({
            open: true,
            title: "Erro",
            message: "Não foi possível carregar o guia deste jogo.",
            variant: "error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReport(false);
      });
    return () => {
      cancelled = true;
    };
  }, [travelId]);

  const requireReport = (): GuiaPartidaReportDto | null => {
    if (reportData) return reportData;
    setFeedback({
      open: true,
      title: "Seleção obrigatória",
      message: "Selecione o jogo para gerar o guia.",
      variant: "warning",
    });
    return null;
  };

  const handlePreview = () => {
    const data = requireReport();
    if (!data) return;
    setBusy(true);
    setPreviewHtml(buildGuiaPartidaPrintHtml(data, pageSize));
    setPreviewOpen(true);
    setBusy(false);
  };

  const handlePrint = () => {
    const data = requireReport();
    if (!data) return;
    setBusy(true);
    printGuiaPartidaReport(data, pageSize);
    setBusy(false);
  };

  const summary = reportData
    ? [
        { label: "Atletas", value: reportData.squad.length },
        { label: "Jogos na temporada", value: reportData.campaign.overall.matches },
        { label: "Aproveitamento", value: `${reportData.campaign.overall.winRate}%` },
        { label: "Escalações", value: reportData.lastLineups.length },
      ]
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Guia da Partida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={tenantId || "none"}
                onValueChange={(v) => {
                  setTenantId(v === "none" ? "" : v);
                  setTravelId("");
                }}
              >
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
            <div className="space-y-2">
              <Label>{isHomeMatch ? "Jogo" : "Viagem / jogo"}</Label>
              <Select
                value={travelId || "none"}
                onValueChange={(v) => setTravelId(v === "none" ? "" : v)}
                disabled={!tenantId || loadingTravels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTravels ? "Carregando…" : "Selecione o jogo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {travels.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {formatTravelLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PageSizeSelect value={pageSize} onChange={setPageSize} />

          {loadingReport ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Montando o guia…
            </div>
          ) : null}

          {reportData ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              {!reportData.hasOfficialData ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  Sem partidas oficiais importadas nesta temporada — o guia sai com elenco e
                  planejamento, sem números consolidados.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !reportData}
              onClick={handlePreview}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Visualizar
            </Button>
            <Button
              type="button"
              className="bg-[#00205B] text-white hover:bg-[#003087]"
              disabled={busy || !reportData}
              onClick={handlePrint}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir / PDF
            </Button>
            {travelId ? (
              <Button type="button" variant="outline" asChild>
                <Link
                  href={`/dashboard/futebol/logistica/relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`}
                >
                  Editar arbitragem e titulares
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pré-visualização — Guia da Partida"
        html={previewHtml}
        onPrint={() => {
          if (reportData) printGuiaPartidaReport(reportData, pageSize);
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
