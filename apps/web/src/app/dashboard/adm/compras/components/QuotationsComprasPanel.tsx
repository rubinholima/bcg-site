"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DashboardFieldLabel, DashboardFilterBox, DashboardStatGrid } from "@/components/dashboard/DashboardDeptHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/tenant";
import { REQUISITION_STATUS_LABELS, type PurchaseRequisitionWorkflowRow } from "@/lib/purchase-workflow-types";

export function QuotationsComprasPanel({
  tenants,
  tenantId,
  onOpenRequisition,
}: {
  tenants: Tenant[];
  tenantId: string;
  onOpenRequisition: (id: string) => void;
}) {
  const [rows, setRows] = useState<PurchaseRequisitionWorkflowRow[]>([]);
  const [counts, setCounts] = useState({
    emCotacao: 0,
    aguardandoAprovacao: 0,
    emCompra: 0,
    aguardandoFornecedor: 0,
  });
  const [statusFilter, setStatusFilter] = useState("em_cotacao");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (statusFilter) params.set("status", statusFilter);
      const [listRes, countsRes] = await Promise.all([
        api.get<PurchaseRequisitionWorkflowRow[]>(`/compras/workflow/requisitions?${params.toString()}`),
        api.get<typeof counts>(
          `/compras/workflow/quotations/inbox-counts${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`,
        ),
      ]);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setCounts(countsRes.data ?? counts);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <DashboardStatGrid
        items={[
          { label: "Em cotação", value: counts.emCotacao, tone: "amber" },
          { label: "Aguardando fornecedor", value: counts.aguardandoFornecedor, tone: "sky" },
          { label: "Aguardando aprovação", value: counts.aguardandoAprovacao, tone: "violet" },
          { label: "Em compra", value: counts.emCompra, tone: "emerald" },
        ]}
      />

      <DashboardFilterBox accent="amber" className="sm:grid-cols-2">
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="amber">Status</DashboardFieldLabel>
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="em_cotacao">Em cotação</option>
            <option value="aguardando_gerente">Aguardando gerente</option>
            <option value="aguardando_financeiro">Aguardando financeiro</option>
            <option value="aguardando_diretoria">Aguardando diretoria</option>
            <option value="em_compra">Em compra</option>
            <option value="aprovada">Aprovada</option>
          </NativeSelect>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => void load()}>
            Atualizar
          </Button>
        </div>
      </DashboardFilterBox>

      {loading ? (
        <p className="flex justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cotação/requisição neste filtro.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requisição</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cotações</TableHead>
              <TableHead className="text-right">Abrir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="font-medium">{r.requestedByName}</span>
                  <div className="text-xs text-muted-foreground">{r.departmentName || "—"}</div>
                </TableCell>
                <TableCell>{r.tenant?.name}</TableCell>
                <TableCell>{REQUISITION_STATUS_LABELS[r.status] ?? r.status}</TableCell>
                <TableCell>{r.quotes?.length ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onOpenRequisition(r.id)}>
                    <FileText className="mr-1 h-4 w-4" />
                    Gerir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
