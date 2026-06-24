"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  ContactRound,
  Kanban,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { BostonCityHallShell } from "@/components/dashboard/boston-city-hall/BostonCityHallShell";
import { BostonCityHallOverviewCharts } from "@/components/dashboard/boston-city-hall/BostonCityHallOverviewCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { VenueOverview } from "@/types/boston-city-hall";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";

const QUICK_LINKS = [
  {
    href: agendaHubUrl(AGENDA_VISAO.BOSTON_HALL),
    label: "Agenda operacional",
    description: "Calendário mensal de reservas e bloqueios",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/eventos/boston-city-hall/crm",
    label: "CRM — Leads",
    description: "Lista, busca, filtros e anotações de todos os contatos",
    icon: ContactRound,
  },
  {
    href: "/dashboard/eventos/boston-city-hall/reservas",
    label: "Reservas",
    description: "Cadastrar, editar e cancelar reservas por espaço",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/eventos/boston-city-hall/pipeline",
    label: "Pipeline comercial",
    description: "Kanban por estágio até o contrato",
    icon: Kanban,
  },
] as const;

export default function BostonCityHallPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<VenueOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (authLoading || !canAccessModule("eventos")) return;
    api
      .get<VenueOverview>("/boston-city-hall/overview")
      .then((r) => setOverview(r.data ?? null))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [authLoading, canAccessModule]);

  if (authLoading || !canAccessModule("eventos")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conversionPct =
    overview && overview.leadsTotal > 0
      ? Math.round((overview.leadsWon / overview.leadsTotal) * 100)
      : 0;

  return (
    <BostonCityHallShell
      title="Boston City Hall"
      description="Dash — indicadores, gráficos, CRM e operação do venue."
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Espaços ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.spacesCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reservas no mês</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.bookingsThisMonth}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Confirmados à frente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.confirmedUpcoming}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads em aberto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.leadsOpen}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads no mês</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{overview.leadsNewThisMonth ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Taxa de conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{conversionPct}%</p>
                <p className="text-xs text-muted-foreground">
                  {overview.leadsWon ?? 0} confirmados / {overview.leadsTotal ?? 0} total
                </p>
              </CardContent>
            </Card>
          </div>

          <BostonCityHallOverviewCharts overview={overview} />
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[88px] flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
          >
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <span className="font-semibold">{label}</span>
            <span className="mt-1 text-sm text-muted-foreground">{description}</span>
          </Link>
        ))}
      </div>
    </BostonCityHallShell>
  );
}
