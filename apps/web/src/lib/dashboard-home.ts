import type { MeRole } from "@/types/auth";

/** Painel master (/dashboard) — apenas super_admin. */
export function canAccessMasterDashboard(role: MeRole | null | undefined): boolean {
  return role === "super_admin";
}

/** Painel da empresa (/dashboard/clube) — apenas company_admin. */
export function canAccessCompanyDashboard(role: MeRole | null | undefined): boolean {
  return role === "company_admin";
}

export const COMPANY_DASHBOARD_ROUTE = "/dashboard/clube";

interface HubHomeRule {
  route: string;
  roles?: MeRole[];
  modules?: string[];
}

/** Prioridade: primeiro match define a home do usuário (exceto super_admin). */
const HUB_HOME_RULES: HubHomeRule[] = [
  { route: COMPANY_DASHBOARD_ROUTE, roles: ["company_admin"] },
  { route: "/dashboard/diretoria", roles: ["diretoria"], modules: ["diretoria"] },
  {
    route: "/dashboard/futebol",
    roles: ["comissao", "analista"],
    modules: ["futebol_comissao", "futebol_logistica", "futebol_analise", "futebol_fisiologia"],
  },
  { route: "/dashboard/saude", roles: ["medico", "psicologo"], modules: ["saude"] },
  {
    route: "/dashboard/adm",
    roles: ["gerente", "administrativo"],
    modules: [
      "adm_financeiro",
      "adm_compras",
      "adm_estoque",
      "adm_rh",
      "adm_patrimonio",
      "adm_nutricao",
    ],
  },
  {
    route: "/dashboard/marketing",
    roles: ["editor"],
    modules: ["marketing", "midia", "paginas", "noticias", "boston_tv"],
  },
  { route: "/dashboard/juridico", modules: ["juridico"] },
  { route: "/dashboard/eventos", modules: ["eventos"] },
  { route: "/dashboard/socio-torcedor", modules: ["socio_torcedor"] },
  { route: "/dashboard/cadastros", modules: ["tipos", "adm_rh"] },
  { route: "/dashboard/grupo", modules: ["grupo_master", "empresas"] },
];

function hasAnyModule(modules: string[], slugs: string[] | undefined): boolean {
  if (!slugs?.length) return false;
  const set = new Set(modules);
  return slugs.some((s) => set.has(s));
}

/** Rota inicial após login ou ao bloquear /dashboard master. */
export function getHomeDashboardRoute(
  role: MeRole | null | undefined,
  modules: string[],
): string {
  if (!role || role === "user") return "/login";
  if (canAccessMasterDashboard(role)) return "/dashboard";

  for (const rule of HUB_HOME_RULES) {
    if (rule.roles?.includes(role)) return rule.route;
  }

  for (const rule of HUB_HOME_RULES) {
    if (hasAnyModule(modules, rule.modules)) return rule.route;
  }

  if (role === "editor") return "/dashboard/marketing";
  return "/dashboard/configuracoes";
}

export interface DashboardHomeMenuItem {
  slug: string;
  label: string;
  href: string;
}

/** Item topo do menu: master vê "Dashboard Master"; demais veem "Início" do dept. */
export function getDashboardHomeMenuItem(
  role: MeRole | null | undefined,
  modules: string[],
): DashboardHomeMenuItem {
  if (canAccessMasterDashboard(role)) {
    return { slug: "dashboard", label: "Dashboard Master", href: "/dashboard" };
  }
  if (canAccessCompanyDashboard(role)) {
    return { slug: "company_dashboard", label: "Painel da Empresa", href: COMPANY_DASHBOARD_ROUTE };
  }
  return {
    slug: "home",
    label: "Início",
    href: getHomeDashboardRoute(role, modules),
  };
}
