"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateMedicalDeparturePayload,
  MedicalDeparture,
  MedicalDepartureDocument,
  UpdateMedicalDeparturePayload,
} from "@/types/medical-departure";
import {
  MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS,
  MEDICAL_DEPARTURE_DOC_KIND_OPTIONS,
  MEDICAL_DEPARTURE_TRANSPORT_OPTIONS,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/medical-departure-labels";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { getPublicImageUrl } from "@/lib/media-url";

type TenantOpt = { id: string; name: string; categories?: string[] | null };
type StaffOpt = { id: string; name: string; role: string; tenantId?: string | null };
type PlayerOpt = { id: string; name: string; category: string | null };

type DocDraft = MedicalDepartureDocument & { kind: string };

export function MedicalDepartureForm({
  tenants,
  initialTenantId,
  initialPlayerId,
  initialCategory,
  departureId,
  onSaved,
}: {
  tenants: TenantOpt[];
  initialTenantId?: string;
  initialPlayerId?: string;
  initialCategory?: string;
  departureId?: string;
  onSaved: (id: string) => void;
}) {
  const isEdit = Boolean(departureId);
  const { categories: allCats } = useFixtureCategories();
  const [tenantId, setTenantId] = useState(initialTenantId ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  const [playerId, setPlayerId] = useState(initialPlayerId ?? "");
  const [departedAt, setDepartedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [returnedAt, setReturnedAt] = useState("");
  const [destination, setDestination] = useState("");
  const [careType, setCareType] = useState<CreateMedicalDeparturePayload["careType"]>("medico");
  const [reason, setReason] = useState("");
  const [careSummary, setCareSummary] = useState("");
  const [transportMode, setTransportMode] =
    useState<CreateMedicalDeparturePayload["transportMode"]>("proprio");
  const [transportNotes, setTransportNotes] = useState("");
  const [companionStaffId, setCompanionStaffId] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [companionPhone, setCompanionPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [staffList, setStaffList] = useState<StaffOpt[]>([]);
  const [documents, setDocuments] = useState<DocDraft[]>([]);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentKind, setAttachmentKind] = useState<(typeof MEDICAL_DEPARTURE_DOC_KIND_OPTIONS)[number]["value"]>("atestado");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(isEdit);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForClub = useMemo(
    () => filterCategoriesForTenant(allCats, selectedTenant?.categories),
    [allCats, selectedTenant?.categories],
  );

  useEffect(() => {
    if (!departureId) return;
    setLoadingSession(true);
    api
      .get<MedicalDeparture>(`/medical-departures/${departureId}`)
      .then(({ data }) => {
        setTenantId(data.tenantId);
        setPlayerId(data.playerId);
        setCategory(data.category ?? "");
        setDepartedAt(toDateTimeLocalValue(data.departedAt));
        setReturnedAt(toDateTimeLocalValue(data.returnedAt));
        setDestination(data.destination);
        setCareType(data.careType);
        setReason(data.reason);
        setCareSummary(data.careSummary ?? "");
        setTransportMode(data.transportMode);
        setTransportNotes(data.transportNotes ?? "");
        setCompanionStaffId(data.companionStaffId ?? "");
        setCompanionName(data.companionName ?? "");
        setCompanionPhone(data.companionPhone ?? "");
        setNotes(data.notes ?? "");
        setDocuments(
          (data.documents ?? []).map((d) => ({
            ...d,
            kind:
              MEDICAL_DEPARTURE_DOC_KIND_OPTIONS.find((k) => k.documentType === d.documentType)
                ?.value ?? "outro",
          })),
        );
      })
      .catch(() => setError("Não foi possível carregar o registro."))
      .finally(() => setLoadingSession(false));
  }, [departureId]);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<PlayerOpt[]>(`/players?${params}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]));
  }, [tenantId, category]);

  useEffect(() => {
    if (!tenantId) {
      setStaffList([]);
      return;
    }
    api
      .get<StaffOpt[]>(`/medical-staff?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => setStaffList([]));
  }, [tenantId]);

  useEffect(() => {
    if (!playerId) return;
    const p = players.find((x) => x.id === playerId);
    if (p?.category && !category) setCategory(p.category);
  }, [playerId, players, category]);

  const uploadDocument = async () => {
    if (!playerId) {
      setError("Selecione o atleta antes de enviar o documento.");
      return;
    }
    if (!uploadFile) {
      setError("Selecione um arquivo (PDF ou imagem).");
      return;
    }
    const kindOpt = MEDICAL_DEPARTURE_DOC_KIND_OPTIONS.find((k) => k.value === attachmentKind);
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", attachmentName.trim() || uploadFile.name);
      formData.append("documentType", kindOpt?.documentType ?? "doc_saida_ct");
      const { data } = await api.postForm<MedicalDepartureDocument>(
        `/players/${playerId}/registration-documents`,
        formData,
      );
      setDocuments((prev) => [
        ...prev,
        { ...data, kind: attachmentKind },
      ]);
      setAttachmentName("");
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Falha no upload do documento.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!tenantId || !playerId) {
      setError("Clube e atleta são obrigatórios.");
      return;
    }
    if (!destination.trim() || !reason.trim()) {
      setError("Destino e motivo são obrigatórios.");
      return;
    }
    const departedIso = fromDateTimeLocalValue(departedAt);
    if (!departedIso) {
      setError("Data/hora de saída inválida.");
      return;
    }

    const payload: CreateMedicalDeparturePayload = {
      tenantId,
      playerId,
      category: category || undefined,
      departedAt: departedIso,
      returnedAt: fromDateTimeLocalValue(returnedAt),
      destination: destination.trim(),
      careType,
      reason: reason.trim(),
      careSummary: careSummary.trim() || undefined,
      transportMode,
      transportNotes: transportNotes.trim() || undefined,
      companionStaffId: companionStaffId || undefined,
      companionName: companionName.trim() || undefined,
      companionPhone: companionPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      documentIds: documents.map((d) => d.id),
    };

    setSaving(true);
    try {
      if (isEdit && departureId) {
        await api.patch<MedicalDeparture>(`/medical-departures/${departureId}`, payload as UpdateMedicalDeparturePayload);
        onSaved(departureId);
        return;
      }
      const { data } = await api.post<MedicalDeparture>("/medical-departures", payload);
      onSaved(data.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Clube</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setPlayerId("");
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
        <div className="space-y-2">
          <Label>Categoria</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas / automática</option>
            {categoriesForClub.map((c) => (
              <option key={c.value} value={c.value}>
                {getCategoryLabel(c.value, "pt", allCats)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Atleta</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            disabled={!tenantId || isEdit}
          >
            <option value="">Selecione…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.category ? ` (${getCategoryLabel(p.category, "pt", allCats)})` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label>Saída do CT</Label>
          <Input
            type="datetime-local"
            className="min-h-[44px] text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={departedAt}
            onChange={(e) => setDepartedAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Retorno ao CT</Label>
          <Input
            type="datetime-local"
            className="min-h-[44px] text-foreground [&::-webkit-datetime-edit]:text-foreground"
            value={returnedAt}
            onChange={(e) => setReturnedAt(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Destino / local</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} className="min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label>Tipo de atendimento</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={careType}
            onChange={(e) => setCareType(e.target.value as CreateMedicalDeparturePayload["careType"])}
          >
            {MEDICAL_DEPARTURE_CARE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label>Transporte</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={transportMode}
            onChange={(e) =>
              setTransportMode(e.target.value as CreateMedicalDeparturePayload["transportMode"])
            }
          >
            {MEDICAL_DEPARTURE_TRANSPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Motivo da saída</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>O que foi resolvido / descrição do atendimento</Label>
          <Textarea value={careSummary} onChange={(e) => setCareSummary(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Observações do transporte</Label>
          <Input value={transportNotes} onChange={(e) => setTransportNotes(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Acompanhante (equipe)</Label>
          <NativeSelect
            className="min-h-[44px] w-full text-foreground"
            value={companionStaffId}
            onChange={(e) => setCompanionStaffId(e.target.value)}
          >
            <option value="">Nenhum / informar nome</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label>Acompanhante / responsável</Label>
          <Input value={companionName} onChange={(e) => setCompanionName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Telefone do acompanhante</Label>
          <Input value={companionPhone} onChange={(e) => setCompanionPhone(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Observações gerais</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 p-4 space-y-3">
        <Label>Documentos (atestado, exames…)</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <NativeSelect
            className="min-h-[44px] w-full sm:w-[160px] text-foreground"
            value={attachmentKind}
            onChange={(e) =>
              setAttachmentKind(e.target.value as (typeof MEDICAL_DEPARTURE_DOC_KIND_OPTIONS)[number]["value"])
            }
          >
            {MEDICAL_DEPARTURE_DOC_KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </NativeSelect>
          <Input
            placeholder="Nome do documento"
            value={attachmentName}
            onChange={(e) => setAttachmentName(e.target.value)}
            className="min-h-[44px] flex-1"
          />
          <Input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="min-h-[44px] flex-1"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" className="min-h-[44px]" disabled={uploading} onClick={() => void uploadDocument()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Anexar
          </Button>
        </div>
        {documents.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                <a href={getPublicImageUrl(d.fileUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                  {d.name}
                </a>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => setDocuments((prev) => prev.filter((x) => x.id !== d.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Button className="min-h-[44px]" disabled={saving} onClick={() => void handleSubmit()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isEdit ? "Salvar alterações" : "Registrar saída"}
      </Button>
    </div>
  );
}
