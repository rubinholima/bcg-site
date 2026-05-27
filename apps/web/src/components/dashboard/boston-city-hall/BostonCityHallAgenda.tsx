"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueBooking } from "@/types/boston-city-hall";
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL } from "@/types/boston-city-hall";

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function BostonCityHallAgenda() {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthRange(cursor.year, cursor.month);
    try {
      const res = await api.get<VenueBooking[]>(
        `/boston-city-hall/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [cursor.year, cursor.month]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, VenueBooking[]>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const key = b.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const startWeekday = new Date(cursor.year, cursor.month, 1).getDay();

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-lg capitalize">{monthLabel}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() =>
              setCursor((c) =>
                c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() =>
              setCursor((c) =>
                c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 },
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[88px] rounded-lg bg-muted/20" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = byDay.get(dateKey) ?? [];
                const isToday =
                  dateKey ===
                  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                return (
                  <div
                    key={dateKey}
                    className={`min-h-[88px] rounded-lg border p-1.5 text-left ${
                      isToday ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"
                    }`}
                  >
                    <span className="text-xs font-semibold text-muted-foreground">{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className={`truncate rounded border px-1 py-0.5 text-[10px] leading-tight sm:text-[11px] ${BOOKING_STATUS_COLOR[b.status] ?? ""}`}
                          title={`${b.title} — ${b.spaceName ?? ""}`}
                        >
                          {formatDayLabel(b.startAt)} {b.title}
                        </div>
                      ))}
                      {items.length > 3 ? (
                        <p className="text-[10px] text-muted-foreground">+{items.length - 3}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Gerencie detalhes em{" "}
              <Link href="/dashboard/eventos/boston-city-hall/reservas" className="text-primary hover:underline">
                Reservas
              </Link>
              .
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BostonCityHallAgendaLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {Object.entries(BOOKING_STATUS_LABEL).map(([key, label]) => (
        <span
          key={key}
          className={`rounded-full border px-2 py-0.5 ${BOOKING_STATUS_COLOR[key] ?? ""}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
