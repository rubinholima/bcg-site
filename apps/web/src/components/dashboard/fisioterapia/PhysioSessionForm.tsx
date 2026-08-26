"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Upload, X } from "lucide-react";
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
  PhysioSession,
  PhysioSessionRegionInput,
  PhysioTreatment,
  UpdatePhysioSessionPayload,
} from "@/types/fisioterapia";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPublicImageUrl } from "@/lib/media-url";

type PainRegionEntry = PhysioSessionRegionInput & { key: string };

function regionKey(regionId: string, side?: string) {
  return `${regionId}:${side ?? ""}`;
}

function sideLabel(side?: string) {
  if (side === "E") return "E";
  if (side === "D") return "D";
  if (side === "bilateral") return "bilateral";
  return "";
}
type TenantOpt = { id: string; name: string; categories?: string[] | null };
type StaffOpt = { id: string; name: string; role: string; tenantId?: string | null };

type PlayerOpt = { id: string; name: string; category: string | null };

export function PhysioSessionForm({
  tenants,
  initialTenantId,
  initialPlayerId,
  initialCategory,
  sessionId,
  onSaved,
}: {
  tenants: TenantOpt[];
  initialTenantId?: string;
  initialPlayerId?: string;
  initialCategory?: string;
  /** Modo edição — carrega atendimento existente e faz PATCH. */
  sessionId?: string;
  onSaved: (sessionId: string) => void;
}) {
  const isEdit = Boolean(sessionId);
  const { categories: allCats } = useFixtureCategories();
  const [tenantId, setTenantId] = useState(initialTenantId ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [playerId, setPlayerId] = useState(initialPlayerId ?? "");
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [regions, setRegions] = useState<PhysioBodyRegion[]>([]);
  const [diagnoses, setDiagnoses] = useState<PhysioDiagnosis[]>([]);
  const [treatments, setTreatments] = useState<PhysioTreatment[]>([]);
  const [view, setView] = useState<"front" | "back">("front");
  const [regionId, setRegionId] = useState("");
  const [side, setSide] = useState<"E" | "D" | "bilateral" | "">("");
  const [bodyMapX, setBodyMapX] = useState<number | undefined>();
  const [bodyMapY, setBodyMapY] = useState<number | undefined>();
  const [symptoms, setSymptoms] = useState("");
  const [painScore, setPainScore] = useState("5");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [needsTransition, setNeedsTransition] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState("");
  const [estimatedEndDate, setEstimatedEndDate] = useState("");
  const [staffId, setStaffId] = useState("");
  const [attachments, setAttachments] = useState<PhysioAttachment[]>([]);
  const [attachmentName, setAttachmentName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newDx, setNewDx] = useState("");
  const [newTx, setNewTx] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSession, setLoadingSession] = useState(isEdit);
  const [pendingStaffName, setPendingStaffName] = useState<string | null>(null);
  const [loadingDx, setLoadingDx] = useState(false);
  const [painRegions, setPainRegions] = useState<PainRegionEntry[]>([]);
  const [selectedDiagnosisIds, setSelectedDiagnosisIds] = useState<string[]>([]);
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForClub = useMemo(
    () => filterCategoriesForTenant(allCats, selectedTenant?.categories),
    [allCats, selectedTenant?.categories],
  );

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
    if (!sessionId) return;
    setLoadingSession(true);
    api
      .get<PhysioSession>(`/fisioterapia/sessions/${sessionId}`)
      .then(({ data }) => {
        setTenantId(data.tenantId);
        setPlayerId(data.playerId);
        setCategory(data.category ?? "");
        setView((data.bodyMapView as "front" | "back") || "front");
        setRegionId(data.regionId);
        setSide(data.side ?? "");
        setBodyMapX(data.bodyMapX ?? undefined);
        setBodyMapY(data.bodyMapY ?? undefined);
        setSymptoms(data.symptoms ?? "");
        setPainScore(data.painScore != null ? String(data.painScore) : "");
        setTreatmentNotes(data.treatmentNotes ?? "");
        setNeedsTransition(data.needsTransition === true);
        setEstimatedDays(data.estimatedDays != null ? String(data.estimatedDays) : "");
        setEstimatedEndDate(
          data.estimatedEndDate ? String(data.estimatedEndDate).slice(0, 10) : "",
        );
        setStaffId(data.staffId ?? "");
        if (!data.staffId && data.staffName) setPendingStaffName(data.staffName);
        else setPendingStaffName(null);
        setAttachments(Array.isArray(data.attachments) ? data.attachments : []);

        const regionRows =
          data.sessionRegions && data.sessionRegions.length > 0
            ? data.sessionRegions
            : [
                {
                  regionId: data.regionId,
                  side: data.side ?? undefined,
                  bodyMapView: data.bodyMapView ?? undefined,
                  bodyMapX: data.bodyMapX ?? undefined,
                  bodyMapY: data.bodyMapY ?? undefined,
                },
              ];
        setPainRegions(
          regionRows.map((r) => ({
            regionId: r.regionId,
            side: r.side ?? undefined,
            bodyMapView: (r.bodyMapView as "front" | "back" | undefined) ?? undefined,
            bodyMapX: r.bodyMapX ?? undefined,
            bodyMapY: r.bodyMapY ?? undefined,
            key: regionKey(r.regionId, r.side ?? undefined),
          })),
        );

        const dxIds =
          data.sessionDiagnoses && data.sessionDiagnoses.length > 0
            ? data.sessionDiagnoses
                .map((d) => d.diagnosisId)
                .filter((id): id is string => Boolean(id))
            : data.diagnosisId
              ? [data.diagnosisId]
              : [];
        setSelectedDiagnosisIds(dxIds);

        const txIds =
          data.sessionTreatments && data.sessionTreatments.length > 0
            ? data.sessionTreatments
                .map((t) => t.treatmentId)
                .filter((id): id is string => Boolean(id))
            : data.treatmentId
              ? [data.treatmentId]
              : [];
        setSelectedTreatmentIds(txIds);
      })
      .catch(() => setError("Não foi possível carregar o atendimento."))
      .finally(() => setLoadingSession(false));
  }, [sessionId]);

  useEffect(() => {
    if (!pendingStaffName || staffId || staffList.length === 0) return;
    const match = staffList.find(
      (s) => s.name.trim().toLowerCase() === pendingStaffName.trim().toLowerCase(),
    );
    if (match) {
      setStaffId(match.id);
      setPendingStaffName(null);
    }
  }, [pendingStaffName, staffId, staffList]);

  useEffect(() => {
    if (!isEdit || !staffId || staffList.length === 0) return;
    if (!staffList.some((s) => s.id === staffId)) setStaffId("");
  }, [isEdit, staffId, staffList]);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      setStaffList([]);
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

    api
      .get<StaffOpt[]>(
        `/medical-staff?tenantId=${encodeURIComponent(tenantId)}&role=fisioterapeuta`,
      )
      .then(({ data }) => {
        setStaffList(Array.isArray(data) ? data : []);
      })
      .catch(() => setStaffList([]));
  }, [tenantId]);

  useEffect(() => {
    const regionIds = [...new Set(painRegions.map((r) => r.regionId))];
    if (regionIds.length === 0) {
      setDiagnoses([]);
      setSelectedDiagnosisIds([]);
      return;
    }
    setLoadingDx(true);
    Promise.all(
      regionIds.map((id) =>
        api.get<PhysioDiagnosis[]>(`/fisioterapia/diagnoses?regionId=${encodeURIComponent(id)}`),
      ),
    )
      .then((responses) => {
        const merged = new Map<string, PhysioDiagnosis>();
        for (const { data } of responses) {
          for (const d of Array.isArray(data) ? data : []) {
            merged.set(d.id, d);
          }
        }
        setDiagnoses([...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .catch(() => setDiagnoses([]))
      .finally(() => setLoadingDx(false));
  }, [painRegions]);

  useEffect(() => {
    if (loadingDx) return;
    setSelectedDiagnosisIds((prev) => prev.filter((id) => diagnoses.some((d) => d.id === id)));
  }, [diagnoses, loadingDx]);

  useEffect(() => {
    if (category && !categoriesForClub.some((c) => c.value === category)) {
      setCategory("");
    }
  }, [category, categoriesForClub]);

  const filteredPlayers = useMemo(() => {
    if (!category) return players;
    return players.filter((p) => p.category === category);
  }, [players, category]);

  /** Todos os tratamentos ativos — procedimentos são multi e geralmente globais. */
  const treatmentOptions = useMemo(
    () => [...treatments].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [treatments],
  );

  const regionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of regions) map.set(r.id, r.namePt);
    return map;
  }, [regions]);

  const selectedStaff = staffList.find((s) => s.id === staffId);

  const upsertPainRegion = (entry: Omit<PainRegionEntry, "key">) => {
    const key = regionKey(entry.regionId, entry.side);
    setPainRegions((prev) => {
      const without = prev.filter((r) => r.key !== key);
      return [...without, { ...entry, key }];
    });
  };

  const handleMapSelect = (hit: BodyMapHit) => {
    setRegionId(hit.regionId);
    setSide(hit.side ?? "");
    setView(hit.view);
    setBodyMapX(hit.x);
    setBodyMapY(hit.y);
    upsertPainRegion({
      regionId: hit.regionId,
      side: hit.side || undefined,
      bodyMapView: hit.view,
      bodyMapX: hit.x,
      bodyMapY: hit.y,
    });
  };

  const addRegionFromSelect = () => {
    if (!regionId) return;
    upsertPainRegion({
      regionId,
      side: side || undefined,
      bodyMapView: view,
      bodyMapX,
      bodyMapY,
    });
  };

  const removePainRegion = (key: string) => {
    setPainRegions((prev) => prev.filter((r) => r.key !== key));
  };

  const toggleDiagnosis = (id: string) => {
    setSelectedDiagnosisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleTreatment = (id: string) => {
    setSelectedTreatmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addDiagnosis = async () => {
    if (!regionId || !newDx.trim()) return;
    try {
      const { data } = await api.post<PhysioDiagnosis>("/fisioterapia/diagnoses", {
        regionId,
        name: newDx.trim(),
      });
      setDiagnoses((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSelectedDiagnosisIds((prev) => [...prev, data.id]);
      setNewDx("");
    } catch {
      setError("Não foi possível criar o diagnóstico.");
    }
  };

  const addTreatment = async () => {
    if (!newTx.trim()) return;
    try {
      const { data } = await api.post<PhysioTreatment>("/fisioterapia/treatments", {
        name: newTx.trim(),
      });
      setTreatments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSelectedTreatmentIds((prev) => [...prev, data.id]);
      setNewTx("");
    } catch {
      setError("Não foi possível criar o tratamento.");
    }
  };

  const uploadExam = async () => {
    if (!playerId) {
      setError("Selecione o atleta antes de enviar o exame.");
      return;
    }
    if (!uploadFile) {
      setError("Selecione um arquivo (PDF ou imagem).");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", attachmentName.trim() || uploadFile.name);
      formData.append("documentType", "exame_fisio");
      const { data } = await api.postForm<{
        name: string;
        fileUrl: string;
        fileKey?: string;
      }>(`/players/${playerId}/registration-documents`, formData);
      setAttachments((prev) => [
        ...prev,
        {
          name: data.name,
          url: data.fileUrl,
          key: data.fileKey,
          mimeType: uploadFile.type || undefined,
        },
      ]);
      setAttachmentName("");
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Falha no upload do exame para a pasta do atleta.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!tenantId || !playerId || painRegions.length === 0) {
      setError("Clube, atleta e ao menos um local de dor são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const regionsPayload = painRegions.map(({ regionId: rid, side: s, bodyMapView, bodyMapX: x, bodyMapY: y }) => ({
        regionId: rid,
        side: s,
        bodyMapView,
        bodyMapX: x,
        bodyMapY: y,
      }));
      const diagnosesPayload = selectedDiagnosisIds.map((id) => {
        const dx = diagnoses.find((d) => d.id === id);
        return { diagnosisId: id, regionId: dx?.regionId };
      });
      const treatmentsPayload = selectedTreatmentIds.map((id) => ({ treatmentId: id }));

      if (isEdit && sessionId) {
        const payload: UpdatePhysioSessionPayload = {
          category: category || undefined,
          regions: regionsPayload,
          diagnoses: diagnosesPayload,
          treatments: treatmentsPayload,
          regionId: painRegions[0]?.regionId,
          side: painRegions[0]?.side,
          bodyMapView: painRegions[0]?.bodyMapView ?? view,
          bodyMapX: painRegions[0]?.bodyMapX,
          bodyMapY: painRegions[0]?.bodyMapY,
          symptoms: symptoms || undefined,
          painScore: painScore ? Number(painScore) : undefined,
          diagnosisId: selectedDiagnosisIds[0],
          treatmentId: selectedTreatmentIds[0],
          treatmentNotes: treatmentNotes || undefined,
          estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
          estimatedEndDate: estimatedEndDate || null,
          needsTransition,
          staffId: staffId || undefined,
          staffName: selectedStaff?.name || undefined,
          attachments: attachments.length ? attachments : [],
        };
        await api.patch(`/fisioterapia/sessions/${sessionId}`, payload);
        onSaved(sessionId);
        return;
      }

      const payload: CreatePhysioSessionPayload = {
        tenantId,
        playerId,
        category: category || undefined,
        regions: regionsPayload,
        diagnoses: diagnosesPayload,
        treatments: treatmentsPayload,
        regionId: painRegions[0]?.regionId,
        side: painRegions[0]?.side,
        bodyMapView: painRegions[0]?.bodyMapView ?? view,
        bodyMapX: painRegions[0]?.bodyMapX,
        bodyMapY: painRegions[0]?.bodyMapY,
        symptoms: symptoms || undefined,
        painScore: painScore ? Number(painScore) : undefined,
        diagnosisId: selectedDiagnosisIds[0],
        treatmentId: selectedTreatmentIds[0],
        treatmentNotes: treatmentNotes || undefined,
        estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
        estimatedEndDate: estimatedEndDate || undefined,
        needsTransition,
        staffId: staffId || undefined,
        staffName: selectedStaff?.name || undefined,
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

  if (loadingMeta || loadingSession) {
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
        marks={painRegions.map((r) => ({
          regionId: r.regionId,
          side: r.side,
          view: r.bodyMapView,
          x: r.bodyMapX,
          y: r.bodyMapY,
        }))}
        onSelect={handleMapSelect}
      />

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Clube *</Label>
            <NativeSelect
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setPlayerId("");
                setStaffId("");
                setCategory("");
              }}
              disabled={isEdit}
            >
              <option value="">Selecione…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label>Categoria</Label>
            <NativeSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!tenantId}
            >
              <option value="">Todas do clube</option>
              {categoriesForClub.map((c) => (
                <option key={c.value} value={c.value}>
                  {getCategoryLabel(c.value, "pt", allCats)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Atleta *</Label>
          <NativeSelect value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={isEdit}>
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
            <Label>Região (clique no mapa ou selecione)</Label>
            <NativeSelect
              value={regionId}
              onChange={(e) => {
                setRegionId(e.target.value);
              }}
            >
              <option value="">Selecione no mapa ou aqui…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.namePt}
                </option>
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            disabled={!regionId}
            onClick={addRegionFromSelect}
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar local de dor
          </Button>
        </div>

        {painRegions.length > 0 ? (
          <ul className="space-y-1 rounded-lg border border-border/70 p-2 text-sm">
            {painRegions.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2">
                <span>
                  {regionNameById.get(r.regionId) ?? r.regionId}
                  {sideLabel(r.side) ? ` (${sideLabel(r.side)})` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Remover local"
                  onClick={() => removePainRegion(r.key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Toque no mapa corporal para marcar um ou mais locais de dor (multi-lesão).
          </p>
        )}

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
            <NativeSelect
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={!tenantId}
            >
              <option value="">Selecione do cadastro…</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            {tenantId && staffList.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum fisioterapeuta cadastrado em Saúde → Cadastros → Fisioterapeutas.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Diagnósticos (pode marcar mais de um)</Label>
          {painRegions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
              Adicione ao menos um local de dor para carregar os diagnósticos.
            </p>
          ) : loadingDx ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando diagnósticos…
            </div>
          ) : diagnoses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum diagnóstico cadastrado — adicione abaixo.</p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/70 p-3">
              {diagnoses.map((d) => (
                <label key={d.id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedDiagnosisIds.includes(d.id)}
                    onChange={() => toggleDiagnosis(d.id)}
                  />
                  <span>
                    {d.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({regionNameById.get(d.regionId) ?? d.regionId})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Novo diagnóstico (região selecionada acima)"
              value={newDx}
              onChange={(e) => setNewDx(e.target.value)}
              disabled={!regionId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void addDiagnosis()}
              disabled={!regionId || !newDx.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Tratamentos (pode marcar mais de um)</Label>
          {treatmentOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tratamento cadastrado — adicione abaixo.</p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/70 p-3">
              {treatmentOptions.map((t) => (
                <label key={t.id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selectedTreatmentIds.includes(t.id)}
                    onChange={() => toggleTreatment(t.id)}
                  />
                  <span>
                    {t.name}
                    {t.equipment ? (
                      <span className="ml-1 text-xs text-muted-foreground">({t.equipment})</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Novo tratamento / equipamento"
              value={newTx}
              onChange={(e) => setNewTx(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void addTreatment()}
              disabled={!newTx.trim()}
            >
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

        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={needsTransition}
            onChange={(e) => setNeedsTransition(e.target.checked)}
          />
          Precisa de transição (fisiologia + preparação + fisio)
        </label>

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

        <div className="grid gap-1.5 rounded-lg border border-border/70 p-3">
          <Label>Exames / laudos (pasta do atleta no S3)</Label>
          <p className="text-xs text-muted-foreground">
            Envia para a pasta do jogador e também fica no atendimento. Selecione o atleta antes.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-1.5">
              <Input
                placeholder="Nome do exame"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
              />
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="text-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={uploading || !playerId || !uploadFile}
              onClick={() => void uploadExam()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
          {attachments.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {attachments.map((a, i) => (
                <li key={`${a.url}-${i}`}>
                  <a
                    href={getPublicImageUrl(a.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {a.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="button" className="min-h-[44px]" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEdit ? "Salvar alterações" : "Salvar atendimento"}
        </Button>
      </div>
    </div>
  );
}
