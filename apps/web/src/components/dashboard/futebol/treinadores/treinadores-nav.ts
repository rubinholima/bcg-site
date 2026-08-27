import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  UserCheck,
  Users,
} from "lucide-react";

export const TREINADORES_BASE = "/dashboard/futebol/treinadores";

export type TreinadoresSectionId =
  | "dash"
  | "informacoes"
  | "pos-jogo"
  | "avaliacao-jogador"
  | "relatorio-equipe"
  | "treinos";

export const TREINADORES_SECTIONS: Array<{
  id: TreinadoresSectionId;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}> = [
  {
    id: "informacoes",
    label: "Informações",
    href: `${TREINADORES_BASE}/informacoes`,
    icon: LayoutDashboard,
    description: "Jogos, tabela, adversários e elenco.",
  },
  {
    id: "pos-jogo",
    label: "Relatório pós-jogo",
    href: `${TREINADORES_BASE}/pos-jogo`,
    icon: ClipboardList,
    description: "Notas, resumo e melhor do jogo.",
  },
  {
    id: "avaliacao-jogador",
    label: "Avaliação individual",
    href: `${TREINADORES_BASE}/avaliacao-jogador`,
    icon: UserCheck,
    description: "Avaliação trimestral por atleta.",
  },
  {
    id: "relatorio-equipe",
    label: "Relatório da equipe",
    href: `${TREINADORES_BASE}/relatorio-equipe`,
    icon: Users,
    description: "Período, pontos fracos e ações por atleta.",
  },
  {
    id: "treinos",
    label: "Planejamento de treinos",
    href: `${TREINADORES_BASE}/treinos`,
    icon: Dumbbell,
    description: "Sessões, planos e relatórios de treino.",
  },
];

export function treinadoresSectionFromPath(pathname: string | null): TreinadoresSectionId {
  if (!pathname?.startsWith(TREINADORES_BASE)) return "dash";
  if (pathname === TREINADORES_BASE || pathname === `${TREINADORES_BASE}/`) return "dash";
  if (pathname.startsWith(`${TREINADORES_BASE}/informacoes`)) return "informacoes";
  if (pathname.startsWith(`${TREINADORES_BASE}/pos-jogo`)) return "pos-jogo";
  if (pathname.startsWith(`${TREINADORES_BASE}/avaliacao-jogador`)) return "avaliacao-jogador";
  if (pathname.startsWith(`${TREINADORES_BASE}/relatorio-equipe`)) return "relatorio-equipe";
  if (pathname.startsWith(`${TREINADORES_BASE}/treinos`)) return "treinos";
  return "dash";
}

export function treinadoresLegacyTabRedirect(tab: string): string | null {
  switch (tab) {
    case "informacoes":
      return `${TREINADORES_BASE}/informacoes`;
    case "pos-jogo":
      return `${TREINADORES_BASE}/pos-jogo`;
    case "avaliacao-jogador":
      return `${TREINADORES_BASE}/avaliacao-jogador`;
    case "relatorio-equipe":
      return `${TREINADORES_BASE}/relatorio-equipe`;
    case "treinos":
      return `${TREINADORES_BASE}/treinos`;
    default:
      return null;
  }
}
