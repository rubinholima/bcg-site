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
import type { MenuItemConfig } from "@/lib/dashboard-menu.config";
import {
  DASHBOARD_MENU,
  canAccessMenuLeaf,
  hasAccessToMenuItem,
} from "@/lib/dashboard-menu.config";
import { getDashboardHomeMenuItem, getHomeDashboardRoute } from "@/lib/dashboard-home";
import { useDashboardShell } from "@/context/DashboardShellContext";
import { Cup360BrandMark } from "@/components/dashboard/Cup360BrandMark";
import { DashboardThemeToggle } from "@/components/dashboard/DashboardThemeToggle";
import { PLATFORM_APP_NAME } from "@/lib/platform-branding";
import { SidebarAreaLabel } from "@/components/dashboard/cup360";
import {
  getCup360NavAreaForMenuSlug,
  getCup360NavAreaLabel,
  type Cup360NavAreaId,
} from "@/lib/dashboard-nav-areas";
import { cup360 } from "@/lib/cup360-design-tokens";
import { Fragment } from "react";

function SidebarMenuIcon({ item, className = "h-4 w-4 shrink-0" }: { item: MenuItemConfig; className?: string }) {
  if (item.menuLogoSrc) {
    return (
      <img
        src={item.menuLogoSrc}
        alt=""
        className={cn(className, "rounded-full object-contain")}
      />
    );
  }
  if (item.icon) {
    const Icon = item.icon;
    return <Icon className={className} />;
  }
  return null;
}

/** Verifica se o usuário tem acesso a pelo menos um filho do grupo (recursivo). */
function hasAccessToAnyChild(
  children: MenuItemConfig[],
  pathPrefix: string,
  canAccessModule: (slug: string) => boolean,
  canAccessDashboard?: boolean,
  isSuperAdmin?: boolean,
): boolean {
  return children.some((c) =>
    hasAccessToMenuItem(c, pathPrefix, canAccessModule, canAccessDashboard, isSuperAdmin),
  );
}

function relatorioHubFromPath(pathname: string | null): string | null {
  if (!pathname?.startsWith("/dashboard/relatorios/")) return null;
  const seg = pathname.split("/")[3];
  return seg?.trim() || null;
}

function relatorioHub(href: string | undefined): string | null {
  if (!href?.includes("/dashboard/relatorios")) return null;
  const match = href.match(/[?&]hub=([^&]+)/);
  if (match?.[1]) return match[1];
  if (href.startsWith("/dashboard/relatorios/")) {
    const seg = href.split("/")[3];
    return seg?.trim() || null;
  }
  return null;
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

function isFutebolCadastroPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/cadastros/jogadores") ||
    pathname.startsWith("/dashboard/cadastros/campeonatos") ||
    pathname.startsWith("/dashboard/cadastros/estadios") ||
    pathname.startsWith("/dashboard/cadastros/times") ||
    pathname.startsWith("/dashboard/cadastros/categorias") ||
    pathname.startsWith("/dashboard/cadastros/espacos")
  );
}

function isSaudeCadastroPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/medico/equipe") ||
    pathname.startsWith("/dashboard/medico/enfermeiros") ||
    pathname.startsWith("/dashboard/psicologia/psicologos") ||
    pathname.startsWith("/dashboard/saude/estagiarios")
  );
}

function isFutebolOperacaoPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "futebol") return true;
  if (!pathname) return false;
  return (
    pathname === "/dashboard/futebol" ||
    pathname.startsWith("/dashboard/relatorios/futebol") ||
    pathname.startsWith("/dashboard/futebol/logistica") ||
    pathname.startsWith("/dashboard/futebol/analise") ||
    pathname.startsWith("/dashboard/futebol/analise-desempenho") ||
    pathname.startsWith("/dashboard/futebol/avaliacoes") ||
    pathname.startsWith("/dashboard/futebol/agenda") ||
    pathname.startsWith("/dashboard/futebol/comissao") ||
    pathname.startsWith("/dashboard/futebol/fisiologia") ||
    pathname.startsWith("/dashboard/futebol/preparacao-fisica") ||
    pathname.startsWith("/dashboard/futebol/performance") ||
    pathname.startsWith("/dashboard/futebol/captacao") ||
    pathname.startsWith("/dashboard/futebol/try-outs") ||
    pathname.startsWith("/dashboard/futebol/treinadores") ||
    pathname.startsWith("/dashboard/futebol/jogos") ||
    pathname.startsWith("/dashboard/adm/nutricao") ||
    isFutebolCadastroPath(pathname)
  );
}

function isJuridicoPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "juridico") return true;
  return !!pathname?.startsWith("/dashboard/juridico");
}

function isAssistenciaSocialPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "assistencia_social") return true;
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard/assistencia-social") ||
    pathname.startsWith("/dashboard/futebol/assistencia-social")
  );
}

function isEventosPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "eventos") return true;
  return !!pathname?.startsWith("/dashboard/eventos");
}

function isSaudePath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "saude") return true;
  if (!pathname) return false;
  return (
    (pathname.startsWith("/dashboard/medico") && !isSaudeCadastroPath(pathname)) ||
    pathname.startsWith("/dashboard/consultas") ||
    (pathname.startsWith("/dashboard/psicologia") && !pathname.startsWith("/dashboard/psicologia/psicologos")) ||
    pathname.startsWith("/dashboard/saude") ||
    isSaudeCadastroPath(pathname) ||
    pathname.startsWith("/dashboard/psicologia/psicologos")
  );
}

function isAdmPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "adm") return true;
  if (pathname === "/dashboard/adm") return true;
  return !!pathname?.startsWith("/dashboard/adm") && !pathname.startsWith("/dashboard/adm/nutricao");
}

function isAgendaSectionPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/dashboard/agenda" || pathname.startsWith("/dashboard/agenda/");
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

function isAssessoriaImprensaPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "assessoria_imprensa") return true;
  if (!pathname) return false;
  return pathname.startsWith("/dashboard/assessoria-imprensa");
}

function isSocioPath(pathname: string | null, relHub: string | null): boolean {
  if (relHub === "socio_torcedor") return true;
  return !!pathname?.startsWith("/dashboard/socio-torcedor");
}

function isFerramentasPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/dashboard/emails") || pathname.startsWith("/dashboard/senhas") || pathname.startsWith("/dashboard/ferramentas/fmf-scraper");
}

function isAcademiasPath(pathname: string | null): boolean {
  return !!pathname?.startsWith("/dashboard/academias");
}

function isComunicacaoPath(pathname: string | null): boolean {
  return !!pathname?.startsWith("/dashboard/comunicacao");
}

function isConfigPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/dashboard/configuracoes");
}

/** Seção de topo aberta conforme a rota atual (accordion — só uma). */
function getActiveGroupSlug(pathname: string | null, relHub: string | null): string | null {
  if (isGrupoMasterPath(pathname, relHub)) return "grupo_master";
  if (isAdmPath(pathname, relHub)) return "adm";
  if (isRequisicoesPath(pathname)) return "requisicoes";
  if (isAgendaSectionPath(pathname)) return "agenda";
  if (isSaudePath(pathname, relHub)) return "saude";
  if (isFutebolOperacaoPath(pathname, relHub)) return "futebol";
  if (isAssistenciaSocialPath(pathname, relHub)) return "assistencia_social";
  if (isJuridicoPath(pathname, relHub)) return "juridico";
  if (isEventosPath(pathname, relHub)) return "eventos";
  if (isMarketingPath(pathname, relHub)) return "marketing";
  if (isAssessoriaImprensaPath(pathname, relHub)) return "assessoria_imprensa";
  if (isSocioPath(pathname, relHub)) return "socio_torcedor";
  if (isAcademiasPath(pathname)) return "academias";
  if (isComunicacaoPath(pathname)) return "comunicacao";
  if (isFerramentasPath(pathname)) return "ferramentas";
  if (
    pathname?.startsWith("/dashboard/configuracoes") ||
    pathname?.startsWith("/dashboard/usuarios") ||
    pathname?.startsWith("/dashboard/empresas") ||
    pathname?.startsWith("/dashboard/tenants")
  ) {
    return "configuracoes";
  }
  return null;
}

/** Hub ativo pela rota atual (inclui ?hub= em relatórios). */
function getPathnameHub(pathname: string | null, relHub: string | null): string | null {
  if (relHub) return relHub;
  if (!pathname || pathname === "/dashboard") return null;
  if (isGrupoMasterPath(pathname, null)) return "grupo_master";
  if (isAdmPath(pathname, null)) return "adm";
  if (isRequisicoesPath(pathname)) return "requisicoes";
  if (isAgendaSectionPath(pathname)) return "agenda";
  if (isSaudePath(pathname, null)) return "saude";
  if (isFutebolOperacaoPath(pathname, null)) return "futebol";
  if (isAssistenciaSocialPath(pathname, null)) return "assistencia_social";
  if (isJuridicoPath(pathname, null)) return "juridico";
  if (isEventosPath(pathname, null)) return "eventos";
  if (isMarketingPath(pathname, null)) return "marketing";
  if (isAssessoriaImprensaPath(pathname, null)) return "assessoria_imprensa";
  if (isSocioPath(pathname, null)) return "socio_torcedor";
  if (isAcademiasPath(pathname)) return "academias";
  if (isComunicacaoPath(pathname)) return "comunicacao";
  if (isFerramentasPath(pathname)) return "ferramentas";
  if (isConfigPath(pathname)) return "configuracoes";
  return null;
}

