"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Calendar, Copy, ExternalLink, Home, Loader2, Pencil, Plus, Trophy } from "lucide-react";
import { BCH_PUBLIC_PATH, BCH_SLUG, bchLogoSrc } from "@/lib/boston-city-hall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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

/** Clube se o tipo contiver futebol/clube/football. */
function isClubKind(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  return k.includes("futebol") || k.includes("clube") || k.includes("football");
}

function sortTenantsByKind(tenants: Tenant[]): { clubs: Tenant[]; companies: Tenant[] } {
  const clubs: Tenant[] = [];
  const companies: Tenant[] = [];
  for (const t of tenants) {
    if (isClubKind(t.kind?.name)) clubs.push(t);
    else companies.push(t);
  }
  clubs.sort((a, b) => a.name.localeCompare(b.name));
  companies.sort((a, b) => a.name.localeCompare(b.name));
  return { clubs, companies };
}

export default function PaginasPage() {
  const router = useRouter();
  const { canAccessModule } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [creatingFromCopy, setCreatingFromCopy] = useState<string | null>(null);
  const [replaceFromCopy, setReplaceFromCopy] = useState<string | null>(null);
  const [copySourceByTenant, setCopySourceByTenant] = useState<Record<string, string>>({});
  const [replaceSourceByTenant, setReplaceSourceByTenant] = useState<Record<string, string>>({});
  const [replaceModal, setReplaceModal] = useState<{ tenantId: string; sourcePageId: string; tenantName: string; sourceName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccessEventos = canAccessModule("eventos");

  useEffect(() => {
    let cancelled = false;
    const fetches: Promise<unknown>[] = [
      fetch("/api/pages", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch("/api/tenants", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ];
    if (canAccessEventos) {
      fetches.push(
        api.get<EventItem[]>("/events").then((r) => (Array.isArray(r.data) ? r.data : []))
      );
    }
    Promise.all(fetches)
      .then((results) => {
        if (!cancelled) {
          setPages(Array.isArray(results[0]) ? results[0] : []);
          setTenants(Array.isArray(results[1]) ? results[1] : []);
          if (canAccessEventos && results[2] !== undefined) {
            const evs = results[2] as EventItem[];
            setEvents(Array.isArray(evs) ? evs : []);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar páginas e empresas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessEventos]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    const hash = window.location.hash.replace("#", "");
    if (hash === "eventos" || hash === "boston-city-hall") {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading]);

  const pageByTenantId = new Map(pages.map((p) => [p.tenantId, p]));

  /** Páginas que podem ser usadas como origem para copiar (mesmo tipo: clube↔clube, empresa↔empresa). */
  const getSourcePagesForTenant = (tenant: Tenant): Page[] => {
    const tenantIsClub = isClubKind(tenant.kind?.name);
    return pages.filter((p) => {
      if (p.tenantId === tenant.id) return false;
      const srcTenant = tenants.find((t) => t.id === p.tenantId);
      if (!srcTenant) return false;
      const srcIsClub = isClubKind(srcTenant.kind?.name);
      return tenantIsClub === srcIsClub;
    });
  };

  const handleCreatePage = async (tenantId: string) => {
    setCreating(tenantId);
    setError(null);
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
      setPages((prev) => [...prev, page]);
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar página");
    } finally {
      setCreating(null);
    }
  };

  const handleCreateFromCopy = async (tenantId: string, sourcePageId: string) => {
    setCreatingFromCopy(tenantId);
    setError(null);
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
      setPages((prev) => [...prev, page]);
      setCopySourceByTenant((prev) => ({ ...prev, [tenantId]: "" }));
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar página");
    } finally {
      setCreatingFromCopy(null);
    }
  };

  const handleReplaceFromCopy = async (tenantId: string, sourcePageId: string) => {
    const targetPage = pageByTenantId.get(tenantId);
    if (!targetPage) return;
    setReplaceFromCopy(tenantId);
    setError(null);
    try {
      const sourcePage = pages.find((p) => p.id === sourcePageId);
      if (!sourcePage?.content?.blocks) throw new Error("Página de origem sem conteúdo");
      const copiedBlocks = sourcePage.content.blocks.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
      }));
      const res = await fetch(`/api/pages/${targetPage.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            theme: sourcePage.content.theme,
            blocks: copiedBlocks,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao substituir módulos");
      }
      const updated = (await res.json()) as Page;
      setPages((prev) => prev.map((p) => (p.id === targetPage.id ? updated : p)));
      setReplaceSourceByTenant((prev) => ({ ...prev, [tenantId]: "" }));
      setReplaceModal(null);
      router.push(`/dashboard/paginas/tenant/${tenantId}/editar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao substituir módulos");
      setReplaceModal(null);
    } finally {
      setReplaceFromCopy(null);
    }
  };

  const openReplaceModal = (tenantId: string) => {
    const src = replaceSourceByTenant[tenantId];
    if (!src) return;
    const tenant = tenants.find((t) => t.id === tenantId);
    const sourcePage = pages.find((p) => p.id === src);
    const sourceTenant = tenants.find((t) => t.id === sourcePage?.tenantId);
    setReplaceModal({
      tenantId,
      sourcePageId: src,
      tenantName: tenant?.name ?? "Página",
      sourceName: sourceTenant?.name ?? sourcePage?.tenant?.name ?? "Página",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { clubs, companies: companiesAll } = sortTenantsByKind(tenants);
  const bchTenant = tenants.find((t) => t.slug === BCH_SLUG) ?? null;
  const bchPage = bchTenant ? pageByTenantId.get(bchTenant.id) : undefined;
  const companies = companiesAll.filter((t) => t.slug !== BCH_SLUG);

  const renderTenantCard = (tenant: Tenant) => {
    const page = pageByTenantId.get(tenant.id);
    return (
      <Card key={tenant.id}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {tenant.logoUrl ? (
              <img
                src={getPublicImageUrl(tenant.logoUrl)}
                alt=""
                className="h-8 w-8 rounded object-contain border"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">{tenant.name}</CardTitle>
          </div>
          <CardDescription>
            {page
              ? "Página específica. Edite módulos, aparência e textos."
              : "Crie a página e monte com módulos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {page ? (
            <div className="space-y-3">
              <Link href={`/dashboard/paginas/tenant/${tenant.id}/editar`} className="block">
                <Button variant="outline" className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar página
                </Button>
              </Link>
              {getSourcePagesForTenant(tenant).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">
                    Copiar módulos de outra página:
                  </span>
                  <div className="flex gap-2">
                    <Select
                      value={replaceSourceByTenant[tenant.id] ?? ""}
                      onValueChange={(v) =>
                        setReplaceSourceByTenant((prev) => ({
                          ...prev,
                          [tenant.id]: v,
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione uma página" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSourcePagesForTenant(tenant).map((p) => {
                          const t = tenants.find((x) => x.id === p.tenantId);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {t?.name ?? p.tenant?.name ?? "Página"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        !replaceSourceByTenant[tenant.id] ||
                        replaceFromCopy === tenant.id
                      }
                      onClick={() => openReplaceModal(tenant.id)}
                    >
                      {replaceFromCopy === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
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
              {getSourcePagesForTenant(tenant).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">
                    ou copiar módulos de:
                  </span>
                  <div className="flex gap-2">
                    <Select
                      value={copySourceByTenant[tenant.id] ?? ""}
                      onValueChange={(v) =>
                        setCopySourceByTenant((prev) => ({
                          ...prev,
                          [tenant.id]: v,
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione uma página" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSourcePagesForTenant(tenant).map((p) => {
                          const t = tenants.find((x) => x.id === p.tenantId);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {t?.name ?? p.tenant?.name ?? "Página"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={
                        !copySourceByTenant[tenant.id] ||
                        creatingFromCopy === tenant.id
                      }
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
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Páginas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite a Home (grupo) ou a página de cada empresa/clube. Monte com módulos: Hero, Destaques, Texto, etc.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Home em destaque */}
      <div>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Home</CardTitle>
            </div>
            <CardDescription>
              Página inicial do site (grupo master). Conteúdo modular com os mesmos tipos de módulo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/paginas/group-home/editar">
              <Button variant="outline" className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Editar página
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Clubes */}
      {clubs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-wider">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
              <Trophy className="h-4 w-4 text-amber-500" />
            </span>
            Clubes
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clubs.map(renderTenantCard)}
          </div>
        </div>
      )}

      {/* Empresas */}
      {companies.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border">
          <h2 className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-wider">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Briefcase className="h-4 w-4 text-emerald-500" />
            </span>
            Empresas
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map(renderTenantCard)}
          </div>
        </div>
      )}

      {/* Eventos — editar páginas (cadastro em Eventos) */}
      {canAccessEventos && events.length > 0 && (
        <div id="eventos" className="space-y-4 pt-6 border-t border-border">
          <h2 className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-wider">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
              <Calendar className="h-4 w-4 text-violet-500" />
            </span>
            Eventos — editar páginas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre eventos em <Link href="/dashboard/eventos" className="text-primary hover:underline">Eventos</Link>. Aqui você edita a landing page modular de cada um.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const hasContent = Array.isArray(ev.content?.blocks) && ev.content.blocks.length > 0;
              return (
                <Card key={ev.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      {ev.logoUrl ? (
                        <img
                          src={getPublicImageUrl(ev.logoUrl)}
                          alt=""
                          className="h-8 w-8 rounded object-contain border"
                        />
                      ) : (
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{ev.name}</CardTitle>
                    </div>
                    <CardDescription>
                      {hasContent ? "Cabeçalho, rodapé, módulos." : "Crie a página com módulos."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/dashboard/paginas/evento/${ev.id}/editar`} className="block">
                      <Button variant="outline" className="w-full">
                        {hasContent ? (
                          <>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar página
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Criar página
                          </>
                        )}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Boston City Hall — venue (abaixo de Eventos) */}
      {canAccessEventos && bchTenant && (
        <div id="boston-city-hall" className="space-y-4 pt-6 border-t border-border">
          <h2 className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-wider">
            <img
              src={bchLogoSrc(bchTenant.logoUrl)}
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
            />
            Boston City Hall
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Página pública</CardTitle>
                <CardDescription>
                  Site do venue — espaços, agenda, solicitação de evento e FAQ.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {bchPage ? (
                  <>
                    <Link href={`/dashboard/paginas/tenant/${bchTenant.id}/editar`} className="block">
                      <Button variant="outline" className="w-full">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar página
                      </Button>
                    </Link>
                    <Link href={BCH_PUBLIC_PATH} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="secondary" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver site público
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={creating === bchTenant.id}
                    onClick={() => handleCreatePage(bchTenant.id)}
                  >
                    {creating === bchTenant.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Criar página
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tenants.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>Nenhuma empresa ou clube cadastrado. Cadastre em Empresas para criar páginas.</p>
            <Link href="/dashboard/empresas/new">
              <Button variant="outline" className="mt-4">
                Nova empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmação: substituir módulos */}
      <AlertDialog open={!!replaceModal} onOpenChange={(open) => !open && setReplaceModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir todos os módulos?</AlertDialogTitle>
            <AlertDialogDescription className="text-amber-600 dark:text-amber-400">
              Atenção: isso substituirá todos os módulos atuais da página de{" "}
              <strong>{replaceModal?.tenantName}</strong> pelos módulos de{" "}
              <strong>{replaceModal?.sourceName}</strong>. A ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!replaceFromCopy}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={!!replaceFromCopy}
              onClick={(e) => {
                e.preventDefault();
                if (replaceModal)
                  handleReplaceFromCopy(replaceModal.tenantId, replaceModal.sourcePageId);
              }}
            >
              {replaceFromCopy === replaceModal?.tenantId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Substituir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
