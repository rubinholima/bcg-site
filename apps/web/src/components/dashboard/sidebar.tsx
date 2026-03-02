"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Globe,
  FileText,
  Image,
  Settings,
  Newspaper,
  Tag,
  Users,
  Mail,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Trophy,
  MapPin,
  Shirt,
  Layers,
} from "lucide-react";
import type { Group } from "@/types/group";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";

const cadastrosClubesItems = [
  { title: "Categorias", href: "/dashboard/cadastros/categorias", icon: Layers, moduleSlug: "tipos" },
  { title: "Campeonatos", href: "/dashboard/cadastros/campeonatos", icon: Trophy, moduleSlug: "tipos" },
  { title: DASHBOARD_LABELS.estadios, href: "/dashboard/cadastros/estadios", icon: MapPin, moduleSlug: "tipos" },
  { title: DASHBOARD_LABELS.timesAdversarios, href: "/dashboard/cadastros/times", icon: Shirt, moduleSlug: "tipos" },
];

const cadastrosEmpresasItems: { title: string; href: string; icon: typeof Building2; moduleSlug: string }[] = [
  { title: "Listagem", href: "/dashboard/empresas", icon: Building2, moduleSlug: "empresas" },
  // Mais itens serão adicionados depois
];

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, moduleSlug: "dashboard" },
  { title: "Grupo Master", href: "/dashboard/grupo", icon: Globe, moduleSlug: "grupo_master" },
  { title: "Emails", href: "/dashboard/emails", icon: Mail, moduleSlug: "emails" },
  { title: "Senhas", href: "/dashboard/senhas", icon: KeyRound, moduleSlug: "vault" },
  { title: DASHBOARD_LABELS.paginas, href: "/dashboard/paginas", icon: FileText, moduleSlug: "paginas" },
  { title: DASHBOARD_LABELS.noticias, href: "/dashboard/noticias", icon: Newspaper, moduleSlug: "noticias" },
  { title: DASHBOARD_LABELS.midia, href: "/dashboard/midia", icon: Image, moduleSlug: "midia" },
  { title: DASHBOARD_LABELS.configuracoes, href: "/dashboard/configuracoes", icon: Settings, moduleSlug: "configuracoes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [cadastrosOpen, setCadastrosOpen] = useState(
    () =>
      (pathname?.startsWith("/dashboard/cadastros") ||
        pathname?.startsWith("/dashboard/usuarios") ||
        pathname?.startsWith("/dashboard/empresas") ||
        pathname?.startsWith("/dashboard/tenants")) ??
      false
  );
  const [clubesOpen, setClubesOpen] = useState(
    () => pathname?.startsWith("/dashboard/cadastros") ?? false
  );
  const [empresasOpen, setEmpresasOpen] = useState(
    () =>
      (pathname?.startsWith("/dashboard/empresas") ||
        pathname?.startsWith("/dashboard/tenants")) ??
      false
  );

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
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Logo + nome do grupo + Platform */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <img
            src="/bcg-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain rounded flex-shrink-0"
          />
          <span className="text-lg font-semibold truncate">
            <span className="text-muted-foreground">Dashboard</span> {name}
          </span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {menuItems
          .filter(
            (item) =>
              canAccessModule(item.moduleSlug) ||
              (item.moduleSlug === "emails" && canAccessDashboard),
          )
          .flatMap((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard/grupo" && pathname?.startsWith("/dashboard/grupo")) ||
            (item.href === "/dashboard/emails" && pathname?.startsWith("/dashboard/emails")) ||
            (item.href === "/dashboard/senhas" && pathname?.startsWith("/dashboard/senhas")) ||
            (item.href === "/dashboard/noticias" && pathname?.startsWith("/dashboard/noticias")) ||
            (item.href === "/dashboard/midia" && pathname?.startsWith("/dashboard/midia"));

          const linkEl = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );

          // Cadastros logo após Grupo Master
          if (item.href === "/dashboard/grupo" &&
              (canAccessModule("tipos") || canAccessModule("usuarios") || canAccessModule("empresas") || canAccessModule("vault"))) {
            const hasClubes = cadastrosClubesItems.some((s) => canAccessModule(s.moduleSlug));
            const hasEmpresas = canAccessModule("empresas") || cadastrosEmpresasItems.some((s) => canAccessModule(s.moduleSlug));
            return [
              linkEl,
              <div key="cadastros" className="pt-2 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setCadastrosOpen((o) => !o)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    cadastrosOpen ||
                      pathname?.startsWith("/dashboard/cadastros") ||
                      pathname?.startsWith("/dashboard/usuarios") ||
                      pathname?.startsWith("/dashboard/empresas") ||
                      pathname?.startsWith("/dashboard/tenants")
                      ? "bg-accent/50 text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Tag className="h-5 w-5" />
                    Cadastros
                  </span>
                  {cadastrosOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {cadastrosOpen && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                    {canAccessModule("usuarios") && (
                      <Link
                        href="/dashboard/usuarios"
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                          pathname === "/dashboard/usuarios" || pathname?.startsWith("/dashboard/usuarios/")
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Users className="h-4 w-4" />
                        {DASHBOARD_LABELS.usuarios}
                      </Link>
                    )}
                    {hasClubes && (
                      <>
                        <button
                          type="button"
                          onClick={() => setClubesOpen((o) => !o)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                            clubesOpen
                              ? "bg-accent/50 text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Shirt className="h-4 w-4" />
                            Clubes
                          </span>
                          {clubesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {clubesOpen && (
                          <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                            {cadastrosClubesItems
                              .filter((s) => canAccessModule(s.moduleSlug))
                              .map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive =
                                  pathname === sub.href || pathname?.startsWith(sub.href + "/");
                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    className={cn(
                                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                                      isSubActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                  >
                                    <SubIcon className="h-4 w-4" />
                                    {sub.title}
                                  </Link>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}
                    {(hasEmpresas || cadastrosEmpresasItems.length > 0) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEmpresasOpen((o) => !o)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                            empresasOpen
                              ? "bg-accent/50 text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Empresas
                          </span>
                          {empresasOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        {empresasOpen && (
                          <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                            {cadastrosEmpresasItems.length === 0 ? (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">Em breve</p>
                            ) : (
                              cadastrosEmpresasItems
                                .filter((s) => canAccessModule(s.moduleSlug))
                                .map((sub) => {
                                  const SubIcon = sub.icon;
                                  const isSubActive =
                                    pathname === sub.href ||
                                    pathname?.startsWith(sub.href + "/") ||
                                    (sub.href === "/dashboard/empresas" && pathname?.startsWith("/dashboard/tenants"));
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      className={cn(
                                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                                        isSubActive
                                          ? "bg-primary text-primary-foreground"
                                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                      )}
                                    >
                                      <SubIcon className="h-4 w-4" />
                                      {sub.title}
                                    </Link>
                                  );
                                })
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>,
            ];
          }
          return [linkEl];
        })}
      </nav>
    </div>
  );
}
