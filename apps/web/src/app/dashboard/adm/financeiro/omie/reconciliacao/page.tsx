"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../../financeiro-tenant-shell";

type QueueItem = {
  mirror: {
    id: string;
    tituloTipo: string;
    omieExternalId: string;
    matchLevel: string;
    omieReconciliationState: string;
  };
  sideBySide: {
    omie: Record<string, unknown>;
    cup360: Record<string, unknown> | null;
    differences: string[];
  };
};

export default function FinanceiroOmieReconciliacaoPage() {
  const { tenantId } = useFinanceiroTenant();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkLancId, setLinkLancId] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [q, s] = await Promise.all([
      api.get<QueueItem[]>(`/financeiro/omie/reconciliacao/fila?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<Record<string, unknown>>(
        `/financeiro/omie/reconciliacao/resumo?tenantId=${encodeURIComponent(tenantId)}`,
      ),
    ]);
    setQueue(Array.isArray(q.data) ? q.data : []);
    setSummary(s.data);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function linkMirror(mirrorId: string) {
    const financeiroLancamentoId = linkLancId[mirrorId]?.trim();
    if (!financeiroLancamentoId) return;
    setLoading(true);
    try {
      await api.post("/financeiro/omie/reconciliacao/vincular", {
        tenantId,
        mirrorId,
        financeiroLancamentoId,
      });
      await load();
      setFeedback({ title: "Vínculo criado", message: "Relação Omie ↔ CUP360 registrada." });
    } catch (e) {
      setFeedback({ title: "Erro", message: e instanceof Error ? e.message : "Falha ao vincular." });
    } finally {
      setLoading(false);
    }
  }

  async function keepSeparate(mirrorId: string) {
    setLoading(true);
    try {
      await api.post("/financeiro/omie/reconciliacao/manter-separado", { tenantId, mirrorId });
      await load();
    } catch (e) {
      setFeedback({ title: "Erro", message: e instanceof Error ? e.message : "Falha." });
    } finally {
      setLoading(false);
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliação Omie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-xs text-muted-foreground">
            Conciliação Omie (títulos externos) — distinto da conciliação financeira bancária CUP360.
          </p>
          {summary ? (
            <p className="text-xs">
              CUP360 sem vínculo Omie: {String(summary.cup360WithoutOmieLink ?? 0)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {queue.map((item) => (
        <Card key={item.mirror.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {item.mirror.tituloTipo.toUpperCase()} · {item.mirror.matchLevel} · {item.mirror.omieExternalId}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded border border-zinc-800 p-2">
              <p className="text-xs font-medium mb-1">Omie</p>
              <p>{String(item.sideBySide.omie.counterparty ?? "—")}</p>
              <p>{String(item.sideBySide.omie.document ?? "—")}</p>
              <p>{String(item.sideBySide.omie.originalAmount ?? "—")}</p>
              <p>Venc.: {String(item.sideBySide.omie.dueDate ?? "—")}</p>
              <p>Status: {String(item.sideBySide.omie.status ?? "—")}</p>
            </div>
            <div className="rounded border border-zinc-800 p-2">
              <p className="text-xs font-medium mb-1">CUP360</p>
              {item.sideBySide.cup360 ? (
                <>
                  <p>{String(item.sideBySide.cup360.counterparty ?? "—")}</p>
                  <p>{String(item.sideBySide.cup360.document ?? "—")}</p>
                  <p>{String(item.sideBySide.cup360.originalAmount ?? "—")}</p>
                  <p>Origem: {String(item.sideBySide.cup360.origin ?? "—")}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Sem candidato canônico</p>
              )}
            </div>
            {item.sideBySide.differences.length ? (
              <p className="md:col-span-2 text-xs text-amber-400">
                Diferenças: {item.sideBySide.differences.join(", ")}
              </p>
            ) : null}
            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`link-${item.mirror.id}`}>ID lançamento CUP360</Label>
                <Input
                  id={`link-${item.mirror.id}`}
                  className="text-foreground"
                  value={linkLancId[item.mirror.id] ?? ""}
                  onChange={(e) => setLinkLancId((p) => ({ ...p, [item.mirror.id]: e.target.value }))}
                />
              </div>
              <Button type="button" size="sm" disabled={loading} onClick={() => void linkMirror(item.mirror.id)}>
                Vincular
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => void keepSeparate(item.mirror.id)}
              >
                Manter separado
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!queue.length ? (
        <p className="text-sm text-muted-foreground">Nenhum candidato na fila. Execute sincronização Omie primeiro.</p>
      ) : null}

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
