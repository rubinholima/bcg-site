"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Loader2, Printer, Save, Shield, Users } from "lucide-react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import type {
  PressKitConfigDto,
  PressKitNamedRole,
  PressKitReportDto,
  GuiaPartidaReportDto,
  PrintPageSize,
  RelatorioPessoaRow,
} from "@/lib/futebol-relatorios.types";
import {
  DEFAULT_PRESS_KIT_DIRECTOR_ROLES,
  DEFAULT_PRESS_KIT_REFEREE_ROLES,
} from "@/lib/futebol-relatorios.types";
import {
  buildMatchExternalReportHtml,
  printHtmlDocument,
  printMatchExternalReport,
} from "@/lib/futebol-relatorios-print";
import {
  buildGuiaPartidaPrintHtml,
  printGuiaPartidaReport,
} from "@/lib/guia-partida-print";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { getStaffRoleLabel } from "@/lib/staff-roles";
import { getFormation, PRESS_KIT_FORMATIONS } from "@/lib/press-kit-formations";
import {
  PageSizeSelect,
  formatTravelLabel,
  useFutebolRelatorioTenants,
  useFutebolRelatorioTravels,
} from "./futebol-relatorio-shared";

function emptyNamed(roles: readonly string[]): PressKitNamedRole[] {
  return roles.map((role) => ({ role, name: "" }));
}

function padStarterSlots(ids: string[] | undefined): string[] {
  return Array.from({ length: 11 }, (_, i) => ids?.[i] ?? "");
}

function applyJerseyOverridesLocal(
  rows: RelatorioPessoaRow[],
  overrides: Record<string, number | null>,
): RelatorioPessoaRow[] {
  if (Object.keys(overrides).length === 0) return rows;
  return rows.map((row) => {
    if (!row.playerId || !(row.playerId in overrides)) return row;
    return { ...row, jerseyNumber: overrides[row.playerId] ?? null };
  });
}

