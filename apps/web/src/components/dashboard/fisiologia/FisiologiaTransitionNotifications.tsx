"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { TransitionOperationalSummary } from "@/lib/fisiologia-transition-types";

export function FisiologiaTransitionNotifications({ tenantId }: { tenantId?: string }) {
  const [data, setData] = useState<TransitionOperationalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data: res } = await api.get<TransitionOperationalSummary>(
        `/fisiologia/transition-programs/summary${params}`,
      );
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando encaminhamentos…
      </div>
    );
  }

  if (!data || data.newCount === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-semibold text-amber-100">
          {data.newCount === 1
            ? "1 novo atleta em transição"
            : `${data.newCount} novos atletas em transição`}
        </p>
      </div>
      <ul className="space-y-2">
        {data.items.map((item) => (
          <li
            key={item.programId}
            className="flex flex-col gap-1 rounded-md border border-amber-500/20 bg-zinc-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{item.playerName}</p>
              <p className="text-xs text-muted-foreground">
                Encaminhado {formatDateDayMonYear(item.startedAt)}
                {item.originLabel ? ` · ${item.originLabel}` : ""}
              </p>
            </div>
            <Link
              href={`/dashboard/futebol/fisiologia/transicoes/${item.programId}`}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-amber-300 hover:text-amber-200 hover:underline"
            >
              Registrar 1ª sessão
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
