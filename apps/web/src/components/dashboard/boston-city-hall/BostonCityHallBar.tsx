"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, ShoppingCart } from "lucide-react";
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
  BCH_BAR_MOVEMENT_TYPE_LABEL,
  BCH_BAR_MOVEMENT_TYPES,
  type BchBarStockBalance,
  type BchBarStockMovement,
  type BchBarOpenContainer,
  type BchBarOpenContainerLedgerEntry,
} from "@/types/bch-bar";
import { cn } from "@/lib/utils";
import { bchProductDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { BchTabBar } from "@/components/dashboard/boston-city-hall/BchTabBar";
import { BchInlineError } from "@/components/dashboard/boston-city-hall/BchInlineError";
import { BCH_BTN_PRIMARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";

type Tab = "products" | "selling" | "prices" | "inventory" | "movements" | "open";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Produtos" },
  { id: "selling", label: "Unidades de venda" },
  { id: "prices", label: "Preços" },
  { id: "inventory", label: "Estoque" },
  { id: "movements", label: "Movimentações" },
  { id: "open", label: "Garrafas abertas" },
];

const MOVEMENT_TYPES_IN = BCH_BAR_MOVEMENT_TYPES.filter(
  (t) =>
    t === "purchase_receipt" ||
    t === "return_in" ||
    t === "manual_adjustment" ||
    t === "physical_count_adjustment" ||
    t === "other",
);

const MOVEMENT_TYPES_OUT = BCH_BAR_MOVEMENT_TYPES.filter(
  (t) =>
    t === "breakage" ||
    t === "spill_waste" ||
    t === "internal_use" ||
    t === "tasting" ||
    t === "complimentary" ||
    t === "return_out" ||
    t === "manual_adjustment" ||
    t === "physical_count_adjustment" ||
    t === "other",
);

function movementTypeLabel(t: string): string {
  return BCH_BAR_MOVEMENT_TYPE_LABEL[t as keyof typeof BCH_BAR_MOVEMENT_TYPE_LABEL] ?? t;
}

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
  const [movements, setMovements] = useState<BchBarStockMovement[]>([]);
  const [openContainers, setOpenContainers] = useState<BchBarOpenContainer[]>([]);
  const [openHistory, setOpenHistory] = useState<BchBarOpenContainerLedgerEntry[]>([]);
  const [historyContainerId, setHistoryContainerId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const reversedMovementIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of movements) {
      if (m.reversesMovementId) ids.add(m.reversesMovementId);
    }
    return ids;
  }, [movements]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodRes, suRes, prRes, locRes, invRes, movRes, openRes] = await Promise.all([
        api.get<BchBarProduct[]>("/boston-city-hall/bar/products"),
        api.get<BchBarSellingUnit[]>("/boston-city-hall/bar/selling-units"),
        api.get<BchBarSellingUnitPrice[]>("/boston-city-hall/bar/prices"),
        api.get<BchBarInventoryLocation[]>("/boston-city-hall/bar/locations"),
        api.get<BchBarStockBalance[]>("/boston-city-hall/bar/inventory"),
        api.get<BchBarStockMovement[]>("/boston-city-hall/bar/inventory/movements?limit=200"),
        api.get<BchBarOpenContainer[]>("/boston-city-hall/bar/open-containers"),
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setSellingUnits(Array.isArray(suRes.data) ? suRes.data : []);
      setPrices(Array.isArray(prRes.data) ? prRes.data : []);
      setLocations(Array.isArray(locRes.data) ? locRes.data : []);
      setStock(Array.isArray(invRes.data) ? invRes.data : []);
      setMovements(Array.isArray(movRes.data) ? movRes.data : []);
      setOpenContainers(Array.isArray(openRes.data) ? openRes.data : []);
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
    targetQuantity: "",
    adjustmentKind: "manual_adjustment",
  });

  const [movDialog, setMovDialog] = useState(false);
  const [movMode, setMovMode] = useState<"in" | "out" | "transfer">("in");
  const [movForm, setMovForm] = useState({
    productId: "",
    locationId: "",
    fromLocationId: "",
    toLocationId: "",
    movementType: "purchase_receipt",
    quantity: "",
    reason: "",
    notes: "",
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [openForm, setOpenForm] = useState({ productId: "", locationId: "", notes: "" });
  const [openAdjustDialog, setOpenAdjustDialog] = useState(false);
  const [openAdjustForm, setOpenAdjustForm] = useState({ containerId: "", newRemaining: "", reason: "" });
  const [historyDialog, setHistoryDialog] = useState(false);

  const saveOpenContainer = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      await api.post("/boston-city-hall/bar/open-containers/open", {
        productId: openForm.productId,
        locationId: openForm.locationId,
        notes: openForm.notes.trim() || undefined,
      });
      setOpenDialog(false);
      await loadAll();
      setFeedback({ open: true, title: "Salvo", message: "Garrafa aberta.", variant: "success" });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao abrir.");
    } finally {
      setSaving(false);
    }
  };

  const loadOpenHistory = async (containerId: string) => {
    const res = await api.get<BchBarOpenContainerLedgerEntry[]>(
      `/boston-city-hall/bar/open-containers/${containerId}/history`,
    );
    setOpenHistory(Array.isArray(res.data) ? res.data : []);
    setHistoryContainerId(containerId);
    setHistoryDialog(true);
  };

  const saveOpenAdjust = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      await api.post(`/boston-city-hall/bar/open-containers/${openAdjustForm.containerId}/adjust`, {
        newRemaining: openAdjustForm.newRemaining.replace(",", "."),
        reason: openAdjustForm.reason.trim() || undefined,
      });
      setOpenAdjustDialog(false);
      await loadAll();
      setFeedback({ open: true, title: "Salvo", message: "Conteúdo ajustado.", variant: "success" });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao ajustar.");
    } finally {
      setSaving(false);
    }
  };

  const discardOpen = async (containerId: string) => {
    setSaving(true);
    try {
      await api.post(`/boston-city-hall/bar/open-containers/${containerId}/discard`, {});
      await loadAll();
      setFeedback({ open: true, title: "Salvo", message: "Restante descartado.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Erro ao descartar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const openInvAdjust = (row?: BchBarStockBalance) => {
    setInvForm({
      productId: row?.productId ?? activeProducts[0]?.id ?? "",
      locationId: row?.locationId ?? locations[0]?.id ?? "",
      targetQuantity: row?.quantityOnHand ?? "0",
      adjustmentKind: "manual_adjustment",
    });
    setDialogError(null);
    setInvDialog(true);
  };

  const openMovDialog = (mode: "in" | "out" | "transfer") => {
    setMovMode(mode);
    setMovForm({
      productId: activeProducts[0]?.id ?? "",
      locationId: locations[0]?.id ?? "",
      fromLocationId: locations[0]?.id ?? "",
      toLocationId: locations[1]?.id ?? locations[0]?.id ?? "",
      movementType: mode === "in" ? "purchase_receipt" : mode === "out" ? "spill_waste" : "purchase_receipt",
      quantity: "",
      reason: "",
      notes: "",
    });
    setDialogError(null);
    setMovDialog(true);
  };

  const saveMovement = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      if (movMode === "transfer") {
        await api.post("/boston-city-hall/bar/inventory/transfer", {
          productId: movForm.productId,
          fromLocationId: movForm.fromLocationId,
          toLocationId: movForm.toLocationId,
          quantity: movForm.quantity.replace(",", "."),
          notes: movForm.notes.trim() || undefined,
        });
      } else {
        await api.post("/boston-city-hall/bar/inventory/movements", {
          productId: movForm.productId,
          locationId: movForm.locationId,
          movementType: movForm.movementType,
          direction: movMode,
          quantity: movForm.quantity.replace(",", "."),
          reason: movForm.reason.trim() || undefined,
          notes: movForm.notes.trim() || undefined,
        });
      }
      setMovDialog(false);
      await loadAll();
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Movimentação registrada.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  };

  const reverseMovement = async (movementId: string) => {
    setSaving(true);
    try {
      await api.post(`/boston-city-hall/bar/inventory/movements/${movementId}/reverse`, {});
      await loadAll();
      setFeedback({
        open: true,
        title: "Estornado",
        message: "Movimentação estornada com registro de reversão.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível estornar.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveInventory = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      await api.post("/boston-city-hall/bar/inventory/adjust", {
        productId: invForm.productId,
        locationId: invForm.locationId,
        targetQuantity: invForm.targetQuantity.replace(",", "."),
        adjustmentKind: invForm.adjustmentKind,
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
    return <BchInlineError message={loadError} onRetry={() => void loadAll()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/eventos/boston-city-hall/bar/dashboard">Painel</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/eventos/boston-city-hall/bar/reports">Relatórios</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/eventos/boston-city-hall/bar/close">Fechamento</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/eventos/boston-city-hall/bar/event-inventory">Estoque evento</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/eventos/boston-city-hall/bar/physical-counts">Contagem física</Link>
        </Button>
        <Button asChild className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}>
          <Link href="/dashboard/eventos/boston-city-hall/bar/pos">
            <ShoppingCart className="h-4 w-4" />
            POS
          </Link>
        </Button>
      </div>
      <BchTabBar tabs={TABS} active={tab} onChange={setTab} />

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
                  <TableHead>Consumo por venda</TableHead>
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
                      <TableCell>
                        {bchProductDisplayName(
                          su.productName,
                          activeProducts.find((p) => p.id === su.productId),
                        )}
                      </TableCell>
                      <TableCell>{su.name}</TableCell>
                      <TableCell>
                        {su.portionAmount
                          ? `${su.portionAmount}${su.portionUnit ? ` ${su.portionUnit}` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {su.consumeDisplayLabel ?? su.physicalUnitsConsumedPerSale}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {su.yieldDisplayLabel ?? su.expectedPortionsPerPhysical ?? "—"}
                      </TableCell>
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
                  <TableHead>Unidade</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Última mov.</TableHead>
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
                      <TableCell>{bchProductDisplayName(row.productName)}</TableCell>
                      <TableCell>
                        {row.physicalUnitType
                          ? physicalLabel(row.physicalUnitType)
                          : "—"}
                      </TableCell>
                      <TableCell>{row.quantityOnHand}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.latestMovementAt
                          ? new Date(row.latestMovementAt).toLocaleString("pt-BR")
                          : "—"}
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

      {tab === "movements" && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Movimentações</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => openMovDialog("in")}>
                Entrada
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => openMovDialog("out")}>
                Saída
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => openMovDialog("transfer")}
                disabled={locations.length < 2}
              >
                Transferir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entrada/Saída</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma movimentação.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{movementTypeLabel(m.movementType)}</TableCell>
                      <TableCell>{m.direction === "in" ? "Entrada" : "Saída"}</TableCell>
                      <TableCell>{bchProductDisplayName(m.productName)}</TableCell>
                      <TableCell>{m.locationName}</TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell className="text-xs">{m.createdByName ?? "—"}</TableCell>
                      <TableCell>
                        {m.reversesMovementId ? (
                          <span className="text-xs text-muted-foreground">Estorno</span>
                        ) : reversedMovementIds.has(m.id) ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            disabled={saving}
                            onClick={() => void reverseMovement(m.id)}
                          >
                            Estornar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "open" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Garrafas abertas</CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setOpenForm({
                  productId: activeProducts[0]?.id ?? "",
                  locationId: locations[0]?.id ?? "",
                  notes: "",
                });
                setDialogError(null);
                setOpenDialog(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Abrir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Aberta em</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="min-w-[200px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {openContainers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhuma garrafa aberta.
                    </TableCell>
                  </TableRow>
                ) : (
                  openContainers.map((oc) => (
                    <TableRow key={oc.id}>
                      <TableCell>{oc.productName}</TableCell>
                      <TableCell>{oc.locationName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(oc.openedAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {oc.originalContent} {oc.contentUnit}
                      </TableCell>
                      <TableCell>
                        {oc.remainingContent} {oc.contentUnit}
                      </TableCell>
                      <TableCell>{oc.status}</TableCell>
                      <TableCell className="text-xs">{oc.openedByName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {oc.status === "open" ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setOpenAdjustForm({
                                    containerId: oc.id,
                                    newRemaining: oc.remainingContent,
                                    reason: "",
                                  });
                                  setOpenAdjustDialog(true);
                                }}
                              >
                                Ajustar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => void discardOpen(oc.id)}
                              >
                                Descartar
                              </Button>
                            </>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => void loadOpenHistory(oc.id)}
                          >
                            Histórico
                          </Button>
                        </div>
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
              <Label htmlFor="bch-inv-kind">Motivo do ajuste</Label>
              <NativeSelect
                id="bch-inv-kind"
                value={invForm.adjustmentKind}
                onChange={(e) => setInvForm((f) => ({ ...f, adjustmentKind: e.target.value }))}
              >
                <option value="manual_adjustment">Ajuste manual</option>
                <option value="physical_count_adjustment">Contagem física</option>
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bch-inv-qty">Quantidade alvo</Label>
              <Input
                id="bch-inv-qty"
                value={invForm.targetQuantity}
                onChange={(e) => setInvForm((f) => ({ ...f, targetQuantity: e.target.value }))}
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

      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movMode === "in" ? "Entrada de estoque" : movMode === "out" ? "Saída de estoque" : "Transferência"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bch-mov-prod">Produto</Label>
              <NativeSelect
                id="bch-mov-prod"
                value={movForm.productId}
                onChange={(e) => setMovForm((f) => ({ ...f, productId: e.target.value }))}
              >
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {movMode === "transfer" ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="bch-mov-from">Origem</Label>
                  <NativeSelect
                    id="bch-mov-from"
                    value={movForm.fromLocationId}
                    onChange={(e) => setMovForm((f) => ({ ...f, fromLocationId: e.target.value }))}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bch-mov-to">Destino</Label>
                  <NativeSelect
                    id="bch-mov-to"
                    value={movForm.toLocationId}
                    onChange={(e) => setMovForm((f) => ({ ...f, toLocationId: e.target.value }))}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="bch-mov-loc">Local</Label>
                  <NativeSelect
                    id="bch-mov-loc"
                    value={movForm.locationId}
                    onChange={(e) => setMovForm((f) => ({ ...f, locationId: e.target.value }))}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bch-mov-type">Tipo</Label>
                  <NativeSelect
                    id="bch-mov-type"
                    value={movForm.movementType}
                    onChange={(e) => setMovForm((f) => ({ ...f, movementType: e.target.value }))}
                  >
                    {(movMode === "in" ? MOVEMENT_TYPES_IN : MOVEMENT_TYPES_OUT).map((t) => (
                      <option key={t} value={t}>
                        {movementTypeLabel(t)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="bch-mov-qty">Quantidade</Label>
              <Input
                id="bch-mov-qty"
                value={movForm.quantity}
                onChange={(e) => setMovForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            {movMode !== "transfer" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="bch-mov-reason">Motivo</Label>
                <Input
                  id="bch-mov-reason"
                  value={movForm.reason}
                  onChange={(e) => setMovForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="bch-mov-notes">Observações</Label>
              <Input
                id="bch-mov-notes"
                value={movForm.notes}
                onChange={(e) => setMovForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {dialogError && movDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setMovDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveMovement()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir unidade</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <NativeSelect
              value={openForm.productId}
              onChange={(e) => setOpenForm((f) => ({ ...f, productId: e.target.value }))}
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={openForm.locationId}
              onChange={(e) => setOpenForm((f) => ({ ...f, locationId: e.target.value }))}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
            <Input
              placeholder="Observações"
              value={openForm.notes}
              onChange={(e) => setOpenForm((f) => ({ ...f, notes: e.target.value }))}
            />
            {dialogError && openDialog ? <p className="text-sm text-destructive">{dialogError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveOpenContainer()}>
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAdjustDialog} onOpenChange={setOpenAdjustDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar conteúdo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              value={openAdjustForm.newRemaining}
              onChange={(e) => setOpenAdjustForm((f) => ({ ...f, newRemaining: e.target.value }))}
            />
            <Input
              placeholder="Motivo"
              value={openAdjustForm.reason}
              onChange={(e) => setOpenAdjustForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenAdjustDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveOpenAdjust()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico da garrafa</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Após</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openHistory.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{new Date(h.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs">{h.recordType}</TableCell>
                  <TableCell>{h.quantity}</TableCell>
                  <TableCell>{h.remainingAfter}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
