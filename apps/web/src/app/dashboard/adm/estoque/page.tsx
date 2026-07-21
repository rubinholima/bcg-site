"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Pencil,
  TrendingDown,
  TrendingUp,
  Warehouse,
  AlertTriangle,
  Layers,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  INVENTORY_KIND_LABELS,
  INVENTORY_KIND_ORDER,
  formatProductPrice,
  type InventoryKind,
} from "@/lib/inventory-kinds";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Tenant } from "@/types/tenant";
import { ProductFormDialog, type ProductRow } from "../compras/components/ProductFormDialog";

const STORAGE_TENANT_KEY = "adm_estoque_tenant_id";

function parseSquadTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((s) => s.trim());
}

function formatCategoryLabel(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stockRatio(current: number, min: number): number {
  if (min <= 0) return current > 0 ? 1 : 0;
  return Math.min(1, current / min);
}

export default function AdmEstoquePage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("todos");
  const [squadFilter, setSquadFilter] = useState<string>("todos");

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [alerts, setAlerts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveProduct, setMoveProduct] = useState<ProductRow | null>(null);
  const [moveQty, setMoveQty] = useState("");
  const [moveDir, setMoveDir] = useState<"in" | "out">("in");
  const [moveNote, setMoveNote] = useState("");
  const [moveUnitPrice, setMoveUnitPrice] = useState("");
  const [moveSaving, setMoveSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length === 0) {
        setTenantId("");
        return;
      }
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_TENANT_KEY) : null;
      const fallback = stored && list.some((x) => x.id === stored) ? stored : list[0].id;
      setTenantId((prev) => (prev && list.some((x) => x.id === prev) ? prev : fallback));
    } catch {
      setTenants([]);
      setTenantId("");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessModule("adm_estoque") && !authLoading) return;
    void loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (tenantId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TENANT_KEY, tenantId);
    }
  }, [tenantId]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const clubCategories = useMemo(
    () => selectedTenant?.categories?.filter(Boolean) ?? [],
    [selectedTenant?.categories],
  );

  const qsProducts = useMemo(() => {
    if (!tenantId) return "";
    const p = new URLSearchParams({ tenantId });
    if (searchDebounced) p.set("search", searchDebounced);
    if (kindFilter !== "todos") p.set("inventoryKind", kindFilter);
    if (squadFilter !== "todos") p.set("squadTag", squadFilter);
    return p.toString();
  }, [tenantId, searchDebounced, kindFilter, squadFilter]);

  const loadData = useCallback(async () => {
    if (!tenantId || !qsProducts) return;
    setLoading(true);
    try {
      const [prRes, alRes] = await Promise.all([
        api.get<ProductRow[]>(`/compras/products?${qsProducts}`),
        api.get<ProductRow[]>(`/compras/products/stock-alerts?tenantId=${tenantId}`),
      ]);
      setProducts(Array.isArray(prRes.data) ? prRes.data : []);
      setAlerts(Array.isArray(alRes.data) ? alRes.data : []);
    } catch {
      setProducts([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, qsProducts]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const k of INVENTORY_KIND_ORDER) map.set(k, []);
    for (const p of products) {
      const k = (p.inventoryKind as InventoryKind) || "uso_consumo";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [products]);

  const stats = useMemo(() => {
    const low = products.filter((p) => p.stockMin > 0 && p.currentStock <= p.stockMin).length;
    return {
      total: products.length,
      low,
      kinds: new Set(products.map((p) => p.inventoryKind || "uso_consumo")).size,
    };
  }, [products]);

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditingProduct(p);
    setProductDialogOpen(true);
  };

  const openMove = (p: ProductRow) => {
    setMoveProduct(p);
    setMoveQty("1");
    setMoveDir("in");
    setMoveNote("");
    setMoveUnitPrice("");
    setMoveOpen(true);
  };

  const submitMove = async () => {
    if (!moveProduct) return;
    const n = parseInt(moveQty, 10);
    if (!Number.isFinite(n) || n <= 0) return;

    const priceStr = moveUnitPrice.replace(",", ".").trim();
    const unitPrice = priceStr ? parseFloat(priceStr) : undefined;

    if (moveDir === "in" && (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice < 0)) {
      setFeedback({
        open: true,
        title: "Preço obrigatório",
        message: "Informe o preço unitário da entrada para atualizar estoque e preço médio.",
      });
      return;
    }

    const signed = moveDir === "in" ? n : -n;
    setMoveSaving(true);
    try {
      await api.post("/compras/stock-movements", {
        productId: moveProduct.id,
        quantity: signed,
        type: "adjustment",
        notes: moveNote.trim() || undefined,
        ...(moveDir === "in" && unitPrice != null ? { unitPrice } : {}),
      });
      setMoveOpen(false);
      await loadData();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro na movimentação",
        message: e instanceof Error ? e.message : "Não foi possível registrar a movimentação.",
      });
    } finally {
      setMoveSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("adm_estoque")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/35 via-card to-sky-950/25 p-6 md:p-10 shadow-lg shadow-emerald-950/10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="shrink-0 bg-background/40 backdrop-blur-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex flex-wrap items-center gap-3 text-foreground">
                <Warehouse className="h-9 w-9 md:h-10 md:w-10 text-emerald-500" />
                Estoque
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/20"
              onClick={openNewProduct}
              disabled={!tenantId || tenantsLoading}
            >
              <Plus className="h-4 w-4" />
              Novo item
            </Button>
            <Link href="/dashboard/adm/compras">
              <Button type="button" variant="outline" className="backdrop-blur-sm bg-background/50">
                Módulo compras
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-background/60 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Layers className="h-3.5 w-3.5" />
              SKUs ativos
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-400 uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5" />
              Abaixo do mínimo
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1 text-amber-900 dark:text-amber-300">{stats.low}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/60 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Shield className="h-3.5 w-3.5" />
              Categorias em uso
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.kinds}</p>
          </div>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-2">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <CardTitle className="text-lg">Clube / empresa</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantsLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresas...
            </p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa. <Link href="/dashboard/empresas" className="text-primary underline">Cadastre</Link>.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label>Unidade</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={kindFilter} onValueChange={setKindFilter}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {INVENTORY_KIND_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>
                        {INVENTORY_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria de futebol</Label>
                <Select value={squadFilter} onValueChange={setSquadFilter}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas / estoque geral</SelectItem>
                    {clubCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {formatCategoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Busca</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 text-foreground"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nome ou SKU..."
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {tenantId && alerts.length > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent px-4 py-3 flex flex-wrap items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{alerts.length}</span> alertas
          </p>
        </div>
      ) : null}

      {tenantId && loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2 py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando estoque…
        </p>
      ) : tenantId && products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground text-sm">
            Nenhum produto.
          </CardContent>
        </Card>
      ) : tenantId ? (
        <div className="space-y-10">
          {INVENTORY_KIND_ORDER.map((kind) => {
            const items = grouped.get(kind) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={kind} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{INVENTORY_KIND_LABELS[kind]}</h2>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => {
                    const tags = parseSquadTags(p.squadTags);
                    const low = p.stockMin > 0 && p.currentStock <= p.stockMin;
                    const ratio = stockRatio(p.currentStock, p.stockMin || 1);
                    return (
                      <Card
                        key={p.id}
                        className={`group relative overflow-hidden border-border/80 transition-shadow hover:shadow-lg hover:shadow-emerald-950/5 ${
                          low ? "ring-1 ring-amber-500/50 bg-amber-500/[0.03]" : ""
                        }`}
                      >
                        <CardHeader className="pb-2 pt-5">
                          <CardTitle className="text-base leading-snug pr-16 line-clamp-2">{p.name}</CardTitle>
                          <p className="flex flex-wrap gap-x-2 gap-y-1 items-center text-xs text-muted-foreground">
                            {p.sku ? <span className="font-mono">{p.sku}</span> : null}
                            {p.sku ? <span>·</span> : null}
                            <span>{p.unit}</span>
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-5">
                          {tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-primary/10 text-primary px-2 py-0.5 border border-primary/20"
                                >
                                  {formatCategoryLabel(t)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Saldo</span>
                              <span className="font-bold tabular-nums text-foreground">
                                {p.currentStock} {p.unit}
                              </span>
                            </div>
                            {p.stockMin > 0 ? (
                              <>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      low ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.round(ratio * 100)}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-muted-foreground">Mínimo: {p.stockMin}</p>
                              </>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <p className="text-muted-foreground">Compra</p>
                              <p className="font-medium tabular-nums">{formatProductPrice(p.purchasePrice)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Atual</p>
                              <p className="font-medium tabular-nums">{formatProductPrice(p.currentPrice)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Médio</p>
                              <p className="font-medium tabular-nums">{formatProductPrice(p.averagePrice)}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 opacity-100 md:opacity-90 md:group-hover:opacity-100">
                            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => openMove(p)}>
                              <TrendingUp className="h-3.5 w-3.5" />
                              Movimentar
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                          </div>
                        </CardContent>
                        {low ? (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                              Alerta
                            </span>
                          </div>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lista compacta</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Item</TableHead>
                    <TableHead className="text-foreground">Categoria</TableHead>
                    <TableHead className="text-foreground">Times</TableHead>
                    <TableHead className="text-foreground text-right">Preço médio</TableHead>
                    <TableHead className="text-foreground text-right">Saldo</TableHead>
                    <TableHead className="text-foreground text-right">Mín.</TableHead>
                    <TableHead className="text-right text-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const tags = parseSquadTags(p.squadTags);
                    const k = (p.inventoryKind as InventoryKind) || "uso_consumo";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-foreground max-w-[220px]">
                          <span className="line-clamp-2">{p.name}</span>
                          {p.sku ? (
                            <span className="block text-xs text-muted-foreground font-mono">{p.sku}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{INVENTORY_KIND_LABELS[k]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                          {tags.length ? tags.map(formatCategoryLabel).join(", ") : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatProductPrice(p.averagePrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {p.currentStock} {p.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{p.stockMin}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => openMove(p)}>
                            <TrendingDown className="h-3.5 w-3.5 mr-1" />
                            Mov.
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        tenants={tenants}
        edit={editingProduct}
        defaultTenantId={tenantId}
        onSuccess={() => void loadData()}
      />

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
            <DialogDescription className="sr-only">Movimentação de quantidade</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {moveProduct ? (
              <p className="text-sm text-muted-foreground">
                {moveProduct.name} · {moveProduct.currentStock} {moveProduct.unit}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={moveDir === "in" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setMoveDir("in")}
              >
                <TrendingUp className="h-4 w-4" />
                Entrada
              </Button>
              <Button
                type="button"
                variant={moveDir === "out" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setMoveDir("out")}
              >
                <TrendingDown className="h-4 w-4" />
                Saída
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Quantidade ({moveProduct?.unit ?? "un"})</Label>
              <Input
                inputMode="numeric"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value)}
                min={1}
              />
            </div>
            {moveDir === "in" ? (
              <div className="space-y-2">
                <Label>Preço unitário (R$) *</Label>
                <Input
                  inputMode="decimal"
                  className="text-foreground"
                  value={moveUnitPrice}
                  onChange={(e) => setMoveUnitPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Ex.: entrega fornecedor X" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={moveSaving} onClick={() => void submitMove()}>
              {moveSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
