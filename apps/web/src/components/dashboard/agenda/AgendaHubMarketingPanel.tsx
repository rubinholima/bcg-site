"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface MarketingPost {
  id: string;
  title: string | null;
  scheduledAt: string | null;
  status: string;
  tenant?: { name: string } | null;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: { date: string; day: number; isEmpty: boolean }[] = [];
  for (let i = 0; i < startPad; i++) days.push({ date: "", day: 0, isEmpty: true });
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      isEmpty: false,
    });
  }
  return days;
}

export function AgendaHubMarketingPanel() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("month", String(month + 1));
    api
      .get<MarketingPost[]>(`/marketing/posts?${params.toString()}`)
      .then(({ data }) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const postsByDate = posts.reduce<Record<string, MarketingPost[]>>((acc, p) => {
    if (!p.scheduledAt) return acc;
    const key = p.scheduledAt.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const days = getDaysInMonth(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Publicações agendadas no planner de marketing. Edite e publique na tela completa.
        </p>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/dashboard/marketing">
            <ExternalLink className="h-4 w-4" />
            Abrir planner completo
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg capitalize">
              <Megaphone className="h-5 w-5 text-violet-400" />
              {monthLabel}
            </CardTitle>
            <CardDescription>Visão mensal — posts com data de publicação</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear((y) => y - 1);
                } else setMonth((m) => m - 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear((y) => y + 1);
                } else setMonth((m) => m + 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                {WEEKDAYS.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((cell, i) => (
                  <div
                    key={`${cell.date || "e"}-${i}`}
                    className={`min-h-[72px] rounded-lg border p-1 sm:min-h-[88px] sm:p-1.5 ${
                      cell.isEmpty ? "border-transparent bg-transparent" : "border-border/60 bg-zinc-900/30"
                    }`}
                  >
                    {!cell.isEmpty ? (
                      <>
                        <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">{cell.day}</span>
                        <ul className="mt-0.5 space-y-0.5">
                          {(postsByDate[cell.date] ?? []).slice(0, 2).map((p) => (
                            <li
                              key={p.id}
                              className="truncate rounded bg-violet-500/15 px-1 py-0.5 text-[9px] text-violet-100 sm:text-[10px]"
                              title={p.title ?? "Sem título"}
                            >
                              {p.title?.trim() || "Post"}
                            </li>
                          ))}
                          {(postsByDate[cell.date]?.length ?? 0) > 2 ? (
                            <li className="text-[9px] text-muted-foreground">+{(postsByDate[cell.date]?.length ?? 0) - 2}</li>
                          ) : null}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {posts.filter((p) => p.scheduledAt).length} publicação(ões) neste mês ·{" "}
                {posts.filter((p) => p.status === "scheduled").length} agendada(s)
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
