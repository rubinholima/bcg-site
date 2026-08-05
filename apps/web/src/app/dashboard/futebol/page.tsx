"use client";

import {
  Calendar,
  Map,
  Users,
  UserCircle,
  Trophy,
  MapPin,
  Shirt,
  Layers,
  Archive,
  Gauge,
  UserPlus,
  ClipboardCheck,
  Video,
} from "lucide-react";
import { HubDashboardPage } from "@/components/dashboard/HubDashboardPage";
import { FutebolHubInsights } from "@/components/dashboard/hub/FutebolHubInsights";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";

const LINKS = [
  {
    title: DASHBOARD_LABELS.atletas,
    description: "Cadastro de atletas por clube.",
    href: "/dashboard/cadastros/jogadores",
    icon: UserCircle,
    moduleSlug: "tipos",
  },
  {
    title: "Atletas desligados",
    description: "Arquivo de atletas desligados.",
    href: "/dashboard/cadastros/jogadores/arquivo",
    icon: Archive,
    moduleSlug: "tipos",
  },
  {
    title: "Campeonatos",
    description: "Competições cadastradas.",
    href: "/dashboard/cadastros/campeonatos",
    icon: Trophy,
    moduleSlug: "tipos",
  },
  {
    title: DASHBOARD_LABELS.estadios,
    description: "Locais e estádios.",
    href: "/dashboard/cadastros/estadios",
    icon: MapPin,
    moduleSlug: "tipos",
  },
  {
    title: DASHBOARD_LABELS.timesAdversarios,
    description: "Times adversários.",
    href: "/dashboard/cadastros/times",
    icon: Shirt,
    moduleSlug: "tipos",
  },
  {
    title: "Categorias",
    description: "Categorias de base e profissional.",
    href: "/dashboard/cadastros/categorias",
    icon: Layers,
    moduleSlug: "tipos",
  },
  {
    title: "Logística — Agenda",
    description: "Calendário operacional: viagens, treinos, jogos e compromissos.",
    href: agendaHubUrl(AGENDA_VISAO.FUTEBOL),
    icon: Calendar,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Jogos e viagens",
    description: "Planejamentos de jogos em casa e fora.",
    href: "/dashboard/futebol/logistica",
    icon: Map,
    moduleSlug: "futebol_logistica",
  },
  {
    title: "Comissão técnica",
    description: "Quadro técnico, cargos e vínculos com elenco.",
    href: "/dashboard/futebol/comissao",
    icon: Users,
    moduleSlug: "futebol_comissao",
  },
  {
    title: "Análise e desempenho",
    description: "Vídeo e imagens do jogo — mapas de calor, lances e análise tática.",
    href: "/dashboard/futebol/analise-desempenho",
    icon: Video,
    moduleSlug: "futebol_analise_desempenho",
  },
  {
    title: "Performance",
    description: "Fisiologista, preparação física e nutricionista.",
    href: "/dashboard/futebol/performance",
    icon: Gauge,
    moduleSlug: "futebol_performance",
  },
  {
    title: "Captação",
    description: "Prospecção e acompanhamento de atletas em captação.",
    href: "/dashboard/futebol/captacao",
    icon: UserPlus,
    moduleSlug: "futebol_captacao",
  },
  {
    title: "Try-outs",
    description: "Peneiras, testes e convocações para avaliação.",
    href: "/dashboard/futebol/try-outs",
    icon: ClipboardCheck,
    moduleSlug: "futebol_tryouts",
  },
] as const;

export default function FutebolHubPage() {
  return (
    <HubDashboardPage
      section="Depto Futebol"
      title="Dash"
      subtitle={`Dash operacional — ${DASHBOARD_LABELS.atletas}, logística, comissão e performance.`}
      hubId="futebol"
      links={[...LINKS]}
    >
      <FutebolHubInsights />
    </HubDashboardPage>
  );
}
