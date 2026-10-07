"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BCH_BAR_CATEGORY_LABEL,
  BCH_BAR_PHYSICAL_UNIT_LABEL,
  BCH_BAR_PHYSICAL_UNIT_TYPES,
  BCH_BAR_PRODUCT_CATEGORIES,
  type BchBarInventoryLocation,
  type BchBarProduct,
  type BchBarSellingUnit,
  type BchBarSellingUnitPrice,
  type BchBarStockBalance,
} from "@/types/bch-bar";
import { cn } from "@/lib/utils";

type Tab = "products" | "selling" | "prices" | "inventory";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Produtos" },
  { id: "selling", label: "Unidades de venda" },
  { id: "prices", label: "Preços" },
  { id: "inventory", label: "Estoque" },
];

function categoryLabel(cat: string): string {
  return BCH_BAR_CATEGORY_LABEL[cat as keyof typeof BCH_BAR_CATEGORY_LABEL] ?? cat;
}

function physicalLabel(t: string): string {
  return BCH_BAR_PHYSICAL_UNIT_LABEL[t as keyof typeof BCH_BAR_PHYSICAL_UNIT_LABEL] ?? t;
}

export function BostonCityHallBar() {
  const [tab, setTab] = useState<Tab>("products");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [products, setProducts] = useState<BchBarProduct[]>([]);
  const [sellingUnits, setSellingUnits] = useState<BchBarSellingUnit[]>([]);
  const [prices, setPrices] = useState<BchBarSellingUnitPrice[]>([]);
  const [locations, setLocations] = useState<BchBarInventoryLocation[]>([]);
  const [stock, setStock] = useState<BchBarStockBalance[]>([]);

  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodRes, suRes, prRes, locRes, invRes] = await Promise.all([
        api.get<BchBarProduct[]>("/boston-city-hall/bar/products"),
        api.get<BchBarSellingUnit[]>("/boston-city-hall/bar/selling-units"),
        api.get<BchBarSellingUnitPrice[]>("/boston-city-hall/bar/prices"),
        api.get<BchBarInventoryLocation[]>("/boston-city-hall/bar/locations"),
        api.get<BchBarStockBalance[]>("/boston-city-hall/bar/inventory"),
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setSellingUnits(Array.isArray(suRes.data) ? suRes.data : []);
      setPrices(Array.isArray(prRes.data) ? prRes.data : []);
      setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      setStock(Array.isArray(invRes.data) ? invRes.data : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar bar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // —— Product dialog ——
  const [productDialog, setProductDialog] = useState(false);
  const [productEditId, setProductEditId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category: "other",
    description: "",
    imageUrl: "",
    active: "true",
    unitType: "bottle",
    volumeMl: "",
    quantityBasis: "1",
  });

  const openProductNew = () => {
    setProductEditId(null);
    setProductForm({
      sku: "",
      name: "",
      category: "other",
      description: "",
      imageUrl: "",
      active: "true",
      unitType: "bottle",
      volumeMl: "",
      quantityBasis: "1",
    });
    setDialogError(null);
    setProductDialog(true);
  };

  const openProductEdit = (p: BchBarProduct) => {
    setProductEditId(p.id);
    setProductForm({
      sku: p.sku,
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      active: p.active ? "true" : "false",
      unitType: p.physicalUnit?.unitType ?? "bottle",
      volumeMl: p.physicalUnit?.volumeMl != null ? String(p.physicalUnit.volumeMl) : "",
      quantityBasis: p.physicalUnit?.quantityBasis ?? "1",
    });
    setDialogError(null);
    setProductDialog(true);
  };

  const saveProduct = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      const body = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        category: productForm.category,
        description: productForm.description.trim() || undefined,
        imageUrl: productForm.imageUrl.trim() || undefined,
        active: productForm.active === "true",
        physicalUnit: {
          unitType: productForm.unitType,
          volumeMl: productForm.volumeMl ? Number(productForm.volumeMl) : undefined,
          quantityBasis: productForm.quantityBasis || "1",
        },
      };
      if (productEditId) {
        await api.patch(`/boston-city-hall/bar/products/${productEditId}`, body);
      } else {
        await api.post("/boston-city-hall/bar/products", body);
      }
      setProductDialog(false);
      await loadAll();
      setFeedback({
        open: true,
        title: "Salvo",
        message: productEditId ? "Produto atualizado." : "Produto cadastrado.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  // —— Selling unit dialog ——
  const [sellingDialog, setSellingDialog] = useState(false);
  const [sellingEditId, setSellingEditId] = useState<string | null>(null);
  const [sellingForm, setSellingForm] = useState({
    productId: "",
    name: "",
    active: "true",
    sortOrder: "0",
    portionAmount: "",
    portionUnit: "ml",
    physicalUnitsConsumedPerSale: "1",
    expectedPortionsPerPhysical: "",
  });

  const openSellingNew = () => {
    setSellingEditId(null);
    setSellingForm({
      productId: activeProducts[0]?.id ?? "",
      name: "",
      active: "true",
      sortOrder: "0",
      portionAmount: "",
      portionUnit: "ml",
      physicalUnitsConsumedPerSale: "1",
      expectedPortionsPerPhysical: "",
    });
    setDialogError(null);
    setSellingDialog(true);
  };

  const openSellingEdit = (su: BchBarSellingUnit) => {
    setSellingEditId(su.id);
    setSellingForm({
      productId: su.productId,
      name: su.name,
      active: su.active ? "true" : "false",
      sortOrder: String(su.sortOrder),
      portionAmount: su.portionAmount ?? "",
      portionUnit: su.portionUnit ?? "",
      physicalUnitsConsumedPerSale: su.physicalUnitsConsumedPerSale,
      expectedPortionsPerPhysical: su.expectedPortionsPerPhysical ?? "",
    });
    setDialogError(null);
    setSellingDialog(true);
  };

  const saveSelling = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      const payload = {
        name: sellingForm.name.trim(),
        active: sellingForm.active === "true",
        sortOrder: Number(sellingForm.sortOrder) || 0,
        portionAmount: sellingForm.portionAmount.trim() || null,
        portionUnit: sellingForm.portionUnit.trim() || null,
        physicalUnitsConsumedPerSale: sellingForm.physicalUnitsConsumedPerSale || "1",
        expectedPortionsPerPhysical: sellingForm.expectedPortionsPerPhysical.trim() || null,
      };
      if (sellingEditId) {
        await api.patch(`/boston-city-hall/bar/selling-units/${sellingEditId}`, payload);
      } else {
        if (!sellingForm.productId) throw new Error("Selecione o produto.");
        await api.post(
          `/boston-city-hall/bar/products/${sellingForm.productId}/selling-units`,
          payload,
        );
      }
      setSellingDialog(false);
      await loadAll();
      setFeedback({
        open: true,
        title: "Salvo",
        message: sellingEditId ? "Unidade de venda atualizada." : "Unidade de venda cadastrada.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar unidade de venda.");
    } finally {
      setSaving(false);
    }
  };

  // —— Price dialog ——
  const [priceDialog, setPriceDialog] = useState(false);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState({
    sellingUnitId: "",
    price: "",
    currency: "BRL",
    active: "true",
    validFrom: "",
    validTo: "",
  });

  const activeSellingUnits = useMemo(
    () => sellingUnits.filter((su) => su.active && su.productActive !== false),
    [sellingUnits],
  );

  const openPriceNew = () => {
    setPriceEditId(null);
    setPriceForm({
      sellingUnitId: activeSellingUnits[0]?.id ?? "",
      price: "",
      currency: "BRL",
      active: "true",
      validFrom: "",
      validTo: "",
    });
    setDialogError(null);
    setPriceDialog(true);
  };

  const openPriceEdit = (pr: BchBarSellingUnitPrice) => {
    setPriceEditId(pr.id);
    setPriceForm({
      sellingUnitId: pr.sellingUnitId,
      price: pr.price,
      currency: pr.currency,
      active: pr.active ? "true" : "false",
      validFrom: pr.validFrom ? pr.validFrom.slice(0, 10) : "",
      validTo: pr.validTo ? pr.validTo.slice(0, 10) : "",
    });
    setDialogError(null);
    setPriceDialog(true);
  };

  const savePrice = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      const payload = {
        price: priceForm.price.replace(",", "."),
        currency: priceForm.currency.trim().toUpperCase(),
        active: priceForm.active === "true",
        validFrom: priceForm.validFrom || null,
        validTo: priceForm.validTo || null,
      };
      if (priceEditId) {
        await api.patch(`/boston-city-hall/bar/prices/${priceEditId}`, payload);
      } else {
        if (!priceForm.sellingUnitId) throw new Error("Selecione a unidade de venda.");
        await api.post(
          `/boston-city-hall/bar/selling-units/${priceForm.sellingUnitId}/prices`,
          payload,
        );
      }
      setPriceDialog(false);
      await loadAll();
      setFeedback({
        open: true,
        title: "Salvo",
        message: priceEditId ? "Preço atualizado." : "Preço cadastrado.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar preço.");
    } finally {
      setSaving(false);
    }
  };

  // —— Inventory dialog ——
  const [invDialog, setInvDialog] = useState(false);
  const [invForm, setInvForm] = useState({
    productId: "",
    locationId: "",
    quantityOnHand: "",
  });

  const openInvAdjust = (row?: BchBarStockBalance) => {
    setInvForm({
      productId: row?.productId ?? activeProducts[0]?.id ?? "",
      locationId: row?.locationId ?? locations[0]?.id ?? "",
      quantityOnHand: row?.quantityOnHand ?? "0",
    });
    setDialogError(null);
    setInvDialog(true);
  };

  const saveInventory = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      await api.put("/boston-city-hall/bar/inventory", {
        productId: invForm.productId,
        locationId: invForm.locationId,
        quantityOnHand: invForm.quantityOnHand.replace(",", "."),
      });
      setInvDialog(false);
      await loadAll();
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Saldo de estoque atualizado.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar estoque.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" variant="outline" onClick={() => void loadAll()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Produtos</CardTitle>
            <Button type="button" size="sm" onClick={openProductNew}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade física</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum produto.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{categoryLabel(p.category)}</TableCell>
                      <TableCell>
                        {p.physicalUnit
                          ? `${physicalLabel(p.physicalUnit.unitType)}${
                              p.physicalUnit.volumeMl ? ` · ${p.physicalUnit.volumeMl} ml` : ""
                            }`
                          : "—"}
                      </TableCell>
                      <TableCell>{p.active ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => openProductEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "selling" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Unidades de venda</CardTitle>
            <Button type="button" size="sm" onClick={openSellingNew} disabled={activeProducts.length === 0}>
              <Plus className="mr-1 h-4 w-4" />
              Nova
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Porção</TableHead>
                  <TableHead>Consome (un. fís.)</TableHead>
                  <TableHead>Rendimento</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellingUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma unidade de venda.
                    </TableCell>
                  </TableRow>
                ) : (
                  sellingUnits.map((su) => (
                    <TableRow key={su.id}>
                      <TableCell>{su.productName ?? su.productId}</TableCell>
                      <TableCell>{su.name}</TableCell>
                      <TableCell>
                        {su.portionAmount
                          ? `${su.portionAmount}${su.portionUnit ? ` ${su.portionUnit}` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell>{su.physicalUnitsConsumedPerSale}</TableCell>
                      <TableCell>{su.expectedPortionsPerPhysical ?? "—"}</TableCell>
                      <TableCell>{su.active ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => openSellingEdit(su)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "prices" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Preços</CardTitle>
            <Button type="button" size="sm" onClick={openPriceNew} disabled={activeSellingUnits.length === 0}>
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade de venda</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum preço.
                    </TableCell>
                  </TableRow>
                ) : (
                  prices.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell>{pr.sellingUnitName ?? pr.sellingUnitId}</TableCell>
                      <TableCell>{pr.price}</TableCell>
                      <TableCell>{pr.currency}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pr.validFrom || pr.validTo
                          ? `${pr.validFrom?.slice(0, 10) ?? "…"} — ${pr.validTo?.slice(0, 10) ?? "…"}`
                          : "—"}
                      </TableCell>
                      <TableCell>{pr.active ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => openPriceEdit(pr)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "inventory" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Estoque físico</CardTitle>
            <Button type="button" size="sm" onClick={() => openInvAdjust()} disabled={locations.length === 0}>
              <Plus className="mr-1 h-4 w-4" />
              Ajustar saldo
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Local</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum saldo registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  stock.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.locationName}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{row.productSku}</TableCell>
                      <TableCell>{row.quantityOnHand}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.updatedAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => openInvAdjust(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{productEditId ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bch-sku">SKU</Label>
              <Input id="bch-sku" value={productForm.sku} onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-name">Nome</Label>
              <Input id="bch-name" value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-cat">Categoria</Label>
              <NativeSelect
                id="bch-cat"
                value={productForm.category}
                onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
              >
                {BCH_BAR_PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-unit">Unidade física</Label>
              <NativeSelect
                id="bch-unit"
                value={productForm.unitType}
                onChange={(e) => setProductForm((f) => ({ ...f, unitType: e.target.value }))}
              >
                {BCH_BAR_PHYSICAL_UNIT_TYPES.map((u) => (
                  <option key={u} value={u}>
                    {physicalLabel(u)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-vol">Volume (ml)</Label>
                <Input
                  id="bch-vol"
                  type="number"
                  className="text-foreground"
                  value={productForm.volumeMl}
                  onChange={(e) => setProductForm((f) => ({ ...f, volumeMl: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-basis">Base quantidade</Label>
                <Input
                  id="bch-basis"
                  value={productForm.quantityBasis}
                  onChange={(e) => setProductForm((f) => ({ ...f, quantityBasis: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-active">Ativo</Label>
              <NativeSelect
                id="bch-active"
                value={productForm.active}
                onChange={(e) => setProductForm((f) => ({ ...f, active: e.target.value }))}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </NativeSelect>
            </div>
            {dialogError && productDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setProductDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveProduct()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sellingDialog} onOpenChange={setSellingDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{sellingEditId ? "Editar unidade de venda" : "Nova unidade de venda"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!sellingEditId ? (
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-prod">Produto</Label>
                <NativeSelect
                  id="bch-su-prod"
                  value={sellingForm.productId}
                  onChange={(e) => setSellingForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="bch-su-name">Nome</Label>
              <Input
                id="bch-su-name"
                value={sellingForm.name}
                onChange={(e) => setSellingForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-portion">Porção (qtd)</Label>
                <Input
                  id="bch-su-portion"
                  value={sellingForm.portionAmount}
                  onChange={(e) => setSellingForm((f) => ({ ...f, portionAmount: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-punit">Unidade porção</Label>
                <Input
                  id="bch-su-punit"
                  value={sellingForm.portionUnit}
                  onChange={(e) => setSellingForm((f) => ({ ...f, portionUnit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-consume">Consome un. física / venda</Label>
                <Input
                  id="bch-su-consume"
                  value={sellingForm.physicalUnitsConsumedPerSale}
                  onChange={(e) =>
                    setSellingForm((f) => ({ ...f, physicalUnitsConsumedPerSale: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-yield">Porções / un. física</Label>
                <Input
                  id="bch-su-yield"
                  placeholder="ex.: 10"
                  value={sellingForm.expectedPortionsPerPhysical}
                  onChange={(e) =>
                    setSellingForm((f) => ({ ...f, expectedPortionsPerPhysical: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-order">Ordem</Label>
                <Input
                  id="bch-su-order"
                  type="number"
                  value={sellingForm.sortOrder}
                  onChange={(e) => setSellingForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-su-active">Ativo</Label>
                <NativeSelect
                  id="bch-su-active"
                  value={sellingForm.active}
                  onChange={(e) => setSellingForm((f) => ({ ...f, active: e.target.value }))}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </NativeSelect>
              </div>
            </div>
            {dialogError && sellingDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSellingDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveSelling()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{priceEditId ? "Editar preço" : "Novo preço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {!priceEditId ? (
              <div className="grid gap-1.5">
                <Label htmlFor="bch-pr-su">Unidade de venda</Label>
                <NativeSelect
                  id="bch-pr-su"
                  value={priceForm.sellingUnitId}
                  onChange={(e) => setPriceForm((f) => ({ ...f, sellingUnitId: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {activeSellingUnits.map((su) => (
                    <option key={su.id} value={su.id}>
                      {su.productName ? `${su.productName} — ${su.name}` : su.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-pr-price">Preço</Label>
                <Input
                  id="bch-pr-price"
                  value={priceForm.price}
                  onChange={(e) => setPriceForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-pr-curr">Moeda (ISO)</Label>
                <Input
                  id="bch-pr-curr"
                  value={priceForm.currency}
                  onChange={(e) => setPriceForm((f) => ({ ...f, currency: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="bch-pr-from">Válido de</Label>
                <Input
                  id="bch-pr-from"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={priceForm.validFrom}
                  onChange={(e) => setPriceForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bch-pr-to">Válido até</Label>
                <Input
                  id="bch-pr-to"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={priceForm.validTo}
                  onChange={(e) => setPriceForm((f) => ({ ...f, validTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-pr-active">Ativo</Label>
              <NativeSelect
                id="bch-pr-active"
                value={priceForm.active}
                onChange={(e) => setPriceForm((f) => ({ ...f, active: e.target.value }))}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </NativeSelect>
            </div>
            {dialogError && priceDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPriceDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void savePrice()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invDialog} onOpenChange={setInvDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar saldo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bch-inv-loc">Local</Label>
              <NativeSelect
                id="bch-inv-loc"
                value={invForm.locationId}
                onChange={(e) => setInvForm((f) => ({ ...f, locationId: e.target.value }))}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-inv-prod">Produto</Label>
              <NativeSelect
                id="bch-inv-prod"
                value={invForm.productId}
                onChange={(e) => setInvForm((f) => ({ ...f, productId: e.target.value }))}
              >
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-inv-qty">Quantidade em mãos</Label>
              <Input
                id="bch-inv-qty"
                value={invForm.quantityOnHand}
                onChange={(e) => setInvForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
              />
            </div>
            {dialogError && invDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setInvDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveInventory()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
