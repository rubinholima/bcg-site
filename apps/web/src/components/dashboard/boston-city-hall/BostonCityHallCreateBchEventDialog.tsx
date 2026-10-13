"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BCH_BTN_PRIMARY, BCH_INPUT } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { bchEventSetupPath } from "@/components/dashboard/boston-city-hall/bch-event-setup-path";
import type { Tenant } from "@/types/tenant";
import { cn } from "@/lib/utils";

const BCH_TENANT_SLUG = "boston-city-hall";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function BostonCityHallCreateBchEventDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bchTenantId = useMemo(
    () => tenants.find((t) => t.slug === BCH_TENANT_SLUG)?.id ?? "",
    [tenants],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingTenants(true);
    api
      .get<Tenant[]>("/tenants")
      .then((r) => setTenants(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTenants([]))
      .finally(() => setLoadingTenants(false));
  }, [open]);

  const handleCreate = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome do evento.");
      return;
    }
    if (!bchTenantId) {
      setError(
        `Empresa "${BCH_TENANT_SLUG}" não encontrada. Verifique cadastro de tenants ou permissões.`,
      );
      return;
    }
    setSaving(true);
    try {
      const slug = slugify(trimmed) || "evento";
      const res = await api.post<{ id: string }>("/events", {
        name: trimmed,
        slug,
        organizer: "tenant",
        tenantId: bchTenantId,
        category: "other",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        competitionFormat: null,
      });
      const id = res.data?.id;
      if (!id) throw new Error("Resposta inválida ao criar evento.");
      onOpenChange(false);
      onCreated?.();
      router.push(bchEventSetupPath(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-[#0c1222] text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar evento (rascunho)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-slate-400">
            Cria um rascunho no tenant Boston City Hall e abre o Event Setup. Não gera reserva nem
            duplica eventos existentes.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bch-new-event-name">Nome do evento</Label>
            <Input
              id="bch-new-event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(BCH_INPUT, "min-h-[44px]")}
              placeholder="Ex.: Jantar de gala 2026"
              disabled={saving}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bch-new-event-start">Data início (opcional)</Label>
              <Input
                id="bch-new-event-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(BCH_INPUT, "text-foreground [&::-webkit-datetime-edit]:text-foreground")}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bch-new-event-end">Data fim (opcional)</Label>
              <Input
                id="bch-new-event-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn(BCH_INPUT, "text-foreground [&::-webkit-datetime-edit]:text-foreground")}
                disabled={saving}
              />
            </div>
          </div>
          {loadingTenants ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Carregando tenant…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
            onClick={() => void handleCreate()}
            disabled={saving || loadingTenants}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Criar e preparar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
