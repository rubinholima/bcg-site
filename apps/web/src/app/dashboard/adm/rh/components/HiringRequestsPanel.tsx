"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasRhCapability } from "@/lib/rh-capabilities";
import { formatDateDayMonYear } from "@/lib/format-date";
import { hiringStatusLabel } from "@/lib/rh-hiring-status";

export type HiringRequestRow = {
  id: string;
  candidateName: string;
  contractType: string;
  status: string;
  proposedStartDate?: string | null;
  tenant?: { name?: string };
  updatedAt: string;
};

type Props = {
  tenantId: string;
  statusFilter?: string;
};

export function HiringRequestsPanel({ tenantId, statusFilter }: Props) {
  const { modules, role } = useAuth();
  const canManage = hasRhCapability(modules, "rh_hiring_manage", role);
  const [rows, setRows] = useState<HiringRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (statusFilter) params.set("status", statusFilter);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get<HiringRequestRow[]>(`/rh/hiring-requests${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (id: string, toStatus: string) => {
    if (!canManage) return;
    try {
      await api.post(`/rh/hiring-requests/${id}/transition`, { toStatus });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Button type="button" variant="outline" size="sm" className="min-h-[44px]" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Nova contratação (em breve no formulário)
        </Button>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidato</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Início previsto</TableHead>
            <TableHead>Empresa</TableHead>
            {canManage && <TableHead className="w-[120px]">Ação</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-8">
                Nenhuma solicitação encontrada.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.candidateName}</TableCell>
                <TableCell>{r.contractType}</TableCell>
                <TableCell>{hiringStatusLabel(r.status)}</TableCell>
                <TableCell>
                  {r.proposedStartDate ? formatDateDayMonYear(r.proposedStartDate) : "—"}
                </TableCell>
                <TableCell>{r.tenant?.name ?? "—"}</TableCell>
                {canManage && (
                  <TableCell>
                    {r.status === "rascunho" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="min-h-[40px]"
                        onClick={() => advance(r.id, "enviado")}
                      >
                        Enviar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
