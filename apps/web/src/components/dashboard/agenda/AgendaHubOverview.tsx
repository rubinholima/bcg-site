"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ClipboardList,
  Loader2,
  Megaphone,
  Shirt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { agendaHubUrl, AGENDA_VISAO, type AgendaVisao } from "@/lib/agenda-hub";
import type { FootballAgendaCalendarItem } from "@/types/futebol-agenda";
import { FOOTBALL_AGENDA_TYPE_LABEL } from "@/types/futebol-agenda";
import type { VenueBooking } from "@/types/boston-city-hall";
import { BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";

type UpcomingItem = {
  id: string;
  visao: AgendaVisao;
  title: string;
  subtitle: string;
  startAt: string;
  badge: string;
};

function nextDaysRange(days: number) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AREA_META: Record<
  Exclude<AgendaVisao, typeof AGENDA_VISAO.GERAL>,
  { label: string; icon: LucideIcon; accent: string }
> = {
  [AGENDA_VISAO.FUTEBOL]: {
    label: "Futebol",
    icon: Shirt,
    accent: "from-sky-500/10 to-sky-600/5 border-sky-500/25",
  },
  [AGENDA_VISAO.BOSTON_HALL]: {
    label: "Boston City Hall",
    icon: Building2,
    accent: "from-amber-500/10 to-amber-600/5 border-amber-500/25",
  },
  [AGENDA_VISAO.CONSULTAS]: {
    label: "Consultas",
    icon: ClipboardList,
    accent: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/25",
  },
  [AGENDA_VISAO.MARKETING]: {
    label: "Marketing",
    icon: Megaphone,
    accent: "from-violet-500/10 to-violet-600/5 border-violet-500/25",
  },
};

export function AgendaHubOverview({ onOpenVisao }: { onOpenVisao: (visao: AgendaVisao) => void }) {
  const { canAccessModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  const canFutebol = canAccessModule("futebol_logistica");
  const canBch = canAccessModule("eventos");
  const canConsultas = canAccessModule("saude");
  const canMarketing = canAccessModule("marketing");

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = nextDaysRange(14);
    const items: UpcomingItem[] = [];
    const nextCounts: Record<string, number> = {};

    const tasks: Promise<void>[] = [];

    if (canFutebol) {
      tasks.push(
        api
          .get<FootballAgendaCalendarItem[]>(
            `/futebol-agenda/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          )
          .then(({ data }) => {
            const list = Array.isArray(data) ? data : [];
            nextCounts.futebol = list.length;
            for (const row of list.slice(0, 6)) {
              items.push({
                id: `f-${row.id}`,
                visao: AGENDA_VISAO.FUTEBOL,
                title: row.title,
                subtitle: row.tenantName ?? "Futebol",
                startAt: row.startAt,
                badge: FOOTBALL_AGENDA_TYPE_LABEL[row.type] ?? row.type,
              });
            }
          })
          .catch(() => {
            nextCounts.futebol = 0;
          }),
      );
    }

    if (canBch) {
      tasks.push(
        api
          .get<VenueBooking[]>(
            `/boston-city-hall/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          )
          .then(({ data }) => {
            const list = (Array.isArray(data) ? data : []).filter((b) => b.status !== "cancelled");
            nextCounts.bostonHall = list.length;
            for (const row of list.slice(0, 6)) {
              items.push({
                id: `b-${row.id}`,
                visao: AGENDA_VISAO.BOSTON_HALL,
                title: row.title?.trim() || row.contactName || "Reserva",
                subtitle: "Boston City Hall",
                startAt: row.startAt,
                badge: BOOKING_STATUS_LABEL[row.status] ?? row.status,
              });
            }
          })
          .catch(() => {
            nextCounts.bostonHall = 0;
          }),
      );
    }

    if (canConsultas) {
      tasks.push(
        api
          .get<Array<{ id: string; playerName?: string; date?: string; time?: string; status?: string }>>(
            "/consultations",
          )
          .then(({ data }) => {
            const list = (Array.isArray(data) ? data : []).filter((c) => c.status !== "cancelled");
            const inRange = list.filter((c) => {
              if (!c.date) return false;
              const iso = `${c.date}T${c.time ?? "12:00"}:00`;
              const t = new Date(iso).getTime();
              return t >= new Date(from).getTime() && t <= new Date(to).getTime();
            });
            nextCounts.consultas = inRange.length;
            for (const row of inRange.slice(0, 6)) {
              const iso = `${row.date}T${row.time ?? "09:00"}:00`;
              items.push({
                id: `c-${row.id}`,
                visao: AGENDA_VISAO.CONSULTAS,
                title: row.playerName ?? "Consulta",
                subtitle: "Psicologia",
                startAt: iso,
                badge: row.status === "completed" ? "Realizada" : "Agendada",
              });
            }
          })
          .catch(() => {
            nextCounts.consultas = 0;
          }),
      );
    }

    if (canMarketing) {
      const now = new Date();
      tasks.push(
        api
          .get<Array<{ id: string; title: string | null; scheduledAt: string | null; status: string }>>(
            `/marketing/posts?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
          )
          .then(({ data }) => {
            const list = (Array.isArray(data) ? data : []).filter((p) => p.scheduledAt);
            const inRange = list.filter((p) => {
              const t = new Date(p.scheduledAt!).getTime();
              return t >= new Date(from).getTime() && t <= new Date(to).getTime();
            });
            nextCounts.marketing = inRange.length;
            for (const row of inRange.slice(0, 6)) {
              items.push({
                id: `m-${row.id}`,
                visao: AGENDA_VISAO.MARKETING,
                title: row.title?.trim() || "Publicação",
                subtitle: "Marketing",
                startAt: row.scheduledAt!,
                badge: row.status === "scheduled" ? "Agendada" : row.status,
              });
            }
          })
          .catch(() => {
            nextCounts.marketing = 0;
          }),
      );
    }

    await Promise.all(tasks);
    items.sort((a, b) => a.startAt.localeCompare(b.startAt));
    setCounts(nextCounts);
    setUpcoming(items.slice(0, 12));
    setLoading(false);
  }, [canBch, canConsultas, canFutebol, canMarketing]);

  useEffect(() => {
    void load();
  }, [load]);

  const areas = useMemo(
    () =>
      (Object.keys(AREA_META) as Array<Exclude<AgendaVisao, typeof AGENDA_VISAO.GERAL>>).filter((key) => {
        if (key === AGENDA_VISAO.FUTEBOL) return canFutebol;
        if (key === AGENDA_VISAO.BOSTON_HALL) return canBch;
        if (key === AGENDA_VISAO.CONSULTAS) return canConsultas;
        if (key === AGENDA_VISAO.MARKETING) return canMarketing;
        return false;
      }),
    [canBch, canConsultas, canFutebol, canMarketing],
  );

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {areas.map((key) => {
          const meta = AREA_META[key];
          const Icon = meta.icon;
          const countKey =
            key === AGENDA_VISAO.FUTEBOL
              ? "futebol"
              : key === AGENDA_VISAO.BOSTON_HALL
                ? "bostonHall"
                : key === AGENDA_VISAO.CONSULTAS
                  ? "consultas"
                  : "marketing";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenVisao(key)}
              className={`rounded-xl border bg-gradient-to-br p-4 text-left transition hover:ring-1 hover:ring-violet-500/30 ${meta.accent}`}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-5 w-5 shrink-0 opacity-80" />
                <span className="text-2xl font-bold tabular-nums">
                  {loading ? "—" : (counts[countKey] ?? 0)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">Próximos 14 dias</p>
            </button>
          );
        })}
      </div>

      <Card className="rounded-xl shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-violet-400" />
              Próximos compromissos
            </CardTitle>
            <CardDescription>Visão consolidada de todas as áreas com acesso</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum compromisso nos próximos 14 dias nas áreas disponíveis.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((item) => {
                const meta = AREA_META[item.visao as Exclude<AgendaVisao, typeof AGENDA_VISAO.GERAL>];
                const Icon = meta?.icon ?? Calendar;
                return (
                  <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                      <Icon className="h-5 w-5 text-violet-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.subtitle} · {formatWhen(item.startAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.badge}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link href={agendaHubUrl(item.visao)}>Abrir</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
