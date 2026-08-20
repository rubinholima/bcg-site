"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  parseGpsImportText,
  parseGpsXlsxFile,
  type GpsImportRowPatch,
} from "@/lib/fisiologia-gps-import";

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

function applyGpsPatch(entry: EntryDraft, patch: GpsImportRowPatch): EntryDraft {
  return {
    ...entry,
    present: patch.present ?? entry.present,
    gpsImportLabel: patch.gpsImportLabel ?? entry.gpsImportLabel,
    rpe: patch.rpe !== undefined ? (patch.rpe as number | null) : entry.rpe,
    trainingMinutes:
      patch.trainingMinutes !== undefined
        ? (patch.trainingMinutes as number | null)
        : entry.trainingMinutes,
    gameMinutes:
      patch.gameMinutes !== undefined ? (patch.gameMinutes as number | null) : entry.gameMinutes,
    maxDistanceM:
      patch.maxDistanceM !== undefined ? (patch.maxDistanceM as number | null) : entry.maxDistanceM,
    maxSpeedKmh:
      patch.maxSpeedKmh !== undefined ? (patch.maxSpeedKmh as number | null) : entry.maxSpeedKmh,
    sprintCount:
      patch.sprintCount !== undefined ? (patch.sprintCount as number | null) : entry.sprintCount,
    highIntensityDistanceM:
      patch.highIntensityDistanceM !== undefined
        ? (patch.highIntensityDistanceM as number | null)
        : entry.highIntensityDistanceM,
    lowIntensityDistanceM:
      patch.lowIntensityDistanceM !== undefined
        ? (patch.lowIntensityDistanceM as number | null)
        : entry.lowIntensityDistanceM,
    sprintDistanceM:
      patch.sprintDistanceM !== undefined
        ? (patch.sprintDistanceM as number | null)
        : entry.sprintDistanceM,
  };
}

function sanitizeEntryForSave(entry: EntryDraft) {
  const asInt = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? Math.round(value) : undefined;
  const asNum = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? value : undefined;
  const rpe = asInt(entry.rpe);

  return {
    playerId: entry.playerId,
    present: entry.present,
    rpe: rpe != null && rpe >= 1 && rpe <= 10 ? rpe : undefined,
    trainingMinutes: asInt(entry.trainingMinutes),
    gameMinutes: asInt(entry.gameMinutes),
    maxDistanceM: asNum(entry.maxDistanceM),
    maxSpeedKmh: asNum(entry.maxSpeedKmh),
    sprintCount: asInt(entry.sprintCount),
    highIntensityDistanceM: asNum(entry.highIntensityDistanceM),
    lowIntensityDistanceM: asNum(entry.lowIntensityDistanceM),
    sprintDistanceM: asNum(entry.sprintDistanceM),
    gpsImportLabel: entry.gpsImportLabel ?? undefined,
    notes: entry.notes ?? undefined,
  };
}

function buildImportMessage(result: {
  matched: number;
  withGpsData: number;
  unmatched: string[];
}): string {
  if (result.matched === 0) {
    return "Nenhum atleta reconhecido na planilha. Confira categoria e nomes.";
  }
  const parts = [
    `${result.matched} atleta(s) reconhecido(s)`,
    `${result.withGpsData} com dados GPS preenchidos`,
  ];
  if (result.unmatched.length > 0) {
    const sample = result.unmatched.slice(0, 4).join(", ");
    const extra = result.unmatched.length > 4 ? ` (+${result.unmatched.length - 4})` : "";
    parts.push(`Sem vínculo: ${sample}${extra}`);
  }
  return parts.join(" · ");
}

export function FisiologiaCargaPanel() {
  const { categories: allCats } = useFixtureCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importFileName, setImportFileName] = useState("");
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

  const applyImportResult = (result: Awaited<ReturnType<typeof parseGpsImportText>>) => {
    if (result.sessionHints.sessionDate) {
      setSessionDate(result.sessionHints.sessionDate);
    }
    if (result.sessionHints.trainingType && !trainingType.trim()) {
      setTrainingType(result.sessionHints.trainingType);
    }

    setEntries((prev) =>
      prev.map((entry) => {
        const patch = result.patches.get(entry.playerId);
        return patch ? applyGpsPatch(entry, patch) : entry;
      }),
    );

    setFeedback({
      open: true,
      title: "Importação",
      message: buildImportMessage(result),
    });
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) {
      setFeedback({ open: true, title: "Atenção", message: "Cole os dados ou envie o arquivo XLSX da HUD." });
      return;
    }
    if (roster.length === 0) {
      setFeedback({ open: true, title: "Atenção", message: "Carregue o elenco da categoria antes de importar." });
      return;
    }
    const result = parseGpsImportText(csvText, roster);
    applyImportResult(result);
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    if (roster.length === 0) {
      setFeedback({ open: true, title: "Atenção", message: "Carregue o elenco da categoria antes de importar." });
      return;
    }

    setImporting(true);
    setImportFileName(file.name);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const result = await parseGpsXlsxFile(file, roster);
        applyImportResult(result);
        return;
      }

      const text = await file.text();
      setCsvText(text);
      const result = parseGpsImportText(text, roster);
      applyImportResult(result);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível ler o arquivo.",
      });
    } finally {
      setImporting(false);
    }
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
        entries: entries.map(sanitizeEntryForSave),
      });
      setFeedback({ open: true, title: "Salvo", message: "Sessão de carga registrada." });
      setCsvText("");
      setImportFileName("");
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
                  Importar HUD / GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      void handleImportFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Enviar XLSX da HUD
                  </Button>
                  {importFileName ? (
                    <span className="text-xs text-muted-foreground truncate">{importFileName}</span>
                  ) : null}
                </div>
                <textarea
                  className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-mono"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Ou cole aqui a aba Summary (HUD) — Player, Distance(m), MAX Speed(km/h)…"
                />
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={handleImportCsv} disabled={importing}>
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
