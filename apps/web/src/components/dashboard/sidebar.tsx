"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Group } from "@/types/group";
import type { MenuItemConfig } from "@/lib/dashboard-menu.config";
import { DASHBOARD_MENU } from "@/lib/dashboard-menu.config";
import { getDashboardHomeMenuItem, getHomeDashboardRoute } from "@/lib/dashboard-home";
import { useDashboardShell } from "@/context/DashboardShellContext";

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

function relatorioHub(href: string | undefined): string | null {
  if (!href?.includes("/dashboard/relatorios")) return null;
  const match = href.match(/[?&]hub=([^&]+)/);
  return match?.[1] ?? null;
}

function isRelatorioLinkActive(
  href: string | undefined,
  pathname: string | null,
  currentHub: string | null
): boolean {
  const expected = relatorioHub(href);
  if (expected === null) return false;
  if (!pathname?.startsWith("/dashboard/relatorios")) return false;
  return expected === currentHub;
}

function isGrupoMasterPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "grupo_master") return true;
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

function isCadastrosPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "cadastros") return true;
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/cadastros") ||
    isMedicoCadastroPath(pathname) ||
    pathname.startsWith("/dashboard/psicologia/psicologos") ||
    pathname.startsWith("/dashboard/socio-torcedor/planos") ||
    pathname.startsWith("/dashboard/cadastros/fornecedores") ||
    pathname.startsWith("/dashboard/cadastros/clientes")
  );
}

function isFutebolOperacaoPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "futebol") return true;
  if (!pathname) return false;
  return (
    pathname === "/dashboard/futebol" ||
    pathname.startsWith("/dashboard/futebol/logistica") ||
    pathname.startsWith("/dashboard/futebol/analise") ||
    pathname.startsWith("/dashboard/futebol/avaliacoes") ||
    pathname.startsWith("/dashboard/futebol/agenda") ||
    pathname.startsWith("/dashboard/futebol/comissao")
  );
}

function isJuridicoPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "juridico") return true;
  return !!pathname?.startsWith("/dashboard/juridico");
}

function isEventosPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "eventos") return true;
  return !!pathname?.startsWith("/dashboard/eventos");
}

function isSaudePath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "saude") return true;
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

function isAdmPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "adm") return true;
  if (pathname === "/dashboard/adm") return true;
  return !!pathname?.startsWith("/dashboard/adm") && !pathname.startsWith("/dashboard/adm/nutricao");
}

function isRequisicoesPath(pathname: string | null): boolean {
  return !!pathname?.startsWith("/dashboard/requisicoes");
}

function isMarketingPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "marketing") return true;
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/marketing") ||
    pathname.startsWith("/dashboard/paginas") ||
    pathname.startsWith("/dashboard/noticias") ||
    pathname.startsWith("/dashboard/midia")
  );
}

function isSocioPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "socio_torcedor") return true;
  return (
    !!pathname?.startsWith("/dashboard/socio-torcedor") &&
    !pathname.startsWith("/dashboard/socio-torcedor/planos")
  );
}

function isFerramentasPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/dashboard/emails") || pathname.startsWith("/dashboard/senhas");
}

function isAcademiasPath(pathname: string | null): boolean {
  return !!pathname?.startsWith("/dashboard/academias");
}

function isConfigPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/dashboard/configuracoes");
}

/** Hub ativo pela rota atual (inclui ?hub= em relatórios). */
function getPathnameHub(pathname: string | null, relHub: string | null): string | null {
  if (relHub) return relHub;
  if (!pathname || pathname === "/dashboard") return null;
  if (isGrupoMasterPath(pathname, null)) return "grupo_master";
  if (isCadastrosPath(pathname, null)) return "cadastros";
  if (isAdmPath(pathname, null)) return "adm";
  if (isRequisicoesPath(pathname)) return "requisicoes";
  if (isSaudePath(pathname, null)) return "saude";
  if (isFutebolOperacaoPath(pathname, null)) return "futebol";
  if (isJuridicoPath(pathname, null)) return "juridico";
  if (isEventosPath(pathname, null)) return "eventos";
  if (isMarketingPath(pathname, null)) return "marketing";
  if (isSocioPath(pathname, null)) return "socio_torcedor";
  if (isAcademiasPath(pathname)) return "academias";
  if (isFerramentasPath(pathname)) return "ferramentas";
  if (isConfigPath(pathname)) return "configuracoes";
  return null;
}

