"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Newspaper, Pencil, Building2, Home, ExternalLink, Loader2, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Page } from "@/types/page";
import type { Tenant } from "@/types/tenant";

type PageWithNoticias = Page & { tenant?: Tenant | null; hasNoticias: boolean; rssUrl?: string };

export default function NoticiasPage() {
  const [pages, setPages] = useState<PageWithNoticias[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/pages", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/tenants", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([pagesData, tenantsData]) => {
        if (cancelled) return;
        const pagesArr = Array.isArray(pagesData) ? pagesData : [];
        const tenantsArr = Array.isArray(tenantsData) ? tenantsData : [];
        const tenantMap = new Map(tenantsArr.map((t: Tenant) => [t.id, t]));

        const withNoticias: PageWithNoticias[] = pagesArr.map((p: Page) => {
          const blocks = p.content?.blocks ?? [];
          const noticiasBlock = blocks.find((b) => b.type === "noticias");
          const rssUrl = noticiasBlock?.config?.noticiasRssUrl as string | undefined;
          return {
            ...p,
            tenant: p.tenantId ? tenantMap.get(p.tenantId) ?? null : null,
            hasNoticias: !!noticiasBlock,
            rssUrl: rssUrl?.trim() || undefined,
          };
        });

        setPages(withNoticias);
        setTenants(tenantsArr);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const editHref = (p: PageWithNoticias) =>
    p.tenantId
      ? `/dashboard/paginas/tenant/${p.tenantId}/editar`
      : "/dashboard/paginas/group-home/editar";
  const isGroupHome = (p: PageWithNoticias) => !p.tenantId;

  const portfolioHref = (p: PageWithNoticias) => {
    const slug = p.tenant?.slug;
    if (!slug) return null;
    return `/portfolio/${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notícias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o feed de notícias em cada página. Use RSS (Google News, Instagram via RSS.app) ou lista manual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Como configurar
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>Clique em &quot;Editar página&quot; da empresa ou clube desejado.</li>
              <li>Adicione o módulo &quot;Notícias&quot; (dropdown &quot;Adicionar módulo&quot;).</li>
              <li>Em &quot;Feed de notícias&quot;, escolha RSS e cole a URL do feed.</li>
              <li>Crie o feed em <a href="https://rss.app" target="_blank" rel="noopener noreferrer" className="underline text-primary">rss.app</a> — Google News ou Instagram do clube.</li>
            </ol>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {page.tenant?.logoUrl ? (
                  <img
                    src={page.tenant.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded object-contain border"
                  />
                ) : (
                  page.tenantId ? (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Home className="h-5 w-5 text-muted-foreground" />
                  )
                )}
                <CardTitle className="text-lg">
                  {page.tenant?.name ?? (isGroupHome(page) ? "Home" : "Página")}
                </CardTitle>
              </div>
              <CardDescription>
                {page.hasNoticias ? (
                  page.rssUrl ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Newspaper className="h-4 w-4" />
                      Feed RSS configurado
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Módulo adicionado — configure a URL do RSS
                    </span>
                  )
                ) : (
                  "Módulo Notícias não adicionado"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href={editHref(page)}>
                <Button variant="outline" className="w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar página
                </Button>
              </Link>
              {portfolioHref(page) && (
                <Link href={portfolioHref(page)!} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver página pública
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pages.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Newspaper className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>Nenhuma página encontrada. Crie páginas em Páginas primeiro.</p>
            <Link href="/dashboard/paginas">
              <Button variant="outline" className="mt-4">
                Ir para Páginas
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
