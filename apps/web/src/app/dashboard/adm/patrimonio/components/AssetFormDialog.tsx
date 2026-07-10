"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DashboardDialogBody,
  DashboardDialogFooter,
  DashboardFieldLabel,
  DashboardFormHero,
  DashboardFormSection,
} from "@/components/dashboard/DashboardDeptHeader";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { api } from "@/lib/api";
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import { Tenant } from "@/types/tenant";
import type { AssetCategoryRow } from "./AssetCategoryFormDialog";
import { ASSET_CATEGORY_KIND_LABEL, ASSET_PIECE_LABEL } from "../patrimonio-labels";

const NATIVE_SELECT_CLASS =
  "w-full min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const STATUS_OPTIONS = [
  { value: "em_uso", label: "Em uso" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "emprestado", label: "Emprestado" },
  { value: "baixado", label: "Baixado" },
];

const PIECE_OPTIONS = Object.entries(ASSET_PIECE_LABEL).map(([value, label]) => ({ value, label }));

export interface AssetRow {
  id: string;
  tenantId: string;
  categoryId: string;
  tagNumber: string | null;
  description: string;
  photoUrl: string | null;
  location: string | null;
  responsibleName: string | null;
  acquisitionDate: string | null;
  acquisitionValue: number | null;
  depreciationRate: number | null;
  status: string;
  notes: string | null;
  pieceType: string | null;
  size: string | null;
  shirtNumber: number | null;
  assignedPlayerId: string | null;
  tenant: { id: string; name: string; slug: string };
  category: { id: string; name: string; kind: string };
  assignedPlayer?: { id: string; name: string; jerseyNumber: number | null } | null;
}

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  registrationProfile?: unknown;
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories: AssetCategoryRow[];
  tenantId: string;
  edit?: AssetRow | null;
  onSuccess: (savedTenantId: string) => void;
  onPhotoUpdated?: (photoUrl: string) => void;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  tenantId,
  edit,
  onSuccess,
  onPhotoUpdated,
}: AssetFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "error" | "warning" | "success" } | null>(null);
  const skipNextPhotoAutosave = useRef(false);
  const photoAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialogPlayers, setDialogPlayers] = useState<PlayerOption[]>([]);
  const [catTenantId, setCatTenantId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [location, setLocation] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [acquisitionValue, setAcquisitionValue] = useState<string>("");
  const [depreciationRate, setDepreciationRate] = useState<string>("");
  const [status, setStatus] = useState("em_uso");
  const [notes, setNotes] = useState("");
  const [pieceType, setPieceType] = useState("");
  const [size, setSize] = useState("");
  const [shirtNumber, setShirtNumber] = useState<string>("");
  const [assignedPlayerId, setAssignedPlayerId] = useState<string>("");

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isUniform = selectedCategory?.kind === "uniform";
  const tenantCategories = categories.filter((c) => c.tenant.id === (edit ? edit.tenant.id : catTenantId || tenantId));
  const tenantName = tenants.find((t) => t.id === catTenantId)?.name ?? edit?.tenant.name;

  const playerTenantId = edit?.tenant.id || catTenantId || tenantId;

  useEffect(() => {
    if (!open || !playerTenantId) {
      setDialogPlayers([]);
      return;
    }
    let cancelled = false;
    api
      .get<PlayerOption[]>(`/players?tenantId=${encodeURIComponent(playerTenantId)}`)
      .then(({ data }) => {
        if (!cancelled) setDialogPlayers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDialogPlayers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, playerTenantId, edit?.id]);

  const persistPhotoUrl = useCallback(
    async (url: string) => {
      if (!edit?.id) return;
      setSavingPhoto(true);
      try {
        await api.patch(`/patrimonio/assets/${edit.id}`, {
          photoUrl: url.trim(),
        });
        onPhotoUpdated?.(url.trim());
      } catch (err) {
        setFeedback({
          variant: "error",
          title: "Foto não salva",
          message:
            err instanceof Error
              ? err.message
              : "Não foi possível vincular a foto ao bem. Tente de novo ou clique em Salvar.",
        });
      } finally {
        setSavingPhoto(false);
      }
    },
    [edit?.id, onPhotoUpdated],
  );

  const shouldPersistPhotoImmediately = (url: string) => {
    const t = url.trim();
    if (!t) return true;
    return (
      t.includes("media/") ||
      t.includes("amazonaws.com") ||
      t.includes("bostoncitygroup.biz")
    );
  };

  const handlePhotoUrlChange = useCallback(
    (url: string) => {
      setPhotoUrl(url);
      if (!edit?.id) return;
      if (skipNextPhotoAutosave.current) {
        skipNextPhotoAutosave.current = false;
        return;
      }
      if (photoAutosaveTimerRef.current) clearTimeout(photoAutosaveTimerRef.current);
      if (shouldPersistPhotoImmediately(url)) {
        void persistPhotoUrl(url);
        return;
      }
      photoAutosaveTimerRef.current = setTimeout(() => {
        void persistPhotoUrl(url);
      }, 700);
    },
    [edit?.id, persistPhotoUrl],
  );

  useEffect(() => {
    return () => {
      if (photoAutosaveTimerRef.current) clearTimeout(photoAutosaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    skipNextPhotoAutosave.current = true;
    if (edit) {
      setCatTenantId(edit.tenant.id);
      setCategoryId(edit.categoryId);
      setTagNumber(edit.tagNumber ?? "");
      setDescription(edit.description);
      setPhotoUrl(edit.photoUrl ?? "");
      setLocation(edit.location ?? "");
      setResponsibleName(edit.responsibleName ?? "");
      setAcquisitionDate(edit.acquisitionDate ? edit.acquisitionDate.slice(0, 10) : "");
      setAcquisitionValue(edit.acquisitionValue != null ? String(edit.acquisitionValue) : "");
      setDepreciationRate(edit.depreciationRate != null ? String(edit.depreciationRate) : "");
      setStatus(edit.status ?? "em_uso");
      setNotes(edit.notes ?? "");
      setPieceType(edit.pieceType ?? "");
      setSize(edit.size ?? "");
      setShirtNumber(edit.shirtNumber != null ? String(edit.shirtNumber) : "");
      setAssignedPlayerId(edit.assignedPlayerId ?? "");
    } else {
      setCatTenantId(tenantId);
      setCategoryId("");
      setTagNumber("");
      setDescription("");
      setPhotoUrl("");
      setLocation("");
      setResponsibleName("");
      setAcquisitionDate("");
      setAcquisitionValue("");
      setDepreciationRate("");
      setStatus("em_uso");
      setNotes("");
      setPieceType("");
      setSize("");
      setShirtNumber("");
      setAssignedPlayerId("");
    }
  }, [open, edit, tenantId]);

  useEffect(() => {
    if (!open) return;
    if (!catTenantId || !categoryId) return;
    const exists = categories.some((c) => c.id === categoryId && c.tenant.id === catTenantId);
    if (!exists) setCategoryId("");
  }, [open, catTenantId, categoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantIdForSubmit = catTenantId;
    if (!tenantIdForSubmit?.trim() || !categoryId?.trim() || !description?.trim()) return;
    if (isUniform && !pieceType) {
      setFeedback({
        variant: "warning",
        title: "Tipo de peça obrigatório",
        message: "Para kit uniforme, selecione o tipo de peça antes de salvar.",
      });
      return;
    }
    setSaving(true);
    try {
      const photoPayloadCreate = photoUrl.trim() || undefined;
      if (edit) {
        await api.patch(`/patrimonio/assets/${edit.id}`, {
          tenantId: catTenantId,
          categoryId: categoryId || undefined,
          tagNumber: tagNumber.trim() || undefined,
          description: description.trim(),
          photoUrl: photoUrl.trim(),
          location: location.trim() || undefined,
          responsibleName: responsibleName.trim() || undefined,
          acquisitionDate: acquisitionDate || undefined,
          acquisitionValue: acquisitionValue ? Number(acquisitionValue) : undefined,
          depreciationRate: depreciationRate ? Number(depreciationRate) : undefined,
          status,
          notes: notes.trim() || undefined,
          pieceType: isUniform ? pieceType || undefined : undefined,
          size: isUniform ? size.trim() || undefined : undefined,
          shirtNumber: isUniform && shirtNumber ? Number(shirtNumber) : undefined,
          assignedPlayerId: isUniform ? (assignedPlayerId || null) : null,
        });
      } else {
        await api.post("/patrimonio/assets", {
          tenantId: catTenantId,
          categoryId,
          tagNumber: tagNumber.trim() || undefined,
          description: description.trim(),
          photoUrl: photoPayloadCreate,
          location: location.trim() || undefined,
          responsibleName: responsibleName.trim() || undefined,
          acquisitionDate: acquisitionDate || undefined,
          acquisitionValue: acquisitionValue ? Number(acquisitionValue) : undefined,
          depreciationRate: depreciationRate ? Number(depreciationRate) : undefined,
          status,
          notes: notes.trim() || undefined,
          pieceType: isUniform ? pieceType || undefined : undefined,
          size: isUniform ? size.trim() || undefined : undefined,
          shirtNumber: isUniform && shirtNumber ? Number(shirtNumber) : undefined,
          assignedPlayerId: isUniform && assignedPlayerId ? assignedPlayerId : undefined,
        });
      }
      onSuccess(tenantIdForSubmit);
      onOpenChange(false);
    } catch (err) {
      setFeedback({
        variant: "error",
        title: "Erro ao salvar",
        message: err instanceof Error ? err.message : "Não foi possível salvar o bem patrimonial.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className="!w-[min(56rem,calc(100vw-1.5rem))] !max-w-none max-h-[92vh] overflow-hidden p-0"
        >
          <form onSubmit={handleSubmit} className="flex max-h-[92vh] flex-col">
            <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4">
              <DialogTitle>{edit ? "Editar bem patrimonial" : "Novo bem patrimonial"}</DialogTitle>
            </DialogHeader>

            <DashboardDialogBody>
              <DashboardFormHero
                eyebrow="Patrimônio"
                title={description.trim() || (edit ? edit.description : "Cadastro de bem")}
                subtitle={[tenantName, selectedCategory?.name].filter(Boolean).join(" · ") || "Preencha clube, categoria e descrição"}
                icon={Package}
                accent="emerald"
              />

              <DashboardFormSection title="Identificação" accent="emerald">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <DashboardFieldLabel accent="emerald">Clube / Empresa *</DashboardFieldLabel>
                    <select
                      required
                      className={NATIVE_SELECT_CLASS}
                      value={catTenantId}
                      onChange={(e) => setCatTenantId(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-category">Categoria *</DashboardFieldLabel>
                    <select
                      id="asset-category"
                      required
                      className={NATIVE_SELECT_CLASS}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Selecione a categoria</option>
                      {tenantCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.kind === "uniform" ? "(kit)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedCategory ? (
                      <p className="text-xs text-muted-foreground">
                        Tipo: {ASSET_CATEGORY_KIND_LABEL[selectedCategory.kind] ?? selectedCategory.kind}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-desc">Descrição *</DashboardFieldLabel>
                    <Input
                      id="asset-desc"
                      className="text-foreground"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex.: Mesa de reunião, Notebook Dell"
                      required
                    />
                  </div>
                </div>
              </DashboardFormSection>

              {isUniform && (
                <DashboardFormSection title="Kit uniforme" accent="emerald">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <DashboardFieldLabel accent="emerald" htmlFor="asset-piece">Tipo de peça *</DashboardFieldLabel>
                      <select
                        id="asset-piece"
                        required
                        className={NATIVE_SELECT_CLASS}
                        value={pieceType}
                        onChange={(e) => setPieceType(e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {PIECE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <DashboardFieldLabel accent="emerald" htmlFor="asset-size">Tamanho</DashboardFieldLabel>
                      <Input
                        id="asset-size"
                        className="text-foreground"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="P, M, G, GG"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <DashboardFieldLabel accent="emerald" htmlFor="asset-shirt">Número da camisa</DashboardFieldLabel>
                      <Input
                        id="asset-shirt"
                        type="number"
                        min={1}
                        max={99}
                        className="text-foreground"
                        value={shirtNumber}
                        onChange={(e) => setShirtNumber(e.target.value)}
                        placeholder="1–99"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <DashboardFieldLabel accent="emerald" htmlFor="asset-player">Atribuído ao jogador</DashboardFieldLabel>
                      <select
                        id="asset-player"
                        className={NATIVE_SELECT_CLASS}
                        value={assignedPlayerId}
                        onChange={(e) => setAssignedPlayerId(e.target.value)}
                      >
                        <option value="">Nenhum</option>
                        {dialogPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {getPlayerListDisplayName(p)} {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </DashboardFormSection>
              )}

              <DashboardFormSection title="Foto do bem" highlight accent="emerald">
                <PhotoUploadWithName
                  sizeKey="patrimonio"
                  value={photoUrl}
                  onChange={handlePhotoUrlChange}
                  placeholder="Escolher da pasta Patrimônio"
                  urlPlaceholder="URL da imagem"
                  uploadFolderHint="patrimonio"
                  displayNameAuto={description.trim() || undefined}
                  showAutomaticPhotoNameNote={false}
                  showFileFormatHint={false}
                  recordLinking={savingPhoto}
                  recordLinkingLabel="Vinculando foto ao bem patrimonial…"
                />
                {!edit ? (
                  <p className="text-xs text-muted-foreground">
                    As fotos ficam na pasta <strong>Patrimônio</strong> (Mídia). Ao criar o bem, clique em Salvar para vincular.
                  </p>
                ) : null}
              </DashboardFormSection>

              <DashboardFormSection title="Localização e responsável" accent="emerald">
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isUniform && (
                    <div className="grid gap-1.5">
                      <DashboardFieldLabel accent="emerald" htmlFor="asset-tag">Nº etiqueta patrimonial</DashboardFieldLabel>
                      <Input
                        id="asset-tag"
                        className="text-foreground"
                        value={tagNumber}
                        onChange={(e) => setTagNumber(e.target.value)}
                        placeholder="Ex.: 001234"
                      />
                    </div>
                  )}
                  <div className="grid gap-1.5">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-location">Localização</DashboardFieldLabel>
                    <Input
                      id="asset-location"
                      className="text-foreground"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Setor, sala, prédio"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-responsible">Responsável</DashboardFieldLabel>
                    <Input
                      id="asset-responsible"
                      className="text-foreground"
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-status">Situação</DashboardFieldLabel>
                    <select
                      id="asset-status"
                      className={NATIVE_SELECT_CLASS}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </DashboardFormSection>

              <DashboardFormSection title="Dados financeiros" accent="emerald">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-date">Data de aquisição</DashboardFieldLabel>
                    <Input
                      id="asset-date"
                      type="date"
                      className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                      value={acquisitionDate}
                      onChange={(e) => setAcquisitionDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-value">Valor (R$)</DashboardFieldLabel>
                    <Input
                      id="asset-value"
                      type="number"
                      step="0.01"
                      min={0}
                      className="text-foreground"
                      value={acquisitionValue}
                      onChange={(e) => setAcquisitionValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <DashboardFieldLabel accent="emerald" htmlFor="asset-depreciation">Taxa de depreciação (% ao ano)</DashboardFieldLabel>
                    <Input
                      id="asset-depreciation"
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      className="text-foreground"
                      value={depreciationRate}
                      onChange={(e) => setDepreciationRate(e.target.value)}
                      placeholder="Ex.: 10"
                    />
                  </div>
                </div>
              </DashboardFormSection>

              <DashboardFormSection title="Observações" accent="emerald">
                <textarea
                  id="asset-notes"
                  className="min-h-[88px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas sobre o bem"
                />
              </DashboardFormSection>
            </DashboardDialogBody>

            <DashboardDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || savingPhoto} className="min-h-[44px]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {edit ? "Salvar alterações" : "Criar bem"}
              </Button>
            </DashboardDialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        variant={feedback?.variant ?? "error"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
