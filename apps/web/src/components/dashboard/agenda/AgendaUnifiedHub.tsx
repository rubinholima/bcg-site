"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  Megaphone,
  Shirt,
} from "lucide-react";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { FutebolAgendaOperacional } from "@/components/dashboard/futebol/FutebolAgendaOperacional";
import {
  BostonCityHallAgenda,
  BostonCityHallAgendaLegend,
} from "@/components/dashboard/boston-city-hall/BostonCityHallAgenda";
import { AgendaHubOverview } from "@/components/dashboard/agenda/AgendaHubOverview";
import { AgendaHubConsultasPanel } from "@/components/dashboard/agenda/AgendaHubConsultasPanel";
import { AgendaHubMarketingPanel } from "@/components/dashboard/agenda/AgendaHubMarketingPanel";
import { useAuth } from "@/context/AuthContext";
import { AGENDA_VISAO, agendaHubUrl, parseAgendaVisao, type AgendaVisao } from "@/lib/agenda-hub";
import { BCH_LOGO_STATIC } from "@/lib/boston-city-hall";

type TabDef = { id: AgendaVisao; label: string; icon: typeof Calendar; moduleSlug: string | null };

const ALL_TABS: TabDef[] = [
  { id: AGENDA_VISAO.GERAL, label: "Visão geral", icon: LayoutDashboard, moduleSlug: null },
  { id: AGENDA_VISAO.FUTEBOL, label: "Futebol", icon: Shirt, moduleSlug: "futebol_logistica" },
  { id: AGENDA_VISAO.BOSTON_HALL, label: "Boston City Hall", icon: Building2, moduleSlug: "eventos" },
  { id: AGENDA_VISAO.CONSULTAS, label: "Consultas", icon: ClipboardList, moduleSlug: "saude" },
  { id: AGENDA_VISAO.MARKETING, label: "Marketing", icon: Megaphone, moduleSlug: "marketing" },
];

function AgendaUnifiedHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, canAccessDashboard, loading: authLoading } = useAuth();

  const requestedVisao = parseAgendaVisao(searchParams.get("visao"));

  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter((tab) => {
      if (tab.id === AGENDA_VISAO.GERAL) {
        return ALL_TABS.some(
          (t) => t.moduleSlug && (canAccessModule(t.moduleSlug) || (t.moduleSlug === "saude" && canAccessDashboard)),
        );
      }
      if (!tab.moduleSlug) return true;
      if (tab.moduleSlug === "saude") return canAccessModule("saude") || canAccessDashboard;
      return canAccessModule(tab.moduleSlug);
    });
  }, [canAccessDashboard, canAccessModule]);

  const activeVisao = useMemo(() => {
    if (visibleTabs.some((t) => t.id === requestedVisao)) return requestedVisao;
    return visibleTabs[0]?.id ?? AGENDA_VISAO.GERAL;
  }, [requestedVisao, visibleTabs]);

  useEffect(() => {
    if (authLoading || requestedVisao === activeVisao) return;
    router.replace(agendaHubUrl(activeVisao), { scroll: false });
  }, [activeVisao, authLoading, requestedVisao, router]);

  const setVisao = useCallback(
    (visao: AgendaVisao) => {
      router.replace(agendaHubUrl(visao), { scroll: false });
    },
    [router],
  );

  const canAccessHub =
    canAccessModule("agenda") ||
    canAccessDashboard ||
    visibleTabs.some((t) => t.moduleSlug && canAccessModule(t.moduleSlug));

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessHub) router.replace("/403");
  }, [authLoading, canAccessHub, router]);

  if (authLoading || !canAccessHub) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Agenda"
        sectionIcon={Calendar}
        title="Central de agendas"
        description="Calendários do clube em um só lugar — futebol, eventos, consultas e marketing."
        stats={[
          { value: visibleTabs.length - 1, label: "Áreas" },
          { value: "14 dias", label: "Visão consolidada" },
        ]}
      />

      <BostonTvDashboardTabs
        tabs={visibleTabs.map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon,
        }))}
        active={activeVisao}
        onChange={setVisao}
        ariaLabel="Áreas da agenda"
        wrap={false}
        stretch
      />

      <div role="tabpanel" aria-label={visibleTabs.find((t) => t.id === activeVisao)?.label}>
        {activeVisao === AGENDA_VISAO.GERAL ? (
          <AgendaHubOverview onOpenVisao={setVisao} />
        ) : null}

        {activeVisao === AGENDA_VISAO.FUTEBOL ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Viagens, treinos, jogos e compromissos operacionais. Jogos FMF sincronizam automaticamente.
            </p>
            <Suspense
              fallback={
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <FutebolAgendaOperacional />
            </Suspense>
          </div>
        ) : null}

        {activeVisao === AGENDA_VISAO.BOSTON_HALL ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <img src={BCH_LOGO_STATIC} alt="" className="h-8 w-8 rounded-full object-contain" />
              <p className="text-sm text-muted-foreground">
                Reservas, pré-reservas e bloqueios do Boston City Hall.
              </p>
            </div>
            <BostonCityHallAgendaLegend />
            <BostonCityHallAgenda />
          </div>
        ) : null}

        {activeVisao === AGENDA_VISAO.CONSULTAS ? <AgendaHubConsultasPanel /> : null}

        {activeVisao === AGENDA_VISAO.MARKETING ? <AgendaHubMarketingPanel /> : null}
      </div>
    </div>
  );
}

export function AgendaUnifiedHub() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AgendaUnifiedHubInner />
    </Suspense>
  );
}
