"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PhysioBodyMap, type BodyMapHit } from "@/components/dashboard/fisioterapia/PhysioBodyMap";
import type {
  CreatePhysioSessionPayload,
  PhysioAttachment,
  PhysioBodyRegion,
  PhysioDiagnosis,
  PhysioTreatment,
} from "@/types/fisioterapia";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

type PlayerOpt = { id: string; name: string; category: string | null };
type TenantOpt = { id: string; name: string };

export function PhysioSessionForm({
  tenants,
  initialTenantId,
  initialPlayerId,
  initialCategory,
  onSaved,
}: {
  tenants: TenantOpt[];
  initialTenantId?: string;
  initialPlayerId?: string;
  initialCategory?: string;
  onSaved: (sessionId: string) => void;
}) {
  const { categories: allCats } = useFixtureCategories();
  const [tenantId, setTenantId] = useState(initialTenantId ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [playerId, setPlayerId] = useState(initialPlayerId ?? "");
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [regions, setRegions] = useState<PhysioBodyRegion[]>([]);
  const [treatments, setTreatments] = useState<PhysioTreatment[]>([]);
  const [view, setView] = useState<"front" | "back">("front");
  const [regionId, setRegionId] = useState("");
  const [side, setSide] = useState<"E" | "D" | "bilateral" | "">("");
  const [bodyMapX, setBodyMapX] = useState<number | undefined>();
  const [bodyMapY, setBodyMapY] = useState<number | undefined>();
  const [symptoms, setSymptoms] = useState("");
  const [painScore, setPainScore] = useState("5");
  const [diagnosisId, setDiagnosisId] = useState("");
  const [treatmentId, setTreatmentId] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [estimatedEndDate, setEstimatedEndDate] = useState("");
  const [staffName, setStaffName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachments, setAttachments] = useState<PhysioAttachment[]>([]);
  const [newDx, setNewDx] = useState("");
  const [newTx, setNewTx] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      api.get<PhysioBodyRegion[]>("/fisioterapia/regions"),
      api.get<PhysioTreatment[]>("/fisioterapia/treatments"),
    ])
      .then(([r, t]) => {
        setRegions(Array.isArray(r.data) ? r.data : []);
        setTreatments(Array.isArray(t.data) ? t.data : []);
      })
      .catch(() => {
        setRegions([]);
        setTreatments([]);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    api
      .get<PlayerOpt[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setPlayers(
          list.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category ?? null,
          })),
        );
      })
      .catch(() => setPlayers([]));
  }, [tenantId]);

  const filteredPlayers = useMemo(() => {
    if (!category) return players;
    return players.filter((p) => p.category === category);
  }, [players, category]);

  const selectedRegion = regions.find((r) => r.id === regionId);
  const diagnoses: PhysioDiagnosis[] = selectedRegion?.diagnoses ?? [];
  const filteredTreatments = useMemo(() => {
    if (!regionId) return treatments;
    return treatments.filter((t) => !t.regionId || t.regionId === regionId);
  }, [treatments, regionId]);

  const handleMapSelect = (hit: BodyMapHit) => {
    setRegionId(hit.regionId);
    setSide(hit.side ?? "");
    setView(hit.view);
    setBodyMapX(hit.x);
    setBodyMapY(hit.y);
    setDiagnosisId("");
  };

  const addDiagnosis = async () => {
    if (!regionId || !newDx.trim()) return;
    const { data } = await api.post<PhysioDiagnosis>("/fisioterapia/diagnoses", {
      regionId,
      name: newDx.trim(),
    });
    setRegions((prev) =>
      prev.map((r) =>
        r.id === regionId
          ? { ...r, diagnoses: [...(r.diagnoses ?? []), data].sort((a, b) => a.name.localeCompare(b.name)) }
          : r,
      ),
    );
    setDiagnosisId(data.id);
    setNewDx("");
  };

  const addTreatment = async () => {
    if (!newTx.trim()) return;
    const { data } = await api.post<PhysioTreatment>("/fisioterapia/treatments", {
      name: newTx.trim(),
      regionId: regionId || undefined,
    });
    setTreatments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setTreatmentId(data.id);
    setNewTx("");
  };

  const addAttachment = () => {
    if (!attachmentUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      {
        name: attachmentName.trim() || "Anexo",
        url: attachmentUrl.trim(),
      },
    ]);
    setAttachmentUrl("");
    setAttachmentName("");
  };

  const handleSubmit = async () => {
    setError(null);
    if (!tenantId || !playerId || !regionId) {
      setError("Clube, atleta e região corporal são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload: CreatePhysioSessionPayload = {
        tenantId,
        playerId,
        category: category || undefined,
        regionId,
        side: side || undefined,
        bodyMapView: view,
        bodyMapX,
        bodyMapY,
        symptoms: symptoms || undefined,
        painScore: painScore ? Number(painScore) : undefined,
        diagnosisId: diagnosisId || undefined,
        treatmentId: treatmentId || undefined,
        treatmentNotes: treatmentNotes || undefined,
        estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
        estimatedEndDate: estimatedEndDate || undefined,
        staffName: staffName || undefined,
        attachments: attachments.length ? attachments : undefined,
      };
      const { data } = await api.post<{ id: string }>("/fisioterapia/sessions", payload);
      onSaved(data.id);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      setError(Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <PhysioBodyMap
        view={view}
        onViewChange={setView}
        selectedRegionId={regionId}
        selectedSide={side || null}
        onSelect={handleMapSelect}
      />

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Clube *</Label>
            <NativeSelect value={tenantId} onChange={(e) => { setTenantId(e.target.value); setPlayerId(""); }}>
              <option value="">Selecione…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label>Categoria</Label>
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {allCats.map((c) => (
                <option key={c.value} value={c.value}>
                  {getCategoryLabel(c.value, "pt", allCats)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Atleta *</Label>
          <NativeSelect value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Selecione…</option>
            {filteredPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.category ? ` (${getCategoryLabel(p.category, "pt", allCats)})` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Região *</Label>
            <NativeSelect
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
                setDiagnosisId("");
              }}
            >
              <option value="">Selecione no mapa ou aqui…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.namePt}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label>Lado</Label>
            <NativeSelect value={side} onChange={(e) => setSide(e.target.value as typeof side)}>
              <option value="">—</option>
              <option value="E">Esquerdo</option>
              <option value="D">Direito</option>
              <option value="bilateral">Bilateral</option>
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Sintomas</Label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Dor, edema, limitação…"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Dor (0–10)</Label>
            <Input
              type="number"
              min={0}
              max={10}
              className="text-foreground"
              value={painScore}
              onChange={(e) => setPainScore(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Fisioterapeuta</Label>
            <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Diagnóstico</Label>
          <NativeSelect value={diagnosisId} onChange={(e) => setDiagnosisId(e.target.value)} disabled={!regionId}>
            <option value="">Selecione…</option>
            {diagnoses.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </NativeSelect>
          <div className="flex gap-2">
            <Input
              placeholder="Novo diagnóstico nesta região"
              value={newDx}
              onChange={(e) => setNewDx(e.target.value)}
              disabled={!regionId}
            />
            <Button type="button" variant="outline" onClick={() => void addDiagnosis()} disabled={!regionId || !newDx.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Tratamento</Label>
          <NativeSelect value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)}>
            <option value="">Selecione…</option>
            {filteredTreatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.equipment ? ` (${t.equipment})` : ""}
              </option>
            ))}
          </NativeSelect>
          <div className="flex gap-2">
            <Input
              placeholder="Novo tratamento / equipamento"
              value={newTx}
              onChange={(e) => setNewTx(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void addTreatment()} disabled={!newTx.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Notas do tratamento</Label>
          <textarea
            className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={treatmentNotes}
            onChange={(e) => setTreatmentNotes(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Duração estimada (dias)</Label>
            <Input
              type="number"
              min={0}
              className="text-foreground"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Data prevista de alta</Label>
            <Input
              type="date"
              className="text-foreground"
              value={estimatedEndDate}
              onChange={(e) => setEstimatedEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Anexos (laudos / exames — URL)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Nome" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} />
            <Input placeholder="https://…" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
            <Button type="button" variant="outline" onClick={addAttachment}>
              Adicionar
            </Button>
          </div>
          {attachments.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {attachments.map((a, i) => (
                <li key={`${a.url}-${i}`} className="truncate text-muted-foreground">
                  {a.name}: {a.url}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="button" className="min-h-[44px]" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar atendimento
        </Button>
      </div>
    </div>
  );
}
