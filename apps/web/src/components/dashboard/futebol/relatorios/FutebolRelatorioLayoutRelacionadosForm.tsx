"use client";

import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import type { LayoutRelacionadosReportDto, PrintPageSize } from "@/lib/futebol-relatorios.types";
import {
  buildLayoutRelacionadosPrintHtml,
  printLayoutRelacionadosReport,
} from "@/lib/futebol-relatorios-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import {
  PageSizeSelect,
  formatTravelLabel,
  useFutebolRelatorioTenants,
  useFutebolRelatorioTravels,
} from "./futebol-relatorio-shared";

export function FutebolRelatorioLayoutRelacionadosForm() {
  const searchParams = useSearchParams();
  const { tenants } = useFutebolRelatorioTenants();
  const [tenantId, setTenantId] = useState("");
  const [travelId, setTravelId] = useState("");
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<LayoutRelacionadosReportDto | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const { travels, loading: loadingTravels } = useFutebolRelatorioTravels(tenantId);

  useEffect(() => {
    const qTenant = searchParams.get("tenantId")?.trim() ?? "";
    const qTravel = searchParams.get("travelId")?.trim() ?? "";
    if (qTenant) setTenantId(qTenant);
    if (qTravel) setTravelId(qTravel);
  }, [searchParams]);

  useEffect(() => {
    if (!tenantId && tenants.length === 1) setTenantId(tenants[0]!.id);
  }, [tenants, tenantId]);

  const fetchReport = async (): Promise<LayoutRelacionadosReportDto | null> => {
    if (!travelId) {
      setFeedback({
        open: true,
        title: "Viagem obrigatória",
        message: "Selecione a viagem para gerar o Layout Relacionados.",
        variant: "warning",
      });
      return null;
    }
    try {
      const { data } = await api.get<LayoutRelacionadosReportDto>(
        `/futebol-relatorios/layout-relacionados?travelId=${encodeURIComponent(travelId)}`,
      );
      return data;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os dados da viagem.",
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
      setPreviewHtml(buildLayoutRelacionadosPrintHtml(data, pageSize));
      setPreviewOpen(true);
    }
    setBusy(false);
  };

  const handlePrint = async () => {
    setBusy(true);
    const data = reportData ?? (await fetchReport());
    if (data) printLayoutRelacionadosReport(data, pageSize);
    setBusy(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Layout Relacionados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Convocados, uniformes e programação de ida/volta (ou agenda em casa) em um único documento.
          </p>
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
              <Label>Viagem / jogo</Label>
              <Select
                value={travelId || "none"}
                onValueChange={(v) => setTravelId(v === "none" ? "" : v)}
                disabled={!tenantId || loadingTravels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTravels ? "Carregando…" : "Selecione a viagem"} />
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
            {travelId ? (
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/futebol/logistica/${travelId}/edit`}>Editar viagem</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pré-visualização — Layout Relacionados"
        html={previewHtml}
        onPrint={() => {
          if (reportData) printLayoutRelacionadosReport(reportData, pageSize);
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
