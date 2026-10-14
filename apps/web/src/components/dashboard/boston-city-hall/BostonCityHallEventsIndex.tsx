"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import type { EventTicketingEventListItem, VenueOperationListItem } from "@/types/boston-city-hall";
import { EVENT_STATUS_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

function formatWhen(ev: EventTicketingEventListItem): string {
  if (!ev.startDate) return "Data a definir";
  const d = new Date(ev.startDate);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export function BostonCityHallEventsIndex() {
  const [events, setEvents] = useState<EventTicketingEventListItem[]>([]);
  const [spaceByEventId, setSpaceByEventId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([
      api.get<EventTicketingEventListItem[]>("/boston-city-hall/ticketing/events"),
      api.get<VenueOperationListItem[]>("/boston-city-hall/operations"),
    ])
      .then(([evRes, opsRes]) => {
        setEvents(Array.isArray(evRes.data) ? evRes.data : []);
        const map: Record<string, string> = {};
        for (const op of Array.isArray(opsRes.data) ? opsRes.data : []) {
          if (op.event?.id && op.spaceName?.trim()) {
            map[op.event.id] = op.spaceName.trim();
          }
        }
        setSpaceByEventId(map);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar eventos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-50">Eventos</h1>
        <Button
          type="button"
          className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Criar evento
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400/80" />
        </div>
      ) : (
        <>
          <BchEventListDiagnostics
            error={error}
            eventCount={events.length}
            onRetry={load}
            onCreateEvent={() => setCreateOpen(true)}
          />
          {events.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {events.map((ev) => (
                <li key={ev.id}>
                  <Link
                    href={bchEventWorkspacePath(ev.id)}
                    className={cn(
                      BCH_CARD,
                      "block transition-colors hover:border-sky-500/40 hover:bg-[#0c1528]/80",
                    )}
                  >
                    <p className="font-semibold text-slate-50">{bchEventDisplayName(ev.name)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatWhen(ev)}
                      {spaceByEventId[ev.id] ? ` · ${spaceByEventId[ev.id]}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md border border-slate-700 bg-slate-900/50 px-2 py-0.5 text-[11px] text-slate-300">
                        {EVENT_STATUS_LABEL[ev.status] ?? ev.status}
                      </span>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px]",
                          ev.ticketingEnabled
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-700 text-slate-500",
                        )}
                      >
                        {ev.ticketingEnabled ? "Bilheteria ativa" : "Bilheteria off"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <BostonCityHallCreateBchEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />
    </div>
  );
}
