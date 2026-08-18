"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import type { SocialPedagogyAptoNotificationsResponse } from "@/lib/assistencia-social-types";
import { statusLabel } from "@/lib/assistencia-social-types";

export function AssistenciaSocialAptoNotifications({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<SocialPedagogyAptoNotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get<SocialPedagogyAptoNotificationsResponse>(
        `/assistencia-social/notifications/novos-aptos?tenantId=${encodeURIComponent(tenantId)}`,
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
        Verificando novos atletas aptos…
      </div>
    );
  }

  if (!data || data.count === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-semibold text-amber-100">
          {data.count === 1
            ? "1 novo atleta apto (BID)"
            : `${data.count} novos atletas aptos (BID)`}
        </p>
      </div>
      <ul className="space-y-2">
        {data.items.map((item) => (
          <li
            key={item.caseId}
            className="flex flex-col gap-1 rounded-md border border-amber-500/20 bg-zinc-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{item.playerName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateDayMonYear(item.createdAt)}
                {item.category ? ` · ${item.category}` : ""}
                {` · ${statusLabel(item.status)}`}
              </p>
            </div>
            <Link
              href={`/dashboard/cadastros/jogadores/${item.playerId}/edit?tab=assistencia_social`}
              className="min-h-[44px] inline-flex items-center text-sm font-medium text-amber-300 hover:text-amber-200 hover:underline"
            >
              Abrir ficha — matrícula escolar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