function resolveLinkActive(
  href: string | undefined,
  pathname: string | null,
  currentHub: string | null
): boolean {
  if (!href) return false;
  if (isRelatorioLinkActive(href, pathname, currentHub)) return true;
  if (relatorioHub(href)) return false;
  if (href === "/dashboard/configuracoes") {
    return pathname === "/dashboard/configuracoes";
  }
  if (href === "/dashboard/empresas") {
    return pathname === "/dashboard/empresas" || !!pathname?.startsWith("/dashboard/tenants");
  }
  if (href === "/dashboard/grupo") return !!pathname?.startsWith("/dashboard/grupo");
  if (href === "/dashboard/diretoria") return !!pathname?.startsWith("/dashboard/diretoria");
  if (href === "/dashboard/futebol") return pathname === "/dashboard/futebol";
  if (href === "/dashboard/adm") return pathname === "/dashboard/adm";
  if (href === "/dashboard/saude") return pathname === "/dashboard/saude";
  if (href === "/dashboard/cadastros") return pathname === "/dashboard/cadastros";
  if (href === "/dashboard/cadastros/tipos") return !!pathname?.startsWith("/dashboard/cadastros/tipos");
  if (href === "/dashboard/cadastros/jogadores") {
    if (!pathname?.startsWith("/dashboard/cadastros/jogadores")) return false;
    if (pathname.startsWith("/dashboard/cadastros/jogadores/arquivo")) return false;
    if (pathname.startsWith("/dashboard/cadastros/jogadores/emprestados")) return false;
    return true;
  }
  if (href === "/dashboard/cadastros/jogadores/arquivo") {
    return !!pathname?.startsWith("/dashboard/cadastros/jogadores/arquivo");
  }
  if (href === "/dashboard/cadastros/jogadores/emprestados") {
    return !!pathname?.startsWith("/dashboard/cadastros/jogadores/emprestados");
  }
  return inPathHelper(href, pathname);
}

function inPathHelper(href: string, pathname: string | null): boolean {
  return pathname === href || (href !== "/dashboard" && !!pathname?.startsWith(href + "/"));
}

function nestedDefaultOpen(
  child: MenuItemConfig,
  pathname: string | null,
  inPath: (href: string) => boolean
): boolean {
  if (!child.children?.length) return false;
  return child.children.some((cc) => cc.href && inPath(cc.href));
}

