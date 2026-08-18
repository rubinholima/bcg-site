"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  DashboardDeptSection,
  DashboardFieldLabel,
  DashboardFilterBox,
} from "@/components/dashboard/DashboardDeptHeader";
import { api } from "@/lib/api";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import type { PhysiologyLoadEntryRow } from "@/lib/fisiologia-types";

type Tenant = {
  id: string;
  name: string;
  categories?: string[] | null;
  kind?: { name?: string };
};

interface RosterPlayer {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category: string | null;
}

type EntryDraft = PhysiologyLoadEntryRow & { playerName: string };

const GPS_FIELD_ALIASES: Record<string, keyof EntryDraft> = {
  nome: "playerName",
  atleta: "playerName",
  player: "playerName",
  jogador: "playerName",
  maxdistance: "maxDistanceM",
  distanciamax: "maxDistanceM",
  distancia: "maxDistanceM",
  maxspeed: "maxSpeedKmh",
  velocidademax: "maxSpeedKmh",
  velocidade: "maxSpeedKmh",
  sprintcount: "sprintCount",
  sprints: "sprintCount",
  highintensitydistance: "highIntensityDistanceM",
  distanciaalta: "highIntensityDistanceM",
  distanciaaltainten: "highIntensityDistanceM",
  lowintensitydistance: "lowIntensityDistanceM",
  distanciabaixa: "lowIntensityDistanceM",
  sprintdistance: "sprintDistanceM",
  distanciasprint: "sprintDistanceM",
  rpe: "rpe",
  pse: "rpe",
  trainingminutes: "trainingMinutes",
  minutos: "trainingMinutes",
  gameminutes: "gameMinutes",
};

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseNum(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseCsvLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  return line.split(/[,;]/).map((c) => c.trim());
}

function matchPlayerName(name: string, roster: RosterPlayer[]): RosterPlayer | null {
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  const exact = roster.find((p) => p.name.trim().toLowerCase() === norm);
  if (exact) return exact;
  const partial = roster.find((p) => p.name.trim().toLowerCase().includes(norm) || norm.includes(p.name.trim().toLowerCase()));
  return partial ?? null;
}

function emptyEntry(player: RosterPlayer): EntryDraft {
  return {
    playerId: player.id,
    playerName: player.name,
    present: true,
    rpe: null,
    trainingMinutes: null,
    gameMinutes: null,
    maxDistanceM: null,
    maxSpeedKmh: null,
    sprintCount: null,
    highIntensityDistanceM: null,
    lowIntensityDistanceM: null,
    sprintDistanceM: null,
    player: { id: player.id, name: player.name, jerseyNumber: player.jerseyNumber },
  };
}

