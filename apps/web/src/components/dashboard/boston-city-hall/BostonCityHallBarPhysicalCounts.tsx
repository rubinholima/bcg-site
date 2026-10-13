"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BchCard } from "@/components/dashboard/boston-city-hall/BchCard";
import { BCH_BTN_PRIMARY, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { bchProductDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { cn } from "@/lib/utils";
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
  BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_LABEL,
  BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS,
  type BchBarInventoryLocation,
  type BchBarPhysicalCount,
  type BchBarProduct,
} from "@/types/bch-bar";

function divergenceClass(value: string | null) {
  if (value == null) return "text-muted-foreground";
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n === 0) return "text-muted-foreground";
  return n > 0 ? "text-emerald-400" : "text-red-400";
}

export function BostonCityHallBarPhysicalCounts() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<BchBarInventoryLocation[]>([]);
  const [products, setProducts] = useState<BchBarProduct[]>([]);
  const [counts, setCounts] = useState<BchBarPhysicalCount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<BchBarPhysicalCount | null>(null);
  const [newLocationId, setNewLocationId] = useState("");
  const [addProductId, setAddProductId] = useState("");
  const [draftCounts, setDraftCounts] = useState<Record<string, { qty: string; reason: string }>>({});
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const selected = useMemo(
    () => counts.find((c) => c.id === selectedId) ?? detail,
    [counts, selectedId, detail],
  );

  const readOnly = selected?.status === "completed" || selected?.status === "cancelled";

  const refreshList = useCallback(async () => {
    const { data } = await api.get<BchBarPhysicalCount[]>("/boston-city-hall/bar/physical-counts");
    setCounts(Array.isArray(data) ? data : []);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    const { data } = await api.get<BchBarPhysicalCount>(`/boston-city-hall/bar/physical-counts/${id}`);
    setDetail(data);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [{ data: locs }, { data: prods }] = await Promise.all([
          api.get<BchBarInventoryLocation[]>("/boston-city-hall/bar/locations"),
          api.get<BchBarProduct[]>("/boston-city-hall/bar/products"),
        ]);
        setLocations(Array.isArray(locs) ? locs.filter((l) => l.active) : []);
        setProducts(Array.isArray(prods) ? prods : []);
        await refreshList();
      } catch (e) {
        setFeedback({
          open: true,
          title: "Erro",
          message: e instanceof Error ? e.message : "Falha ao carregar.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId).catch(() => setDetail(null));
  }, [selectedId, loadDetail]);

  const createAndStart = async () => {
    if (!newLocationId) return;
    setBusy(true);
    try {
      const { data: created } = await api.post<BchBarPhysicalCount>("/boston-city-hall/bar/physical-counts", {
        locationId: newLocationId,
      });
      const { data: started } = await api.post<BchBarPhysicalCount>(
        `/boston-city-hall/bar/physical-counts/${created.id}/start`,
        {},
      );
      await refreshList();
      setSelectedId(started.id);
      setDetail(started);
      setFeedback({ open: true, title: "Contagem iniciada", message: "Informe as quantidades contadas.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível iniciar.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveItem = async (itemId: string) => {
    if (!selected) return;
    const draft = draftCounts[itemId];
    if (!draft?.qty.trim()) return;
    setBusy(true);
    try {
      await api.patch(`/boston-city-hall/bar/physical-counts/${selected.id}/items/${itemId}`, {
        countedQuantity: draft.qty,
        reason: draft.reason || null,
      });
      await loadDetail(selected.id);
      await refreshList();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao salvar linha.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const addProduct = async () => {
    if (!selected || !addProductId) return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/physical-counts/${selected.id}/items`, { productId: addProductId });
      await loadDetail(selected.id);
      setAddProductId("");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível adicionar produto.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const completeCount = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/physical-counts/${selected.id}/complete`, {});
      await refreshList();
      await loadDetail(selected.id);
      setFeedback({ open: true, title: "Concluída", message: "Ajustes aplicados no estoque.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível concluir.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancelCount = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/physical-counts/${selected.id}/cancel`, {});
      await refreshList();
      await loadDetail(selected.id);
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = detail?.items ?? selected?.items ?? [];

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>

      <BchCard title="Nova contagem">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label className="text-xs">Local</Label>
            <NativeSelect
              className="mt-1 min-h-[44px] w-full"
              value={newLocationId}
              onChange={(e) => setNewLocationId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.kind})
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            type="button"
            className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
            disabled={busy || !newLocationId}
            onClick={() => void createAndStart()}
          >
            Iniciar contagem
          </Button>
          </div>
      </BchCard>

      <BchCard title="Sessões">
          <div>
          <NativeSelect
            className="min-h-[44px] w-full max-w-xl"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {counts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.locationName} — {c.status} ({c.startedAt?.slice(0, 10) ?? "rascunho"})
              </option>
            ))}
          </NativeSelect>
          {detail?.openContainers.length ? (
            <p className="mt-2 text-sm text-amber-400">
              {detail.openContainers.length} garrafa(s) aberta(s) neste local — contagem abaixo é só estoque fechado.
            </p>
          ) : null}
          </div>
      </BchCard>

      {selected && rows.length > 0 ? (
        <BchCard title={`${readOnly ? "Histórico" : "Contagem"} — ${selected.locationName}`}>
            <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Contado</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Motivo</TableHead>
                  {!readOnly ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((line) => {
                  const draft = draftCounts[line.id];
                  const countedDisplay = readOnly ? line.countedQuantity : draft?.qty ?? line.countedQuantity ?? "";
                  const reasonDisplay = readOnly ? line.reason : draft?.reason ?? line.reason ?? "";
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{bchProductDisplayName(line.productName)}</TableCell>
                      <TableCell>{line.expectedQuantity}</TableCell>
                      <TableCell>
                        {readOnly ? (
                          line.countedQuantity ?? "—"
                        ) : (
                          <Input
                            className="min-h-[44px] w-24 text-foreground"
                            inputMode="decimal"
                            placeholder="—"
                            value={countedDisplay ?? ""}
                            onChange={(e) =>
                              setDraftCounts((d) => ({
                                ...d,
                                [line.id]: { qty: e.target.value, reason: d[line.id]?.reason ?? line.reason ?? "" },
                              }))
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className={cn("font-medium", divergenceClass(line.divergenceQuantity))}>
                        {line.divergenceQuantity ?? (readOnly ? "—" : "…")}
                      </TableCell>
                      <TableCell>
                        {readOnly ? (
                          line.reason ? (BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_LABEL[line.reason as keyof typeof BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_LABEL] ?? line.reason) : "—"
                        ) : (
                          <NativeSelect
                            className="min-h-[44px] min-w-[140px]"
                            value={reasonDisplay ?? ""}
                            onChange={(e) =>
                              setDraftCounts((d) => ({
                                ...d,
                                [line.id]: { qty: d[line.id]?.qty ?? line.countedQuantity ?? "", reason: e.target.value },
                              }))
                            }
                          >
                            <option value="">Motivo…</option>
                            {BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_LABEL[r]}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                      </TableCell>
                      {!readOnly ? (
                        <TableCell>
                          <Button type="button" size="sm" className="min-h-[44px]" disabled={busy} onClick={() => void saveItem(line.id)}>
                            Salvar
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!readOnly && selected.status === "in_progress" ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label className="text-xs">Adicionar produto</Label>
                  <NativeSelect
                    className="mt-1 min-h-[44px] w-full"
                    value={addProductId}
                    onChange={(e) => setAddProductId(e.target.value)}
                  >
                    <option value="">Produto ativo…</option>
                    {products.filter((p) => p.active).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy || !addProductId} onClick={() => void addProduct()}>
                  Adicionar
                </Button>
              </div>
            ) : null}
            {!readOnly && selected.status === "in_progress" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
                  disabled={busy}
                  onClick={() => void completeCount()}
                >
                  Concluir e ajustar estoque
                </Button>
                <Button type="button" variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => void cancelCount()}>
                  Cancelar
                </Button>
              </div>
            ) : null}
            </div>
        </BchCard>
      ) : null}

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
