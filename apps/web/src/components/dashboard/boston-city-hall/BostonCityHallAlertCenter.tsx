"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BCH_BTN_SECONDARY, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BchOperationalAlert } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const severityClass: Record<string, string> = {
  critical: "text-red-300 bg-red-500/15 ring-red-500/30",
  warning: "text-amber-100 bg-amber-500/15 ring-amber-500/30",
  info: "text-sky-100 bg-sky-500/15 ring-sky-500/30",
};

export function BostonCityHallAlertCenter({ initialEventId }: { initialEventId?: string }) {
  const [status, setStatus] = useState<string>("open");
  const [severity, setSeverity] = useState<string>("");
  const [eventId, setEventId] = useState(initialEventId ?? "");
  const [items, setItems] = useState<BchOperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("evaluate", "1");
    if (status) p.set("status", status);
    if (severity) p.set("severity", severity);
    if (eventId.trim()) p.set("eventId", eventId.trim());
    return p.toString();
  }, [status, severity, eventId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<BchOperationalAlert[]>(`/boston-city-hall/alerts?${query}`);
      setItems(res.data);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acknowledge(id: string) {
    setAckLoading(id);
    try {
      await api.post(`/boston-city-hall/alerts/${encodeURIComponent(id)}/acknowledge`, {});
      await load();
    } finally {
      setAckLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <BchFilterBar>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Status</label>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Abertos</option>
            <option value="acknowledged">Reconhecidos</option>
            <option value="resolved">Resolvidos</option>
          </NativeSelect>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground">Severidade</label>
          <NativeSelect value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Todas</option>
            <option value="critical">Crítico</option>
            <option value="warning">Aviso</option>
            <option value="info">Info</option>
          </NativeSelect>
        </div>
        {initialEventId ? null : (
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Evento (ID)</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Filtrar por evento…"
            />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          className={cn("min-h-[44px]", BCH_BTN_SECONDARY)}
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </BchFilterBar>

      {loading && !items.length ? (
        <BchLoadingBlock label="Carregando alertas…" />
      ) : (
        <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Detectado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs ring-1 ring-inset capitalize",
                          severityClass[a.severity] ?? "",
                        )}
                      >
                        {a.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                    </TableCell>
                    <TableCell className="text-sm">{a.eventName ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {new Date(a.detectedAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{a.status}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {a.actionUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={a.actionUrl}>Abrir</Link>
                        </Button>
                      ) : null}
                      {a.status === "open" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={ackLoading === a.id}
                          onClick={() => void acknowledge(a.id)}
                        >
                          {ackLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Vi"}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!items.length ? (
              <BchEmptyState message="Nenhum alerta neste filtro." className="py-8" />
            ) : null}
        </div>
      )}
    </div>
  );
}
