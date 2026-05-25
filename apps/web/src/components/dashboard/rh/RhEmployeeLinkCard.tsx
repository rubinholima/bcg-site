"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Users } from "lucide-react";
import { api } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<RhEmployeeSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<RhEmployeeSummary>(`/rh/employees/by-player/${playerId}`);
        if (!cancelled) setEmployee(data);
      } catch {
        if (!cancelled) setEmployee(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

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
              Matrícula <span className="font-mono uppercase text-foreground">{employeeCodeDisplay(employee.code)}</span>
              {" · "}
              ID <span className="font-mono text-foreground">{employeeInternalIdDisplay(employee.id)}</span>
            </p>
            <p className="mt-0.5 uppercase">{employee.name}</p>
          </div>
          <Link
            href="/dashboard/adm/rh"
            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
          >
            Abrir RH
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium">Sem vínculo com RH</p>
      <p className="mt-1 text-muted-foreground">
        Cadastre este atleta em{" "}
        <Link href="/dashboard/adm/rh" className="text-foreground underline">
          ADM → RH → Colaboradores
        </Link>{" "}
        e vincule ao cadastro de atleta para unificar matrícula, contrato e dados operacionais.
      </p>
    </div>
  );
}
