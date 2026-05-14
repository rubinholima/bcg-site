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
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { ASSET_CATEGORY_KIND_OPTIONS, ASSET_CATEGORY_KIND_LABEL } from "../patrimonio-labels";

const NATIVE_SELECT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface AssetCategoryRow {
  id: string;
  name: string;
  code: string | null;
  kind: string;
  tenant: { id: string; name: string; slug: string };
}

interface AssetCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  edit?: AssetCategoryRow | null;
  onSuccess: () => void;
}

export function AssetCategoryFormDialog({
  open,
  onOpenChange,
  tenants,
  edit,
  onSuccess,
}: AssetCategoryFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState("general");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenant.id);
      setName(edit.name);
      setCode(edit.code ?? "");
      setKind(edit.kind && ASSET_CATEGORY_KIND_LABEL[edit.kind] ? edit.kind : "general");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setName("");
      setCode("");
      setKind("general");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim()) return;
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/patrimonio/asset-categories/${edit.id}`, {
          name: name.trim(),
          code: code.trim() || undefined,
          kind,
        });
      } else {
        await api.post("/patrimonio/asset-categories", {
          tenantId,
          name: name.trim(),
          code: code.trim() || undefined,
          kind,
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
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-tenant">Clube/Empresa *</Label>
              <select
                id="cat-tenant"
                required
                disabled={!!edit}
                className={NATIVE_SELECT_CLASS}
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
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
              <Label htmlFor="cat-name">Nome *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Móveis, Kit uniforme"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-code">Código</Label>
              <Input
                id="cat-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: MOV, KIT"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-kind">Tipo</Label>
              <select
                id="cat-kind"
                className={NATIVE_SELECT_CLASS}
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {ASSET_CATEGORY_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
