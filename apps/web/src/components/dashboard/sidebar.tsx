"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Group } from "@/types/group";
import type { MenuItemConfig } from "@/lib/dashboard-menu.config";
import { DASHBOARD_MENU } from "@/lib/dashboard-menu.config";

/** Verifica se o usuário tem acesso a pelo menos um filho do grupo (recursivo). */
function hasAccessToAnyChild(
  children: MenuItemConfig[],
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean
): boolean {
  return children.some((c) => {
    if (c.moduleSlug === "emails" && canAccessDashboard) return true;
    if (c.children?.length) return hasAccessToAnyChild(c.children, canAccessModule, canAccessDashboard);
    return canAccessModule(c.moduleSlug);
  });
}

function isGrupoMasterPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/grupo") ||
    pathname.startsWith("/dashboard/diretoria") ||
    pathname.startsWith("/dashboard/empresas") ||
    pathname.startsWith("/dashboard/tenants") ||
    pathname.startsWith("/dashboard/cadastros/tipos") ||
    pathname.startsWith("/dashboard/usuarios")
  );
}

function isMedicoCadastroPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/medico/equipe") ||
    pathname.startsWith("/dashboard/medico/enfermeiros")
  );
}

function isCadastrosPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/cadastros") ||
    isMedicoCadastroPath(pathname) ||
    pathname.startsWith("/dashboard/psicologia/psicologos") ||
    pathname.startsWith("/dashboard/socio-torcedor/planos")
  );
}

function isFutebolOperacaoPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/juridico") ||
    pathname.startsWith("/dashboard/futebol/logistica") ||
    pathname.startsWith("/dashboard/futebol/analise") ||
    pathname.startsWith("/dashboard/futebol/avaliacoes")
  );
}

function isSaudePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    (pathname.startsWith("/dashboard/medico") && !isMedicoCadastroPath(pathname)) ||
    pathname.startsWith("/dashboard/consultas") ||
    (pathname.startsWith("/dashboard/psicologia") && !pathname.startsWith("/dashboard/psicologia/psicologos")) ||
    pathname.startsWith("/dashboard/futebol/fisiologia") ||
    pathname.startsWith("/dashboard/saude") ||
    pathname.startsWith("/dashboard/adm/nutricao")
  );
}

function nestedDefaultOpen(
  child: MenuItemConfig,
  pathname: string | null,
  inPath: (href: string) => boolean
): boolean {
  if (!child.children?.length) return false;
  return child.children.some((cc) => cc.href && inPath(cc.href));
}

