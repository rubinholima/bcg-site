import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { DASHBOARD_MENU, type MenuItemConfig } from "./dashboard-menu.config";

export type DashboardPageMeta = {
  section: string;
  sectionIcon: LucideIcon;
  title: string;
  description?: string;
  backHref?: string;
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
    ...override,
  };
}

/** Rotas que já renderizam `DashboardDeptHeader` ou header próprio — sem auto-header. */
export const DASHBOARD_AUTO_HEADER_EXCLUDE: RegExp[] = [
  /^\/dashboard$/,
  /^\/dashboard\/consultas\/sessao/,
  /^\/dashboard\/academias\//,
  /^\/dashboard\/paginas(\/|$)/,
  /^\/dashboard\/midia$/,
  /^\/dashboard\/marketing$/,
  /^\/dashboard\/noticias$/,
  /^\/dashboard\/usuarios$/,
  /^\/dashboard\/eventos$/,
  /^\/dashboard\/assessoria-imprensa$/,
  /^\/dashboard\/adm$/,
  /^\/dashboard\/futebol$/,
  /^\/dashboard\/futebol\/performance$/,
  /^\/dashboard\/futebol\/captacao$/,
  /^\/dashboard\/futebol\/try-outs$/,
  /^\/dashboard\/saude$/,
  /^\/dashboard\/clube$/,
  /^\/dashboard\/relatorios$/,
  /^\/dashboard\/manual$/,
  /^\/dashboard\/ferramentas\/fmf-scraper$/,
  /^\/dashboard\/ferramentas\/beatscode-import$/,
  /^\/dashboard\/marketing\/boston-tv\/playlists\//,
  /^\/dashboard\/cadastros\/jogadores\/[^/]+\/edit$/,
  /^\/dashboard\/medico\/[^/]+$/,
  /^\/dashboard\/juridico\/[^/]+$/,
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