function AthleteAvatar({
  photoUrl,
  name,
  size = "md",
}: {
  photoUrl?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const src = getPublicImageUrl(photoUrl);
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover bg-zinc-800`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300`}
    >
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
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
  const [previewLandscape, setPreviewLandscape] = useState(false);
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
  const [starterPlayerIds, setStarterPlayerIds] = useState<string[]>(() => padStarterSlots([]));
  const [formation, setFormation] = useState("4-3-3");
  const [jerseyOverrides, setJerseyOverrides] = useState<Record<string, number | null>>({});
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
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
        setStarterPlayerIds(padStarterSlots(data.config.starterPlayerIds));
        setFormation(data.config.formation?.trim() || "4-3-3");
        setJerseyOverrides(data.config.jerseyOverrides ?? {});
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
    starterPlayerIds: padStarterSlots(starterPlayerIds),
    formation,
    jerseyOverrides,
    contactLine: contactLine.trim() || null,
    showDisclaimer: true,
  });

  const buildLocalReport = (base: PressKitReportDto): PressKitReportDto => {
    const cfg = configPayload();
    const athletes = applyJerseyOverridesLocal(base.athletes, cfg.jerseyOverrides);
    const byId = new Map(
      athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
    );
    const starters = cfg.starterPlayerIds
      .filter(Boolean)
      .map((id) => byId.get(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a, i) => ({ ...a, num: i + 1 }));
    const starterSet = new Set(cfg.starterPlayerIds.filter(Boolean));
    const substitutes = athletes
      .filter((a) => a.playerId && !starterSet.has(a.playerId))
      .map((a, i) => ({ ...a, num: i + 1 }));
    return { ...base, athletes, config: cfg, starters, substitutes };
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
      setStarterPlayerIds(padStarterSlots(data.config.starterPlayerIds));
      setFormation(data.config.formation?.trim() || "4-3-3");
      setJerseyOverrides(data.config.jerseyOverrides ?? {});
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
    try {
      await api.put(`/futebol-relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`, configPayload());
      const { data } = await api.get<GuiaPartidaReportDto>(
        `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
      );
      setPreviewHtml(buildGuiaPartidaPrintHtml(data, pageSize));
      setPreviewLandscape(false);
      setPreviewOpen(true);
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível montar o Press Kit completo.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
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
    try {
      await api.put(`/futebol-relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`, configPayload());
      const { data } = await api.get<GuiaPartidaReportDto>(
        `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
      );
      printGuiaPartidaReport(data, pageSize);
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível imprimir o Press Kit completo.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleExternalReport = async (
    audience: "opponent" | "referees",
    preview: boolean,
  ) => {
    if (!reportData) return;
    setBusy(true);
    try {
      const local = buildLocalReport(reportData);
      if (preview) {
        setPreviewHtml(buildMatchExternalReportHtml(local, audience, pageSize));
        setPreviewLandscape(false);
        setPreviewOpen(true);
      } else {
        printMatchExternalReport(local, audience, pageSize);
      }
    } finally {
      setBusy(false);
    }
  };

  const placeStarterInSlot = (playerId: string, slotIndex: number) => {
    setStarterPlayerIds((prev) => {
      const next = padStarterSlots(prev);
      for (let i = 0; i < 11; i++) {
        if (next[i] === playerId) next[i] = "";
      }
      next[slotIndex] = playerId;
      return next;
    });
  };

  const clearStarterSlot = (slotIndex: number) => {
    setStarterPlayerIds((prev) => {
      const next = padStarterSlots(prev);
      next[slotIndex] = "";
      return next;
    });
  };

  const swapStarterSlots = (from: number, to: number) => {
    if (from === to) return;
    setStarterPlayerIds((prev) => {
      const next = padStarterSlots(prev);
      const tmp = next[from]!;
      next[from] = next[to]!;
      next[to] = tmp;
      return next;
    });
  };

  const addStarterToFirstEmpty = (playerId: string) => {
    setStarterPlayerIds((prev) => {
      const next = padStarterSlots(prev);
      if (next.includes(playerId)) return next;
      const empty = next.findIndex((id) => !id);
      if (empty < 0) return next;
      next[empty] = playerId;
      return next;
    });
  };

  const setJerseyForPlayer = (playerId: string, raw: string) => {
    setJerseyOverrides((prev) => {
      const next = { ...prev };
      const trimmed = raw.trim();
      if (!trimmed) {
        next[playerId] = null;
        return next;
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0 || n > 99) return prev;
      next[playerId] = Math.trunc(n);
      return next;
    });
  };

  const athletes = applyJerseyOverridesLocal(
    reportData?.athletes ?? [],
    jerseyOverrides,
  );
  const starterSet = new Set(starterPlayerIds.filter(Boolean));
  const formationDef = getFormation(formation);
  const filledStarters = starterPlayerIds.filter(Boolean).length;
  const directorNameOptions = Array.from(
    new Set(
      [
        ...(reportData?.staff ?? []).map((s) => s.name.trim()).filter(Boolean),
        ...directors.map((d) => d.name.trim()).filter(Boolean),
      ],
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Press Kit / Relatório de Imprensa</CardTitle>
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
              <Label>Planejamento</Label>
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
                        : "Selecione o planejamento"
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
                        <NativeSelect
                          className="min-h-[44px]"
                          value={d.role}
                          onChange={(e) => {
                            const next = [...directors];
                            next[i] = { ...d, role: e.target.value };
                            setDirectors(next);
                          }}
                        >
                          {Array.from(
                            new Set([
                              ...DEFAULT_PRESS_KIT_DIRECTOR_ROLES,
                              d.role.trim(),
                            ].filter(Boolean)),
                          ).map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <NativeSelect
                          className="min-h-[44px]"
                          value={d.name}
                          onChange={(e) => {
                            const next = [...directors];
                            next[i] = { ...d, name: e.target.value };
                            setDirectors(next);
                          }}
                        >
                          <option value="">Selecione…</option>
                          {directorNameOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Titulares no gramado ({filledStarters}/11)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Esquema tático</Label>
                      <NativeSelect
                        className="min-h-[44px] min-w-[140px]"
                        value={formation}
                        onChange={(e) => setFormation(e.target.value)}
                      >
                        {PRESS_KIT_FORMATIONS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() =>
                        setStarterPlayerIds(
                          padStarterSlots(
                            athletes
                              .map((a) => a.playerId)
                              .filter((id): id is string => !!id)
                              .slice(0, 11),
                          ),
                        )
                      }
                    >
                      Usar primeiros 11 da convocação
                    </Button>
                  </div>
                </div>

                <div
                  className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl border border-emerald-900/60 bg-gradient-to-b from-emerald-800 to-emerald-950"
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-px bg-white/25" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
                  {formationDef.slots.map((slot, slotIndex) => {
                    const playerId = starterPlayerIds[slotIndex] ?? "";
                    const athlete = playerId
                      ? athletes.find((a) => a.playerId === playerId)
                      : undefined;
                    return (
                      <div
                        key={slot.id}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromSlot = e.dataTransfer.getData("slotIndex");
                          const pid =
                            e.dataTransfer.getData("playerId") || dragPlayerId || "";
                          if (fromSlot !== "" && fromSlot != null) {
                            swapStarterSlots(Number(fromSlot), slotIndex);
                            setDragPlayerId(null);
                            return;
                          }
                          if (pid) placeStarterInSlot(pid, slotIndex);
                          setDragPlayerId(null);
                        }}
                      >
                        {athlete ? (
                          <div
                            draggable
                            onDragStart={(e) => {
                              setDragPlayerId(athlete.playerId!);
                              e.dataTransfer.setData("playerId", athlete.playerId!);
                              e.dataTransfer.setData("slotIndex", String(slotIndex));
                            }}
                            className="flex w-[72px] cursor-grab flex-col items-center gap-0.5 active:cursor-grabbing"
                          >
                            <div className="relative">
                              <AthleteAvatar
                                photoUrl={athlete.photoUrl}
                                name={athlete.nickname || athlete.name}
                                size="sm"
                              />
                              <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C8102E] px-1 text-[10px] font-bold text-white">
                                {athlete.jerseyNumber ?? "—"}
                              </span>
                            </div>
                            <span className="max-w-full truncate text-center text-[10px] font-semibold text-white drop-shadow">
                              {athlete.nickname?.trim() || athlete.name.split(/\s+/)[0]}
                            </span>
                            <button
                              type="button"
                              className="text-[10px] text-white/70 underline"
                              onClick={() => clearStarterSlot(slotIndex)}
                            >
                              Tirar
                            </button>
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-dashed border-white/40 bg-black/20 text-[10px] font-semibold uppercase text-white/70">
                            {slot.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {starterPlayerIds.map((id, index) => {
                    if (!id) return null;
                    const a = athletes.find((x) => x.playerId === id);
                    if (!a) return null;
                    const jerseyValue =
                      a.playerId && a.playerId in jerseyOverrides
                        ? jerseyOverrides[a.playerId] == null
                          ? ""
                          : String(jerseyOverrides[a.playerId])
                        : a.jerseyNumber != null
                          ? String(a.jerseyNumber)
                          : "";
                    return (
                      <div
                        key={`${id}-${index}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                          {formationDef.slots[index]?.label ?? index + 1}
                        </span>
                        <AthleteAvatar photoUrl={a.photoUrl} name={a.nickname || a.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {a.nickname?.trim() || a.name}
                          </p>
                          {a.nickname?.trim() ? (
                            <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                          ) : null}
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Camisa</Label>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            className="min-h-[40px] text-foreground"
                            value={jerseyValue}
                            onChange={(e) => setJerseyForPlayer(a.playerId!, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[40px]"
                          onClick={() => clearStarterSlot(index)}
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
                        draggable
                        onDragStart={(e) => {
                          setDragPlayerId(a.playerId!);
                          e.dataTransfer.setData("playerId", a.playerId!);
                        }}
                        className="flex min-h-[52px] items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm hover:border-[#C8102E]/50 hover:bg-[#C8102E]/5"
                        onClick={() => addStarterToFirstEmpty(a.playerId!)}
                        disabled={filledStarters >= 11}
                      >
                        <AthleteAvatar photoUrl={a.photoUrl} name={a.nickname || a.name} size="sm" />
                        <span className="min-w-0 flex-1 truncate">
                          {a.jerseyNumber != null ? `#${a.jerseyNumber} · ` : ""}
                          {a.nickname?.trim() || a.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">+ titular</span>
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
            <Button
              type="button"
              variant="outline"
              disabled={busy || !reportData}
              onClick={() => void handleExternalReport("opponent", true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Relatório para adversário
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !reportData}
              onClick={() => void handleExternalReport("referees", true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              Relatório para arbitragem
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
        title="Pré-visualização"
        html={previewHtml}
        landscape={previewLandscape}
        onPrint={() => {
          if (previewHtml) printHtmlDocument(previewHtml, "Impressão");
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
