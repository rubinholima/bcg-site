"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { employeeCodeDisplay, employeeInternalIdDisplay } from "@/lib/rh-employee-display";

interface RhEmployeeSummary {
  id: string;
  code: string | null;
  name: string;
}

interface RhEmployeeLinkCardProps {
  playerId: string;
}

export function RhEmployeeLinkCard({ playerId }: RhEmployeeLinkCardProps) {
  const { canAccessModule } = useAuth();
  const canRh = canAccessModule("adm_rh");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<RhEmployeeSummary | null>(null);

  const loadEmployee = useCallback(async () => {
    if (!canRh) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<RhEmployeeSummary>(`/rh/employees/by-player/${playerId}`);
      setEmployee(data);
    } catch {
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [canRh, playerId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const handleCreateFromPlayer = async () => {
    setSaving(true);
    try {
      const { data } = await api.post<RhEmployeeSummary>(`/rh/employees/from-player/${playerId}`);
      setEmployee(data);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao criar colaborador RH");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      const { data } = await api.post<RhEmployeeSummary>(`/rh/employees/${employee.id}/sync-identity`);
      setEmployee(data);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao sincronizar dados");
    } finally {
      setSaving(false);
    }
  };

  if (!canRh) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando vínculo com RH…
      </div>
    );
  }

  if (employee) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Colaborador RH vinculado
            </p>
            <p className="mt-1 text-muted-foreground">
              Matrícula{" "}
              <span className="font-mono uppercase text-foreground">{employeeCodeDisplay(employee.code)}</span>
              {" · "}
              ID <span className="font-mono text-foreground">{employeeInternalIdDisplay(employee.id)}</span>
            </p>
            <p className="mt-0.5 uppercase">{employee.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Nome, CPF, RG, contato e foto são sincronizados automaticamente entre RH e Futebol ao salvar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={handleSync}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Sincronizar
            </Button>
            <Link
              href="/dashboard/adm/rh"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
            >
              Abrir RH
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium">Sem vínculo com RH</p>
      <p className="mt-1 text-muted-foreground">
        Crie o colaborador RH com os dados deste atleta (nome, CPF, contato, foto) ou vincule manualmente em{" "}
        <Link href="/dashboard/adm/rh" className="text-foreground underline">
          ADM → RH
        </Link>
        .
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        disabled={saving}
        onClick={handleCreateFromPlayer}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        Criar colaborador RH com dados deste atleta
      </Button>
    </div>
  );
}