export function Sidebar() {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);

  const inPath = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));

  const [grupoMasterOpen, setGrupoMasterOpen] = useState(() => isGrupoMasterPath(pathname));
  const [cadastrosOpen, setCadastrosOpen] = useState(() => isCadastrosPath(pathname));
  const [saudeOpen, setSaudeOpen] = useState(() => isSaudePath(pathname));
  const [futebolOpen, setFutebolOpen] = useState(() => isFutebolOperacaoPath(pathname));
  const [admOpen, setAdmOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/adm") && !pathname?.startsWith("/dashboard/adm/nutricao")
  );
  const [ferramentasOpen, setFerramentasOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/emails") ||
      pathname?.startsWith("/dashboard/senhas") ||
      pathname?.startsWith("/dashboard/paginas") ||
      pathname?.startsWith("/dashboard/noticias") ||
      pathname?.startsWith("/dashboard/midia")
  );
  const [configOpen, setConfigOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/configuracoes") ||
      pathname?.startsWith("/dashboard/usuarios") ||
      pathname?.startsWith("/dashboard/empresas") ||
      pathname?.startsWith("/dashboard/tenants")
  );
  const [psicologiaOpen, setPsicologiaOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/consultas") ||
      (pathname?.startsWith("/dashboard/psicologia") && !pathname?.startsWith("/dashboard/psicologia/psicologos"))
  );
  const [medicoOpen, setMedicoOpen] = useState(
    () => pathname?.startsWith("/dashboard/medico") && !isMedicoCadastroPath(pathname)
  );
  const [relatoriosOpen, setRelatoriosOpen] = useState(() => pathname?.startsWith("/dashboard/relatorios"));
  const [socioOpen, setSocioOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/socio-torcedor") &&
      !pathname?.startsWith("/dashboard/socio-torcedor/planos")
  );
  const [marketingOpen, setMarketingOpen] = useState(() => pathname?.startsWith("/dashboard/marketing"));
  const [analiseOpen, setAnaliseOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/futebol/analise") ||
      pathname?.startsWith("/dashboard/futebol/avaliacoes")
  );
  const [nestedOpen, setNestedOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/group", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Group | null) => {
        if (!cancelled && data) setGroup(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleNested = (child: MenuItemConfig) => {
    setNestedOpen((prev) => ({
      ...prev,
      [child.slug]: !(prev[child.slug] ?? nestedDefaultOpen(child, pathname, inPath)),
    }));
  };

  const isNestedExpanded = (child: MenuItemConfig): boolean => {
    if (child.slug === "analise") return analiseOpen;
    if (child.slug === "psicologia") return psicologiaOpen;
    if (child.slug === "medico") return medicoOpen;
    if (nestedOpen[child.slug] !== undefined) return nestedOpen[child.slug];
    return nestedDefaultOpen(child, pathname, inPath);
  };

  const toggleNestedChild = (child: MenuItemConfig) => {
    if (child.slug === "analise") setAnaliseOpen((o) => !o);
    else if (child.slug === "psicologia") setPsicologiaOpen((o) => !o);
    else if (child.slug === "medico") setMedicoOpen((o) => !o);
    else toggleNested(child);
  };

  const name = group?.name ?? "Grupo Master";

  return (
    <div className="flex h-full flex-col border-r border-border bg-card shadow-sm">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <img
            src="/bcg-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0 rounded object-contain"
          />
          <span className="truncate text-lg font-semibold">
            <span className="text-muted-foreground">Dashboard</span> {name}
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {DASHBOARD_MENU.map((item) => {
          const Icon = item.icon!;

          if (item.href && !item.children?.length) {
            if (!canAccessModule(item.moduleSlug) && !(item.moduleSlug === "emails" && canAccessDashboard)) {
              return null;
            }
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/dashboard/grupo"
                  ? pathname?.startsWith("/dashboard/grupo")
                  : inPath(item.href);
            return (
              <Link
                key={item.slug}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "dashboard-sidebar-active"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dashboard-link-hover"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          }

          if (item.children?.length) {
            const showGroup =
              item.slug === "grupo_master"
                ? canAccessModule("grupo_master") ||
                  canAccessModule("diretoria") ||
                  canAccessModule("empresas") ||
                  canAccessModule("tipos") ||
                  canAccessModule("usuarios")
                : item.slug === "cadastros"
                  ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                  : item.slug === "adm"
                    ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                    : item.slug === "saude"
                      ? canAccessModule("saude") ||
                        canAccessModule("futebol_fisiologia") ||
                        canAccessModule("adm_nutricao")
                      : item.slug === "futebol"
                        ? canAccessModule("diretoria") ||
                          canAccessModule("juridico") ||
                          canAccessModule("futebol_analise") ||
                          canAccessModule("futebol_logistica")
                        : item.slug === "ferramentas"
                        ? hasAccessToAnyChild(item.children, canAccessModule, canAccessDashboard)
                        : item.slug === "configuracoes"
                          ? canAccessModule("configuracoes") ||
                            canAccessModule("usuarios") ||
                            canAccessModule("empresas")
                          : item.slug === "relatorios"
                            ? canAccessModule("relatorios")
                            : item.slug === "socio_torcedor"
                              ? canAccessModule("socio_torcedor")
                              : item.slug === "marketing"
                                ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                                : false;

            if (!showGroup) return null;

            const isOpen =
              item.slug === "grupo_master"
                ? grupoMasterOpen
                : item.slug === "cadastros"
                  ? cadastrosOpen
                  : item.slug === "adm"
                    ? admOpen
                    : item.slug === "saude"
                      ? saudeOpen
                      : item.slug === "futebol"
                        ? futebolOpen
                        : item.slug === "ferramentas"
                        ? ferramentasOpen
                        : item.slug === "configuracoes"
                          ? configOpen
                          : item.slug === "relatorios"
                            ? relatoriosOpen
                            : item.slug === "socio_torcedor"
                              ? socioOpen
                              : item.slug === "marketing"
                                ? marketingOpen
                                : false;
            const setOpen =
              item.slug === "grupo_master"
                ? setGrupoMasterOpen
                : item.slug === "cadastros"
                  ? setCadastrosOpen
                  : item.slug === "adm"
                    ? setAdmOpen
                    : item.slug === "saude"
                      ? setSaudeOpen
                      : item.slug === "futebol"
                        ? setFutebolOpen
                        : item.slug === "ferramentas"
                        ? setFerramentasOpen
                        : item.slug === "configuracoes"
                          ? setConfigOpen
                          : item.slug === "relatorios"
                            ? setRelatoriosOpen
                            : item.slug === "socio_torcedor"
                              ? setSocioOpen
                              : item.slug === "marketing"
                                ? setMarketingOpen
                                : () => {};

            return (
              <div key={item.slug} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                    "font-bold uppercase tracking-wide",
                    isOpen
                      ? "bg-accent/50 text-accent-foreground"
                      : "text-foreground/90 hover:bg-accent hover:text-accent-foreground dashboard-link-hover"
                  )}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 dashboard-chevron-transition" aria-label="Recolher" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 dashboard-chevron-transition" aria-label="Expandir" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
                {isOpen && (
                  <div className="ml-4 space-y-0.5 border-l border-border pl-3">
                    {item.children
                      .filter((c) =>
                        c.children?.length
                          ? hasAccessToAnyChild(c.children, canAccessModule, canAccessDashboard)
                          : canAccessModule(c.moduleSlug) || (c.moduleSlug === "emails" && canAccessDashboard)
                      )
                      .map((child) => {
                        if (child.children?.length) {
                          const hasAccess = hasAccessToAnyChild(child.children, canAccessModule, canAccessDashboard);
                          if (!hasAccess) return null;
                          const SubIcon = child.icon;
                          const isSubOpen = isNestedExpanded(child);
                          return (
                            <div key={child.slug} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => toggleNestedChild(child)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 dashboard-link-hover",
                                  "font-semibold uppercase tracking-wide",
                                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                {isSubOpen ? (
                                  <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                )}
                                {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                                <span>{child.label}</span>
                              </button>
                              {isSubOpen && (
                                <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                  {(() => {
                                    let markedActiveHref: string | null = null;
                                    return child.children
                                      .filter(
                                        (cc) =>
                                          canAccessModule(cc.moduleSlug) ||
                                          (cc.moduleSlug === "emails" && canAccessDashboard)
                                      )
                                      .map((cc) => {
                                        const hrefMatches = inPath(cc.href!);
                                        const isChildActive =
                                          hrefMatches &&
                                          (markedActiveHref === null || markedActiveHref !== cc.href) &&
                                          (markedActiveHref = cc.href!, true);
                                        return (
                                          <Link
                                            key={cc.slug}
                                            href={cc.href!}
                                            className={cn(
                                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
                                              isChildActive
                                                ? "dashboard-sidebar-active"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                          >
                                            {cc.icon && <cc.icon className="h-4 w-4 shrink-0" />}
                                            {cc.label}
                                          </Link>
                                        );
                                      });
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        }
                        const ChildIcon = child.icon!;
                        const isChildActive =
                          child.href === "/dashboard/configuracoes"
                            ? pathname === "/dashboard/configuracoes" ||
                              pathname?.startsWith("/dashboard/configuracoes/")
                            : child.href === "/dashboard/empresas"
                              ? pathname === "/dashboard/empresas" || pathname?.startsWith("/dashboard/tenants")
                              : child.href === "/dashboard/grupo"
                                ? pathname?.startsWith("/dashboard/grupo")
                                : child.href === "/dashboard/diretoria"
                                  ? pathname?.startsWith("/dashboard/diretoria")
                                  : child.href === "/dashboard/cadastros/tipos"
                                    ? pathname?.startsWith("/dashboard/cadastros/tipos")
                                    : inPath(child.href!);
                        const compact = "compactGroup" in child && (child as MenuItemConfig & { compactGroup?: string }).compactGroup;
                        return (
                          <Link
                            key={child.slug}
                            href={child.href!}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 text-sm transition-all duration-200 dashboard-link-hover",
                              compact ? "py-1" : "py-1.5",
                              isChildActive
                                ? "dashboard-sidebar-active"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" />
                            {child.label}
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </nav>
    </div>
  );
}
