"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { cutoutWhiteBackgroundUrlCached } from "@/lib/photo-edge-white-cutout";
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
import { getFormation, PRESS_KIT_FORMATIONS, pitchChipTranslateY } from "@/lib/press-kit-formations";
import {
  assignStartersByCadastroPosition,
  cadastroPositionAbbrev,
  orderedAthleteIdsForJerseySeed,
  provisionalJerseyValue,
  seedProvisionalJerseyOverrides,
} from "@/lib/press-kit-lineup";
import {
  PageSizeSelect,
  formatTravelLabel,
  useFutebolRelatorioTenants,
  useFutebolRelatorioTravels,
} from "./futebol-relatorio-shared";
import type { MatchReferee } from "@/types/match-referee";

function emptyNamed(roles: readonly string[]): PressKitNamedRole[] {
  return roles.map((role) => ({ role, name: "", refereeId: null, photoUrl: null }));
}

type StaffDirectoryRow = {
  id: string;
  name: string;
  role?: string | null;
  photoUrl?: string | null;
  jobRole?: { id: string; name: string } | null;
};

function isHeadCoachRole(role: string | null | undefined): boolean {
  const raw = (role ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const label = getStaffRoleLabel(role ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return raw === "tecnico" || (label.includes("tecnico") && !label.includes("auxiliar"));
}

function staffDisplayRank(role: string | null | undefined): number {
  if (isHeadCoachRole(role)) return 0;
  const label = getStaffRoleLabel(role ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (label.includes("auxiliar")) return 1;
  return 10;
}

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

/** Primeiro + último nome, sem reticências. */
function firstLastName(full: string | null | undefined): string {
  const cleaned = (full ?? "")
    .replace(/\u2026/g, "")
    .replace(/\.{2,}/g, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.toLocaleUpperCase("pt-BR");
  return `${parts[0]} ${parts[parts.length - 1]}`.toLocaleUpperCase("pt-BR");
}

function formatBirthShortUi(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/** Recorta fundo branco de estúdio nas fotos do elenco (gramado / impressão). */
async function applySquadPhotoCutouts(
  data: GuiaPartidaReportDto,
): Promise<GuiaPartidaReportDto> {
  const squad = await Promise.all(
    (data.squad ?? []).map(async (p) => {
      if (!p.photoUrl) return p;
      const cut = await cutoutWhiteBackgroundUrlCached(p.photoUrl);
      return cut ? { ...p, photoUrl: cut } : p;
    }),
  );
  return { ...data, squad };
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
  /** No gramado: remove fundo branco de estúdio (recorte) */
  onPitch = false,
}: {
  photoUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  onPitch?: boolean;
}) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(() =>
    onPitch ? null : getPublicImageUrl(photoUrl) || null,
  );
  const [ready, setReady] = useState(!onPitch);

  useEffect(() => {
    if (!onPitch) {
      setDisplaySrc(getPublicImageUrl(photoUrl) || null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void cutoutWhiteBackgroundUrlCached(photoUrl).then((url) => {
      if (cancelled) return;
      setDisplaySrc(url);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, onPitch]);

  const dim =
    size === "xl"
      ? "h-[96px] w-[72px]"
      : size === "lg"
        ? "h-[80px] w-[60px]"
        : size === "sm"
          ? "h-12 w-9"
          : "h-14 w-[42px]";

  if (!ready && onPitch) {
    return (
      <div
        className={`${dim} shrink-0 animate-pulse rounded-sm bg-black/30`}
        aria-hidden
      />
    );
  }

  if (displaySrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displaySrc}
        alt=""
        className={`${dim} shrink-0 bg-transparent object-cover object-[center_12%] ${onPitch ? "rounded-sm shadow-none" : "rounded-sm shadow-md"}`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-sm bg-black/50 text-xs font-bold text-white`}
    >
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
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
      {/* Linhas do campo — sem retângulo interno (não faz parte do gramado) */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[22%] top-0 h-[14%] border-2 border-t-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[36%] top-0 h-[6%] border-2 border-t-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[22%] bottom-0 h-[14%] border-2 border-b-0 border-white/55" />
      <div className="pointer-events-none absolute inset-x-[36%] bottom-0 h-[6%] border-2 border-b-0 border-white/55" />
    </>
  );
}

export function FutebolRelatorioPressKitForm() {
  const router = useRouter();
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
  const [refereeDirectory, setRefereeDirectory] = useState<MatchReferee[]>([]);
  const [refereeSearch, setRefereeSearch] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
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
    let cancelled = false;
    void api
      .get<MatchReferee[]>("/match-referees?activeOnly=1")
      .then(({ data }) => {
        if (cancelled) return;
        setRefereeDirectory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRefereeDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        const starters = padStarterSlots(data.config.starterPlayerIds);
        const seeded = seedProvisionalJerseyOverrides(
          orderedAthleteIdsForJerseySeed(starters, data.athletes),
          data.athletes,
          data.config.jerseyOverrides ?? {},
        );
        setStarterPlayerIds(starters);
        setFormation(data.config.formation?.trim() || "4-3-3");
        setJerseyOverrides(seeded);
        setSavedSnapshot(
          JSON.stringify({
            phase: data.config.phase ?? "",
            matchTime: data.config.matchTime ?? "",
            contactLine: data.config.contactLine ?? "",
            referees: data.config.referees.length
              ? data.config.referees
              : emptyNamed(DEFAULT_PRESS_KIT_REFEREE_ROLES),
            directors: data.config.directors.length
              ? data.config.directors
              : emptyNamed(DEFAULT_PRESS_KIT_DIRECTOR_ROLES),
            starterPlayerIds: starters,
            formation: data.config.formation?.trim() || "4-3-3",
            jerseyOverrides: seeded,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setReportData(null);
          setSavedSnapshot("");
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

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        phase,
        matchTime,
        contactLine,
        referees,
        directors,
        starterPlayerIds: padStarterSlots(starterPlayerIds),
        formation,
        jerseyOverrides,
      }),
    [
      phase,
      matchTime,
      contactLine,
      referees,
      directors,
      starterPlayerIds,
      formation,
      jerseyOverrides,
    ],
  );
  const isDirty = Boolean(savedSnapshot) && currentSnapshot !== savedSnapshot;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const requestLeave = (action: () => void) => {
    if (!isDirty) {
      action();
      return;
    }
    pendingLeaveRef.current = action;
    setLeaveOpen(true);
  };

  const buildLocalReport = (base: PressKitReportDto): PressKitReportDto => {
    const cfg = configPayload();
    const seeded = seedProvisionalJerseyOverrides(
      orderedAthleteIdsForJerseySeed(cfg.starterPlayerIds, base.athletes),
      base.athletes,
      cfg.jerseyOverrides,
    );
    const athletes = applyJerseyOverridesLocal(base.athletes, seeded);
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
    return {
      ...base,
      athletes,
      config: { ...cfg, jerseyOverrides: seeded },
      starters,
      substitutes,
    };
  };

  const handleSave = async (opts?: { silent?: boolean }): Promise<boolean> => {
    if (!travelId || !reportData) return false;
    setSaving(true);
    try {
      const payload = configPayload();
      const seeded = seedProvisionalJerseyOverrides(
        orderedAthleteIdsForJerseySeed(payload.starterPlayerIds, reportData.athletes),
        reportData.athletes,
        payload.jerseyOverrides,
      );
      const { data } = await api.put<PressKitReportDto>(
        `/futebol-relatorios/press-kit?travelId=${encodeURIComponent(travelId)}`,
        { ...payload, jerseyOverrides: seeded },
      );
      const starters = padStarterSlots(data.config.starterPlayerIds);
      const nextJerseys = seedProvisionalJerseyOverrides(
        orderedAthleteIdsForJerseySeed(starters, data.athletes),
        data.athletes,
        data.config.jerseyOverrides ?? {},
      );
      setReportData(data);
      setPhase(data.config.phase ?? "");
      setMatchTime(data.config.matchTime ?? "");
      setContactLine(data.config.contactLine ?? "");
      setReferees(data.config.referees);
      setDirectors(data.config.directors);
      setStarterPlayerIds(starters);
      setFormation(data.config.formation?.trim() || "4-3-3");
      setJerseyOverrides(nextJerseys);
      setSavedSnapshot(
        JSON.stringify({
          phase: data.config.phase ?? "",
          matchTime: data.config.matchTime ?? "",
          contactLine: data.config.contactLine ?? "",
          referees: data.config.referees,
          directors: data.config.directors,
          starterPlayerIds: starters,
          formation: data.config.formation?.trim() || "4-3-3",
          jerseyOverrides: nextJerseys,
        }),
      );
      if (!opts?.silent) {
        setFeedback({
          open: true,
          title: "Salvo",
          message: "Press kit salvo neste planejamento.",
          variant: "success",
        });
      }
      return true;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível salvar o press kit.",
        variant: "error",
      });
      return false;
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
      const ok = await handleSave({ silent: true });
      if (!ok) return;
      const { data } = await api.get<GuiaPartidaReportDto>(
        `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
      );
      const withCutouts = await applySquadPhotoCutouts(data);
      setPreviewHtml(buildGuiaPartidaPrintHtml(withCutouts, pageSize));
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
      const ok = await handleSave({ silent: true });
      if (!ok) return;
      const { data } = await api.get<GuiaPartidaReportDto>(
        `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
      );
      const withCutouts = await applySquadPhotoCutouts(data);
      printGuiaPartidaReport(withCutouts, pageSize);
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

  const escalateByCadastroPosition = () => {
    void (async () => {
      let preferred: string[] = [];
      if (travelId) {
        try {
          const { data } = await api.get<GuiaPartidaReportDto>(
            `/futebol-relatorios/guia-partida?travelId=${encodeURIComponent(travelId)}`,
          );
          preferred = (data.lastLineups[0]?.starters ?? [])
            .map((s) => s.playerId)
            .filter((id): id is string => !!id);
        } catch {
          /* sem dados FMF — só cadastro */
        }
      }
      const assigned = padStarterSlots(
        assignStartersByCadastroPosition(athletes, formation, preferred),
      );
      setStarterPlayerIds(assigned);
      setJerseyOverrides((prev) =>
        seedProvisionalJerseyOverrides(
          orderedAthleteIdsForJerseySeed(assigned, athletes),
          athletes,
          prev,
        ),
      );
    })();
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
    (reportData?.staff ?? []).find((s) => isHeadCoachRole(s.role)) ?? null;
  const commissionStaff = useMemo(() => {
    return [...(reportData?.staff ?? [])].sort((a, b) => {
      const d = staffDisplayRank(a.role) - staffDisplayRank(b.role);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [reportData?.staff]);
  const directorPeople = useMemo(() => {
    const byId = new Map<string, StaffDirectoryRow>();
    for (const s of staffDirectory) {
      if (!s.id || !s.name?.trim()) continue;
      byId.set(s.id, s);
    }
    for (const s of reportData?.staff ?? []) {
      if (!s.staffId || !s.name?.trim() || byId.has(s.staffId)) continue;
      byId.set(s.staffId, {
        id: s.staffId,
        name: s.name,
        role: s.role,
        photoUrl: s.photoUrl,
        jobRole: s.role ? { id: s.staffId, name: getStaffRoleLabel(s.role) } : null,
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
                  requestLeave(() => {
                    setTenantId(v === "none" ? "" : v);
                    setTravelId("");
                    setSavedSnapshot("");
                  });
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
                onValueChange={(v) => {
                  requestLeave(() => setTravelId(v === "none" ? "" : v));
                }}
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
                  <Input
                    className="min-h-[44px] text-foreground"
                    placeholder="Buscar árbitro cadastrado…"
                    value={refereeSearch}
                    onChange={(e) => setRefereeSearch(e.target.value)}
                  />
                  {referees.map((r, i) => {
                    const q = refereeSearch.trim().toLocaleLowerCase("pt-BR");
                    const options = refereeDirectory.filter((ref) => {
                      if (!q) return true;
                      return (
                        ref.name.toLocaleLowerCase("pt-BR").includes(q) ||
                        (ref.federation ?? "").toLocaleLowerCase("pt-BR").includes(q) ||
                        (ref.licenseNumber ?? "").toLocaleLowerCase("pt-BR").includes(q)
                      );
                    });
                    const selected =
                      refereeDirectory.find((ref) => ref.id === r.refereeId) ??
                      refereeDirectory.find(
                        (ref) =>
                          ref.name.trim().toLocaleUpperCase("pt-BR") ===
                          r.name.trim().toLocaleUpperCase("pt-BR"),
                      ) ??
                      null;
                    const photoSrc = getPublicImageUrl(selected?.photoUrl ?? r.photoUrl);
                    return (
                      <div key={`ref-${i}`} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{r.role}</Label>
                        <div className="flex items-center gap-2">
                          {photoSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoSrc}
                              alt=""
                              className="h-12 w-9 shrink-0 rounded object-cover object-[center_12%]"
                            />
                          ) : (
                            <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold">
                              {(selected?.name || r.name || "?").slice(0, 1)}
                            </div>
                          )}
                          <NativeSelect
                            className="min-h-[44px] flex-1"
                            value={selected?.id ?? ""}
                            onChange={(e) => {
                              const person = refereeDirectory.find(
                                (ref) => ref.id === e.target.value,
                              );
                              const next = [...referees];
                              if (!person) {
                                next[i] = {
                                  role: r.role,
                                  name: "",
                                  refereeId: null,
                                  photoUrl: null,
                                };
                              } else {
                                next[i] = {
                                  role: r.role,
                                  name: person.name,
                                  refereeId: person.id,
                                  photoUrl: person.photoUrl,
                                };
                              }
                              setReferees(next);
                            }}
                          >
                            <option value="">Selecione o árbitro…</option>
                            {options.map((ref) => (
                              <option key={ref.id} value={ref.id}>
                                {ref.name}
                                {ref.federation ? ` · ${ref.federation}` : ""}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      </div>
                    );
                  })}
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
                          <Label className="text-xs text-muted-foreground">Nome</Label>
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
                            {directorPeople.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Cargo</Label>
                          <Input
                            className="min-h-[44px] text-foreground"
                            value={d.role}
                            readOnly
                            placeholder="Cargo da pessoa"
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
                      onClick={escalateByCadastroPosition}
                    >
                      Escalar por posição do cadastro
                    </Button>
                  </div>
                </div>

                <div className="flex w-full justify-center overflow-x-auto">
                  <div className="flex w-max max-w-none flex-col items-stretch gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                  <aside className="order-2 w-full shrink-0 rounded-xl border border-border bg-card/50 p-3 sm:order-1 sm:w-[168px]">
                    <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-[#93c5fd]">
                      Comissão
                    </p>
                    {commissionStaff.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum convocado</p>
                    ) : (
                      <ul className="space-y-2.5">
                        {commissionStaff.map((s) => (
                          <li
                            key={s.staffId ?? `${s.num}-${s.name}`}
                            className="flex items-start gap-2"
                          >
                            <AthletePhoto3x4
                              photoUrl={s.photoUrl}
                              name={s.name}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold uppercase leading-snug break-words">
                                {firstLastName(s.name)}
                              </p>
                              <p className="text-[10px] leading-snug text-muted-foreground break-words">
                                {s.role ? getStaffRoleLabel(s.role) : "Comissão"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </aside>
                  <div
                    className="relative order-1 aspect-[78/100] h-[min(78vh,835px)] w-auto shrink-0 overflow-hidden rounded-xl border-[3px] border-[#14532d] shadow-inner sm:order-2 sm:h-[min(80vh,850px)]"
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <PitchMarkings />
                    <div className="pointer-events-none absolute inset-y-0 left-[7%] right-[7%] z-10">
                    {formationDef.slots.map((slot, slotIndex) => {
                      const playerId = starterPlayerIds[slotIndex] ?? "";
                      const athlete = playerId
                        ? athletes.find((a) => a.playerId === playerId)
                        : undefined;
                      const nickOnly = athlete
                        ? (
                            athlete.nickname?.trim() ||
                            firstLastName(athlete.name)
                          ).toLocaleUpperCase("pt-BR")
                        : "";
                      const pos = athlete ? cadastroPositionAbbrev(athlete.position) : "";
                      const birth = athlete ? formatBirthShortUi(athlete.birthDate) : "";
                      const ty = pitchChipTranslateY(slot.top);
                      return (
                        <div
                          key={slot.id}
                          className="pointer-events-auto absolute z-10"
                          style={{
                            top: `${slot.top}%`,
                            left: `${slot.left}%`,
                            transform: `translate(-50%, ${ty})`,
                          }}
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
                              className="group flex w-[86px] cursor-grab flex-col items-center gap-0 active:cursor-grabbing sm:w-[92px]"
                            >
                              <div className="relative">
                                <AthletePhoto3x4
                                  photoUrl={athlete.photoUrl}
                                  name={athlete.nickname || athlete.name}
                                  size="lg"
                                  onPitch
                                />
                                <span className="absolute -bottom-1 -left-1 flex h-6 min-w-6 items-center justify-center rounded-md bg-[#C8102E] px-1 text-xs font-extrabold text-white shadow">
                                  {provisionalJerseyValue(
                                    athlete,
                                    jerseyOverrides,
                                    slotIndex + 1,
                                  ) || "—"}
                                </span>
                                <button
                                  type="button"
                                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                  onClick={() => clearStarterSlot(slotIndex)}
                                  aria-label="Remover do gramado"
                                  title="Remover do gramado"
                                >
                                  ×
                                </button>
                              </div>
                              <span className="w-full text-center text-[11px] font-extrabold uppercase leading-tight text-amber-200 [text-shadow:0_0_3px_#000,0_1px_2px_rgba(0,0,0,0.95)]">
                                {nickOnly}
                              </span>
                              {pos ? (
                                <span className="w-full text-center text-[10px] font-bold uppercase leading-tight text-white [text-shadow:0_0_3px_#000,0_1px_2px_rgba(0,0,0,0.95)]">
                                  {pos}
                                </span>
                              ) : null}
                              {birth ? (
                                <span className="w-full text-center text-[10px] font-semibold leading-tight text-white [text-shadow:0_0_3px_#000,0_1px_2px_rgba(0,0,0,0.95)]">
                                  {birth}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex h-[96px] w-[72px] flex-col items-center justify-center rounded-md border-2 border-dashed border-white/50 bg-black/25 text-[11px] font-bold uppercase text-white/80">
                              {slot.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Relação — titulares</p>
                  {starterPlayerIds
                    .map((id, slotIndex) => ({ id, slotIndex }))
                    .filter((row): row is { id: string; slotIndex: number } => !!row.id)
                    .map((row, ord) => {
                      const a = athletes.find((x) => x.playerId === row.id);
                      if (!a) return null;
                      const num = ord + 1;
                      return (
                        <div
                          key={`${row.id}-${row.slotIndex}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <span className="w-6 shrink-0 text-center text-sm font-extrabold text-muted-foreground">
                            {num}
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
                              value={provisionalJerseyValue(a, jerseyOverrides, num)}
                              onChange={(e) => setJerseyForPlayer(a.playerId!, e.target.value)}
                            />
                          </div>
                          <span className="w-14 shrink-0 rounded bg-[#00205B]/25 px-1 py-2 text-center text-xs font-bold uppercase text-[#93c5fd]">
                            {cadastroPositionAbbrev(a.position)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium uppercase leading-snug break-words">
                              {firstLastName(a.name)}
                            </p>
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

                <div className="space-y-2 rounded-xl border border-orange-500/40 bg-orange-950/30 p-3">
                  <p className="text-sm font-semibold text-orange-200">
                    Reservas · banco ({reserves.length})
                  </p>
                  {reserves.map((a, ord) => {
                    const num = filledStarters + ord + 1;
                    return (
                      <div
                        key={a.playerId}
                        draggable
                        onDragStart={(e) => {
                          setDragPlayerId(a.playerId!);
                          e.dataTransfer.setData("playerId", a.playerId!);
                        }}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-950/40 px-3 py-2"
                      >
                        <span className="w-6 shrink-0 text-center text-sm font-extrabold text-muted-foreground">
                          {num}
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
                            value={provisionalJerseyValue(a, jerseyOverrides, num)}
                            onChange={(e) => setJerseyForPlayer(a.playerId!, e.target.value)}
                          />
                        </div>
                        <span className="w-14 shrink-0 rounded bg-[#00205B]/25 px-1 py-2 text-center text-xs font-bold uppercase text-[#93c5fd]">
                          {cadastroPositionAbbrev(a.position)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium uppercase leading-snug break-words">
                            {firstLastName(a.name)}
                          </p>
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
                    );
                  })}
                </div>
              </div>

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
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  requestLeave(() =>
                    router.push(`/dashboard/futebol/logistica/${travelId}/edit`),
                  )
                }
              >
                {isHomeMatch ? "Editar planejamento" : "Editar viagem"}
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

      <AlertDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          setLeaveOpen(open);
          if (!open) pendingLeaveRef.current = null;
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você alterou o press kit e ainda não salvou. Deseja salvar antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                pendingLeaveRef.current = null;
              }}
            >
              Continuar editando
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const action = pendingLeaveRef.current;
                pendingLeaveRef.current = null;
                setLeaveOpen(false);
                action?.();
              }}
            >
              Sair sem salvar
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  const ok = await handleSave();
                  if (!ok) return;
                  const action = pendingLeaveRef.current;
                  pendingLeaveRef.current = null;
                  setLeaveOpen(false);
                  action?.();
                })();
              }}
            >
              Salvar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
