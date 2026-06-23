"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Plus,
  Trash2,
  Loader2,
  Youtube,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Shirt,
} from "lucide-react";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { PLAYER_TABS } from "@/lib/dashboard-menu.config";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { PlayerRegistrationSections } from "@/components/dashboard/players/PlayerRegistrationSections";
import {
  FIELD_POSITION_DEFAULTS,
  type FootballPositionCode,
} from "@/lib/football-positions";
import { RhEmployeeLinkCard } from "@/components/dashboard/rh/RhEmployeeLinkCard";
import { RegistrationInviteCard } from "@/components/dashboard/RegistrationInviteCard";
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
} from "@/lib/player-match-availability";
import {
  PlayerMatchAvailabilityBall,
  PlayerMatchAvailabilityHeader,
} from "@/components/dashboard/players/PlayerMatchAvailabilityBadge";
import {
  getRegistrationIdentifiersError,
  parseRegistrationProfile,
  seedCategoryHistoryIfEmpty,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";

const STATUS_OPTIONS = [
  { value: "available", label: "Apto" },
  { value: "injured", label: "Lesionado" },
  { value: "suspended", label: "Suspenso" },
  { value: "absent", label: "Ausente" },
  { value: "on_bench", label: "No banco" },
  { value: "not_in_squad", label: "Fora do elenco" },
];

interface PlayerData {
  id: string;
  tenantId: string;
  tenant?: { id: string; name: string };
  category?: string | null;
  name: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  nationality?: string | null;
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  bodyFatPercent?: number | null;
  leanMassKg?: number | null;
  preferredFoot?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  fieldPositionX?: number | null;
  fieldPositionY?: number | null;
  currentTeam?: string | null;
  previousTeams?: string[] | null;
  seasonHistory?: unknown;
  socialMedia?: unknown;
  matchesPlayed?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  marketValue?: number | null;
  highlights?: string[] | null;
  bioPT?: string | null;
  bioEN?: string | null;
  externalId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactEmail?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: unknown;
  psychologicalAssessment?: unknown[] | null;
  onlineConsultations?: unknown[] | null;
  evaluations?: unknown[] | null;
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  heatMapData?: unknown;
  performanceAnalysis?: string | null;
  images?: unknown[] | null;
  publicFields?: Record<string, boolean> | null;
  registrationProfile?: PlayerRegistrationProfile | null;
}

interface EvaluationEntry {
  date?: string;
  evaluator?: string;
  rating?: number;
  notes?: string;
}

interface ImageEntry {
  type?: string;
  url?: string;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function isFieldPublic(
  publicFields: Record<string, boolean> | null | undefined,
  key: string
): boolean {
  if (!publicFields || typeof publicFields[key] !== "boolean")
    return true; // default: público
  return publicFields[key];
}

/** Busca todos os vídeos de uma playlist do YouTube e chama onImport com as URLs. */
function PlaylistImporter({ onImport }: { onImport: (urls: string[]) => void }) {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    const url = playlistUrl.trim();
    if (!url) {
      setError("Cole a URL da playlist do YouTube.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/youtube/playlist?${new URLSearchParams({ url }).toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Erro ao buscar playlist.");
        return;
      }
      const videos = (data.videos ?? []) as Array<{ url: string }>;
      const urls = videos.map((v) => v.url).filter(Boolean);
      if (urls.length === 0) {
        setError("Nenhum vídeo encontrado na playlist.");
        return;
      }
      onImport(urls);
      setPlaylistUrl("");
      setError(null);
    } catch {
      setError("Falha na requisição. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/20 p-2">
      <Input
        className="h-8 flex-1 min-w-[160px] text-xs"
        placeholder="URL da playlist do YouTube"
        value={playlistUrl}
        onChange={(e) => setPlaylistUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleFetch()}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 text-xs"
        onClick={handleFetch}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Youtube className="h-3 w-3 mr-1" />
        )}
        {loading ? "Buscando…" : "Buscar e adicionar todos"}
      </Button>
      {error && (
        <span className="text-xs text-destructive w-full">{error}</span>
      )}
    </div>
  );
}

