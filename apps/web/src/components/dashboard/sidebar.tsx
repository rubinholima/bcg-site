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

export function Sidebar() {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);

  const inPath = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));

  const [diretoriaOpen, setDiretoriaOpen] = useState(() => pathname?.startsWith("/dashboard/diretoria"));
  const [empresasOpen, setEmpresasOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/empresas") ||
      pathname?.startsWith("/dashboard/tenants") ||
      pathname === "/dashboard/cadastros/tipos"
  );
  const [futebolOpen, setFutebolOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/cadastros") ||
      pathname?.startsWith("/dashboard/medico") ||
      pathname?.startsWith("/dashboard/psicologia") ||
      pathname?.startsWith("/dashboard/consultas") ||
      pathname?.startsWith("/dashboard/juridico") ||
      pathname?.startsWith("/dashboard/futebol")
  );
  const [admOpen, setAdmOpen] = useState(() => pathname?.startsWith("/dashboard/adm"));
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
      pathname?.startsWith("/dashboard/usuarios")
  );
  const [psicologiaOpen, setPsicologiaOpen] = useState(
    () => pathname?.startsWith("/dashboard/consultas") || pathname?.startsWith("/dashboard/psicologia")
  );
  const [relatoriosOpen, setRelatoriosOpen] = useState(() => pathname?.startsWith("/dashboard/relatorios"));
  const [socioOpen, setSocioOpen] = useState(() => pathname?.startsWith("/dashboard/socio-torcedor"));
  const [marketingOpen, setMarketingOpen] = useState(() => pathname?.startsWith("/dashboard/marketing"));
  const [analiseOpen, setAnaliseOpen] = useState(() => pathname?.startsWith("/dashboard/diretoria") || pathname?.startsWith("/dashboard/futebol/analise"));

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
              item.slug === "diretoria"
                ? canAccessModule("diretoria")
                : item.slug === "empresas"
                  ? canAccessModule("empresas") || canAccessModule("tipos")
                  : item.slug === "adm"
                    ? hasAccessToAnyChild(item.children ?? [], canAccessModule, canAccessDashboard)
                    : item.slug === "futebol"
                      ? canAccessModule("tipos") || canAccessModule("diretoria") || canAccessModule("medico") || canAccessModule("psicologia") || canAccessModule("juridico") || canAccessModule("futebol_comissao") || canAccessModule("futebol_fisiologia") || canAccessModule("futebol_analise")
                      : item.slug === "ferramentas"
                        ? hasAccessToAnyChild(item.children, canAccessModule, canAccessDashboard)
                        : item.slug === "configuracoes"
                          ? canAccessModule("configuracoes") || canAccessModule("usuarios")
                          : item.slug === "psicologia"
                            ? canAccessModule("psicologia")
                            : item.slug === "relatorios"
                              ? canAccessModule("relatorios")
                              : item.slug === "socio_torcedor"
                                ? canAccessModule("socio_torcedor")
                                : item.slug === "marketing"
                                  ? canAccessModule("marketing")
                                  : false;

            if (!showGroup) return null;

            const isOpen =
              item.slug === "diretoria"
                ? diretoriaOpen
                : item.slug === "empresas"
                  ? empresasOpen
                  : item.slug === "adm"
                    ? admOpen
                    : item.slug === "futebol"
                      ? futebolOpen
                      : item.slug === "ferramentas"
                        ? ferramentasOpen
                        : item.slug === "configuracoes"
                          ? configOpen
                          : item.slug === "psicologia"
                            ? psicologiaOpen
                            : item.slug === "relatorios"
                              ? relatoriosOpen
                              : item.slug === "socio_torcedor"
                                ? socioOpen
                                : item.slug === "marketing"
                                  ? marketingOpen
                                  : false;
            const setOpen =
              item.slug === "diretoria"
                ? setDiretoriaOpen
                : item.slug === "empresas"
                  ? setEmpresasOpen
                  : item.slug === "adm"
                    ? setAdmOpen
                    : item.slug === "futebol"
                      ? setFutebolOpen
                      : item.slug === "ferramentas"
                        ? setFerramentasOpen
                        : item.slug === "configuracoes"
                          ? setConfigOpen
                          : item.slug === "psicologia"
                            ? setPsicologiaOpen
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
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isOpen
                      ? "bg-accent/50 text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dashboard-link-hover"
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
                      .filter(
                        (c) =>
                          c.children?.length
                            ? hasAccessToAnyChild(c.children, canAccessModule, canAccessDashboard)
                            : canAccessModule(c.moduleSlug) || (c.moduleSlug === "emails" && canAccessDashboard)
                      )
                      .map((child) => {
                        if (child.children?.length) {
                          const hasAccess = hasAccessToAnyChild(child.children, canAccessModule, canAccessDashboard);
                          if (!hasAccess) return null;
                          const SubIcon = child.icon;
                          const isSubOpen =
                            child.slug === "analise"
                              ? analiseOpen
                              : child.slug === "psicologia"
                                ? psicologiaOpen
                                : true;
                          const setSubOpen =
                            child.slug === "analise"
                              ? setAnaliseOpen
                              : child.slug === "psicologia"
                                ? setPsicologiaOpen
                                : () => {};
                          return (
                            <div key={child.slug} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (child.slug === "analise") setAnaliseOpen((o) => !o);
                                  if (child.slug === "psicologia") setPsicologiaOpen((o) => !o);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
                                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                {(child.slug === "analise" || child.slug === "psicologia") ? (
                                  isSubOpen ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                  )
                                ) : null}
                                {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                                <span>{child.label}</span>
                              </button>
                              {(child.slug === "analise" || child.slug === "psicologia") && isSubOpen && (
                                <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                  {child.children
                                    .filter((cc) => canAccessModule(cc.moduleSlug))
                                    .map((cc) => {
                                      const isChildActive = inPath(cc.href!);
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
                                    })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        const ChildIcon = child.icon!;
                        const isChildActive =
                          child.href === "/dashboard/configuracoes"
                            ? pathname === "/dashboard/configuracoes" || pathname?.startsWith("/dashboard/configuracoes/")
                            : child.href === "/dashboard/empresas"
                              ? pathname === "/dashboard/empresas" || pathname?.startsWith("/dashboard/tenants")
                              : inPath(child.href!);
                        return (
                          <Link
                            key={child.slug}
                            href={child.href!}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 dashboard-link-hover",
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
