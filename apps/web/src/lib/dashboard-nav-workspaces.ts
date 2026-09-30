import type { MenuItemConfig } from "@/lib/dashboard-menu.config";
import {
  LayoutDashboard,
  Trophy,
  HeartPulse,
  Briefcase,
  Megaphone,
  Cpu,
  GraduationCap,
  Settings,
} from "lucide-react";
import { hasAccessToMenuItem } from "@/lib/dashboard-menu.config";

type WorkspaceDef = {
  slug: string;
  label: string;
  icon: MenuItemConfig["icon"];
  topSlugs: string[];
};

/** Departamento legado (top-level slug) → workspace de apresentação. */
export const DEPT_TO_WORKSPACE: Record<string, string> = {
  requisicoes: "ws_inicio",
  futebol: "ws_futebol",
  saude: "ws_saude",
  grupo_master: "ws_gestao",
  adm: "ws_gestao",
  juridico: "ws_gestao",
  assistencia_social: "ws_gestao",
  marketing: "ws_comunicacao",
  comunicacao: "ws_comunicacao",
  eventos: "ws_comunicacao",
  socio_torcedor: "ws_comunicacao",
  ferramentas: "ws_tecnologia",
  desenvolvimento: "ws_desenvolvimento",
  configuracoes: "ws_configuracoes",
};

export function workspaceForDept(deptSlug: string | null): string | null {
  if (!deptSlug) return null;
  return DEPT_TO_WORKSPACE[deptSlug] ?? null;
}

const WORKSPACES: WorkspaceDef[] = [
  {
    slug: "ws_inicio",
    label: "Início",
    icon: LayoutDashboard,
    topSlugs: ["requisicoes"],
  },
  {
    slug: "ws_futebol",
    label: "Futebol",
    icon: Trophy,
    topSlugs: ["futebol"],
  },
  {
    slug: "ws_saude",
    label: "Saúde",
    icon: HeartPulse,
    topSlugs: ["saude"],
  },
  {
    slug: "ws_gestao",
    label: "Gestão",
    icon: Briefcase,
    topSlugs: ["grupo_master", "adm", "juridico", "assistencia_social"],
  },
  {
    slug: "ws_comunicacao",
    label: "Comunicação",
    icon: Megaphone,
    topSlugs: ["marketing", "comunicacao", "eventos", "socio_torcedor"],
  },
  {
    slug: "ws_tecnologia",
    label: "Tecnologia",
    icon: Cpu,
    topSlugs: ["ferramentas"],
  },
  {
    slug: "ws_desenvolvimento",
    label: "Desenvolvimento",
    icon: GraduationCap,
    topSlugs: ["desenvolvimento"],
  },
  {
    slug: "ws_configuracoes",
    label: "Configurações",
    icon: Settings,
    topSlugs: ["configuracoes"],
  },
];

/** Agrupa itens legados em workspaces de negócio (só apresentação). */
export function buildCup360WorkspaceMenu(legacyTopLevel: MenuItemConfig[]): MenuItemConfig[] {
  const bySlug = new Map(legacyTopLevel.map((item) => [item.slug, item]));
  const used = new Set<string>();
  const dashboard = bySlug.get("dashboard");
  if (dashboard) used.add("dashboard");

  const workspaces: MenuItemConfig[] = [];

  for (const ws of WORKSPACES) {
    const children: MenuItemConfig[] = [];
    for (const slug of ws.topSlugs) {
      const item = bySlug.get(slug);
      if (item) {
        children.push(item);
        used.add(slug);
      }
    }
    if (children.length === 0) continue;
    workspaces.push({
      slug: ws.slug,
      label: ws.label,
      icon: ws.icon,
      moduleSlug: "dashboard",
      children,
    });
  }

  for (const item of legacyTopLevel) {
    if (!used.has(item.slug)) {
      workspaces.push(item);
    }
  }

  return dashboard ? [dashboard, ...workspaces] : workspaces;
}

/** Filtra workspaces vazios (sem filho acessível). */
export function filterAccessibleWorkspaceMenu(
  menu: MenuItemConfig[],
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
  role?: string | null,
  modules?: readonly string[],
): MenuItemConfig[] {
  return menu
    .map((ws) => {
      if (!ws.children?.length) return ws;
      const children = ws.children.filter((c) =>
        hasAccessToMenuItem(
          c,
          ws.slug,
          canAccessModule,
          canAccessDashboard,
          isSuperAdmin,
          role,
          modules,
        ),
      );
      if (children.length === 0) return null;
      return { ...ws, children };
    })
    .filter(Boolean) as MenuItemConfig[];
}
