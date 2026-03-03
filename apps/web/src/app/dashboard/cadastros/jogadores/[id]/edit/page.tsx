"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Stethoscope,
  Star,
  Activity,
  Map,
  Image as ImageIcon,
  BarChart3,
  Plus,
  Trash2,
  Loader2,
  Youtube,
  Eye,
  EyeOff,
} from "lucide-react";
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
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { getPublicImageUrl } from "@/lib/media-url";
import { FOOTBALL_POSITIONS } from "@/lib/football-positions";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

const TABS = [
  { id: "dados", label: "Dados base", icon: User },
  { id: "medico", label: "Histórico médico", icon: Stethoscope },
  { id: "avaliacoes", label: "Avaliações", icon: Star },
  { id: "status", label: "Status", icon: Activity },
  { id: "mapa", label: "Mapa / Posição", icon: Map },
  { id: "momentos", label: "Melhores momentos", icon: Youtube },
  { id: "imagens", label: "Imagens", icon: ImageIcon },
  { id: "desempenho", label: "Análise de desempenho", icon: BarChart3 },
] as const;

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
  medicalHistory?: unknown[] | null;
  evaluations?: unknown[] | null;
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  heatMapData?: unknown;
  performanceAnalysis?: string | null;
  images?: unknown[] | null;
  publicFields?: Record<string, boolean> | null;
}

