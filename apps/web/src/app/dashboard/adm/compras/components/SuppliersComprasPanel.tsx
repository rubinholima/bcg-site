"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardDeptSearch,
  DashboardFieldLabel,
  DashboardFilterBox,
} from "@/components/dashboard/DashboardDeptHeader";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/tenant";
import { SupplierFormDialog, type SupplierRow } from "./SupplierFormDialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type SupplierCategoryRow = { id: string; name: string; slug: string };

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

export function SuppliersComprasPanel({
  tenants,
  tenantId,
  onTenantChange,
}: {
  tenants: Tenant[];
  tenantId: string;
  onTenantChange: (id: string) => void;
}) {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [categories, setCategories] = useState<SupplierCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<SupplierRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof loadHistory>> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [feedback, setFeedback] = useState({
    open: false,
    title: "",
    message: "",
    variant: "error" as "error" | "success",
  });

  const loadHistory = async (id: string) => {
    const { data } = await api.get(`/compras/suppliers/${id}/history`);
    return data as {
      quotes: Array<{ id: string; totalAmount: number; isWinner: boolean }>;
      purchaseOrders: Array<{ id: string; orderNumber: string | null; status: string }>;
      wins: number;
      audit: Array<{ action: string; createdAt: string }>;
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (countryFilter.trim()) params.set("country", countryFilter.trim());
      const qs = params.toString();
      const [{ data: list }, { data: cats }] = await Promise.all([
        api.get<SupplierRow[]>(`/compras/suppliers${qs ? `?${qs}` : ""}`),
        api.get<SupplierCategoryRow[]>(
          `/compras/supplier-categories${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`,
        ),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, statusFilter, categoryFilter, countryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    try {
      const h = await loadHistory(id);
      setDetail(h);
    } catch {
      setDetail(null);
    }
  };

  const toggleStatus = async (row: SupplierRow) => {
    const next = row.status === "active" ? "inactive" : "active";
    try {
      await api.patch(`/compras/suppliers/${row.id}/status`, { status: next });
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível alterar o status.",
      });
    }
  };

  const addCategory = async () => {
    if (!tenantId || !newCategoryName.trim()) return;
    try {
      await api.post("/compras/supplier-categories", {
        tenantId,
        name: newCategoryName.trim(),
      });
      setNewCategoryName("");
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao criar categoria.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <DashboardFilterBox accent="emerald" className="sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="emerald">Clube / Empresa</DashboardFieldLabel>
          <NativeSelect value={tenantId || ""} onChange={(e) => onTenantChange(e.target.value)}>
            <option value="">Todos (se permitido)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="emerald">Status</DashboardFieldLabel>
          <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="blocked">Bloqueado</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="emerald">Categoria</DashboardFieldLabel>
          <NativeSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <DashboardFieldLabel accent="emerald">País</DashboardFieldLabel>
          <Input
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            placeholder="Ex.: BR, US"
            className="text-foreground"
          />
        </div>
      </DashboardFilterBox>

      <DashboardDeptSearch
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, documento, e-mail ou contato…"
      />

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Button type="button" size="sm" className="min-h-[44px]" onClick={() => { setEdit(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo fornecedor
        </Button>
        <Link href="/dashboard/adm/fornecedores" className="text-xs text-primary underline">
          Abrir página legada de fornecedores
        </Link>
      </div>

      <fieldset className="rounded-lg border border-border p-3 space-y-2">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Categorias de fornecedor</legend>
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs text-foreground"
            placeholder="Nova categoria"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={!tenantId}
          />
          <Button type="button" size="sm" variant="outline" disabled={!tenantId || !newCategoryName.trim()} onClick={() => void addCategory()}>
            Adicionar
          </Button>
        </div>
      </fieldset>

      {loading ? (
        <p className="flex justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando fornecedores…
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell">Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.document, row.taxId].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.tenant?.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {row.email || row.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium">{STATUS_LABEL[row.status ?? "active"] ?? row.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => void openDetail(row.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => { setEdit(row); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => void toggleStatus(row)}>
                        {row.status === "active" ? "Inativar" : "Ativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        edit={edit}
        categories={categories}
        onSuccess={() => void load()}
      />

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Histórico do fornecedor
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <p>
                Cotações: <strong>{detail.quotes.length}</strong> · Vitórias: <strong>{detail.wins}</strong> · Pedidos:{" "}
                <strong>{detail.purchaseOrders.length}</strong>
              </p>
              {detail.audit.slice(0, 8).map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("pt-BR")} — {a.action}
                </p>
              ))}
            </div>
          ) : (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          )}
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
