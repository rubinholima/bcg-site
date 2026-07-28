import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { DashboardAccent } from "./dashboard-accent";
import { resolveDashboardAccent } from "./dashboard-accent";
import { DASHBOARD_MENU, type MenuItemConfig } from "./dashboard-menu.config";

export type DashboardPageMeta = {
  section: string;
  sectionIcon: LucideIcon;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  accent: DashboardAccent;
};

type MenuMatch = {
  dept: MenuItemConfig;
  item: MenuItemConfig;
  href: string;
};

const SUBPATH_TITLE: Record<string, string> = {
  new: "Novo",
  novo: "Novo",
  edit: "Editar",
  editar: "Editar",
  delete: "Excluir",
};

/** Títulos/descrições que diferem do menu lateral. */
const PAGE_META_OVERRIDES: Record<string, Partial<DashboardPageMeta>> = {
  "/dashboard/diretoria": {
    title: "Dashboard gerencial",
    description:
      "Visão por tipo: clubes (futebol) e empresas — indicadores pertinentes a cada perfil",
  },
  "/dashboard/futebol/logistica/convocacao": {
    title: "Convocação",
    backHref: "/dashboard/futebol/logistica",
  },
  "/dashboard/empresas": {
    description: "Gerencie as empresas do grupo",
  },
  "/dashboard/senhas": {
    title: "Senhas / Vault",
    description: "Armazenamento seguro de senhas do grupo. Revele e copie apenas se tiver permissão.",
  },
  "/dashboard/juridico": {
    title: "Controle Jurídico",
    description: "Contratos, documentos legais e vínculos de atletas e colaboradores",
  },
  "/dashboard/manual": {
    title: "Manual do sistema",
    description: "Guia de uso do dashboard e dos módulos",
  },
  "/dashboard/cadastros/jogadores/new": {
    title: "Novo atleta",
    description: "Cadastre um novo atleta no clube",
  },
  "/dashboard/senhas/new": {
    title: "Novo item no Vault",
    description: "Cadastre uma senha ou segredo (será criptografado).",
  },
  "/dashboard/empresas/new": {
    title: "Nova Empresa",
    description: "Cadastre uma nova empresa no grupo",
  },
  "/dashboard/emails": {
    description: "Gerencie emails corporativos por organização WorkMail",
  },
  "/dashboard/ferramentas/fmf-scraper": {
    title: "Importação FMF",
    description:
      "Próximos jogos, últimos resultados e tabela de classificação das categorias de base (FMF). Atualização automática a cada 2 horas.",
  },
  "/dashboard/ferramentas/beatscode-import": {
    title: "Importação Beatscode — Atletas",
    description:
      "Importa cadastros de atletas (Sub-20, Sub-17, Sub-15, Sub-14) do Beatscode para o banco de jogadores.",
  },
  "/dashboard/marketing/boston-tv": {
    title: "BCG TV",
  },
  "/dashboard/marketing/boston-tv/playlists": {
    title: "Editar playlist",
    backHref: "/dashboard/marketing/boston-tv",
  },
  "/dashboard/cadastros/jogadores/arquivo": {
    title: "Atletas desligados",
    description:
      "Cadastro preservado — atletas com situação Desligado, fora da lista principal.",
  },
  "/dashboard/cadastros/jogadores/emprestados": {
    title: "Atletas emprestados",
    description: "Atletas em situação Emprestado — fora da lista por categoria do clube.",
  },
  "/dashboard/adm/patrimonio": {
    title: "Patrimônio",
    description:
      "Cadastro de bens, categorias, fotos e localização. Equipamentos de TI podem ter ficha de infraestrutura.",
    backHref: "/dashboard/adm",
    backLabel: "Voltar ao ADM",
  },
  "/dashboard/comunicacao/inbox": {
    title: "Inbox",
    description: "Conversas unificadas por unidade — WhatsApp e próximos canais.",
    backHref: "/dashboard/comunicacao",
    backLabel: "Voltar",
  },
  "/dashboard/comunicacao/canais": {
    title: "Canais",
    description: "Contas WhatsApp Cloud API e futuros provedores por unidade de negócio.",
    backHref: "/dashboard/comunicacao",
    backLabel: "Voltar",
  },
  "/dashboard/comunicacao/templates": {
    title: "Templates",
    description: "Respostas e templates por canal.",
    backHref: "/dashboard/comunicacao",
    backLabel: "Voltar",
  },
  "/dashboard/psicologia/relatorios": {
    title: "Relatórios semanais",
    description:
      "Relatórios preenchidos na aba Relatório da agenda de atendimentos. Abra para visualizar, editar com histórico e imprimir em PDF.",
    backHref: "/dashboard/consultas",
    backLabel: "Voltar às consultas",
  },
};