function resolveLinkActive(
  href: string | undefined,
  pathname: string | null,
  currentHub: string | null,
  searchParams: URLSearchParams | null,
): boolean {
  if (!href) return false;
  if (isRelatorioLinkActive(href, pathname, currentHub)) return true;
  if (relatorioHub(href)) return false;
  if (href.startsWith("/dashboard/agenda")) {
    return pathname === "/dashboard/agenda";
  }
  if (href === "/dashboard/requisicoes") {
    return pathname === "/dashboard/requisicoes";
  }
  if (href === "/dashboard/agenda") {
    return pathname === "/dashboard/agenda";
  }
  if (href === "/dashboard/empresas") {
    return pathname === "/dashboard/empresas" || !!pathname?.startsWith("/dashboard/tenants");
  }
  if (href === "/dashboard/grupo") return !!pathname?.startsWith("/dashboard/grupo");
  if (href === "/dashboard/diretoria") return !!pathname?.startsWith("/dashboard/diretoria");
  if (href === "/dashboard/futebol/jogos") {
    return !!pathname?.startsWith("/dashboard/futebol/jogos");
  }
  if (href === "/dashboard/futebol") return pathname === "/dashboard/futebol";
  if (href === "/dashboard/adm") return pathname === "/dashboard/adm";
  if (href === "/dashboard/saude") return pathname === "/dashboard/saude";
  if (href === "/dashboard/eventos/boston-city-hall") {
    return pathname === "/dashboard/eventos/boston-city-hall";
  }
  if (href === "/dashboard/relatorios/futebol") {
    return !!pathname?.startsWith("/dashboard/relatorios/futebol");
  }
  if (href === "/dashboard/futebol/logistica/relatorios") {
    return !!pathname?.startsWith("/dashboard/futebol/logistica/relatorios");
  }
  if (href === "/dashboard/futebol/logistica/convocacao") {
    return !!pathname?.startsWith("/dashboard/futebol/logistica/convocacao");
  }
  if (href === "/dashboard/futebol/logistica") {
    if (!pathname?.startsWith("/dashboard/futebol/logistica")) return false;
    if (pathname.startsWith("/dashboard/cadastros/espacos")) return false;
    if (pathname.startsWith("/dashboard/futebol/logistica/agenda")) return false;
    if (pathname.startsWith("/dashboard/futebol/logistica/convocacao")) return false;
    if (pathname.startsWith("/dashboard/futebol/logistica/relatorios")) return false;
    return true;
  }
  if (href === "/dashboard/futebol/agenda") {
    return (
      pathname === "/dashboard/futebol/agenda" ||
      pathname === "/dashboard/futebol/logistica/agenda" ||
      !!pathname?.startsWith("/dashboard/cadastros/espacos")
    );
  }
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

/** Entre irmãos do menu, só o href mais específico fica ativo (evita dois marcados). */
function pickMostSpecificActiveHref(
  items: MenuItemConfig[],
  pathname: string | null,
  relHub: string | null,
  searchParams: URLSearchParams | null,
): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const item of items) {
    if (!item.href || item.external) continue;
    if (resolveLinkActive(item.href, pathname, relHub, searchParams) && item.href.length > bestLen) {
      bestLen = item.href.length;
      best = item.href;
    }
  }
  return best;
}

/** Coleta todos os itens com href na árvore (inclui netos) para achar o match mais específico. */
function collectMenuItemsWithHref(items: MenuItemConfig[]): MenuItemConfig[] {
  const out: MenuItemConfig[] = [];
  for (const item of items) {
    if (item.href) out.push(item);
    if (item.children?.length) out.push(...collectMenuItemsWithHref(item.children));
  }
  return out;
}

