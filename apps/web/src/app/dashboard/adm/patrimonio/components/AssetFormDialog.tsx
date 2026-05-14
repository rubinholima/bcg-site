"use client";

import { useState, useEffect } from "react";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { api } from "@/lib/api";
import { patrimonioMediaThumbSrc } from "../patrimonio-media";
import { Tenant } from "@/types/tenant";
import type { AssetCategoryRow } from "./AssetCategoryFormDialog";
import { ASSET_PIECE_LABEL } from "../patrimonio-labels";

const NATIVE_SELECT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  categories: AssetCategoryRow[];
  tenantId: string;
  edit?: AssetRow | null;
  onSuccess: (savedTenantId: string) => void;
}

const STATUS_OPTIONS = [
  { value: "em_uso", label: "Em uso" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "emprestado", label: "Emprestado" },
  { value: "baixado", label: "Baixado" },
];

const PIECE_OPTIONS = Object.entries(ASSET_PIECE_LABEL).map(([value, label]) => ({ value, label }));

export function AssetFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  tenantId,
  edit,
  onSuccess,
}: AssetFormDialogProps) {
  const [saving, setSaving] = useState(false);
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
  const rawPhoto = photoUrl.trim();
  const photoPreviewSrc = rawPhoto ? patrimonioMediaThumbSrc(rawPhoto) || rawPhoto : "";

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

  useEffect(() => {
    if (!open) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantIdForSubmit = edit ? edit.tenantId : catTenantId;
    if (!tenantIdForSubmit?.trim() || !categoryId?.trim() || !description?.trim()) return;
    if (isUniform && !pieceType) {
      alert("Para kit uniforme, selecione o tipo de peça.");
      return;
    }
    setSaving(true);
    try {
      const photoPayloadCreate = photoUrl.trim() || undefined;
      if (edit) {
        await api.patch(`/patrimonio/assets/${edit.id}`, {
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
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar bem" : "Novo bem patrimonial"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Clube/Empresa *</Label>
              <select
                required
                disabled={!!edit}
                className={NATIVE_SELECT_CLASS}
                value={edit ? edit.tenant.id : catTenantId}
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
            <div className="grid gap-2">
              <Label htmlFor="asset-category">Categoria *</Label>
              <select
                id="asset-category"
                required
                disabled={!!edit}
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
            </div>

            {isUniform && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="asset-piece">Tipo de peça *</Label>
                  <select
                    id="asset-piece"
                    required
                    className={NATIVE_SELECT_CLASS}
                    value={pieceType}
                    onChange={(e) => setPieceType(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {PIECE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asset-size">Tamanho</Label>
                  <Input
                    id="asset-size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="P, M, G, GG"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asset-shirt">Número da camisa</Label>
                  <Input
                    id="asset-shirt"
                    type="number"
                    min={1}
                    max={99}
                    value={shirtNumber}
                    onChange={(e) => setShirtNumber(e.target.value)}
                    placeholder="1–99"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="asset-player">Atribuído ao jogador</Label>
                  <select
                    id="asset-player"
                    className={NATIVE_SELECT_CLASS}
                    value={assignedPlayerId}
                    onChange={(e) => setAssignedPlayerId(e.target.value)}
                  >
                    <option value="">Nenhum</option>
                    {dialogPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="asset-desc">Descrição *</Label>
              <Input
                id="asset-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Mesa de reunião, Notebook Dell"
                required
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Camera className="h-4 w-4 shrink-0 opacity-70" />
                Foto do bem
              </div>
              <p className="text-xs text-muted-foreground">
                Registro visual opcional. Mesmo padrão de exibição do dashboard (resolvePublicMediaUrlForDisplay → proxy). Escolha na biblioteca (pasta Patrimônio) ou cole URL.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="h-28 w-28 rounded-md overflow-hidden bg-muted shrink-0 border border-border mx-auto sm:mx-0">
                  {photoPreviewSrc ? (
                    <img src={photoPreviewSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs text-center px-1">
                      Sem foto
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full min-w-0 space-y-2">
                  <MediaPicker
                    label="Imagem"
                    sizeKey="patrimonio"
                    allowAllFolders
                    uploadFolderHint="patrimonio"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    placeholder="Patrimônio ou biblioteca completa…"
                    hideEmptyFolderHint
                  />
                  <Input
                    className="text-foreground"
                    placeholder="Ou cole a URL da imagem"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {!isUniform && (
              <div className="grid gap-2">
                <Label htmlFor="asset-tag">Nº etiqueta patrimonial</Label>
                <Input
                  id="asset-tag"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  placeholder="Ex.: 001234"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="asset-location">Localização</Label>
              <Input
                id="asset-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Setor, sala, prédio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-responsible">Responsável</Label>
              <Input
                id="asset-responsible"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="asset-date">Data aquisição</Label>
                <Input
                  id="asset-date"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="asset-value">Valor (R$)</Label>
                <Input
                  id="asset-value"
                  type="number"
                  step="0.01"
                  min={0}
                  value={acquisitionValue}
                  onChange={(e) => setAcquisitionValue(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-depreciation">Taxa depreciação (% ao ano)</Label>
              <Input
                id="asset-depreciation"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
                placeholder="Ex.: 10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-status">Situação</Label>
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
            <div className="grid gap-2">
              <Label htmlFor="asset-notes">Observações</Label>
              <textarea
                id="asset-notes"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
