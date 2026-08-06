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

type StaffDirectoryRow = {
  id: string;
  name: string;
  role?: string | null;
  jobRole?: { id: string; name: string } | null;
};

function staffRhCargo(s: StaffDirectoryRow): string {
  const fromJob = s.jobRole?.name?.trim();
  if (fromJob) return fromJob;
  const raw = (s.role ?? "").trim();
  if (!raw) return "";
  // role antigo (slug) ou já nome do cargo RH
  if (raw.includes(" ") || /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(raw)) return raw;
  return getStaffRoleLabel(raw);
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

/** Foto 3×4 sem círculo — evita cortar a cabeça (object-position no topo). */
function AthletePhoto3x4({
  photoUrl,
  name,
  size = "md",
}: {
  photoUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = getPublicImageUrl(photoUrl);
  const dim =
    size === "lg"
      ? "h-[72px] w-[54px]"
      : size === "sm"
        ? "h-12 w-9"
        : "h-14 w-[42px]";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 rounded-md border border-white/30 object-cover object-[center_12%] bg-zinc-800 shadow-md`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-md border border-white/20 bg-zinc-800 text-xs font-bold text-zinc-300`}
    >
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function jerseyInputValue(
  athlete: RelatorioPessoaRow,
  overrides: Record<string, number | null>,
): string {
  if (athlete.playerId && athlete.playerId in overrides) {
    const v = overrides[athlete.playerId];
    return v == null ? "" : String(v);
  }
  return athlete.jerseyNumber != null ? String(athlete.jerseyNumber) : "";
}

function PitchMarkings() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "repeating-linear-gradient(90deg, #15803d 0 11.1%, #16a34a 11.1% 22.2%)",
        }}
      />
      <div className="pointer-events-none absolute inset-[3.5%] rounded-sm border-2 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[3.5%] top-1/2 border-t-2 border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[24%] top-[3.5%] h-[13%] border-2 border-t-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[37%] top-[3.5%] h-[5.5%] border-2 border-t-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[24%] bottom-[3.5%] h-[13%] border-2 border-b-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[37%] bottom-[3.5%] h-[5.5%] border-2 border-b-0 border-white/55" />
    </>
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
  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryRow[]>([]);
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
    if (!tenantId) {
      setStaffDirectory([]);
      return;
    }
    let cancelled = false;
    void api
      .get<StaffDirectoryRow[]>(
        `/technical-staff?tenantId=${encodeURIComponent(tenantId)}`,
      )
      .then(({ data }) => {
        if (cancelled) return;
        setStaffDirectory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStaffDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

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
  const reserves = athletes.filter((a) => a.playerId && !starterSet.has(a.playerId));
  const categoryCoach =
    (reportData?.staff ?? []).find((s) => {
      const raw = (s.role ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
      const label = getStaffRoleLabel(s.role ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      return raw === "tecnico" || (label.includes("tecnico") && !label.includes("auxiliar"));
    }) ?? null;
  const directorPeople = useMemo(() => {
    const byId = new Map<string, StaffDirectoryRow>();
    for (const s of staffDirectory) {
      if (!s.id || !s.name?.trim()) continue;
      byId.set(s.id, s);
    }
    // Inclui convocados do jogo caso ainda não estejam no map (legado)
    for (const s of reportData?.staff ?? []) {
      if (!s.staffId || !s.name?.trim() || byId.has(s.staffId)) continue;
      byId.set(s.staffId, {
        id: s.staffId,
        name: s.name,
        role: s.role,
        jobRole: s.role ? { id: s.staffId, name: getStaffRoleLabel(s.role) } : null,
      });
    }
    return [...byId.values()].sort((a, b) => {
      const ca = staffRhCargo(a).localeCompare(staffRhCargo(b), "pt-BR");
      if (ca !== 0) return ca;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [staffDirectory, reportData?.staff]);

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
                  {directors.map((d, i) => {
                    const selected =
                      directorPeople.find(
                        (s) =>
                          s.name.trim() === d.name.trim() &&
                          (!d.role.trim() || staffRhCargo(s) === d.role.trim()),
                      ) ??
                      directorPeople.find((s) => s.name.trim() === d.name.trim()) ??
                      null;
                    return (
                      <div key={`dir-${i}`} className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nome (comissão / RH)</Label>
                          <NativeSelect
                            className="min-h-[44px]"
                            value={selected?.id ?? ""}
                            onChange={(e) => {
                              const person = directorPeople.find((s) => s.id === e.target.value);
                              const next = [...directors];
                              if (!person) {
                                next[i] = { role: "", name: "" };
                              } else {
                                next[i] = {
                                  name: person.name.trim(),
                                  role: staffRhCargo(person),
                                };
                              }
                              setDirectors(next);
                            }}
                          >
                            <option value="">Selecione…</option>
                            {directorPeople.map((s) => {
                              const cargo = staffRhCargo(s);
                              return (
                                <option key={s.id} value={s.id}>
                                  {cargo ? `${s.name} — ${cargo}` : s.name}
                                </option>
                              );
                            })}
                          </NativeSelect>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Cargo (RH)</Label>
                          <Input
                            className="min-h-[44px] text-foreground"
                            value={d.role}
                            readOnly
                            placeholder="Vem do cargo da pessoa no RH"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Titulares no gramado ({filledStarters}/11)
                    </p>
                    <p className="text-sm text-foreground">
                      Técnico:{" "}
                      <span className="font-semibold text-[#C8102E]">
                        {categoryCoach?.name?.trim() || "Não convocado"}
                      </span>
                      {reportData.travel.categoryLabel ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {reportData.travel.categoryLabel}
                        </span>
                      ) : null}
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
                  className="relative mx-auto aspect-[3/4] w-full max-w-xl overflow-hidden rounded-xl border-[3px] border-[#14532d] shadow-inner"
                  onDragOver={(e) => e.preventDefault()}
                >
                  <PitchMarkings />
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
                            className="flex w-[92px] cursor-grab flex-col items-center gap-0.5 active:cursor-grabbing"
                          >
                            <div className="relative">
                              <AthletePhoto3x4
                                photoUrl={athlete.photoUrl}
                                name={athlete.nickname || athlete.name}
                                size="lg"
                              />
                              <span className="absolute -bottom-1 -left-1 flex h-6 min-w-6 items-center justify-center rounded-md bg-[#C8102E] px-1 text-xs font-extrabold text-white shadow">
                                {athlete.jerseyNumber ?? "—"}
                              </span>
                              <span className="absolute -right-1 -top-1 rounded bg-[#00205B] px-1 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                                {slot.label}
                              </span>
                              <button
                                type="button"
                                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold text-white"
                                onClick={() => clearStarterSlot(slotIndex)}
                                aria-label="Remover do gramado"
                              >
                                ×
                              </button>
                            </div>
                            <span className="max-w-full truncate text-center text-[11px] font-extrabold uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                              {athlete.nickname?.trim() || athlete.name.split(/\s+/)[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-[72px] w-[54px] flex-col items-center justify-center rounded-md border-2 border-dashed border-white/50 bg-black/25 text-[11px] font-bold uppercase text-white/80">
                            {slot.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Relação — titulares</p>
                  {starterPlayerIds
                    .map((id, slotIndex) => ({ id, slotIndex }))
                    .filter((row): row is { id: string; slotIndex: number } => !!row.id)
                    .map((row, ord) => {
                      const a = athletes.find((x) => x.playerId === row.id);
                      if (!a) return null;
                      const slotLabel = formationDef.slots[row.slotIndex]?.label ?? "—";
                      return (
                        <div
                          key={`${row.id}-${row.slotIndex}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <span className="w-6 shrink-0 text-center text-sm font-extrabold text-muted-foreground">
                            {ord + 1}
                          </span>
                          <AthletePhoto3x4
                            photoUrl={a.photoUrl}
                            name={a.nickname || a.name}
                          />
                          <div className="w-20 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Camisa</Label>
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              className="min-h-[40px] text-foreground"
                              value={jerseyInputValue(a, jerseyOverrides)}
                              onChange={(e) => setJerseyForPlayer(a.playerId!, e.target.value)}
                            />
                          </div>
                          <span className="w-14 shrink-0 rounded bg-[#00205B]/25 px-1 py-2 text-center text-xs font-bold uppercase text-[#93c5fd]">
                            {slotLabel}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {a.nickname?.trim() || a.name}
                            </p>
                            {a.nickname?.trim() ? (
                              <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-[40px]"
                            onClick={() => clearStarterSlot(row.slotIndex)}
                          >
                            Remover
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    Reservas ({reserves.length})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {reserves.map((a, ord) => (
                      <div
                        key={a.playerId}
                        draggable
                        onDragStart={(e) => {
                          setDragPlayerId(a.playerId!);
                          e.dataTransfer.setData("playerId", a.playerId!);
                        }}
                        className="flex min-h-[64px] items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
                      >
                        <span className="w-6 shrink-0 text-center text-sm font-extrabold text-muted-foreground">
                          {ord + 1}
                        </span>
                        <AthletePhoto3x4
                          photoUrl={a.photoUrl}
                          name={a.nickname || a.name}
                          size="sm"
                        />
                        <div className="w-[72px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Camisa</Label>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            className="min-h-[40px] text-foreground"
                            value={jerseyInputValue(a, jerseyOverrides)}
                            onChange={(e) => setJerseyForPlayer(a.playerId!, e.target.value)}
                          />
                        </div>
                        <span className="w-14 shrink-0 rounded bg-zinc-800 px-1 py-2 text-center text-[10px] font-bold uppercase text-zinc-300">
                          {a.position?.trim() || "—"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {a.nickname?.trim() || a.name}
                          </p>
                          {a.nickname?.trim() ? (
                            <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-[40px] shrink-0"
                          onClick={() => addStarterToFirstEmpty(a.playerId!)}
                          disabled={filledStarters >= 11}
                        >
                          + titular
                        </Button>
                      </div>
                    ))}
                  </div>
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
