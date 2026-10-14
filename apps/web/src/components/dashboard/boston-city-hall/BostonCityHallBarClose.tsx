"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BchCard } from "@/components/dashboard/boston-city-hall/BchCard";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BCH_BTN_PRIMARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelect } from "@/components/ui/native-select";
import type { BchBarEventInventory } from "@/types/bch-bar";

type BarClose = {
  id: string;
  eventTitle: string | null;
  status: string;
  warnings: string[];
  snapshot: Record<string, unknown> | null;
};

export function BostonCityHallBarClose(_props?: { fixedEventId?: string; embedded?: boolean }) {
  const [inventories, setInventories] = useState<BchBarEventInventory[]>([]);
  const [closes, setCloses] = useState<BarClose[]>([]);
  const [invId, setInvId] = useState("");
  const [selectedCloseId, setSelectedCloseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const refresh = useCallback(async () => {
    const [{ data: invs }, { data: cls }] = await Promise.all([
      api.get<BchBarEventInventory[]>("/boston-city-hall/bar/event-inventories"),
      api.get<BarClose[]>("/boston-city-hall/bar/closes"),
    ]);
    setInventories(Array.isArray(invs) ? invs.filter((i) => i.status === "closed") : []);
    setCloses(Array.isArray(cls) ? cls : []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const draft = async () => {
    if (!invId) return;
    setBusy(true);
    try {
      const { data } = await api.post<BarClose>("/boston-city-hall/bar/closes", { eventInventoryId: invId });
      await refresh();
      setSelectedCloseId(data.id);
      setFeedback({ open: true, title: "Rascunho", message: "Prévia de fechamento gerada.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao gerar rascunho.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!selectedCloseId) return;
    setBusy(true);
    try {
      await api.post(`/boston-city-hall/bar/closes/${selectedCloseId}/finalize`, {});
      await refresh();
      setFeedback({ open: true, title: "Finalizado", message: "Fechamento operacional concluído.", variant: "success" });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível finalizar.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const selected = closes.find((c) => c.id === selectedCloseId);

  if (loading) {
    return <BchLoadingBlock label="Carregando fechamentos…" />;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>
      <BchCard title="Gerar fechamento">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <NativeSelect className="min-h-[44px] flex-1" value={invId} onChange={(e) => setInvId(e.target.value)}>
            <option value="">Estoque de evento fechado…</option>
            {inventories.map((i) => (
              <option key={i.id} value={i.id}>
                {i.eventTitle ?? "Evento"} — {i.locationName}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
            disabled={busy || !invId}
            onClick={() => void draft()}
          >
            Prévia
          </Button>
          </div>
      </BchCard>
      <BchCard title="Fechamentos">
          <div className="space-y-3">
          <NativeSelect
            className="min-h-[44px] w-full max-w-xl"
            value={selectedCloseId}
            onChange={(e) => setSelectedCloseId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {closes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.eventTitle ?? "Evento"} — {c.status}
              </option>
            ))}
          </NativeSelect>
          {selected?.warnings?.length ? (
            <ul className="text-sm text-amber-400">
              {selected.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {selected?.status === "draft" ? (
            <Button
              type="button"
              className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
              disabled={busy}
              onClick={() => void finalize()}
            >
              Finalizar fechamento
            </Button>
          ) : null}
          {selected?.status === "finalized" ? (
            <p className="text-sm text-muted-foreground">Fechamento imutável — consulta apenas.</p>
          ) : null}
          </div>
      </BchCard>
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
