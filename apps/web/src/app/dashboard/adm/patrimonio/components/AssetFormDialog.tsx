"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import type { AssetCategoryRow } from "./AssetCategoryFormDialog";

export interface AssetRow {
  id: string;
  tenantId: string;
  categoryId: string;
  tagNumber: string | null;
  description: string;
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
  players: PlayerOption[];
  tenantId: string;
  edit?: AssetRow | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "em_uso", label: "Em uso" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "emprestado", label: "Emprestado" },
  { value: "baixado", label: "Baixado" },
];

const PIECE_OPTIONS = [
  { value: "camisa", label: "Camisa" },
  { value: "calção", label: "Calção" },
  { value: "meião", label: "Meião" },
];

export function AssetFormDialog({
  open,
  onOpenChange,
  tenants,
  categories,
  players,
  tenantId,
  edit,
  onSuccess,
}: AssetFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [catTenantId, setCatTenantId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [description, setDescription] = useState("");
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

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setCatTenantId(edit.tenant.id);
      setCategoryId(edit.categoryId);
      setTagNumber(edit.tagNumber ?? "");
      setDescription(edit.description);
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
      alert("Para kit uniforme, selecione o tipo de peça (camisa, calção ou meião).");
      return;
    }
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/patrimonio/assets/${edit.id}`, {
          categoryId: categoryId || undefined,
          tagNumber: tagNumber.trim() || undefined,
          description: description.trim(),
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
      onSuccess();
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
              <Label>Categoria *</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                required
                disabled={!!edit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {tenantCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.kind === "uniform" ? "(kit)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isUniform && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Tipo de peça *</Label>
                  <Select value={pieceType} onValueChange={setPieceType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Camisa / Calção / Meião" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIECE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tamanho</Label>
                  <Input
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="P, M, G, GG"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Número da camisa</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={shirtNumber}
                    onChange={(e) => setShirtNumber(e.target.value)}
                    placeholder="1–99"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Atribuído ao jogador</Label>
                  <Select value={assignedPlayerId || "__none__"} onValueChange={(v) => setAssignedPlayerId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {players.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Label>Situação</Label>
              <Select value={status} onValueChange={setStatus}>
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