function findBestMenuMatch(pathname: string): MenuMatch | null {
  const cleanPath = pathname.split("?")[0]!;
  let best: MenuMatch | null = null;

  function visit(items: MenuItemConfig[], dept: MenuItemConfig | null) {
    for (const item of items) {
      const currentDept = item.children?.length ? item : dept;
      if (item.href) {
        const href = item.href.split("?")[0]!;
        if (cleanPath === href || cleanPath.startsWith(`${href}/`)) {
          if (!best || href.length > best.href.length) {
            best = { dept: currentDept ?? item, item, href };
          }
        }
      }
      if (item.children?.length) {
        visit(item.children, currentDept ?? dept ?? item);
      }
    }
  }

  visit(DASHBOARD_MENU, null);
  return best;
}

function titleFromSubpath(pathname: string, baseTitle: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last || !SUBPATH_TITLE[last]) return null;
  const prefix = SUBPATH_TITLE[last]!;
  if (last === "new" || last === "novo") {
    return `${prefix} ${baseTitle.replace(/^Dash$/i, "").trim()}`.trim() || prefix;
  }
  return `${prefix} ${baseTitle}`;
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** IDs Prisma/cuid ou UUID — não usar como título de página. */
function isLikelyDbId(segment: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f-]{20,}$/i.test(segment);
}

function titleForDynamicSegment(pathname: string, lastSegment: string): string | null {
  if (!isLikelyDbId(lastSegment)) return null;
  if (pathname.includes("/boston-tv/playlists/")) return "Editar playlist";
  if (pathname.includes("/playlists/")) return "Editar playlist";
  return null;
}

export function resolveDashboardPageMeta(pathname: string): DashboardPageMeta | null {
  const cleanPath = pathname.split("?")[0]!;
  const overrideExact = PAGE_META_OVERRIDES[cleanPath];
  const overridePrefix = Object.entries(PAGE_META_OVERRIDES).find(
    ([key]) => key !== cleanPath && cleanPath.startsWith(`${key}/`),
  )?.[1];
  const override = overrideExact ?? overridePrefix;
  const match = findBestMenuMatch(cleanPath);

  if (!match && !override) {
    const segments = cleanPath.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const title = humanizeSegment(segments[segments.length - 1]!);
    return {
      section: "Dashboard",
      sectionIcon: Sparkles,
      title,
      accent: resolveDashboardAccent(cleanPath),
    };
  }

  const dept = match?.dept;
  const item = match?.item;
  const baseTitle = item?.label ?? humanizeSegment(cleanPath.split("/").pop() ?? "Página");
  const subTitle = titleFromSubpath(cleanPath, baseTitle);
  const isSubpath = match ? cleanPath !== match.href : false;

  let title = subTitle ?? baseTitle;
  if (isSubpath && !subTitle) {
    const last = cleanPath.split("/").pop()!;
    const dynamicTitle = titleForDynamicSegment(cleanPath, last);
    if (dynamicTitle) {
      title = dynamicTitle;
    } else if (/^\[.*\]$/.test(last) || last === "edit" || last === "editar" || last === "delete") {
      title = baseTitle;
    } else if (!SUBPATH_TITLE[last] && !isLikelyDbId(last)) {
      title = humanizeSegment(last);
    }
  }

  const backHref =
    override?.backHref ??
    (match && isSubpath && match.href !== cleanPath ? match.href : undefined);

  return {
    section: dept?.label ?? "Dashboard",
    sectionIcon: dept?.icon ?? item?.icon ?? Sparkles,
    title,
    description: undefined,
    backHref,
    accent: resolveDashboardAccent(cleanPath),
    ...override,
  };
}

