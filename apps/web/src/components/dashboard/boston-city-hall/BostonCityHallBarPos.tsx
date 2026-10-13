"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  BCH_BAR_CATEGORY_LABEL,
  BCH_BAR_POS_PAYMENT_METHOD_LABEL,
  BCH_BAR_POS_PAYMENT_METHODS,
  type BchBarInventoryLocation,
  type BchBarPosCatalogItem,
  type BchBarSale,
} from "@/types/bch-bar";
import { cn } from "@/lib/utils";
import {
  bchOperationalProducts,
  bchProductDisplayName,
} from "@/components/dashboard/boston-city-hall/bch-operational-display";

function formatMoney(value: string, currency: string) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(n);
}

function categoryLabel(cat: string) {
  return BCH_BAR_CATEGORY_LABEL[cat as keyof typeof BCH_BAR_CATEGORY_LABEL] ?? cat;
}

function availabilityBadge(a: BchBarPosCatalogItem["availability"]) {
  if (!a) return null;
  const map = {
    available: "text-emerald-400",
    low: "text-amber-400",
    unavailable: "text-red-400",
  } as const;
  const labels = { available: "OK", low: "Baixo", unavailable: "Indisp." } as const;
  return <span className={cn("text-xs font-medium", map[a])}>{labels[a]}</span>;
}