function SidebarMenuLink({
  href,
  external,
  className,
  children,
  onNavigate,
  title,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  title?: string;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={title} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} title={title} onClick={onNavigate}>
      {children}
    </Link>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<div className="flex h-full border-r border-border bg-card p-4" />}>
      <SidebarNav />
    </Suspense>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const relHub = pathname?.startsWith("/dashboard/relatorios") ? searchParams.get("hub") : null;
  const { canAccessModule, canAccessDashboard, role, modules } = useAuth();
  const { onNavClick, sidebarDesktopMode, setSidebarDesktopMode } = useDashboardShell();
  const collapsed = sidebarDesktopMode === "icons";
  const [flyoutSlug, setFlyoutSlug] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  const inPath = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));

  const [grupoMasterOpen, setGrupoMasterOpen] = useState(() => isGrupoMasterPath(pathname, relHub));
  const [cadastrosOpen, setCadastrosOpen] = useState(() => isCadastrosPath(pathname, relHub));
  const [saudeOpen, setSaudeOpen] = useState(() => isSaudePath(pathname, relHub));
  const [futebolOpen, setFutebolOpen] = useState(() => isFutebolOperacaoPath(pathname, relHub));
  const [juridicoOpen, setJuridicoOpen] = useState(() => isJuridicoPath(pathname, relHub));
  const [eventosOpen, setEventosOpen] = useState(() => isEventosPath(pathname, relHub));
  const [admOpen, setAdmOpen] = useState(() => isAdmPath(pathname, relHub));
  const [requisicoesOpen, setRequisicoesOpen] = useState(() => isRequisicoesPath(pathname));
  const [ferramentasOpen, setFerramentasOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/emails") ||
      pathname?.startsWith("/dashboard/senhas")
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
  const [socioOpen, setSocioOpen] = useState(() => isSocioPath(pathname, relHub));
  const [academiasOpen, setAcademiasOpen] = useState(() => isAcademiasPath(pathname));
  const [marketingOpen, setMarketingOpen] = useState(() => isMarketingPath(pathname, relHub));
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
  const homeRoute = getHomeDashboardRoute(role, modules);
  const homeMenu = getDashboardHomeMenuItem(role, modules);

  useEffect(() => {
    if (!collapsed) setFlyoutSlug(null);
  }, [collapsed]);

  useEffect(() => {
    setFlyoutSlug(null);
  }, [pathname]);

  return (
    <div className="relative flex h-full flex-col border-r border-border bg-card shadow-sm">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-6",
        )}
      >
        <Link
          href={homeRoute}
          className={cn("flex min-w-0 items-center gap-2", collapsed && "justify-center")}
          onClick={onNavClick}
          title={collapsed ? `Dashboard ${name}` : undefined}
        >
          <img
            src="/bcg-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0 rounded object-contain"
          />
          {!collapsed && (
            <span className="truncate text-lg font-semibold">
              <span className="text-muted-foreground">Dashboard</span> {name}
            </span>
          )}
        </Link>
      </div>

      {flyoutSlug ? (
        <button
          type="button"
          aria-label="Fechar submenu"
          className="fixed inset-0 z-40 hidden lg:block"
          onClick={() => setFlyoutSlug(null)}
        />
      ) : null}

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-4">
        {DASHBOARD_MENU.map((item) => {
          const Icon = item.icon!;

          if (item.slug === "dashboard") {
            if (!canAccessDashboard) return null;
            if (
              homeMenu.href === "/dashboard" &&
              !canAccessModule("dashboard") &&
              role !== "super_admin"
            ) {
              return null;
            }
            const isActive =
              homeMenu.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === homeMenu.href || pathname?.startsWith(`${homeMenu.href}/`);
            return (
              <Link
                key={homeMenu.slug}
                href={homeMenu.href}
                onClick={onNavClick}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "dashboard-sidebar-active"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dashboard-link-hover"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{homeMenu.label}</span>}
              </Link>
            );
          }

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
              <SidebarMenuLink
                key={item.slug}
                href={item.href!}
                external={item.external}
                onNavigate={onNavClick}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "dashboard-sidebar-active"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dashboard-link-hover"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </SidebarMenuLink>
            );
          }

          if (item.children?.length) {
            const showGroup =
              item.slug === "grupo_master"
                ? canAccessModule("grupo_master") ||
                  canAccessModule("diretoria") ||
                  canAccessModule("empresas") ||
                  canAccessModule("tipos") ||
                  canAccessModule("usuarios") ||
                  canAccessModule("relatorios")
                : item.slug === "cadastros"
                  ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                  : item.slug === "adm"
                    ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                      : item.slug === "saude"
                      ? canAccessModule("saude") ||
                        canAccessModule("futebol_fisiologia") ||
                        canAccessModule("adm_nutricao") ||
                        canAccessModule("relatorios")
                      : item.slug === "futebol"
                        ? canAccessModule("diretoria") ||
                          canAccessModule("futebol_analise") ||
                          canAccessModule("futebol_logistica") ||
                          canAccessModule("relatorios")
                        : item.slug === "juridico"
                          ? canAccessModule("juridico") || canAccessModule("relatorios")
                          : item.slug === "eventos"
                            ? canAccessModule("eventos") || canAccessModule("relatorios")
                            : item.slug === "ferramentas"
                        ? hasAccessToAnyChild(item.children, canAccessModule, canAccessDashboard)
                          : item.slug === "configuracoes"
                          ? canAccessModule("configuracoes") ||
                            canAccessModule("usuarios") ||
                            canAccessModule("empresas")
                          : item.slug === "socio_torcedor"
                              ? canAccessModule("socio_torcedor") || canAccessModule("relatorios")
                              : item.slug === "academias"
                                ? canAccessModule("academias")
                                : item.slug === "marketing"
                                ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard) ||
                                  canAccessModule("relatorios")
                                : item.slug === "requisicoes"
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
                    : item.slug === "requisicoes"
                      ? requisicoesOpen
                    : item.slug === "saude"
                      ? saudeOpen
                      : item.slug === "futebol"
                        ? futebolOpen
                        : item.slug === "juridico"
                          ? juridicoOpen
                          : item.slug === "eventos"
                            ? eventosOpen
                            : item.slug === "ferramentas"
                        ? ferramentasOpen
                        : item.slug === "configuracoes"
                          ? configOpen
                          : item.slug === "socio_torcedor"
                              ? socioOpen
                              : item.slug === "academias"
                                ? academiasOpen
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
                    : item.slug === "requisicoes"
                      ? setRequisicoesOpen
                    : item.slug === "saude"
                      ? setSaudeOpen
                      : item.slug === "futebol"
                        ? setFutebolOpen
                        : item.slug === "juridico"
                          ? setJuridicoOpen
                          : item.slug === "eventos"
                            ? setEventosOpen
                            : item.slug === "ferramentas"
                        ? setFerramentasOpen
                        : item.slug === "configuracoes"
                          ? setConfigOpen
                          : item.slug === "socio_torcedor"
                              ? setSocioOpen
                              : item.slug === "academias"
                                ? setAcademiasOpen
                                : item.slug === "marketing"
                                ? setMarketingOpen
                                : () => {};

            return (
              <div key={item.slug} className="relative shrink-0 space-y-0.5">
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (collapsed) {
                      setFlyoutSlug((s) => (s === item.slug ? null : item.slug));
                    } else {
                      setOpen((o) => !o);
                    }
                  }}
                  className={cn(
                    "flex w-full shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                    "font-bold uppercase tracking-wide whitespace-nowrap",
                    collapsed && "justify-center px-2",
                    isOpen || flyoutSlug === item.slug
                      ? "bg-accent/50 text-accent-foreground shadow-sm"
                      : "text-foreground/90 hover:bg-accent hover:text-accent-foreground dashboard-link-hover",
                  )}
                >
                  {!collapsed &&
                    (isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 dashboard-chevron-transition" aria-label="Recolher" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 dashboard-chevron-transition" aria-label="Expandir" />
                    ))}
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                </button>
                {collapsed && flyoutSlug === item.slug ? (
                  <div className="fixed left-[4.5rem] top-16 z-50 hidden max-h-[calc(100dvh-4rem)] w-64 overflow-y-auto rounded-r-lg border border-border bg-card p-3 shadow-xl lg:block">
                    <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <div className="space-y-0.5 border-l border-border pl-3">
                      {item.children
                        .filter((c) =>
                          c.children?.length
                            ? hasAccessToAnyChild(c.children, canAccessModule, canAccessDashboard)
                            : canAccessModule(c.moduleSlug) || (c.moduleSlug === "emails" && canAccessDashboard),
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
                                    "flex w-full shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 dashboard-link-hover",
                                    "font-semibold uppercase tracking-wide whitespace-nowrap",
                                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  )}
                                >
                                  {isSubOpen ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                  )}
                                  {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                                  <span className="truncate">{child.label}</span>
                                </button>
                                {isSubOpen && (
                                  <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                    {child.children
                                      .filter(
                                        (cc) =>
                                          canAccessModule(cc.moduleSlug) ||
                                          (cc.moduleSlug === "emails" && canAccessDashboard),
                                      )
                                      .map((cc) => {
                                        if (!cc.href) return null;
                                        const isChildActive =
                                          !cc.external && resolveLinkActive(cc.href, pathname, relHub);
                                        return (
                                          <SidebarMenuLink
                                            key={cc.slug}
                                            href={cc.href}
                                            external={cc.external}
                                            onNavigate={() => {
                                              onNavClick();
                                              setFlyoutSlug(null);
                                            }}
                                            className={cn(
                                              "flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
                                              isChildActive
                                                ? "dashboard-sidebar-active"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            )}
                                          >
                                            {cc.icon && <cc.icon className="h-4 w-4 shrink-0" />}
                                            <span className="truncate">{cc.label}</span>
                                          </SidebarMenuLink>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          if (!child.href) return null;
                          const ChildIcon = child.icon!;
                          const isChildActive = !child.external && resolveLinkActive(child.href, pathname, relHub);
                          return (
                            <SidebarMenuLink
                              key={child.slug}
                              href={child.href}
                              external={child.external}
                              onNavigate={() => {
                                onNavClick();
                                setFlyoutSlug(null);
                              }}
                              className={cn(
                                "flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
                                isChildActive
                                  ? "dashboard-sidebar-active"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </SidebarMenuLink>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
                {!collapsed && isOpen && (
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
                                  "flex w-full shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 dashboard-link-hover",
                                  "font-semibold uppercase tracking-wide whitespace-nowrap",
                                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                {isSubOpen ? (
                                  <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                )}
                                {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                                <span className="truncate">{child.label}</span>
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
                                        if (cc.children?.length) {
                                          const hasCcAccess = hasAccessToAnyChild(
                                            cc.children,
                                            canAccessModule,
                                            canAccessDashboard,
                                          );
                                          if (!hasCcAccess) return null;
                                          const CcIcon = cc.icon;
                                          const isCcOpen =
                                            nestedOpen[cc.slug] ??
                                            nestedDefaultOpen(cc, pathname, inPath);
                                          return (
                                            <div key={cc.slug} className="space-y-0.5">
                                              <button
                                                type="button"
                                                onClick={() => toggleNested(cc)}
                                                className={cn(
                                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 dashboard-link-hover",
                                                  "font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                )}
                                              >
                                                {isCcOpen ? (
                                                  <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-label="Recolher" />
                                                ) : (
                                                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-label="Expandir" />
                                                )}
                                                {CcIcon && <CcIcon className="h-3.5 w-3.5 shrink-0" />}
                                                <span>{cc.label}</span>
                                              </button>
                                              {isCcOpen ? (
                                                <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                                                  {cc.children
                                                    .filter(
                                                      (ccc) =>
                                                        canAccessModule(ccc.moduleSlug) ||
                                                        (ccc.moduleSlug === "emails" && canAccessDashboard),
                                                    )
                                                    .map((ccc) => {
                                                      const isLeafActive =
                                                        !ccc.external &&
                                                        resolveLinkActive(ccc.href, pathname, relHub);
                                                      return (
                                                        <SidebarMenuLink
                                                          key={ccc.slug}
                                                          href={ccc.href!}
                                                          external={ccc.external}
                                                          onNavigate={onNavClick}
                                                          className={cn(
                                                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
                                                            isLeafActive
                                                              ? "dashboard-sidebar-active"
                                                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                          )}
                                                        >
                                                          {ccc.icon && <ccc.icon className="h-4 w-4 shrink-0" />}
                                                          {ccc.label}
                                                        </SidebarMenuLink>
                                                      );
                                                    })}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        }
                                        if (!cc.href) return null;
                                        const hrefMatches = resolveLinkActive(cc.href, pathname, relHub);
                                        const isChildActive =
                                          !cc.external &&
                                          hrefMatches &&
                                          (markedActiveHref === null || markedActiveHref !== cc.href) &&
                                          (markedActiveHref = cc.href, true);
                                        return (
                                          <SidebarMenuLink
                                            key={cc.slug}
                                            href={cc.href}
                                            external={cc.external}
                                            onNavigate={onNavClick}
                                            className={cn(
                                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
                                              isChildActive
                                                ? "dashboard-sidebar-active"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            )}
                                          >
                                            {cc.icon && <cc.icon className="h-4 w-4 shrink-0" />}
                                            {cc.label}
                                          </SidebarMenuLink>
                                        );
                                      });
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (!child.href) return null;
                        const ChildIcon = child.icon!;
                        const isChildActive = !child.external && resolveLinkActive(child.href, pathname, relHub);
                        const compact = "compactGroup" in child && (child as MenuItemConfig & { compactGroup?: string }).compactGroup;
                        return (
                          <SidebarMenuLink
                            key={child.slug}
                            href={child.href}
                            external={child.external}
                            onNavigate={onNavClick}
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
                          </SidebarMenuLink>
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
