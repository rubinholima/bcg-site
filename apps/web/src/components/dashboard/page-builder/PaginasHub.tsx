"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  Copy,
  ExternalLink,
  Home,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  DashboardDeptHeader,
  DashboardDeptSearch,
  DashboardDeptTabs,
} from "@/components/dashboard/DashboardDeptHeader";
import { BCH_PUBLIC_PATH, BCH_SLUG, bchLogoSrc } from "@/lib/boston-city-hall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getPublicImageUrl } from "@/lib/media-url";
import { countMiddleModules } from "@/components/dashboard/page-builder";
import type { Page } from "@/types/page";
import type { Tenant } from "@/types/tenant";

interface EventItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  content?: { blocks?: unknown[] };
}

type HubTab = "all" | "home" | "clubs" | "companies" | "events";

function isClubKind(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  return k.includes("futebol") || k.includes("clube") || k.includes("football");
}

interface PaginasHubProps {
  pages: Page[];
  tenants: Tenant[];
  events: EventItem[];
  canAccessEventos: boolean;
  loading?: boolean;
  error: string | null;
  onError: (msg: string | null) => void;
  onPagesChange: (pages: Page[]) => void;
}

export function PaginasHub({
  pages,
  tenants,
  events,
  canAccessEventos,
  loading,
  error,
  onError,
  onPagesChange,
}: PaginasHubProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<HubTab>("all");
  const [creating, setCreating] = useState<string | null>(null);
  const [creatingFromCopy, setCreatingFromCopy] = useState<string | null>(null);
  const [replaceFromCopy, setReplaceFromCopy] = useState<string | null>(null);
  const [copySourceByTenant, setCopySourceByTenant] = useState<Record<string, string>>({});
  const [replaceSourceByTenant, setReplaceSourceByTenant] = useState<Record<string, string>>({});
  const [replaceModal, setReplaceModal] = useState<{
    tenantId: string;
    sourcePageId: string;
    tenantName: string;
    sourceName: string;
  } | null>(null);

  const pageByTenantId = useMemo(() => new Map(pages.map((p) => [p.tenantId, p])), [pages]);

  const { clubs, companies } = useMemo(() => {
    const c: Tenant[] = [];
    const co: Tenant[] = [];
    for (const t of tenants) {
      if (isClubKind(t.kind?.name)) c.push(t);
      else co.push(t);
    }
    c.sort((a, b) => a.name.localeCompare(b.name));
    co.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return { clubs: c, companies: co.filter((t) => t.slug !== BCH_SLUG) };
  }, [tenants]);

  const bchTenant = useMemo(
    () => tenants.find((t) => t.slug === BCH_SLUG) ?? null,
    [tenants],
  );

  const q = search.trim().toLowerCase();

  const filterName = (name: string) => !q || name.toLowerCase().includes(q);

  const stats = useMemo(() => {
    const withPage = pages.length;
    const pending = tenants.filter((t) => !pageByTenantId.has(t.id)).length;
    const eventWithContent = events.filter((e) => Array.isArray(e.content?.blocks) && e.content!.blocks!.length > 0).length;
    return { withPage, pending, eventWithContent, totalTenants: tenants.length };
  }, [pages, tenants, events, pageByTenantId]);

  const getSourcePagesForTenant = (tenant: Tenant): Page[] => {
    const tenantIsClub = isClubKind(tenant.kind?.name);
    return pages.filter((p) => {
      if (p.tenantId === tenant.id) return false;
      const srcTenant = tenants.find((t) => t.id === p.tenantId);
      if (!srcTenant) return false;
      return isClubKind(srcTenant.kind?.name) === tenantIsClub;
    });
  };

  const handleCreatePage = async (tenantId: string) => {
    setCreating(tenantId);
    onError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao criar página");
      }
      const page = (await res.json()) as Page;
      onPagesChange([...pages, page]);
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro ao criar página");
    } finally {
      setCreating(null);
    }
  };

  const handleCreateFromCopy = async (tenantId: string, sourcePageId: string) => {
    setCreatingFromCopy(tenantId);
    onError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, sourcePageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao criar página");
      }
      const page = (await res.json()) as Page;
      onPagesChange([...pages, page]);
      setCopySourceByTenant((prev) => ({ ...prev, [tenantId]: "" }));
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro ao criar página");
    } finally {
      setCreatingFromCopy(null);
    }
  };

  const handleReplaceFromCopy = async (tenantId: string, sourcePageId: string) => {
    const targetPage = pageByTenantId.get(tenantId);
    if (!targetPage) return;
    setReplaceFromCopy(tenantId);
    onError(null);
    try {
      const sourcePage = pages.find((p) => p.id === sourcePageId);
      if (!sourcePage?.content?.blocks) throw new Error("Página de origem sem conteúdo");
      const copiedBlocks = sourcePage.content.blocks.map((b) => ({ ...b, id: crypto.randomUUID() }));
      const res = await fetch(`/api/pages/${targetPage.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { theme: sourcePage.content.theme, blocks: copiedBlocks } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao substituir módulos");
      }
      const updated = (await res.json()) as Page;
      onPagesChange(pages.map((p) => (p.id === targetPage.id ? updated : p)));
      setReplaceSourceByTenant((prev) => ({ ...prev, [tenantId]: "" }));
      setReplaceModal(null);
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro ao substituir módulos");
      setReplaceModal(null);
    } finally {
      setReplaceFromCopy(null);
    }
  };

  const renderTenantCard = (tenant: Tenant) => {
    const page = pageByTenantId.get(tenant.id);
    const moduleCount = page?.content?.blocks ? countMiddleModules(page.content.blocks) : 0;
    const sources = getSourcePagesForTenant(tenant);
    const isBch = tenant.slug === BCH_SLUG;
    const logoSrc = isBch
      ? bchLogoSrc(tenant.logoUrl)
      : tenant.logoUrl
        ? getPublicImageUrl(tenant.logoUrl)
        : null;

    return (
      <Card
        key={tenant.id}
        id={isBch ? "boston-city-hall" : undefined}
        className={`overflow-hidden border-border/80 transition-colors hover:border-violet-500/30${isBch ? " border-violet-500/25" : ""}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="h-9 w-9 rounded-lg border object-contain"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{tenant.name}</CardTitle>
                <CardDescription className="text-xs">
                  {isBch
                    ? page
                      ? `Venue · ${moduleCount} módulo${moduleCount === 1 ? "" : "s"}`
                      : "Venue — espaços, agenda e FAQ"
                    : page
                      ? `${moduleCount} módulo${moduleCount === 1 ? "" : "s"}`
                      : "Sem página — criar agora"}
                </CardDescription>
              </div>
            </div>
            {page ? (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                Ativa
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                Pendente
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {page ? (
            <>
              <Link href={`/dashboard/paginas/tenant/${tenant.id}/editar`} className="block">
                <Button variant="default" className="min-h-[44px] w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Link href={isBch ? BCH_PUBLIC_PATH : `/portfolio/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="min-h-[44px] w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver site
                </Button>
              </Link>
              {sources.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-2">
                  <p className="text-[11px] text-muted-foreground">Copiar layout de outra página:</p>
                  <div className="flex gap-2">
                    <Select
                      value={replaceSourceByTenant[tenant.id] ?? ""}
                      onValueChange={(v) => setReplaceSourceByTenant((prev) => ({ ...prev, [tenant.id]: v }))}
                    >
                      <SelectTrigger className="min-h-[44px] flex-1">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((p) => {
                          const t = tenants.find((x) => x.id === p.tenantId);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {t?.name ?? "Página"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!replaceSourceByTenant[tenant.id] || replaceFromCopy === tenant.id}
                      onClick={() => {
                        const src = replaceSourceByTenant[tenant.id];
                        if (!src) return;
                        const sourcePage = pages.find((p) => p.id === src);
                        const sourceTenant = tenants.find((t) => t.id === sourcePage?.tenantId);
                        setReplaceModal({
                          tenantId: tenant.id,
                          sourcePageId: src,
                          tenantName: tenant.name,
                          sourceName: sourceTenant?.name ?? "Página",
                        });
                      }}
                    >
                      {replaceFromCopy === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Button
                className="min-h-[44px] w-full"
                disabled={creating === tenant.id}
                onClick={() => handleCreatePage(tenant.id)}
              >
                {creating === tenant.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Criar página
              </Button>
              {sources.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-2">
                  <p className="text-[11px] text-muted-foreground">Ou começar copiando de:</p>
                  <div className="flex gap-2">
                    <Select
                      value={copySourceByTenant[tenant.id] ?? ""}
                      onValueChange={(v) => setCopySourceByTenant((prev) => ({ ...prev, [tenant.id]: v }))}
                    >
                      <SelectTrigger className="min-h-[44px] flex-1">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((p) => {
                          const t = tenants.find((x) => x.id === p.tenantId);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {t?.name ?? "Página"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={!copySourceByTenant[tenant.id] || creatingFromCopy === tenant.id}
                      onClick={() => {
                        const src = copySourceByTenant[tenant.id];
                        if (src) handleCreateFromCopy(tenant.id, src);
                      }}
                    >
                      {creatingFromCopy === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const tabs: { id: HubTab; label: string; icon: typeof Home }[] = [
    { id: "all", label: "Todas", icon: Layers },
    { id: "home", label: "Home", icon: Home },
    { id: "clubs", label: "Clubes", icon: Trophy },
    { id: "companies", label: "Empresas", icon: Briefcase },
    ...(canAccessEventos || bchTenant ? [{ id: "events" as const, label: "Eventos", icon: Calendar }] : []),
  ];

  const filteredClubs = clubs.filter((t) => filterName(t.name));
  const filteredCompanies = companies.filter((t) => filterName(t.name));
  const filteredEvents = events.filter((e) => filterName(e.name));
  const showBch =
    bchTenant && filterName(bchTenant.name) && (tab === "all" || tab === "events");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardDeptHeader
        section="Construção Web"
        sectionIcon={Sparkles}
        title="Suas páginas"
        description="Monte sites profissionais com módulos arrastáveis, fontes, cores e conteúdo PT/EN. Copie layouts entre clubes ou empresas do mesmo tipo."
        stats={[
          { value: stats.withPage, label: "Páginas" },
          { value: stats.pending, label: "Pendentes" },
          { value: stats.totalTenants, label: "Tenants" },
          ...(canAccessEventos ? [{ value: stats.eventWithContent, label: "Eventos" }] : []),
        ]}
        toolbar={
          <>
            <DashboardDeptSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar clube, empresa ou evento…"
            />
            <DashboardDeptTabs tabs={tabs} active={tab} onChange={setTab} />
          </>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {(tab === "all" || tab === "home") && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Home do grupo</h2>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Página inicial — Boston City Group</p>
                  <p className="text-xs text-muted-foreground">Site principal do grupo</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/paginas/group-home/editar">
                  <Button className="min-h-[44px]">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </Link>
                <Link href="/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="min-h-[44px]">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver site
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {(tab === "all" || tab === "clubs") && filteredClubs.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-500" />
            Clubes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredClubs.map(renderTenantCard)}</div>
        </section>
      )}

      {(tab === "all" || tab === "companies") && filteredCompanies.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Briefcase className="h-4 w-4 text-emerald-500" />
            Empresas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredCompanies.map(renderTenantCard)}</div>
        </section>
      )}

      {canAccessEventos && (tab === "all" || tab === "events") && filteredEvents.length > 0 && (
        <section id="eventos" className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-4 w-4 text-violet-500" />
            Eventos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => {
              const hasContent = Array.isArray(ev.content?.blocks) && ev.content.blocks.length > 0;
              const moduleCount = hasContent ? countMiddleModules(ev.content!.blocks as never[]) : 0;
              return (
                <Card key={ev.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{ev.name}</CardTitle>
                    <CardDescription>
                      {hasContent ? `${moduleCount} módulos` : "Landing ainda vazia"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href={`/dashboard/paginas/evento/${ev.id}/editar`} className="block">
                      <Button variant="default" className="min-h-[44px] w-full">
                        <Pencil className="mr-2 h-4 w-4" />
                        {hasContent ? "Editar" : "Criar página"}
                      </Button>
                    </Link>
                    <Link href={`/eventos/${ev.slug}`} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="min-h-[44px] w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver site
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {showBch && (
        <section id="boston-city-hall" className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <img src={bchLogoSrc(bchTenant!.logoUrl)} alt="" className="h-5 w-5 rounded-full object-contain" />
            Boston City Hall
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{renderTenantCard(bchTenant!)}</div>
        </section>
      )}

      {tenants.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>Nenhuma empresa cadastrada.</p>
            <Link href="/dashboard/empresas/new">
              <Button variant="outline" className="mt-4 min-h-[44px]">
                Nova empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!replaceModal} onOpenChange={(open) => !open && setReplaceModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir todos os módulos?</AlertDialogTitle>
            <AlertDialogDescription>
              Os módulos de <strong>{replaceModal?.tenantName}</strong> serão trocados pelos de{" "}
              <strong>{replaceModal?.sourceName}</strong>. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!replaceFromCopy}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!!replaceFromCopy}
              onClick={() => {
                if (replaceModal) handleReplaceFromCopy(replaceModal.tenantId, replaceModal.sourcePageId);
              }}
            >
              {replaceFromCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Substituir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
