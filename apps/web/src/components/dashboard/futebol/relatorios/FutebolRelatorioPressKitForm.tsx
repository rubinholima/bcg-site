"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, Loader2, Printer, Save } from "lucide-react";
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
import { api } from "@/lib/api";
import type {
  PressKitConfigDto,
  PressKitNamedRole,
  PressKitReportDto,
  PrintPageSize,
} from "@/lib/futebol-relatorios.types";
import {
  DEFAULT_PRESS_KIT_DIRECTOR_ROLES,
  DEFAULT_PRESS_KIT_REFEREE_ROLES,
} from "@/lib/futebol-relatorios.types";
import {
  buildPressKitPrintHtml,
  printPressKitReport,
} from "@/lib/futebol-relatorios-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { getStaffRoleLabel } from "@/lib/staff-roles";
import {
  PageSizeSelect,
  formatTravelLabel,
  useFutebolRelatorioTenants,
  useFutebolRelatorioTravels,
} from "./futebol-relatorio-shared";

function emptyNamed(roles: readonly string[]): PressKitNamedRole[] {
  return roles.map((role) => ({ role, name: "" }));
}

export function FutebolRelatorioPressKitForm() {
  const searchParams = useSearchParams();
  const { tenants } = useFutebolRelatorioTenants();
  const [tenantId, setTenantId] = useState("");
  const [travelId, setTravelId] = useState("");
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<PressKitReportDto | null>(null);
  const [phase, setPhase] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [referees, setReferees] = useState<PressKitNamedRole[]>(() =>
    emptyNamed(DEFAULT_PRESS_KIT_REFEREE_ROLES),
  );
  const [directors, setDirectors] = useState<PressKitNamedRole[]>(() =>
    emptyNamed(DEFAULT_PRESS_KIT_DIRECTOR_ROLES),
  );
  const [starterPlayerIds, setStarterPlayerIds] = useState<string[]>([]);
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
      .get<PressKitReportDto>(
        `/futebol-relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        setReportData(data);
        setPhase(data.config.phase ?? "");
        setMatchTime(data.config.matchTime ?? "");
        setContactLine(data.config.contactLine ?? "");
        setReferees(
          data.config.referees.length
            ? data.config.referees
            : emptyNamed(DEFAULT_PRESS_KIT_REFEREE_ROLES),
        );
        setDirectors(
          data.config.directors.length
            ? data.config.directors
            : emptyNamed(DEFAULT_PRESS_KIT_DIRECTOR_ROLES),
        );
        setStarterPlayerIds(data.config.starterPlayerIds);
      })
      .catch(() => {
        if (!cancelled) {
          setReportData(null);
          setFeedback({
            open: true,
            title: "Erro",
            message: "Não foi possível carregar o press kit deste jogo.",
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

  const configPayload = (): PressKitConfigDto => ({
    phase: phase.trim() || null,
    matchTime: matchTime.trim() || null,
    referees,
    directors,
    starterPlayerIds,
    contactLine: contactLine.trim() || null,
    showDisclaimer: true,
  });

  const buildLocalReport = (base: PressKitReportDto): PressKitReportDto => {
    const cfg = configPayload();
    const byId = new Map(
      base.athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
    );
    const starters = cfg.starterPlayerIds
      .map((id) => byId.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a, i) => ({ ...a, num: i + 1 }));
    const starterSet = new Set(cfg.starterPlayerIds);
    const substitutes = base.athletes
      .filter((a) => a.playerId && !starterSet.has(a.playerId))
      .map((a, i) => ({ ...a, num: i + 1 }));
    return { ...base, config: cfg, starters, substitutes };
  };

  const handleSave = async () => {
    if (!travelId || !reportData) return;
    setSaving(true);
    try {
      const { data } = await api.put<PressKitReportDto>(
        `/futebol-relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`,
        configPayload(),
      );
      setReportData(data);
      setStarterPlayerIds(data.config.starterPlayerIds);
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Press kit salvo neste planejamento.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível salvar o press kit.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!reportData) {
      setFeedback({
        open: true,
        title: "Seleção obrigatória",
        message: "Selecione o jogo para gerar o Relatório de Imprensa.",
        variant: "warning",
      });
      return;
    }
    setBusy(true);
    const data = buildLocalReport(reportData);
    setPreviewHtml(buildPressKitPrintHtml(data, pageSize));
    setPreviewOpen(true);
    setBusy(false);
  };

  const handlePrint = async () => {
    if (!reportData) {
      setFeedback({
        open: true,
        title: "Seleção obrigatória",
        message: "Selecione o jogo para gerar o Relatório de Imprensa.",
        variant: "warning",
      });
      return;
    }
    setBusy(true);
    printPressKitReport(buildLocalReport(reportData), pageSize);
    setBusy(false);
  };

  const moveStarter = (index: number, dir: -1 | 1) => {
    setStarterPlayerIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  };

  const toggleStarter = (playerId: string) => {
    setStarterPlayerIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 11) return prev;
      return [...prev, playerId];
    });
  };

  const athletes = reportData?.athletes ?? [];
  const starterSet = new Set(starterPlayerIds);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Press Kit / Relatório de Imprensa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escalação visual no gramado, suplentes, arbitragem, comissão e diretoria — no estilo do
            Relatório Imprensa.
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
              <Label>{isHomeMatch ? "Jogo" : "Viagem / jogo"}</Label>
              <Select
                value={travelId || "none"}
                onValueChange={(v) => setTravelId(v === "none" ? "" : v)}
                disabled={!tenantId || loadingTravels}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTravels
                        ? "Carregando…"
                        : isHomeMatch
                          ? "Selecione o jogo"
                          : "Selecione a viagem / jogo"
                    }
                  />
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
              Carregando convocados…
            </div>
          ) : null}

          {reportData ? (
            <div className="space-y-6 border-t border-border pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fase / rodada</Label>
                  <Input
                    className="text-foreground"
                    placeholder="Ex.: 1ª Fase"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário do jogo</Label>
                  <Input
                    type="time"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contato no rodapé (opcional)</Label>
                <Input
                  className="text-foreground"
                  placeholder="Nome — função — telefone — e-mail"
                  value={contactLine}
                  onChange={(e) => setContactLine(e.target.value)}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Arbitragem</p>
                  {referees.map((r, i) => (
                    <div key={`ref-${i}`} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{r.role}</Label>
                      <Input
                        className="min-h-[44px] text-foreground"
                        value={r.name}
                        onChange={(e) => {
                          const next = [...referees];
                          next[i] = { ...r, name: e.target.value };
                          setReferees(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Diretoria (até 4)</p>
                  {directors.map((d, i) => (
                    <div key={`dir-${i}`} className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cargo</Label>
                        <Input
                          className="min-h-[44px] text-foreground"
                          value={d.role}
                          onChange={(e) => {
                            const next = [...directors];
                            next[i] = { ...d, role: e.target.value };
                            setDirectors(next);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <Input
                          className="min-h-[44px] text-foreground"
                          value={d.name}
                          onChange={(e) => {
                            const next = [...directors];
                            next[i] = { ...d, name: e.target.value };
                            setDirectors(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Titulares no gramado ({starterPlayerIds.length}/11)</p>
                    <p className="text-xs text-muted-foreground">
                      Marque até 11 atletas e use as setas para ordenar (formação visual 4-3-3). Não é o
                      esquema tático real.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStarterPlayerIds(
                        athletes
                          .map((a) => a.playerId)
                          .filter((id): id is string => !!id)
                          .slice(0, 11),
                      )
                    }
                  >
                    Usar primeiros 11 da convocação
                  </Button>
                </div>

                <div className="space-y-2">
                  {starterPlayerIds.map((id, index) => {
                    const a = athletes.find((x) => x.playerId === id);
                    if (!a) return null;
                    return (
                      <div
                        key={id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="w-6 text-xs font-semibold text-muted-foreground">{index + 1}</span>
                        <span className="min-w-0 flex-1 text-sm">
                          {a.jerseyNumber != null ? `#${a.jerseyNumber} · ` : ""}
                          {a.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[40px] min-w-[40px]"
                          disabled={index === 0}
                          onClick={() => moveStarter(index, -1)}
                          aria-label="Subir"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[40px] min-w-[40px]"
                          disabled={index === starterPlayerIds.length - 1}
                          onClick={() => moveStarter(index, 1)}
                          aria-label="Descer"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStarter(id)}
                        >
                          Remover
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {athletes.map((a) => {
                    if (!a.playerId || starterSet.has(a.playerId)) return null;
                    return (
                      <button
                        key={a.playerId}
                        type="button"
                        className="min-h-[44px] rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm hover:border-[#C8102E]/50 hover:bg-[#C8102E]/5"
                        onClick={() => toggleStarter(a.playerId!)}
                        disabled={starterPlayerIds.length >= 11}
                      >
                        {a.jerseyNumber != null ? `#${a.jerseyNumber} · ` : ""}
                        {a.name}
                        <span className="ml-2 text-xs text-muted-foreground">+ titular</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {reportData.staff.length > 0 ? (
                <div className="rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">Comissão (da convocação)</p>
                  <ul className="space-y-0.5">
                    {reportData.staff.map((s) => (
                      <li key={s.staffId ?? s.num}>
                        {s.name}
                        {s.role ? ` — ${getStaffRoleLabel(s.role)}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !reportData || saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar press kit
            </Button>
            <Button type="button" variant="outline" disabled={busy || !reportData} onClick={() => void handlePreview()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Visualizar
            </Button>
            <Button
              type="button"
              className="bg-[#00205B] text-white hover:bg-[#003087]"
              disabled={busy || !reportData}
              onClick={() => void handlePrint()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir / PDF
            </Button>
            {travelId ? (
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/futebol/logistica/${travelId}/edit`}>
                  {isHomeMatch ? "Editar planejamento" : "Editar viagem"}
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pré-visualização — Press Kit / Relatório Imprensa"
        html={previewHtml}
        landscape
        onPrint={() => {
          if (reportData) printPressKitReport(buildLocalReport(reportData), pageSize);
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
