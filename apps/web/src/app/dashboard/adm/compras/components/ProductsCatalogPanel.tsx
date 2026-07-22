"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Package, Plus, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import {
  formatProductPrice,
  labelForInventoryKind,
  sortCategorySlugs,
} from "@/lib/inventory-kinds";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { Tenant } from "@/types/tenant";
import { ProductFormDialog, type ProductRow } from "./ProductFormDialog";

interface ProductsCatalogPanelProps {
  tenants: Tenant[];
  defaultTenantId?: string;
  /** Modo aba (patrimônio): sem card, filtros no pai */
  embedded?: boolean;
  tenantId?: string;
  search?: string;
  kindFilter?: string;
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  editProduct?: ProductRow | null;
  onEditProductChange?: (product: ProductRow | null) => void;
  onProductsLoaded?: (count: number) => void;
}

export function ProductsCatalogPanel({
  tenants,
  defaultTenantId,
  embedded = false,
  tenantId: tenantIdProp,
  search: searchProp,
  kindFilter: kindFilterProp,
  dialogOpen: dialogOpenProp,
  onDialogOpenChange,
  editProduct: editProductProp,
  onEditProductChange,
  onProductsLoaded,
}: ProductsCatalogPanelProps) {
  const [tenantIdLocal, setTenantIdLocal] = useState(defaultTenantId ?? "");
  const [searchLocal, setSearchLocal] = useState("");
  const [kindFilterLocal, setKindFilterLocal] = useState("todos");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpenLocal, setDialogOpenLocal] = useState(false);
  const [editProductLocal, setEditProductLocal] = useState<ProductRow | null>(null);

  const tenantId = tenantIdProp ?? tenantIdLocal;
  const search = searchProp ?? searchLocal;
  const kindFilter = kindFilterProp ?? kindFilterLocal;
  const dialogOpen = dialogOpenProp ?? dialogOpenLocal;
  const editProduct = editProductProp ?? editProductLocal;

  const setDialogOpen = onDialogOpenChange ?? setDialogOpenLocal;
  const setEditProduct = onEditProductChange ?? setEditProductLocal;

  const { categories, options, orderSlugs } = useInventoryCategories(tenantId || undefined);

  useEffect(() => {
    if (!embedded && defaultTenantId && !tenantIdLocal) setTenantIdLocal(defaultTenantId);
  }, [embedded, defaultTenantId, tenantIdLocal]);

  const loadProducts = useCallback(async () => {
    if (!tenantId) {
      setProducts([]);
      onProductsLoaded?.(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (search.trim()) params.set("search", search.trim());
      if (kindFilter !== "todos") params.set("inventoryKind", kindFilter);
      const { data } = await api.get<ProductRow[]>(`/compras/products?${params}`);
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      onProductsLoaded?.(list.length);
    } catch {
      setProducts([]);
      onProductsLoaded?.(0);
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, kindFilter, onProductsLoaded]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const grouped = useMemo(() => {
    const slugsInProducts = [...new Set(products.map((p) => p.inventoryKind || "uso_consumo"))];
    const ordered = sortCategorySlugs(
      [...new Set([...orderSlugs, ...slugsInProducts])],
      categories,
    );
    const map = new Map<string, ProductRow[]>();
    for (const k of ordered) map.set(k, []);
    for (const p of products) {
      const k = p.inventoryKind || "uso_consumo";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return { map, ordered };
  }, [products, orderSlugs, categories]);

  const openNew = () => {
    setEditProduct(null);
    setDialogOpen(true);
  };

  const listBody = !tenantId ? (
    <p className="text-sm text-muted-foreground py-6 text-center">Selecione o clube para listar produtos.</p>
  ) : loading ? (
    <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando…
    </p>
  ) : products.length === 0 ? (
    <p className="text-sm text-muted-foreground py-6 text-center">Nenhum produto cadastrado nesta unidade.</p>
  ) : (
    <div className="space-y-6">
      {grouped.ordered.map((kind) => {
        const items = grouped.map.get(kind) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={kind} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
              {labelForInventoryKind(kind, categories)}
            </h3>
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 bg-card hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku ? `${p.sku} · ` : ""}
                      {p.currentStock} {p.unit}
                      {p.stockMin > 0 ? ` · mín. ${p.stockMin}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      Médio: <strong className="text-foreground">{formatProductPrice(p.averagePrice)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Atual: <strong className="text-foreground">{formatProductPrice(p.currentPrice)}</strong>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-[36px]"
                      onClick={() => {
                        setEditProduct(p);
                        setDialogOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const dialogs = (
    <ProductFormDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      tenants={tenants}
      edit={editProduct}
      defaultTenantId={tenantId}
      onSuccess={() => void loadProducts()}
    />
  );

  if (embedded) {
    return (
      <>
        {listBody}
        {dialogs}
      </>
    );
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-emerald-500 mt-0.5" />
          <div>
            <CardTitle className="text-lg">Cadastro de produtos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Movimentações de estoque em{" "}
              <Link href="/dashboard/adm/estoque" className="text-primary underline inline-flex items-center gap-1">
                <Warehouse className="h-3.5 w-3.5" />
                Estoque
              </Link>
              .
            </p>
          </div>
        </div>
        <Button type="button" className="gap-2 shrink-0 min-h-[44px]" onClick={openNew} disabled={!tenantId}>
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Clube / empresa</Label>
            <Select value={tenantIdLocal} onValueChange={setTenantIdLocal}>
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
            <Select value={kindFilterLocal} onValueChange={setKindFilterLocal}>
              <SelectTrigger className="text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {options.map((k) => (
                  <SelectItem key={k.slug} value={k.slug}>
                    {k.name}
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
                value={searchLocal}
                onChange={(e) => setSearchLocal(e.target.value)}
                placeholder="Nome ou SKU"
              />
            </div>
          </div>
        </div>
        {listBody}
      </CardContent>
      {dialogs}
    </Card>
  );
}