export function BostonCityHallBarPos() {
  const [locations, setLocations] = useState<BchBarInventoryLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [catalog, setCatalog] = useState<BchBarPosCatalogItem[]>([]);
  const [sale, setSale] = useState<BchBarSale | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<(typeof BCH_BAR_POS_PAYMENT_METHODS)[number]>("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );

  const saleCreateBody = useMemo(() => {
    const body: { locationId: string; eventId?: string } = { locationId };
    if (selectedLocation?.kind === "event_bar" && selectedLocation.eventId) {
      body.eventId = selectedLocation.eventId;
    }
    return body;
  }, [locationId, selectedLocation]);

  const loadLocations = useCallback(async () => {
    const { data: locs } = await api.get<BchBarInventoryLocation[]>("/boston-city-hall/bar/locations");
    const active = Array.isArray(locs) ? locs.filter((l) => l.active) : [];
    setLocations(active);
    setLocationId((prev) => prev || active[0]?.id || "");
  }, []);

  const loadCatalog = useCallback(async (locId: string) => {
    if (!locId) {
      setCatalog([]);
      return;
    }
    const { data: rows } = await api.get<BchBarPosCatalogItem[]>(
      `/boston-city-hall/bar/pos/catalog?locationId=${encodeURIComponent(locId)}`,
    );
    setCatalog(bchOperationalProducts(Array.isArray(rows) ? rows : []));
  }, []);

  const refreshSale = useCallback(async (saleId: string) => {
    const { data: s } = await api.get<BchBarSale>(`/boston-city-hall/bar/pos/sales/${saleId}`);
    setSale(s);
    return s;
  }, []);

  const startSale = useCallback(async () => {
    if (!locationId) return;
    setBusy(true);
    try {
      const { data: s } = await api.post<BchBarSale>("/boston-city-hall/bar/pos/sales", saleCreateBody);
      setSale(s);
      setPaymentAmount("");
      setCashReceived("");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível abrir a venda.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [saleCreateBody]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadLocations();
      } catch (e) {
        setFeedback({
          open: true,
          title: "Erro",
          message: e instanceof Error ? e.message : "Falha ao carregar locais.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [loadLocations]);

  useEffect(() => {
    if (!locationId) return;
    void loadCatalog(locationId).catch(() => setCatalog([]));
  }, [locationId, loadCatalog]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        bchProductDisplayName(c.productName, { name: c.sellingUnitName, sku: c.productSku })
          .toLowerCase()
          .includes(q) ||
        c.sellingUnitName.toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const addToCart = async (item: BchBarPosCatalogItem) => {
    if (!locationId) return;
    setBusy(true);
    try {
      let id = sale?.status === "open" ? sale.id : null;
      if (!id) {
        const { data: s } = await api.post<BchBarSale>("/boston-city-hall/bar/pos/sales", saleCreateBody);
        id = s.id;
      }
      const { data: updated } = await api.post<BchBarSale>(`/boston-city-hall/bar/pos/sales/${id}/items`, {
        sellingUnitId: item.sellingUnitId,
        quantity: 1,
      });
      setSale(updated);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível adicionar o item.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const updateQty = async (itemId: string, quantity: number) => {
    if (!sale || quantity < 1) return;
    setBusy(true);
    try {
      const { data: updated } = await api.patch<BchBarSale>(
        `/boston-city-hall/bar/pos/sales/${sale.id}/items/${itemId}`,
        { quantity },
      );
      setSale(updated);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível atualizar quantidade.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!sale) return;
    setBusy(true);
    try {
      await api.delete(`/boston-city-hall/bar/pos/sales/${sale.id}/items/${itemId}`);
      await refreshSale(sale.id);
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível remover o item.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const addPayment = async () => {
    if (!sale) return;
    const amount = paymentAmount.trim() || sale.amountDue;
    setBusy(true);
    try {
      const body: Record<string, string | number> = {
        method: paymentMethod,
        amount,
      };
      if (paymentMethod === "cash" && cashReceived.trim()) {
        body.amountReceived = cashReceived.trim();
      }
      const { data: updated } = await api.post<BchBarSale>(
        `/boston-city-hall/bar/pos/sales/${sale.id}/payments`,
        body,
      );
      setSale(updated);
      setPaymentAmount("");
      setCashReceived("");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível registrar pagamento.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const completeSale = async () => {
    if (!sale) return;
    setBusy(true);
    try {
      const { data: updated } = await api.post<BchBarSale>(
        `/boston-city-hall/bar/pos/sales/${sale.id}/complete`,
        {},
      );
      setSale(updated);
      setFeedback({
        open: true,
        title: "Venda concluída",
        message: `Venda ${updated.saleNumber} registrada com sucesso.`,
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível concluir a venda.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelSale = async () => {
    if (!sale || sale.status !== "open") return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/pos/sales/${sale.id}/cancel`, {});
      setSale(null);
      setPaymentAmount("");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível cancelar.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const newSale = () => {
    setSale(null);
    setPaymentAmount("");
    setCashReceived("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showReceipt = sale?.status === "completed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/eventos/boston-city-hall/bar"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao bar
        </Link>
        <NativeSelect
          className="min-h-[44px] max-w-xs flex-1"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          disabled={Boolean(sale && sale.status === "open")}
        >
          <option value="">Local de estoque…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        {sale?.status === "open" ? (
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void cancelSale()} disabled={busy}>
            Cancelar venda
          </Button>
        ) : (
          <Button type="button" className="min-h-[44px]" onClick={() => void startSale()} disabled={busy || !locationId}>
            Nova venda
          </Button>
        )}
      </div>

      {showReceipt && sale ? (
        <Card>
          <CardHeader>
            <CardTitle>Venda {sale.saleNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {new Date(sale.closedAt ?? sale.openedAt).toLocaleString("pt-BR")} · {sale.locationName}
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sale.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2 px-3 py-2">
                  <span>
                    {i.quantity}× {bchProductDisplayName(i.productName)} ({i.sellingUnitName})
                  </span>
                  <span>{formatMoney(i.lineTotal, i.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(sale.total, sale.currency)}</span>
            </div>
            <div>
              <p className="mb-1 font-medium">Pagamentos</p>
              {sale.payments.map((p) => (
                <p key={p.id} className="text-muted-foreground">
                  {p.methodLabel}: {formatMoney(p.amount, sale.currency)}
                  {p.changeDue && Number.parseFloat(p.changeDue) > 0
                    ? ` · Troco ${formatMoney(p.changeDue, sale.currency)}`
                    : null}
                </p>
              ))}
            </div>
            {sale.openedByName ? <p className="text-muted-foreground">Operador: {sale.openedByName}</p> : null}
            <Button type="button" className="min-h-[44px] w-full sm:w-auto" onClick={newSale}>
              Nova venda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px]"
              />
              <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto">
                {filteredCatalog.map((c) => (
                  <button
                    key={c.sellingUnitId}
                    type="button"
                    disabled={busy || c.availability === "unavailable" || !locationId}
                    onClick={() => void addToCart(c)}
                    className={cn(
                      "flex w-full min-h-[52px] items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors",
                      "hover:bg-muted/50 disabled:opacity-50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {bchProductDisplayName(c.productName, { sku: c.productSku })}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.sellingUnitName} · {categoryLabel(c.category)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatMoney(c.unitPrice, c.currency)}</p>
                      {availabilityBadge(c.availability)}
                    </div>
                  </button>
                ))}
                {filteredCatalog.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item com preço vigente.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Carrinho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!sale || sale.status !== "open" ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Abra uma venda ou toque em um produto.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {sale.items.map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{bchProductDisplayName(i.productName)}</p>
                          <p className="text-xs text-muted-foreground">{i.sellingUnitName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-10 w-10"
                            disabled={busy}
                            onClick={() =>
                              void updateQty(i.id, Math.max(1, Math.floor(Number.parseFloat(i.quantity)) - 1))
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm">{i.quantity}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-10 w-10"
                            disabled={busy}
                            onClick={() => void updateQty(i.id, Math.floor(Number.parseFloat(i.quantity)) + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="w-20 text-right text-sm font-medium">
                          {formatMoney(i.lineTotal, i.currency)}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 text-destructive"
                          disabled={busy}
                          onClick={() => void removeItem(i.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatMoney(sale.subtotal, sale.currency)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total</span>
                      <span>{formatMoney(sale.total, sale.currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pago</span>
                      <span>{formatMoney(sale.amountPaid, sale.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Restante</span>
                      <span>{formatMoney(sale.amountDue, sale.currency)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <Label className="text-xs">Pagamento</Label>
                    <NativeSelect
                      className="min-h-[44px] w-full"
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as (typeof BCH_BAR_POS_PAYMENT_METHODS)[number])
                      }
                    >
                      {BCH_BAR_POS_PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {BCH_BAR_POS_PAYMENT_METHOD_LABEL[m]}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={`Valor (padrão: ${sale.amountDue})`}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="min-h-[44px] text-foreground"
                    />
                    {paymentMethod === "cash" ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Valor recebido (opcional)"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="min-h-[44px] text-foreground"
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px] w-full"
                      disabled={busy || sale.items.length === 0}
                      onClick={() => void addPayment()}
                    >
                      Registrar pagamento
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="min-h-[48px] w-full text-base"
                    disabled={busy || sale.items.length === 0}
                    onClick={() => void completeSale()}
                  >
                    Finalizar venda
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
