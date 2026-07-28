"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
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
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPublicImageUrl } from "@/lib/media-url";

type PlayerOpt = { id: string; name: string; category: string | null };
type TenantOpt = { id: string; name: string; categories?: string[] | null };
type StaffOpt = { id: string; name: string; role: string; tenantId?: string | null };

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
  const [diagnosisId, setDiagnosisId] = useState("");
  const [treatmentId, setTreatmentId] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
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
  const [loadingDx, setLoadingDx] = useState(false);
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
    if (!regionId) {
      setDiagnoses([]);
      return;
    }
    setLoadingDx(true);
    api
      .get<PhysioDiagnosis[]>(
        `/fisioterapia/diagnoses?regionId=${encodeURIComponent(regionId)}`,
      )
      .then(({ data }) => {
        setDiagnoses(Array.isArray(data) ? data : []);
      })
      .catch(() => setDiagnoses([]))
      .finally(() => setLoadingDx(false));
  }, [regionId]);

  useEffect(() => {
    if (category && !categoriesForClub.some((c) => c.value === category)) {
      setCategory("");
    }
  }, [category, categoriesForClub]);

  const filteredPlayers = useMemo(() => {
    if (!category) return players;
    return players.filter((p) => p.category === category);
  }, [players, category]);

  const filteredTreatments = useMemo(() => {
    if (!regionId) return treatments;
    return treatments.filter((t) => !t.regionId || t.regionId === regionId);
  }, [treatments, regionId]);

  const selectedStaff = staffList.find((s) => s.id === staffId);

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
    try {
      const { data } = await api.post<PhysioDiagnosis>("/fisioterapia/diagnoses", {
        regionId,
        name: newDx.trim(),
      });
      setDiagnoses((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setDiagnosisId(data.id);
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
        regionId: regionId || undefined,
      });
      setTreatments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setTreatmentId(data.id);
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
            <NativeSelect
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setPlayerId("");
                setStaffId("");
                setCategory("");
              }}
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
                Nenhum fisioterapeuta cadastrado em Saúde → Equipe.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Diagnóstico</Label>
          {!regionId ? (
            <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
              Selecione a região no mapa (ou no campo Região) para carregar os diagnósticos.
            </p>
          ) : loadingDx ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando diagnósticos…
            </div>
          ) : (
            <NativeSelect
              value={diagnosisId}
              onChange={(e) => setDiagnosisId(e.target.value)}
            >
              <option value="">
                {diagnoses.length === 0
                  ? "Nenhum diagnóstico — cadastre abaixo"
                  : `Selecione… (${diagnoses.length})`}
              </option>
              {diagnoses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Novo diagnóstico nesta região"
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
          Salvar atendimento
        </Button>
      </div>
    </div>
  );
}
