"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

type OmieConnectionStatus = {
  configured?: boolean;
  ok?: boolean;
  message?: string;
  lastSuccessfulSyncAt?: string | null;
  lastSyncAttemptAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
};

type SyncBatch = {
  id: string;
  status: string;
  syncType: string;
  recordsRead: number;
  recordsNew: number;
  recordsUpdated: number;
  startedAt: string;
};

export default function FinanceiroOmiePage() {
  const { tenantId, tenant } = useFinanceiroTenant();
  const [status, setStatus] = useState<OmieConnectionStatus | null>(null);
  const [batches, setBatches] = useState<SyncBatch[]>([]);
  const [syncType, setSyncType] = useState("both");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [st, bt] = await Promise.all([
      api.get<OmieConnectionStatus>(`/financeiro/omie/conexao?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<SyncBatch[]>(`/financeiro/omie/sincronizacao/lotes?tenantId=${encodeURIComponent(tenantId)}`),
    ]);
    setStatus(st.data);
    setBatches(Array.isArray(bt.data) ? bt.data : []);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    setLoading(true);
    try {
      await api.post("/financeiro/omie/sincronizar", {
        tenantId,
        syncType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      await load();
      setFeedback({ title: "Sincronização concluída", message: "Leitura Omie → CUP360 finalizada (somente leitura)." });
    } catch (e) {
      setFeedback({ title: "Falha na sincronização", message: e instanceof Error ? e.message : "Erro." });
    } finally {
      setLoading(false);
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omie — leitura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Omie permanece o sistema operacional diário. CUP360 espelha títulos para reconciliação — sem escrita no Omie (
            {tenant?.name ?? "empresa"}).
          </p>
          {status ? (
            <div className="rounded-md border border-border/50 p-3 text-foreground space-y-1">
              <p>Configurado: {status.configured ? "Sim" : "Não"}</p>
              <p>Conexão: {status.ok ? "OK" : status.configured ? "Erro" : "—"}</p>
              {status.message ? <p className="text-muted-foreground">{status.message}</p> : null}
              <p className="text-xs text-muted-foreground">
                Última sync OK: {status.lastSuccessfulSyncAt ? new Date(status.lastSuccessfulSyncAt).toLocaleString("pt-BR") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Última tentativa: {status.lastSyncAttemptAt ? new Date(status.lastSyncAttemptAt).toLocaleString("pt-BR") : "—"}
              </p>
            </div>
          ) : null}
          <Link href={`/dashboard/adm/financeiro/omie/reconciliacao?tenantId=${encodeURIComponent(tenantId)}`} className="text-sm text-violet-400 underline">
            Abrir reconciliação Omie
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sincronizar Omie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <NativeSelectField
            value={syncType}
            onChange={(e) => setSyncType(e.target.value)}
            placeholder="Tipo"
            options={[
              { value: "both", label: "AP + AR" },
              { value: "ap", label: "Contas a pagar" },
              { value: "ar", label: "Contas a receber" },
            ]}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="omie-from">De</Label>
              <Input
                id="omie-from"
                type="date"
                className="text-foreground"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="omie-to">Até</Label>
              <Input
                id="omie-to"
                type="date"
                className="text-foreground"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" disabled={loading || !status?.configured} onClick={() => void runSync()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Sincronizar (somente leitura)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lotes de sincronização</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {batches.slice(0, 10).map((b) => (
            <p key={b.id} className="text-xs border-b border-zinc-800 pb-1">
              {b.status} · {b.syncType} · lidos {b.recordsRead} · novos {b.recordsNew} · atualizados {b.recordsUpdated}
            </p>
          ))}
          {!batches.length ? <p className="text-muted-foreground text-xs">Nenhum lote ainda.</p> : null}
        </CardContent>
      </Card>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