function nestedDefaultOpen(
  child: MenuItemConfig,
  pathname: string | null,
  inPath: (href: string) => boolean
): boolean {
  if (!child.children?.length) return false;
  if (child.href && (pathname === child.href || pathname?.startsWith(child.href + "/"))) {
    return true;
  }
  return child.children.some((cc) => {
    if (cc.href && inPath(cc.href)) return true;
    if (cc.children?.length) {
      return cc.children.some((ccc) => !!ccc.href && inPath(ccc.href));
    }
    return false;
  });
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
  const relHub = pathname?.startsWith("/dashboard/relatorios")
    ? searchParams.get("hub") ?? relatorioHubFromPath(pathname)
    : null;
  const { canAccessModule, canAccessDashboard, role, modules, isSuperAdmin } = useAuth();
  const { onNavClick, sidebarDesktopMode, setSidebarDesktopMode } = useDashboardShell();
  const collapsed = sidebarDesktopMode === "icons";
  const [flyoutSlug, setFlyoutSlug] = useState<string | null>(null);

  const inPath = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));

  const [grupoMasterOpen, setGrupoMasterOpen] = useState(() => isGrupoMasterPath(pathname, relHub));
  const [saudeOpen, setSaudeOpen] = useState(() => isSaudePath(pathname, relHub));
  const [futebolOpen, setFutebolOpen] = useState(() => isFutebolOperacaoPath(pathname, relHub));
  const [juridicoOpen, setJuridicoOpen] = useState(() => isJuridicoPath(pathname, relHub));
  const [assistenciaSocialOpen, setAssistenciaSocialOpen] = useState(() =>
    isAssistenciaSocialPath(pathname, relHub),
  );
  const [eventosOpen, setEventosOpen] = useState(() => isEventosPath(pathname, relHub));
  const [admOpen, setAdmOpen] = useState(() => isAdmPath(pathname, relHub));
  const [requisicoesOpen, setRequisicoesOpen] = useState(() => isRequisicoesPath(pathname));
  const [agendaOpen, setAgendaOpen] = useState(() => isAgendaSectionPath(pathname));
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
      (pathname?.startsWith("/dashboard/psicologia") &&
        !pathname?.startsWith("/dashboard/psicologia/psicologos"))
  );
  const [medicoOpen, setMedicoOpen] = useState(
    () => pathname?.startsWith("/dashboard/medico") && !isSaudeCadastroPath(pathname)
  );
  const [socioOpen, setSocioOpen] = useState(() => isSocioPath(pathname, relHub));
  const [academiasOpen, setAcademiasOpen] = useState(() => isAcademiasPath(pathname));
  const [comunicacaoOpen, setComunicacaoOpen] = useState(() => isComunicacaoPath(pathname));
  const [assessoriaImprensaOpen, setAssessoriaImprensaOpen] = useState(() =>
    isAssessoriaImprensaPath(pathname, relHub),
  );
  const [marketingOpen, setMarketingOpen] = useState(() => isMarketingPath(pathname, relHub));
  const [performanceOpen, setPerformanceOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/futebol/performance") ||
      pathname?.startsWith("/dashboard/futebol/fisiologia") ||
      pathname?.startsWith("/dashboard/futebol/preparacao-fisica") ||
      pathname?.startsWith("/dashboard/adm/nutricao")
  );
  const [analiseDesempenhoOpen, setAnaliseDesempenhoOpen] = useState(
    () =>
      pathname?.startsWith("/dashboard/futebol/analise-desempenho") ||
      pathname?.startsWith("/dashboard/futebol/analise")
  );
  const [treinadoresOpen, setTreinadoresOpen] = useState(
    () => pathname?.startsWith("/dashboard/futebol/treinadores"),
  );
  const [nestedOpen, setNestedOpen] = useState<Record<string, boolean>>({});

  const applyOpenGroup = (slug: string | null) => {
    setGrupoMasterOpen(slug === "grupo_master");
    setSaudeOpen(slug === "saude");
    setFutebolOpen(slug === "futebol");
    setAssistenciaSocialOpen(slug === "assistencia_social");
    setJuridicoOpen(slug === "juridico");
    setEventosOpen(slug === "eventos");
    setAdmOpen(slug === "adm");
    setRequisicoesOpen(slug === "requisicoes");
    setAgendaOpen(slug === "agenda");
    setFerramentasOpen(slug === "ferramentas");
    setConfigOpen(slug === "configuracoes");
    setSocioOpen(slug === "socio_torcedor");
    setAcademiasOpen(slug === "academias");
    setComunicacaoOpen(slug === "comunicacao");
    setAssessoriaImprensaOpen(slug === "assessoria_imprensa");
    setMarketingOpen(slug === "marketing");
  };

  const closeAllNested = () => {
    setPerformanceOpen(false);
    setAnaliseDesempenhoOpen(false);
    setTreinadoresOpen(false);
    setPsicologiaOpen(false);
    setMedicoOpen(false);
    setNestedOpen({});
  };

  const syncNestedFromPath = () => {
    closeAllNested();
    if (
      pathname?.startsWith("/dashboard/futebol/performance") ||
      pathname?.startsWith("/dashboard/futebol/fisiologia") ||
      pathname?.startsWith("/dashboard/futebol/preparacao-fisica") ||
      pathname?.startsWith("/dashboard/adm/nutricao")
    ) {
      setPerformanceOpen(true);
    } else if (
      pathname?.startsWith("/dashboard/futebol/analise-desempenho") ||
      pathname?.startsWith("/dashboard/futebol/analise")
    ) {
      setAnaliseDesempenhoOpen(true);
    } else if (pathname?.startsWith("/dashboard/futebol/treinadores")) {
      setTreinadoresOpen(true);
    } else if (
      pathname?.startsWith("/dashboard/consultas") ||
      (pathname?.startsWith("/dashboard/psicologia") &&
        !pathname.startsWith("/dashboard/psicologia/psicologos"))
    ) {
      setPsicologiaOpen(true);
    } else if (pathname?.startsWith("/dashboard/medico") && !isSaudeCadastroPath(pathname)) {
      setMedicoOpen(true);
    }
  };

  useEffect(() => {
    applyOpenGroup(getActiveGroupSlug(pathname, relHub));
    syncNestedFromPath();
  }, [pathname, relHub]);

  const toggleNested = (child: MenuItemConfig) => {
    const expanded = isNestedExpanded(child);
    if (expanded) {
      setNestedOpen((prev) => ({ ...prev, [child.slug]: false }));
      return;
    }
    // Não chama closeAllNested — senão fecha o pai (ex.: Logística) ao abrir Relatórios
    setNestedOpen((prev) => ({ ...prev, [child.slug]: true }));
  };

  const isNestedExpanded = (child: MenuItemConfig): boolean => {
    if (child.slug === "futebol_performance") return performanceOpen;
    if (child.slug === "futebol_analise_desempenho") return analiseDesempenhoOpen;
    if (child.slug === "futebol_treinadores") return treinadoresOpen;
    if (child.slug === "psicologia") return psicologiaOpen;
    if (child.slug === "medico") return medicoOpen;
    /** Se o usuário abriu um hub manualmente, não manter outro aberto só pela rota (ex.: Atletas + Logística). */
    const anyManualNestedOpen = Object.values(nestedOpen).some((v) => v === true);
    if (anyManualNestedOpen) return nestedOpen[child.slug] === true;
    if (nestedOpen[child.slug] === false) return false;
    return nestedDefaultOpen(child, pathname, inPath);
  };

  const toggleNestedChild = (child: MenuItemConfig) => {
    const expanded = isNestedExpanded(child);
    if (expanded) {
      if (child.slug === "futebol_performance") setPerformanceOpen(false);
      else if (child.slug === "futebol_analise_desempenho") setAnaliseDesempenhoOpen(false);
      else if (child.slug === "futebol_treinadores") setTreinadoresOpen(false);
      else if (child.slug === "psicologia") setPsicologiaOpen(false);
      else if (child.slug === "medico") setMedicoOpen(false);
      else setNestedOpen((prev) => ({ ...prev, [child.slug]: false }));
      return;
    }
    closeAllNested();
    if (child.slug === "futebol_performance") setPerformanceOpen(true);
    else if (child.slug === "futebol_analise_desempenho") setAnaliseDesempenhoOpen(true);
    else if (child.slug === "futebol_treinadores") setTreinadoresOpen(true);
    else if (child.slug === "psicologia") setPsicologiaOpen(true);
    else if (child.slug === "medico") setMedicoOpen(true);
    else setNestedOpen({ [child.slug]: true });
  };

  const homeRoute = getHomeDashboardRoute(role, modules);
  const homeMenu = getDashboardHomeMenuItem(role, modules);

  useEffect(() => {
    if (!collapsed) setFlyoutSlug(null);
  }, [collapsed]);

  useEffect(() => {
    setFlyoutSlug(null);
  }, [pathname]);

  let lastNavArea: Cup360NavAreaId | null = null;

  return (
    <div className="relative flex h-full flex-col border-r border-border bg-card shadow-sm">
      <div
        className={cn(
          "hidden h-[4.5rem] shrink-0 items-center justify-center border-b border-border lg:flex",
          collapsed ? "px-2" : "px-4",
        )}
      >
        <Link
          href={homeRoute}
          className="flex w-full min-w-0 items-center justify-center"
          onClick={onNavClick}
          title={collapsed ? PLATFORM_APP_NAME : undefined}
        >
          <Cup360BrandMark
            logoClassName={collapsed ? "h-14 w-14" : "h-12 w-12"}
            showName={!collapsed}
            nameClassName="text-2xl font-bold tracking-tight sm:text-3xl"
          />
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

      <nav className={cup360.sidebar.nav}>
        {DASHBOARD_MENU.map((item) => {
          const navArea = getCup360NavAreaForMenuSlug(item.slug);
          const areaLabel = !collapsed ? getCup360NavAreaLabel(navArea) : null;
          const showAreaLabel = Boolean(areaLabel && navArea !== lastNavArea);
          if (showAreaLabel) lastNavArea = navArea;

          const areaHeader = showAreaLabel && areaLabel ? (
            <SidebarAreaLabel label={areaLabel} />
          ) : null;

          const renderWithArea = (key: string, content: React.ReactNode) => (
            <Fragment key={key}>
              {areaHeader}
              {content}
            </Fragment>
          );

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
            return renderWithArea(
              homeMenu.slug,
              <Link
                href={homeMenu.href}
                onClick={onNavClick}
                className={cn(
                  cup360.sidebar.linkL1,
                  collapsed && "justify-center px-2",
                  isActive ? cup360.sidebar.active : cup360.sidebar.idle,
                )}
              >
                <Icon className={cup360.control.iconMd} />
                {!collapsed && <span className="min-w-0 truncate leading-snug">{homeMenu.label}</span>}
              </Link>,
            );
          }

          if (item.href && !item.children?.length) {
            if (
              !canAccessMenuLeaf(item, item.slug, canAccessModule) &&
              !(item.moduleSlug === "emails" && canAccessDashboard)
            ) {
              return null;
            }
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/dashboard/grupo"
                  ? pathname?.startsWith("/dashboard/grupo")
                  : inPath(item.href);
            return renderWithArea(
              item.slug,
              <SidebarMenuLink
                href={item.href!}
                external={item.external}
                onNavigate={onNavClick}
                className={cn(
                  cup360.sidebar.linkL1,
                  collapsed && "justify-center px-2",
                  isActive ? cup360.sidebar.active : cup360.sidebar.idle,
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cup360.control.iconMd} />
                {!collapsed && <span className="min-w-0 truncate leading-snug">{item.label}</span>}
              </SidebarMenuLink>,
            );
          }

          if (item.children?.length) {
            const showGroup = hasAccessToAnyChild(
              item.children ?? [],
              item.slug,
              canAccessModule,
              canAccessDashboard,
              isSuperAdmin,
            );

            if (!showGroup) return null;

            const isOpen =
              item.slug === "grupo_master"
                ? grupoMasterOpen
                : item.slug === "adm"
                    ? admOpen
                    : item.slug === "requisicoes"
                      ? requisicoesOpen
                    : item.slug === "agenda"
                      ? agendaOpen
                    : item.slug === "saude"
                      ? saudeOpen
                      : item.slug === "futebol"
                        ? futebolOpen
                        : item.slug === "assistencia_social"
                          ? assistenciaSocialOpen
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
                                : item.slug === "comunicacao"
                                  ? comunicacaoOpen
                                : item.slug === "assessoria_imprensa"
                                  ? assessoriaImprensaOpen
                                : item.slug === "marketing"
                                ? marketingOpen
                                : false;

            const visibleHubChildren = item.children.filter((c) =>
              hasAccessToMenuItem(c, item.slug, canAccessModule, canAccessDashboard, isSuperAdmin),
            );
            const activeHubChildHref = pickMostSpecificActiveHref(
              collectMenuItemsWithHref(visibleHubChildren),
              pathname,
              relHub,
              searchParams,
            );

            return renderWithArea(
              item.slug,
              <div className="relative shrink-0 space-y-0.5">
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (collapsed) {
                      setFlyoutSlug((s) => (s === item.slug ? null : item.slug));
                    } else if (isOpen) {
                      applyOpenGroup(null);
                      closeAllNested();
                    } else {
                      applyOpenGroup(item.slug);
                      closeAllNested();
                    }
                  }}
                  className={cn(
                    "flex w-full shrink-0 items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200",
                    "font-bold leading-snug",
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
                  {!collapsed && <span className="min-w-0 text-left leading-snug">{item.label}</span>}
                </button>
                {collapsed && flyoutSlug === item.slug ? (
                  <div className="fixed left-[4.5rem] top-16 z-50 hidden max-h-[calc(100dvh/var(--app-zoom)-4rem)] w-80 overflow-y-auto rounded-r-lg border border-border bg-card p-3 shadow-xl lg:block">
                    <p className="mb-2 px-2 text-xs font-bold text-muted-foreground">
                      {item.label}
                    </p>
                    <div className="space-y-0.5 border-l border-border pl-3">
                      {item.children
                        .filter((c) =>
                          hasAccessToMenuItem(c, item.slug, canAccessModule, canAccessDashboard, isSuperAdmin),
                        )
                        .map((child) => {
                          if (child.children?.length) {
                            const hasAccess = hasAccessToAnyChild(
                              child.children,
                              `${item.slug}/${child.slug}`,
                              canAccessModule,
                              canAccessDashboard,
                              isSuperAdmin,
                            );
                            if (!hasAccess) return null;
                            const isSubOpen = isNestedExpanded(child);
                            return (
                              <div key={child.slug} className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleNestedChild(child)}
                                  className={cn(
                                    "flex w-full shrink-0 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-200 dashboard-link-hover",
                                    "font-semibold leading-snug",
                                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                  )}
                                >
                                  {isSubOpen ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                  )}
                                  <SidebarMenuIcon item={child} />
                                  <span className="text-left leading-snug">{child.label}</span>
                                </button>
                                {isSubOpen && (
                                  <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                    {(() => {
                                      const groupItems = collectMenuItemsWithHref(child.children);
                                      const activeBchHref = pickMostSpecificActiveHref(
                                        groupItems,
                                        pathname,
                                        relHub,
                                        searchParams,
                                      );
                                      return child.children
                                        .filter(
                                          (cc) =>
                                            canAccessMenuLeaf(cc, `${item.slug}/${child.slug}`, canAccessModule) ||
                                            (cc.moduleSlug === "emails" && canAccessDashboard) ||
                                            (cc.children?.length &&
                                              hasAccessToAnyChild(
                                                cc.children,
                                                `${item.slug}/${child.slug}/${cc.slug}`,
                                                canAccessModule,
                                                canAccessDashboard,
                                                isSuperAdmin,
                                              )),
                                        )
                                        .map((cc) => {
                                        if (cc.children?.length) {
                                          const isCcOpen = isNestedExpanded(cc);
                                          const CcIcon = cc.icon;
                                          return (
                                            <div key={cc.slug} className="space-y-0.5">
                                              {cc.href ? (
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleNested(cc)}
                                                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                                                    aria-label={isCcOpen ? "Recolher" : "Expandir"}
                                                  >
                                                    {isCcOpen ? (
                                                      <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                  </button>
                                                  <SidebarMenuLink
                                                    href={cc.href}
                                                    external={cc.external}
                                                    onNavigate={() => {
                                                      onNavClick();
                                                      setFlyoutSlug(null);
                                                    }}
                                                    className={cn(
                                                      "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
                                                      cc.href === activeBchHref
                                                        ? "dashboard-sidebar-active"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                    )}
                                                  >
                                                    {CcIcon && <CcIcon className="h-4 w-4 shrink-0" />}
                                                    <span className="truncate">{cc.label}</span>
                                                  </SidebarMenuLink>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => toggleNested(cc)}
                                                  className={cn(
                                                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                  )}
                                                >
                                                  {isCcOpen ? (
                                                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                                  ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                                  )}
                                                  {CcIcon && <CcIcon className="h-3.5 w-3.5 shrink-0" />}
                                                  <span>{cc.label}</span>
                                                </button>
                                              )}
                                              {isCcOpen ? (
                                                <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                                                  {cc.children
                                                    .filter(
                                                      (ccc) =>
                                                        canAccessMenuLeaf(
                                                          ccc,
                                                          `${item.slug}/${child.slug}/${cc.slug}`,
                                                          canAccessModule,
                                                        ) ||
                                                        (ccc.moduleSlug === "emails" && canAccessDashboard),
                                                    )
                                                    .map((ccc) => {
                                                      if (!ccc.href) return null;
                                                      return (
                                                        <SidebarMenuLink
                                                          key={ccc.slug}
                                                          href={ccc.href}
                                                          external={ccc.external}
                                                          onNavigate={() => {
                                                            onNavClick();
                                                            setFlyoutSlug(null);
                                                          }}
                                                          className={cn(
                                                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
                                                            ccc.href === activeBchHref
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
                                        const isChildActive =
                                          !cc.external && cc.href === activeBchHref;
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
                                              "flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
                                              isChildActive
                                                ? "dashboard-sidebar-active"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                            )}
                                          >
                                            {cc.icon && <cc.icon className="h-4 w-4 shrink-0" />}
                                            <span className="text-left leading-snug">{cc.label}</span>
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
                          const isChildActive =
                            !child.external && child.href === activeHubChildHref;
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
                                "flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
                                isChildActive
                                  ? "dashboard-sidebar-active"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span className="text-left leading-snug">{child.label}</span>
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
                        hasAccessToMenuItem(c, item.slug, canAccessModule, canAccessDashboard, isSuperAdmin),
                      )
                      .map((child) => {
                        if (child.children?.length) {
                          const hasAccess = hasAccessToAnyChild(
                            child.children,
                            `${item.slug}/${child.slug}`,
                            canAccessModule,
                            canAccessDashboard,
                            isSuperAdmin,
                          );
                          if (!hasAccess) return null;
                          const isSubOpen = isNestedExpanded(child);
                          return (
                            <div key={child.slug} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => toggleNestedChild(child)}
                                className={cn(
                                  "flex w-full shrink-0 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-200 dashboard-link-hover",
                                  "font-semibold leading-snug",
                                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                {isSubOpen ? (
                                  <ChevronDown className="h-4 w-4 shrink-0" aria-label="Recolher" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0" aria-label="Expandir" />
                                )}
                                <SidebarMenuIcon item={child} />
                                <span className="text-left leading-snug">{child.label}</span>
                              </button>
                              {isSubOpen && (
                                <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                  {(() => {
                                    const groupItems = collectMenuItemsWithHref(child.children);
                                    const activeNestedHref = pickMostSpecificActiveHref(
                                      groupItems,
                                      pathname,
                                      relHub,
                                      searchParams,
                                    );
                                    return child.children
                                      .filter(
                                        (cc) =>
                                          canAccessMenuLeaf(cc, `${item.slug}/${child.slug}`, canAccessModule) ||
                                          (cc.moduleSlug === "emails" && canAccessDashboard),
                                      )
                                      .map((cc) => {
                                        if (cc.children?.length) {
                                          const hasCcAccess = hasAccessToAnyChild(
                                            cc.children,
                                            `${item.slug}/${child.slug}/${cc.slug}`,
                                            canAccessModule,
                                            canAccessDashboard,
                                            isSuperAdmin,
                                          );
                                          if (!hasCcAccess) return null;
                                          const CcIcon = cc.icon;
                                          const isCcOpen = isNestedExpanded(cc);
                                          return (
                                            <div key={cc.slug} className="space-y-0.5">
                                              {cc.href ? (
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleNested(cc)}
                                                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                                                    aria-label={isCcOpen ? "Recolher" : "Expandir"}
                                                  >
                                                    {isCcOpen ? (
                                                      <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                  </button>
                                                  <SidebarMenuLink
                                                    href={cc.href}
                                                    external={cc.external}
                                                    onNavigate={onNavClick}
                                                    className={cn(
                                                      "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 dashboard-link-hover",
                                                      cc.href === activeNestedHref
                                                        ? "dashboard-sidebar-active"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                                    )}
                                                  >
                                                    {CcIcon && <CcIcon className="h-3.5 w-3.5 shrink-0" />}
                                                    <span>{cc.label}</span>
                                                  </SidebarMenuLink>
                                                </div>
                                              ) : (
                                              <button
                                                type="button"
                                                onClick={() => toggleNested(cc)}
                                                className={cn(
                                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 dashboard-link-hover",
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
                                              )}
                                              {isCcOpen ? (
                                                <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                                                  {cc.children
                                                    .filter(
                                                      (ccc) =>
                                                        canAccessMenuLeaf(
                                                          ccc,
                                                          `${item.slug}/${child.slug}/${cc.slug}`,
                                                          canAccessModule,
                                                        ) ||
                                                        (ccc.moduleSlug === "emails" && canAccessDashboard),
                                                    )
                                                    .map((ccc) => {
                                                      const isLeafActive =
                                                        !ccc.external && ccc.href === activeNestedHref;
                                                      return (
                                                        <SidebarMenuLink
                                                          key={ccc.slug}
                                                          href={ccc.href!}
                                                          external={ccc.external}
                                                          onNavigate={onNavClick}
                                                          className={cn(
                                                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
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
                                        const isChildActive =
                                          !cc.external && cc.href === activeNestedHref;
                                        return (
                                          <SidebarMenuLink
                                            key={cc.slug}
                                            href={cc.href}
                                            external={cc.external}
                                            onNavigate={onNavClick}
                                            className={cn(
                                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-200 dashboard-link-hover",
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
                        const isChildActive =
                          !child.external && child.href === activeHubChildHref;
                        const compact = "compactGroup" in child && (child as MenuItemConfig & { compactGroup?: string }).compactGroup;
                        return (
                          <SidebarMenuLink
                            key={child.slug}
                            href={child.href}
                            external={child.external}
                            onNavigate={onNavClick}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 text-sm font-medium transition-all duration-200 dashboard-link-hover",
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
              </div>,
            );
          }

          return null;
        })}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-border p-3",
          collapsed ? "flex justify-center" : "px-4",
        )}
      >
        <DashboardThemeToggle compact={collapsed} fullWidth={!collapsed} className={collapsed ? undefined : "w-full"} />
      </div>
    </div>
  );
}
