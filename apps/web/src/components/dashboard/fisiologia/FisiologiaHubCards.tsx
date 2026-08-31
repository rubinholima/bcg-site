"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ChevronRight, Droplets, Gauge, Printer, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { TransitionOperationalSummary } from "@/lib/fisiologia-transition-types";

const OPTIONS = [
  {
    href: "/dashboard/futebol/fisiologia/transicoes",
    title: "Atletas em Transição",
    icon: RefreshCw,
    key: "transicoes" as const,
  },
  { href: "/dashboard/futebol/fisiologia/avaliacoes", title: "Avaliações físicas", icon: Activity, key: null },
  { href: "/dashboard/futebol/fisiologia/hidratacao", title: "Hidratação", icon: Droplets, key: null },
  { href: "/dashboard/futebol/fisiologia/carga", title: "Carga e GPS", icon: Gauge, key: null },
  { href: "/dashboard/futebol/fisiologia/relatorios", title: "Relatórios", icon: Printer, key: null },
] as const;

export function FisiologiaHubCards() {
  const [summary, setSummary] = useState<TransitionOperationalSummary | null>(null);

  useEffect(() => {
    void api
      .get<TransitionOperationalSummary>("/fisiologia/transition-programs/summary")
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  const transicoesSubtitle = useMemo(() => {
    if (!summary) return null;
    const parts: string[] = [];
    if (summary.activeCount > 0) {
      parts.push(`${summary.activeCount} ativo${summary.activeCount === 1 ? "" : "s"}`);
    }
    if (summary.newCount > 0) {
      parts.push(`${summary.newCount} novo${summary.newCount === 1 ? "" : "s"}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [summary]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {OPTIONS.map((item) => {
        const Icon = item.icon;
        const isTransicoes = item.key === "transicoes";
        return (
          <Link key={item.href} href={item.href} className="group block h-full">
            <Card
              className={`h-full border-zinc-800 transition-colors hover:border-sky-500/40 hover:bg-sky-500/5 ${
                isTransicoes && summary && summary.newCount > 0
                  ? "border-amber-500/40 bg-amber-500/5"
                  : ""
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className={`h-5 w-5 ${isTransicoes && summary?.newCount ? "text-amber-400" : "text-sky-500"}`} />
                  {item.title}
                  {isTransicoes && summary && summary.newCount > 0 ? (
                    <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-zinc-950">
                      {summary.newCount} novo{summary.newCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isTransicoes && transicoesSubtitle ? (
                  <p className="mb-2 text-sm text-muted-foreground">{transicoesSubtitle}</p>
                ) : null}
                <span className="inline-flex items-center text-sm font-medium text-sky-600 dark:text-sky-400">
                  Abrir
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