/**
 * Rotas que já renderizam cabeçalho próprio (DashboardDeptHeader, hub, shell ou `<h1>`).
 * O layout não deve duplicar — uma página = um cabeçalho.
 */
export const DASHBOARD_AUTO_HEADER_EXCLUDE: RegExp[] = [
  /^\/dashboard$/,
  /^\/dashboard\/consultas\/sessao/,
  /^\/dashboard\/academias\//,
  /^\/dashboard\/marketing\/boston-tv\/controle-hall$/,

  /^\/dashboard\/paginas(\/|$)/,
  /^\/dashboard\/agenda$/,
  /^\/dashboard\/ferramentas\//,

  // Índices com DashboardDeptHeader / HubDashboardPage (hero — não duplicar)
  /^\/dashboard\/(midia|noticias|marketing|usuarios|manual|assessoria-imprensa|eventos|adm|futebol|saude|clube|comunicacao)$/,

  // Subárvores com shell ou agenda dedicada
  /^\/dashboard\/eventos\/boston-city-hall(\/|$)/,
  /^\/dashboard\/saude\/estagiarios(\/|$)/,
  /^\/dashboard\/marketing\/boston-tv(\/|$)/,
  /^\/dashboard\/futebol\/logistica\/agenda$/,
  /^\/dashboard\/futebol\/(performance|captacao|try-outs|preparacao-fisica)$/,
  /^\/dashboard\/futebol\/analise-desempenho(\/|$)/,

  // Páginas com título inline (`<h1>`) no componente
  /^\/dashboard\/futebol\/logistica$/,
  /^\/dashboard\/configuracoes\/modulos$/,
  /^\/dashboard\/conteudo$/,
  /^\/dashboard\/cadastros\/espacos$/,
  /^\/dashboard\/diretoria\/aprovacoes-compras$/,
  /^\/dashboard\/adm\/financeiro\/aprovacoes$/,
  /^\/dashboard\/adm\/estoque$/,
  /^\/dashboard\/juridico\/contratos-base$/,
  /^\/dashboard\/psicologia\/material-apoio$/,
  /^\/dashboard\/medico\/enfermeiros$/,
  /^\/dashboard\/saude\/fisioterapia$/,
  /^\/dashboard\/eventos\/new$/,
  /^\/dashboard\/eventos\/[^/]+\/editar$/,

  // Detalhe / formulário com header dedicado
  /^\/dashboard\/cadastros\/jogadores\/[^/]+\/edit$/,
  /^\/dashboard\/juridico\/[^/]+$/,
  /^\/dashboard\/medico\/(?!equipe(?:\/|$))[^/]+$/,
  /^\/dashboard\/medico\/equipe\/[^/]+\/edit$/,
  /^\/dashboard\/psicologia\/psicologos\/[^/]+\/edit$/,
  /^\/dashboard\/futebol\/logistica\/[^/]+\/(edit|delete)$/,
];

export function shouldShowAutoDashboardHeader(pathname: string): boolean {
  const clean = pathname.split("?")[0]!;
  return !DASHBOARD_AUTO_HEADER_EXCLUDE.some((re) => re.test(clean));
}

/** Breadcrumb da barra superior: nome do hub/depto + página atual. */
export function resolveDashboardHeaderBreadcrumb(pathname: string): {
  hub: string;
  page?: string;
} {
  const meta = resolveDashboardPageMeta(pathname);
  if (!meta) {
    return { hub: "Dashboard Master" };
  }
  const hub = meta.section;
  const page = meta.title?.trim();
  if (!page || page === hub) {
    return { hub };
  }
  return { hub, page };
}
