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
    pathname.startsWith("/dashboard/socio-torcedor/planos")
  );
}

function isFutebolOperacaoPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "futebol") return true;
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/futebol/logistica") ||
    pathname.startsWith("/dashboard/futebol/analise") ||
    pathname.startsWith("/dashboard/futebol/avaliacoes") ||
    pathname.startsWith("/dashboard/futebol/agenda")
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
  return !!pathname?.startsWith("/dashboard/adm") && !pathname.startsWith("/dashboard/adm/nutricao");
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

function resolveLinkActive(
  href: string | undefined,
  pathname: string | null,
  currentHub: string | null
): boolean {
  if (!href) return false;
  if (isRelatorioLinkActive(href, pathname, currentHub)) return true;
  if (relatorioHub(href)) return false;
  if (href === "/dashboard/configuracoes") {
    return pathname === "/dashboard/configuracoes" || !!pathname?.startsWith("/dashboard/configuracoes/");
  }
  if (href === "/dashboard/empresas") {
    return pathname === "/dashboard/empresas" || !!pathname?.startsWith("/dashboard/tenants");
  }
  if (href === "/dashboard/grupo") return !!pathname?.startsWith("/dashboard/grupo");
  if (href === "/dashboard/diretoria") return !!pathname?.startsWith("/dashboard/diretoria");
  if (href === "/dashboard/cadastros/tipos") return !!pathname?.startsWith("/dashboard/cadastros/tipos");
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
  const { canAccessModule, canAccessDashboard } = useAuth();
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
                              : item.slug === "marketing"
                                ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard) ||
                                  canAccessModule("relatorios")
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
                                        const hrefMatches = resolveLinkActive(cc.href, pathname, relHub);
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
                        const isChildActive = resolveLinkActive(child.href, pathname, relHub);
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
