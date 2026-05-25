"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Unlink } from "lucide-react";
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
import { cadastroDisplayUpper } from "@/lib/rh-employee-display";
import { type EmployeeRow } from "./EmployeeFormDialog";

interface PlayerOption {
  id: string;
  name: string;
  category?: string | null;
  position?: string | null;
}

interface EmployeeLinkPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeRow | null;
  onSuccess: () => void;
}

export function EmployeeLinkPlayerDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeLinkPlayerDialogProps) {
  const [saving, setSaving] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);

  const tenantId = employee?.tenant.id ?? "";
  const linkedPlayerId = employee?.playerId ?? "";
  const linkedPlayerName = employee?.player?.name ?? "";

  const loadPlayers = useCallback(async (tid: string, search: string) => {
    if (!tid) {
      setPlayerOptions([]);
      return;
    }
    setLoadingPlayers(true);
    try {
      const params = new URLSearchParams({ tenantId: tid });
      if (search.trim()) params.set("search", search.trim());
      const { data } = await api.get<PlayerOption[]>(`/players?${params}`);
      setPlayerOptions(Array.isArray(data) ? data : []);
    } catch {
      setPlayerOptions([]);
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !employee) return;
    setPlayerId(employee.playerId ?? "");
    setPlayerSearch("");
    loadPlayers(employee.tenant.id, "");
  }, [open, employee, loadPlayers]);

  useEffect(() => {
    if (!open || !tenantId) return;
    const t = setTimeout(() => loadPlayers(tenantId, playerSearch), 300);
    return () => clearTimeout(t);
  }, [open, tenantId, playerSearch, loadPlayers]);

  const handleLink = async () => {
    if (!employee || !playerId.trim()) return;
    setSaving(true);
    try {
      await api.post(`/rh/employees/${employee.id}/link-player`, { playerId: playerId.trim() });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao vincular atleta");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlayer = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      await api.post(`/rh/employees/${employee.id}/create-player`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao criar cadastro de atleta");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      await api.post(`/rh/employees/${employee.id}/unlink-player`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao desvincular");
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vínculo com Futebol</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <p className="text-xs text-muted-foreground">Colaborador RH</p>
            <p className="font-medium uppercase">{cadastroDisplayUpper(employee.name)}</p>
            <p className="text-xs text-muted-foreground mt-1">{cadastroDisplayUpper(employee.tenant.name)}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            O cadastro de atleta fica no módulo Futebol. Aqui você apenas vincula ou cria o registro operacional
            (médico, psicologia, jurídico usam esse cadastro).
          </p>

          {linkedPlayerId ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-sm font-medium">Atleta vinculado</p>
              <p className="uppercase">{cadastroDisplayUpper(linkedPlayerName || "Atleta")}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/cadastros/jogadores/${linkedPlayerId}/edit`} target="_blank">
                    Abrir cadastro
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" disabled={saving} onClick={handleUnlink}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="mr-1.5 h-3.5 w-3.5" />}
                  Desvincular
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="link-playerSearch">Buscar atleta</Label>
                <Input
                  id="link-playerSearch"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Nome do atleta"
                  className="uppercase"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="link-player">
                  Atleta existente
                  {loadingPlayers && (
                    <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </Label>
                <select
                  id="link-player"
                  disabled={loadingPlayers}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                >
                  <option value="">Selecione um atleta</option>
                  {playerOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.category ? ` · ${p.category}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={saving || !playerId.trim()}
                onClick={handleLink}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vincular atleta selecionado
              </Button>
              <div className="relative py-1 text-center text-xs text-muted-foreground">
                <span className="bg-card px-2 relative z-10">ou</span>
                <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={saving}
                onClick={handleCreatePlayer}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar novo cadastro de atleta
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
