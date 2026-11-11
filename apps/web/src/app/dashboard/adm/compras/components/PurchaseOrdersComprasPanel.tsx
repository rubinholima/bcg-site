"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DashboardFieldLabel, DashboardFilterBox } from "@/components/dashboard/DashboardDeptHeader";
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
import { PurchaseOrderFormDialog, type PurchaseOrderRow } from "./PurchaseOrderFormDialog";
import type { SupplierRow } from "./SupplierFormDialog";
import type { ProductRow } from "./ProductFormDialog";

const PO_STATUS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  received: "Recebido",
  cancelled: "Cancelado",
};

export function PurchaseOrdersComprasPanel({
  tenants,
  tenantId,
  suppliers,
}: {
  tenants: Tenant[];
  tenantId: string;
  suppliers: SupplierRow[];
}) {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<PurchaseOrderRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (statusFilter) params.set("status", statusFilter);
      const qs = params.toString();
      const { data } = await api.get<PurchaseOrderRow[]>(`/compras/purchase-orders${qs ? `?${qs}` : ""}`);
      setRows(Array.isArray(data) ? data : []);
      if (tenantId) {
        const prod = await api.get<ProductRow[]>(`/compras/products?tenantId=${encodeURIComponent(tenantId)}`);
        setProducts(Array.isArray(prod.data) ? prod.data : []);
      }
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
      <DashboardFilterBox accent="sky" className="sm:grid-cols-2">
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="sky">Status do pedido</DashboardFieldLabel>
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(PO_STATUS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" size="sm" className="min-h-[44px]" disabled={!tenantId} onClick={() => { setEdit(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo pedido
          </Button>
        </div>
      </DashboardFilterBox>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº / Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  {o.orderNumber || "—"}
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.orderedAt).toLocaleDateString("pt-BR")}
                  </div>
                </TableCell>
                <TableCell>{o.supplier?.name}</TableCell>
                <TableCell>{PO_STATUS[o.status] ?? o.status}</TableCell>
                <TableCell>
                  {o.totalAmount != null
                    ? o.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="icon" variant="ghost" onClick={() => { setEdit(o); setDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PurchaseOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        suppliers={suppliers}
        products={products}
        onSuccess={() => void load()}
        edit={edit}
      />
    </div>
  );
}
