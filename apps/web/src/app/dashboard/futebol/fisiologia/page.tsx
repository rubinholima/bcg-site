"use client";

import Link from "next/link";
import { Activity, ChevronRight, Droplets, Gauge, Printer, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FisiologiaShell } from "@/components/dashboard/fisiologia/FisiologiaShell";

const OPTIONS = [
  { href: "/dashboard/futebol/fisiologia/transicoes", title: "Atletas em Transição", icon: RefreshCw },
  { href: "/dashboard/futebol/fisiologia/avaliacoes", title: "Avaliações físicas", icon: Activity },
  { href: "/dashboard/futebol/fisiologia/hidratacao", title: "Hidratação", icon: Droplets },
  { href: "/dashboard/futebol/fisiologia/carga", title: "Carga e GPS", icon: Gauge },
  { href: "/dashboard/futebol/fisiologia/relatorios", title: "Relatórios", icon: Printer },
] as const;

export default function FisiologiaHubPage() {
  return (
    <FisiologiaShell title="Fisiologia">
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-zinc-800 transition-colors hover:border-sky-500/40 hover:bg-sky-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-sky-500" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
    </FisiologiaShell>
  );
}