export function FisiologiaCargaPanel() {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState("treino");
  const [period, setPeriod] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [entries, setEntries] = useState<EntryDraft[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) =>
        isFootballKind(t.kind?.name ?? ""),
      );
      setTenants(list);
      if (list.length === 1) setTenantId(list[0]!.id);
    });
  }, []);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const categoriesForClub = filterCategoriesForTenant(allCats, selectedTenant?.categories);

  const loadRoster = useCallback(async () => {
    if (!tenantId || !category) {
      setRoster([]);
      setEntries([]);
      return;
    }
    setLoadingRoster(true);
    try {
      const params = new URLSearchParams({ tenantId, category });
      const { data } = await api.get<RosterPlayer[]>(`/fisiologia/load-sessions/category-roster?${params}`);
      const list = Array.isArray(data) ? data : [];
      setRoster(list);
      setEntries(list.map(emptyEntry));
    } catch {
      setRoster([]);
      setEntries([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [tenantId, category]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const updateEntry = (playerId: string, patch: Partial<EntryDraft>) => {
    setEntries((prev) => prev.map((e) => (e.playerId === playerId ? { ...e, ...patch } : e)));
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) {
      setFeedback({ open: true, title: "Atenção", message: "Cole os dados CSV antes de importar." });
      return;
    }
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setFeedback({ open: true, title: "Atenção", message: "CSV precisa de cabeçalho e ao menos uma linha." });
      return;
    }
    const headers = parseCsvLine(lines[0]!).map(normalizeKey);
    let matched = 0;
    const next = [...entries];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]!);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      const nameKey = ["nome", "atleta", "player", "jogador"].find((k) => row[k]);
      const playerName = nameKey ? row[nameKey] : cols[0] ?? "";
      const player = matchPlayerName(playerName, roster);
      if (!player) continue;
      matched += 1;
      const idx = next.findIndex((e) => e.playerId === player.id);
      if (idx < 0) continue;
      const patch: Partial<EntryDraft> = { present: true, gpsImportLabel: playerName };
      for (const [header, field] of Object.entries(GPS_FIELD_ALIASES)) {
        if (field === "playerName") continue;
        const val = row[header];
        if (val == null || !val.trim()) continue;
        if (field === "rpe" || field === "sprintCount" || field === "trainingMinutes" || field === "gameMinutes") {
          const n = parseNum(val);
          if (n != null) (patch as Record<string, number | null>)[field] = Math.round(n);
        } else {
          const n = parseNum(val);
          if (n != null) (patch as Record<string, number | null>)[field] = n;
        }
      }
      next[idx] = { ...next[idx]!, ...patch };
    }
    setEntries(next);
    setFeedback({
      open: true,
      title: "Importação",
      message: matched > 0 ? `${matched} atleta(s) atualizado(s) a partir do CSV.` : "Nenhum atleta reconhecido no CSV.",
    });
  };

  const handleSave = async () => {
    if (!tenantId || !category) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione clube e categoria." });
      return;
    }
    if (entries.length === 0) {
      setFeedback({ open: true, title: "Atenção", message: "Carregue o elenco da categoria." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/fisiologia/load-sessions", {
        tenantId,
        category,
        sessionDate,
        sessionType,
        period: period.trim() || undefined,
        trainingType: trainingType.trim() || undefined,
        staffName: staffName.trim() || undefined,
        notes: notes.trim() || undefined,
        entries: entries.map((e) => ({
          playerId: e.playerId,
          present: e.present,
          rpe: e.rpe ?? undefined,
          trainingMinutes: e.trainingMinutes ?? undefined,
          gameMinutes: e.gameMinutes ?? undefined,
          maxDistanceM: e.maxDistanceM ?? undefined,
          maxSpeedKmh: e.maxSpeedKmh ?? undefined,
          sprintCount: e.sprintCount ?? undefined,
          highIntensityDistanceM: e.highIntensityDistanceM ?? undefined,
          lowIntensityDistanceM: e.lowIntensityDistanceM ?? undefined,
          sprintDistanceM: e.sprintDistanceM ?? undefined,
          gpsImportLabel: e.gpsImportLabel ?? undefined,
          notes: e.notes ?? undefined,
        })),
      });
      setFeedback({ open: true, title: "Salvo", message: "Sessão de carga registrada." });
      setCsvText("");
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DashboardFilterBox accent="sky" className="sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Clube</DashboardFieldLabel>
          <NativeSelect value={tenantId} onChange={(e) => { setTenantId(e.target.value); setCategory(""); }}>
            <option value="">Selecione…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Categoria</DashboardFieldLabel>
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} disabled={!tenantId}>
            <option value="">Selecione…</option>
            {categoriesForClub.map((c) => (
              <option key={c.value} value={c.value}>
                {getCategoryLabel(c.value, "pt", allCats)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Data</DashboardFieldLabel>
          <Input
            type="date"
            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Tipo</DashboardFieldLabel>
          <NativeSelect value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
            <option value="treino">Treino</option>
            <option value="jogo">Jogo</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Período</DashboardFieldLabel>
          <Input className="text-foreground" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Manhã, tarde…" />
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Tipo treino</DashboardFieldLabel>
          <Input className="text-foreground" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} placeholder="Campo, academia…" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <DashboardFieldLabel accent="sky">Profissional</DashboardFieldLabel>
          <Input className="text-foreground" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
        </div>
      </DashboardFilterBox>

      <DashboardDeptSection
        title="Registros por atleta"
        aside={
          <Button onClick={handleSave} disabled={saving || !category || entries.length === 0} className="min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar sessão
          </Button>
        }
      >
        {!tenantId || !category ? (
          <p className="text-sm text-muted-foreground py-4">Selecione clube e categoria.</p>
        ) : loadingRoster ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum atleta na categoria.</p>
        ) : (
          <div className="space-y-4">
            <Card className="border-sky-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4 text-sky-500" />
                  Importar CSV / planilha GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="nome,maxDistance,maxSpeed,sprintCount…"
                />
                <Button type="button" variant="outline" onClick={handleImportCsv}>
                  Aplicar importação
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.playerId}
                  className="rounded-lg border border-border/70 p-3 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {entry.playerName}
                      {entry.player?.jerseyNumber != null ? ` #${entry.player.jerseyNumber}` : ""}
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={entry.present}
                        onChange={(e) => updateEntry(entry.playerId, { present: e.target.checked })}
                      />
                      Presente
                    </label>
                  </div>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                    {(
                      [
                        ["PSE", "rpe", "1"],
                        ["Min treino", "trainingMinutes", "1"],
                        ["Min jogo", "gameMinutes", "1"],
                        ["Dist. máx (m)", "maxDistanceM", "decimal"],
                        ["Vel. máx (km/h)", "maxSpeedKmh", "decimal"],
                        ["Sprints", "sprintCount", "1"],
                        ["Dist. alta (m)", "highIntensityDistanceM", "decimal"],
                        ["Dist. sprint (m)", "sprintDistanceM", "decimal"],
                      ] as const
                    ).map(([label, field, mode]) => (
                      <div key={field} className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input
                          className="text-foreground h-9"
                          inputMode={mode === "1" ? "numeric" : "decimal"}
                          value={entry[field] != null ? String(entry[field]) : ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (!raw.trim()) {
                              updateEntry(entry.playerId, { [field]: null });
                              return;
                            }
                            const n = Number(raw.replace(",", "."));
                            updateEntry(entry.playerId, {
                              [field]: Number.isFinite(n)
                                ? mode === "1"
                                  ? Math.round(n)
                                  : n
                                : null,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DashboardDeptSection>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