export default function EditJogadorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { canAccessModule, user } = useAuth();
  const responsibleUserName = user?.name?.trim() || user?.email || "Sistema";
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => searchParams.get("tab") || "dados");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const normalized = tab === "gerencial" ? "psicologica" : tab;
    if (PLAYER_TABS.some((t) => t.id === normalized)) setActiveTab(normalized);
  }, [searchParams]);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [tenantCategories, setTenantCategories] = useState<string[]>([]);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhotoFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhotoFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhotoFile]);
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<PlayerData>(`/players/${id}`);
        setPlayer(
          data
            ? { ...data, registrationProfile: parseRegistrationProfile(data.registrationProfile) }
            : null,
        );
        if (data?.tenantId) {
          const { data: tenant } = await api.get<{ categories?: string[] | null }>(`/tenants/${data.tenantId}`);
          setTenantCategories(Array.isArray(tenant?.categories) ? tenant.categories : []);
        } else {
          setTenantCategories([]);
        }
      } catch {
        setError("Erro ao carregar atleta");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  const categoriesForDropdown = (() => {
    const fromTenant = tenantCategories.length
      ? FIXTURE_CATEGORIES.filter((c) => tenantCategories.includes(c.value))
      : [];
    if (player?.category && !fromTenant.some((c) => c.value === player.category)) {
      const fallback = FIXTURE_CATEGORIES.find((c) => c.value === player!.category);
      if (fallback) return [fallback, ...fromTenant];
    }
    return fromTenant;
  })();

  const update = (updates: Partial<PlayerData>) => {
    setPlayer((p) => (p ? { ...p, ...updates } : null));
  };

  const handleSave = async () => {
    if (!player) return;
    if (pendingPhotoFile && !player.name?.trim()) {
      setError("Preencha o nome completo antes de salvar a foto.");
      return;
    }
    const profile = seedCategoryHistoryIfEmpty(
      parseRegistrationProfile(player.registrationProfile),
      player.category,
      responsibleUserName,
    );
    const registrationError = getRegistrationIdentifiersError(profile);
    if (registrationError) {
      setError(registrationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let photoUrl = player.photoUrl ?? undefined;
      if (pendingPhotoFile && player.name?.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "jogadores");
        formData.append("displayName", getPhotoDisplayName(player.name, player.category || PHOTO_DEPARTMENT_BY_SIZE_KEY.jogadores));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; key?: string; message?: string; error?: string };
        if (!res.ok) {
          const errMsg = data?.message ?? data?.error ?? "Erro ao enviar foto.";
          setError(typeof errMsg === "string" ? errMsg : "Erro ao enviar foto.");
          setLoading(false);
          return;
        }
        if (data?.url) {
          photoUrl = data.url;
          setPendingPhotoFile(null);
          update({ photoUrl });
        }
      }
      await api.patch(`/players/${id}`, {
        category: player.category || undefined,
        name: player.name,
        photoUrl: photoUrl || undefined,
        birthDate: player.birthDate || undefined,
        nationality: player.nationality || undefined,
        contactEmail: player.contactEmail || undefined,
        contactPhone: player.contactPhone || undefined,
        emergencyContactName: (player.emergencyContactName ?? "").trim() || null,
        emergencyContactEmail: (player.emergencyContactEmail ?? "").trim() || null,
        emergencyContactPhone: (player.emergencyContactPhone ?? "").trim() || null,
        height: player.height ?? undefined,
        weight: player.weight ?? undefined,
        bmi: player.bmi ?? undefined,
        bodyFatPercent: player.bodyFatPercent ?? undefined,
        leanMassKg: player.leanMassKg ?? undefined,
        preferredFoot: player.preferredFoot || undefined,
        jerseyNumber: player.jerseyNumber ?? undefined,
        position: player.position || undefined,
        fieldPositionX: player.fieldPositionX ?? undefined,
        fieldPositionY: player.fieldPositionY ?? undefined,
        currentTeam: player.currentTeam || undefined,
        previousTeams: player.previousTeams ?? undefined,
        seasonHistory: player.seasonHistory ?? undefined,
        socialMedia: player.socialMedia ?? undefined,
        matchesPlayed: player.matchesPlayed ?? undefined,
        goals: player.goals ?? undefined,
        assists: player.assists ?? undefined,
        yellowCards: player.yellowCards ?? undefined,
        redCards: player.redCards ?? undefined,
        marketValue: player.marketValue ?? undefined,
        highlights: player.highlights ?? undefined,
        bioPT: player.bioPT || undefined,
        bioEN: player.bioEN || undefined,
        externalId: player.externalId || undefined,
        medicalHistory: player.medicalHistory ?? undefined,
        psychologicalAssessment: player.psychologicalAssessment ?? undefined,
        onlineConsultations: player.onlineConsultations ?? undefined,
        evaluations: player.evaluations ?? undefined,
        status: player.status || undefined,
        statusDetails: player.statusDetails || undefined,
        statusUntil: player.statusUntil || undefined,
        heatMapData: player.heatMapData ?? undefined,
        performanceAnalysis: player.performanceAnalysis || undefined,
        images: player.images ?? undefined,
        publicFields: player.publicFields ?? undefined,
        registrationProfile: profile,
      });
      router.push("/dashboard/cadastros/jogadores?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setLoading(false);
    }
  };

  if (loadingData || !player) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          {loadingData ? "Carregando..." : "Jogador não encontrado."}
        </div>
      </div>
    );
  }

  const imagesList = (player.images ?? []) as ImageEntry[];

  const matchAvailability = getPlayerMatchAvailability(buildPlayerMatchAvailabilityInput(player));

  const playerPhotoLeading = (
    <div className="relative shrink-0">
      <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-violet-500/35 bg-muted sm:h-32 sm:w-32">
        {(pendingPreviewUrl || player.photoUrl) ? (
          <img
            src={pendingPreviewUrl ?? getPublicImageUrl(player.photoUrl!)}
            alt={player.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <User className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        )}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1">
        <PlayerMatchAvailabilityBall availability={matchAvailability} size="sm" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <DashboardDeptHeader
        section="Depto Futebol"
        sectionIcon={Shirt}
        title={`${player.jerseyNumber ? `${player.jerseyNumber} - ` : ""}${player.name}`}
        description={[player.tenant?.name, player.category].filter(Boolean).join(" • ")}
        backHref="/dashboard/cadastros/jogadores"
        leading={playerPhotoLeading}
        titleClassName="uppercase"
        compact
        className="sticky top-0 z-40 !p-3.5 sm:!p-4 border border-violet-500/25 !bg-background bg-none shadow-[0_12px_32px_-12px_rgba(0,0,0,0.85)]"
        footerAside={
          <Button onClick={handleSave} disabled={loading} className="min-h-[44px] min-w-[120px] shrink-0">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        }
      />

      <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 sm:px-4">
        <PlayerMatchAvailabilityHeader availability={matchAvailability} />
      </div>

      <div className="relative z-0 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/25 via-zinc-950/40 to-background p-2 sm:p-3">
        <BostonTvDashboardTabs
          tabs={PLAYER_TABS.filter((tab) => !tab.moduleSlug || canAccessModule(tab.moduleSlug))}
          active={activeTab}
          onChange={setActiveTab}
          ariaLabel="Seções do atleta"
          wrap
          uppercase
          dense
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tab: Dados base */}
      {activeTab === "dados" && (
        <Card className="rounded-2xl border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cadastro do atleta</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "teamPage") ? "Visível na página do time" : "Oculto da página do time"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.teamPage = !isFieldPublic(player.publicFields, "teamPage");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "teamPage") ? (
                  <Eye className="h-4 w-4 text-amber-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerRegistrationSections
              playerId={player.id}
              name={player.name}
              category={player.category}
              photoUrl={player.photoUrl}
              birthDate={player.birthDate}
              nationality={player.nationality}
              contactEmail={player.contactEmail}
              contactPhone={player.contactPhone}
              emergencyContactName={player.emergencyContactName}
              emergencyContactEmail={player.emergencyContactEmail}
              emergencyContactPhone={player.emergencyContactPhone}
              height={player.height}
              weight={player.weight}
              preferredFoot={player.preferredFoot}
              jerseyNumber={player.jerseyNumber}
              position={player.position}
              status={player.status}
              profile={parseRegistrationProfile(player.registrationProfile)}
              categoriesForDropdown={categoriesForDropdown}
              pendingPhotoFile={pendingPhotoFile}
              onNameChange={(v) => update({ name: v })}
              onCategoryChange={(v) => update({ category: v })}
              responsibleUserName={responsibleUserName}
              onPhotoUrlChange={(v) => update({ photoUrl: v })}
              onPendingPhotoFile={setPendingPhotoFile}
              onPlayerField={(field, value) => {
                if (field === "position" && typeof value === "string" && value) {
                  const code = value as FootballPositionCode;
                  const def = FIELD_POSITION_DEFAULTS[code];
                  if (def) {
                    update({
                      position: code,
                      fieldPositionX: def.x,
                      fieldPositionY: def.y,
                    });
                    return;
                  }
                }
                update({ [field]: value } as Partial<PlayerData>);
              }}
              onProfileChange={(next) => update({ registrationProfile: next })}
              canAccessLogistica={canAccessModule("futebol_logistica")}
              canAccessJuridico={canAccessModule("juridico")}
              canAccessRh={canAccessModule("adm_rh")}
              tenantName={player.tenant?.name}
            />
          </CardContent>
        </Card>
      )}

      {/* Tab: Avaliação psicológica — relatório sintético para gerência/diretoria (somente leitura) */}
      {activeTab === "psicologica" && (() => {
        const psychList = (player.psychologicalAssessment ?? []) as Array<{ date?: string; evaluator?: string; observacoes?: string; [k: string]: unknown }>;
        const consultationList = (player.onlineConsultations ?? []) as Array<{ date?: string; time?: string; status?: string; psychologist?: string; notes?: string }>;
        const completedConsultations = consultationList.filter((c) => c.status === "completed");
        const scheduledConsultations = consultationList.filter((c) => c.status === "scheduled");

        // Nível de atenção: baseado em consultas realizadas, avaliações e pendentes
        const totalCompleted = completedConsultations.length;
        const totalScheduled = scheduledConsultations.length;
        const hasAssessments = psychList.length > 0;
        let nivelAtencao: "baixo" | "moderado" | "alto" = "baixo";
        if (totalScheduled > 0 || totalCompleted >= 3 || (totalCompleted > 0 && !hasAssessments))
          nivelAtencao = "moderado";
        if (totalScheduled >= 2 || totalCompleted >= 5) nivelAtencao = "alto";

        // Tipo de perfil: síntese do acompanhamento
        let tipoPerfil = "Sem acompanhamento registrado";
        if (psychList.length > 0 && consultationList.length > 0)
          tipoPerfil = "Em acompanhamento regular";
        else if (psychList.length > 0)
          tipoPerfil = "Avaliação realizada — aguardando consultas";
        else if (consultationList.length > 0)
          tipoPerfil = "Consultas em andamento — avaliação pendente";

        // Consultas por mês (para gráfico)
        const byMonth: Record<string, number> = {};
        consultationList.forEach((c) => {
          if (c.date) {
            const month = c.date.slice(0, 7);
            byMonth[month] = (byMonth[month] ?? 0) + 1;
          }
        });
        const sortedMonths = Object.keys(byMonth).sort();
        const maxCount = Math.max(...Object.values(byMonth), 1);

        return (
          <Card>
            <CardHeader>
              <CardTitle>Avaliação psicológica</CardTitle>
              <CardDescription>
                Relatório sintético sobre a saúde psicológica do atleta — para gerência e diretoria. Somente visualização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo: Nível de atenção + Tipo de perfil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Nível de atenção</p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                      nivelAtencao === "baixo" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                      nivelAtencao === "moderado" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                      nivelAtencao === "alto" && "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {nivelAtencao === "baixo" && "Baixo — acompanhamento regular"}
                    {nivelAtencao === "moderado" && "Moderado — requer acompanhamento"}
                    {nivelAtencao === "alto" && "Alto — atenção prioritária"}
                  </span>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de perfil</p>
                  <p className="text-foreground font-medium">{tipoPerfil}</p>
                </div>
              </div>

              {/* Gráfico: Consultas por mês */}
              {sortedMonths.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-foreground mb-4">Consultas por mês</p>
                  <div className="flex items-end gap-2 h-24" aria-label="Gráfico de consultas por mês">
                    {sortedMonths.map((month) => {
                      const count = byMonth[month] ?? 0;
                      const pct = (count / maxCount) * 100;
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div
                            className="w-full rounded-t bg-primary/60 min-h-[8px] transition-all"
                            style={{ height: `${Math.max(pct, 12)}%` }}
                            title={`${month}: ${count} consulta(s)`}
                          />
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                            {month.slice(5)}/{month.slice(2, 4)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Consultas realizadas e agendadas */}
              <div className="rounded-lg border p-4 space-y-4">
                <p className="text-sm font-medium text-foreground">Consultas</p>
                {consultationList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma consulta registrada.</p>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto">
                    {consultationList.map((c, idx) => {
                      const dateStr = c.date ? `${c.date.slice(8, 10)}/${c.date.slice(5, 7)}/${c.date.slice(0, 4)}` : "—";
                      const timeStr = c.time ?? "";
                      const statusLabel =
                        c.status === "completed" ? "Realizada" : c.status === "cancelled" ? "Cancelada" : "Agendada";
                      return (
                        <div key={idx} className="rounded border p-3 bg-muted/20">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">{dateStr}</span>
                            {timeStr && <span className="text-muted-foreground">{timeStr}</span>}
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-xs",
                                c.status === "completed" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                c.status === "cancelled" && "bg-destructive/20 text-destructive",
                                c.status === "scheduled" && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {statusLabel}
                            </span>
                            {c.psychologist && (
                              <span className="text-muted-foreground">• {c.psychologist}</span>
                            )}
                          </div>
                          {c.notes && (
                            <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{c.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Impressões do psicólogo (das avaliações) */}
              <div className="rounded-lg border p-4 space-y-4">
                <p className="text-sm font-medium text-foreground">Impressões das avaliações</p>
                {psychList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {psychList.map((entry, idx) => (
                      <div key={idx} className="rounded border p-3 bg-muted/20">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-1">
                          {entry.date && <span>{entry.date}</span>}
                          {entry.evaluator && <span>• {entry.evaluator}</span>}
                        </div>
                        {entry.observacoes ? (
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{entry.observacoes}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Sem observações registradas.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Tab: Status */}
      {activeTab === "status" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status atual</CardTitle>
                <CardDescription>
                  Aptidão para jogar: lesão, suspensão, ausência
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "status") ? "Visível na página pública" : "Oculto na página pública"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.status = !isFieldPublic(player.publicFields, "status");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "status") ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={player.status ?? "available"}
                onValueChange={(v) => update({ status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhes (lesão/suspensão)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={player.statusDetails ?? ""}
                onChange={(e) => update({ statusDetails: e.target.value || null })}
                placeholder="Ex: Lesão no joelho direito, retorno previsto em 3 semanas"
              />
            </div>
            <div className="space-y-2">
              <Label>Válido até (data)</Label>
              <Input
                type="date"
                value={player.statusUntil ? player.statusUntil.toString().slice(0, 10) : ""}
                onChange={(e) => update({ statusUntil: e.target.value || null })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Mapa / Posição */}
      {activeTab === "mapa" && (
        <Card>
          <CardHeader>
            <CardTitle>Posição no campo e mapa de calor</CardTitle>
            <CardDescription>
              Clique no campo para definir a posição típica do atleta. Use X/Y para ajuste fino.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mapa do campo (igual ao Times por Categorias) */}
            <div className="space-y-2">
              <Label>Posição no campo</Label>
              <div className="relative w-full max-w-md mx-auto aspect-[3/2] border-2 border-white/20 rounded-lg overflow-hidden bg-zinc-900">
                <img
                  src="/campo-futebol.png"
                  alt="Campo de futebol"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {(player.fieldPositionX != null || player.fieldPositionY != null) && (
                  <div
                    className="absolute w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg z-10"
                    style={{
                      left: `${player.fieldPositionX ?? 50}%`,
                      top: `${player.fieldPositionY ?? 50}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}
                <button
                  type="button"
                  className="absolute inset-0 cursor-crosshair w-full h-full z-20"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    update({
                      fieldPositionX: Math.max(0, Math.min(100, x)),
                      fieldPositionY: Math.max(0, Math.min(100, y)),
                    });
                  }}
                />
              </div>
              {(player.fieldPositionX != null || player.fieldPositionY != null) && (
                <p className="text-xs text-muted-foreground text-center">
                  Posição: X: {Math.round(player.fieldPositionX ?? 50)}%, Y: {Math.round(player.fieldPositionY ?? 50)}%
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Posição X (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={player.fieldPositionX ?? ""}
                  onChange={(e) => update({ fieldPositionX: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Posição Y (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={player.fieldPositionY ?? ""}
                  onChange={(e) => update({ fieldPositionY: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dados do mapa de calor (JSON)</Label>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={
                  player.heatMapData
                    ? JSON.stringify(player.heatMapData, null, 2)
                    : ""
                }
                onChange={(e) => {
                  try {
                    const v = e.target.value.trim();
                    const parsed = v ? JSON.parse(v) : null;
                    update({ heatMapData: parsed });
                  } catch {
                    // mantém anterior se JSON inválido
                  }
                }}
                placeholder='{"zones": [...], "heatmap": [...]}'
              />
              <p className="text-xs text-muted-foreground">
                Estrutura livre em JSON para integração futura com visualização de mapa de calor
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Melhores momentos */}
      {activeTab === "momentos" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Melhores momentos</CardTitle>
                <CardDescription>
                  URLs de vídeos (YouTube, etc.) ou imagens dos melhores lances do atleta
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "highlights") ? "Visível na página pública" : "Oculto na página pública"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.highlights = !isFieldPublic(player.publicFields, "highlights");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "highlights") ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>URLs</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    highlights: [...(player.highlights ?? []), ""],
                  })
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            <PlaylistImporter
              onImport={(urls) => {
                const current = player.highlights ?? [];
                const existing = new Set(current);
                urls.forEach((u) => existing.add(u));
                update({ highlights: [...existing] });
              }}
            />
            {(player.highlights ?? []).map((url, hIdx) => (
              <div key={hIdx} className="flex gap-1">
                <Input
                  placeholder="URL do vídeo ou imagem"
                  value={url}
                  onChange={(e) => {
                    const next = [...(player.highlights ?? [])];
                    next[hIdx] = e.target.value;
                    update({ highlights: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => {
                    const next = (player.highlights ?? []).filter((_, i) => i !== hIdx);
                    update({ highlights: next });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tab: Imagens */}
      {activeTab === "imagens" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Imagens de apoio</CardTitle>
                <CardDescription>
                  Fotos adicionais e imagens de referência. Use o picker ou suba em Mídia → Imagens de apoio (atletas).
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "images") ? "Visível na página pública (clique para ocultar)" : "Oculto na página pública (clique para exibir)"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.images = !isFieldPublic(player.publicFields, "images");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "images") ? (
                  <Eye className="h-4 w-4 text-amber-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {imagesList.map((entry, idx) => (
              <div key={idx} className="rounded-lg border p-4 flex gap-4 items-start">
                <div className="h-16 w-16 rounded overflow-hidden bg-muted shrink-0">
                  {entry.url ? (
                    <img
                      src={getPublicImageUrl(entry.url)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Tipo (ex: treino, jogo)"
                    value={entry.type ?? ""}
                    onChange={(e) => {
                      const next = [...imagesList];
                      (next[idx] as ImageEntry).type = e.target.value || undefined;
                      update({ images: next });
                    }}
                  />
                  <div className="flex gap-1">
                    <MediaPicker
                      sizeKey="jogadores_apoio"
                      uploadFolderHint="jogadores_apoio"
                      showUploadHint={false}
                      value={entry.url ?? ""}
                      onChange={(url) => {
                        const next = [...imagesList];
                        (next[idx] as ImageEntry).url = url || undefined;
                        update({ images: next });
                      }}
                      placeholder="Buscar na mídia"
                      className="flex-1"
                    />
                    <Input
                      placeholder="Ou colar URL"
                      value={entry.url ?? ""}
                      onChange={(e) => {
                        const next = [...imagesList];
                        (next[idx] as ImageEntry).url = e.target.value || undefined;
                        update({ images: next });
                      }}
                      className="min-w-[140px]"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = imagesList.filter((_, i) => i !== idx);
                    update({ images: next });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => update({ images: [...imagesList, {}] })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar imagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab: Análise de desempenho — relatório sintético (somente leitura) baseado no depto de análise */}
      {activeTab === "desempenho" && (() => {
        const evalList = (player.evaluations ?? []) as Array<{ date?: string; evaluator?: string; rating?: number; notes?: string }>;
        const ratings = evalList.map((e) => e.rating).filter((r): r is number => typeof r === "number" && !Number.isNaN(r));
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        const lastRating = ratings.length > 0 ? ratings[ratings.length - 1] : null;

        // Indicador de evolução: baseado em média e tendência
        let evolucao: "estavel" | "em_alta" | "em_atencao" = "estavel";
        if (ratings.length >= 2) {
          const tendencia = lastRating! - ratings[ratings.length - 2];
          if (tendencia >= 0.5) evolucao = "em_alta";
          else if (lastRating !== null && lastRating < 6) evolucao = "em_atencao";
        } else if (lastRating !== null && lastRating < 6) evolucao = "em_atencao";

        // Avaliações por mês (gráfico)
        const byMonth: Record<string, number[]> = {};
        evalList.forEach((e) => {
          if (e.date) {
            const month = e.date.slice(0, 7);
            if (!byMonth[month]) byMonth[month] = [];
            if (typeof e.rating === "number" && !Number.isNaN(e.rating))
              byMonth[month].push(e.rating);
          }
        });
        const sortedMonths = Object.keys(byMonth).sort();
        const maxAvg = Math.max(...Object.values(byMonth).map((arr) => (arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1))), 0.01);

        return (
          <Card>
            <CardHeader>
              <CardTitle>Análise de desempenho</CardTitle>
              <CardDescription>
                Relatório sintético baseado nas avaliações do departamento de análise — para gerência e diretoria. Somente visualização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo: Evolução + Média */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Evolução</p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                      evolucao === "estavel" && "bg-sky-500/20 text-sky-600 dark:text-sky-400",
                      evolucao === "em_alta" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                      evolucao === "em_atencao" && "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {evolucao === "estavel" && "Estável"}
                    {evolucao === "em_alta" && "Em alta"}
                    {evolucao === "em_atencao" && "Requer atenção"}
                  </span>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Média das avaliações</p>
                  <p className="text-foreground font-medium text-lg">
                    {avgRating !== null ? avgRating.toFixed(1) : "—"} {avgRating !== null && "/ 10"}
                  </p>
                </div>
              </div>

              {/* Gráfico: Média das notas por mês */}
              {sortedMonths.length > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-foreground mb-4">Evolução das notas (por mês)</p>
                  <div className="flex items-end gap-2 h-24" aria-label="Gráfico de média das notas por mês">
                    {sortedMonths.map((month) => {
                      const vals = byMonth[month] ?? [];
                      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      const pct = Math.min(100, (avg / 10) * 100);
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div
                            className="w-full rounded-t bg-primary/60 min-h-[8px] transition-all"
                            style={{ height: `${Math.max(pct, 12)}%` }}
                            title={`${month}: média ${avg.toFixed(1)}`}
                          />
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                            {month.slice(5)}/{month.slice(2, 4)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Avaliações do departamento de análise */}
              <div className="rounded-lg border p-4 space-y-4">
                <p className="text-sm font-medium text-foreground">Avaliações</p>
                {evalList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada pelo departamento de análise.</p>
                ) : (
                  <div className="space-y-3 max-h-[240px] overflow-y-auto">
                    {evalList.map((entry, idx) => {
                      const dateStr = entry.date ? `${entry.date.slice(8, 10)}/${entry.date.slice(5, 7)}/${entry.date.slice(0, 4)}` : "—";
                      return (
                        <div key={idx} className="rounded border p-3 bg-muted/20">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">{dateStr}</span>
                            {entry.evaluator && <span className="text-muted-foreground">• {entry.evaluator}</span>}
                            {typeof entry.rating === "number" && !Number.isNaN(entry.rating) && (
                              <span className="rounded px-2 py-0.5 bg-primary/20 text-primary font-medium">
                                {entry.rating}/10
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{entry.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Análise escrita (performanceAnalysis) */}
              {player.performanceAnalysis && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Análise consolidada</p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{player.performanceAnalysis}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {activeTab === "dados" && (
        <div className="space-y-4 border-t border-border/60 pt-6">
          <RegistrationInviteCard
            subjectType="player"
            subjectId={player.id}
            name={player.name}
            contactEmail={player.contactEmail}
            contactPhone={player.contactPhone}
          />
          <RhEmployeeLinkCard playerId={player.id} />
        </div>
      )}

    </div>
  );
}