interface MedicalEntry {
  date?: string;
  type?: string;
  description?: string;
  daysOut?: number;
  gamesMissed?: number;
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
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dados");
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [tenantCategories, setTenantCategories] = useState<string[]>([]);


  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<PlayerData>(`/players/${id}`);
        setPlayer(data ?? null);
        if (data?.tenantId) {
          const { data: tenant } = await api.get<{ categories?: string[] | null }>(`/tenants/${data.tenantId}`);
          setTenantCategories(Array.isArray(tenant?.categories) ? tenant.categories : []);
        } else {
          setTenantCategories([]);
        }
      } catch {
        setError("Erro ao carregar jogador");
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
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/players/${id}`, {
        category: player.category || undefined,
        name: player.name,
        photoUrl: player.photoUrl || undefined,
        birthDate: player.birthDate || undefined,
        nationality: player.nationality || undefined,
        height: player.height ?? undefined,
        weight: player.weight ?? undefined,
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
        evaluations: player.evaluations ?? undefined,
        status: player.status || undefined,
        statusDetails: player.statusDetails || undefined,
        statusUntil: player.statusUntil || undefined,
        heatMapData: player.heatMapData ?? undefined,
        performanceAnalysis: player.performanceAnalysis || undefined,
        images: player.images ?? undefined,
        publicFields: player.publicFields ?? undefined,
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

  const medicalList = (player.medicalHistory ?? []) as MedicalEntry[];
  const evalList = (player.evaluations ?? []) as EvaluationEntry[];
  const imagesList = (player.images ?? []) as ImageEntry[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/cadastros/jogadores">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-border">
            {player.photoUrl ? (
              <img
                src={getPublicImageUrl(player.photoUrl)}
                alt={player.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {player.jerseyNumber ? `${player.jerseyNumber} - ` : ""}
              {player.name}
            </h1>
            <p className="text-muted-foreground">
              {player.tenant?.name} {player.category ? `• ${player.category}` : ""}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === tab.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Dados base */}
      {activeTab === "dados" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dados base</CardTitle>
                <CardDescription>
                  Informações do jogador (mesmas do Times por Categorias e Google Sheets)
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "teamPage") ? "Visível na página do time (Times por Categorias)" : "Oculto da página do time"}
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
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded overflow-hidden bg-muted shrink-0">
                {player.photoUrl ? (
                  <img
                    src={getPublicImageUrl(player.photoUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label>Foto</Label>
                <MediaPicker
                  sizeKey="jogadores"
                  value={player.photoUrl ?? ""}
                  onChange={(v) => update({ photoUrl: v || null })}
                  placeholder="Escolher foto"
                />
                <Input
                  placeholder="Ou URL"
                  value={player.photoUrl ?? ""}
                  onChange={(e) => update({ photoUrl: e.target.value || null })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input
                  value={player.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Nome do jogador"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={player.category || "none"}
                  onValueChange={(v) => update({ category: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {categoriesForDropdown.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.labelPT}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Data nascimento</Label>
                <Input
                  type="date"
                  value={player.birthDate ?? ""}
                  onChange={(e) => update({ birthDate: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nacionalidade</Label>
                <Input
                  value={player.nationality ?? ""}
                  onChange={(e) => update({ nationality: e.target.value || null })}
                  placeholder="Ex: Brasil"
                />
              </div>
              <div className="space-y-2">
                <Label>Nº camisa</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={player.jerseyNumber ?? ""}
                  onChange={(e) => update({ jerseyNumber: e.target.value ? Number(e.target.value) : null })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Posição</Label>
                <Select
                  value={player.position ?? ""}
                  onValueChange={(v) => update({ position: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOTBALL_POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  min={50}
                  max={250}
                  value={player.height ?? ""}
                  onChange={(e) => update({ height: e.target.value ? Number(e.target.value) : null })}
                  placeholder="182"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  min={30}
                  max={150}
                  value={player.weight ?? ""}
                  onChange={(e) => update({ weight: e.target.value ? Number(e.target.value) : null })}
                  placeholder="78"
                />
              </div>
              <div className="space-y-2">
                <Label>Pé predominante</Label>
                <Select
                  value={player.preferredFoot ?? ""}
                  onValueChange={(v) => update({ preferredFoot: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerdo</SelectItem>
                    <SelectItem value="right">Direito</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Time atual</Label>
              <Input
                value={player.currentTeam ?? ""}
                onChange={(e) => update({ currentTeam: e.target.value || null })}
                placeholder="Ex: Americano FC"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Jogos</Label>
                <Input
                  type="number"
                  min={0}
                  value={player.matchesPlayed ?? ""}
                  onChange={(e) => update({ matchesPlayed: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gols</Label>
                <Input
                  type="number"
                  min={0}
                  value={player.goals ?? ""}
                  onChange={(e) => update({ goals: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assistências</Label>
                <Input
                  type="number"
                  min={0}
                  value={player.assists ?? ""}
                  onChange={(e) => update({ assists: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label>Valor mercado (€)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={isFieldPublic(player.publicFields, "marketValue") ? "Visível na página pública" : "Oculto na página pública"}
                    onClick={() => {
                      const pf = { ...(player.publicFields ?? {}) };
                      pf.marketValue = !isFieldPublic(player.publicFields, "marketValue");
                      update({ publicFields: pf });
                    }}
                  >
                    {isFieldPublic(player.publicFields, "marketValue") ? <Eye className="h-3 w-3 text-amber-500" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </Button>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={player.marketValue ?? ""}
                  onChange={(e) => update({ marketValue: e.target.value ? Number(e.target.value) : null })}
                  placeholder="120000"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cartões amarelos</Label>
                <Input
                  type="number"
                  min={0}
                  value={player.yellowCards ?? ""}
                  onChange={(e) => update({ yellowCards: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cartões vermelhos</Label>
                <Input
                  type="number"
                  min={0}
                  value={player.redCards ?? ""}
                  onChange={(e) => update({ redCards: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Biografia (PT)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={player.bioPT ?? ""}
                onChange={(e) => update({ bioPT: e.target.value || null })}
                placeholder="Biografia em português"
              />
            </div>
            <div className="space-y-2">
              <Label>Biografia (EN)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={player.bioEN ?? ""}
                onChange={(e) => update({ bioEN: e.target.value || null })}
                placeholder="Biography in English"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Histórico médico */}
      {activeTab === "medico" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico médico</CardTitle>
                <CardDescription>
                  Lesões, afastamentos e períodos de recuperação
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "medicalHistory") ? "Visível na página pública" : "Oculto na página pública"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.medicalHistory = !isFieldPublic(player.publicFields, "medicalHistory");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "medicalHistory") ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicalList.map((entry, idx) => (
              <div key={idx} className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Registro {idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = medicalList.filter((_, i) => i !== idx);
                      update({ medicalHistory: next });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="date"
                    placeholder="Data"
                    value={entry.date ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).date = e.target.value || undefined;
                      update({ medicalHistory: next });
                    }}
                  />
                  <Input
                    placeholder="Tipo (ex: lesão muscular)"
                    value={entry.type ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).type = e.target.value || undefined;
                      update({ medicalHistory: next });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Dias afastado"
                    value={entry.daysOut ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).daysOut = e.target.value ? Number(e.target.value) : undefined;
                      update({ medicalHistory: next });
                    }}
                  />
                  <Input
                    type="number"
                    placeholder="Jogos perdidos"
                    value={entry.gamesMissed ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).gamesMissed = e.target.value ? Number(e.target.value) : undefined;
                      update({ medicalHistory: next });
                    }}
                  />
                </div>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Descrição"
                  value={entry.description ?? ""}
                  onChange={(e) => {
                    const next = [...medicalList];
                    (next[idx] as MedicalEntry).description = e.target.value || undefined;
                    update({ medicalHistory: next });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => update({ medicalHistory: [...medicalList, {}] })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar registro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab: Avaliações */}
      {activeTab === "avaliacoes" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Avaliações</CardTitle>
                <CardDescription>
                  Avaliações periódicas de desempenho e potencial
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "evaluations") ? "Visível na página pública" : "Oculto na página pública"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.evaluations = !isFieldPublic(player.publicFields, "evaluations");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "evaluations") ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {evalList.map((entry, idx) => (
              <div key={idx} className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Avaliação {idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = evalList.filter((_, i) => i !== idx);
                      update({ evaluations: next });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={entry.date ?? ""}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).date = e.target.value || undefined;
                      update({ evaluations: next });
                    }}
                  />
                  <Input
                    placeholder="Avaliador"
                    value={entry.evaluator ?? ""}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).evaluator = e.target.value || undefined;
                      update({ evaluations: next });
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    placeholder="Nota (0-10)"
                    value={entry.rating ?? ""}
                    onChange={(e) => {
                      const next = [...evalList];
                      (next[idx] as EvaluationEntry).rating = e.target.value ? Number(e.target.value) : undefined;
                      update({ evaluations: next });
                    }}
                  />
                </div>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Observações"
                  value={entry.notes ?? ""}
                  onChange={(e) => {
                    const next = [...evalList];
                    (next[idx] as EvaluationEntry).notes = e.target.value || undefined;
                    update({ evaluations: next });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => update({ evaluations: [...evalList, {}] })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar avaliação
            </Button>
          </CardContent>
        </Card>
      )}

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
              Clique no campo para definir a posição típica do jogador. Use X/Y para ajuste fino.
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
                  URLs de vídeos (YouTube, etc.) ou imagens dos melhores lances do jogador
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
                  Fotos adicionais e imagens de referência. Use o picker ou suba em Mídia → Imagens de apoio (jogadores).
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

      {/* Tab: Análise de desempenho */}
      {activeTab === "desempenho" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Análise de desempenho</CardTitle>
                <CardDescription>
                  Anotações sobre desempenho, evolução e projeções
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isFieldPublic(player.publicFields, "performanceAnalysis") ? "Visível na página pública" : "Oculto na página pública"}
                onClick={() => {
                  const pf = { ...(player.publicFields ?? {}) };
                  pf.performanceAnalysis = !isFieldPublic(player.publicFields, "performanceAnalysis");
                  update({ publicFields: pf });
                }}
              >
                {isFieldPublic(player.publicFields, "performanceAnalysis") ? <Eye className="h-4 w-4 text-amber-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={player.performanceAnalysis ?? ""}
              onChange={(e) => update({ performanceAnalysis: e.target.value || null })}
              placeholder="Analise o desempenho do jogador, pontos fortes, áreas de melhoria, projeção de carreira..."
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
