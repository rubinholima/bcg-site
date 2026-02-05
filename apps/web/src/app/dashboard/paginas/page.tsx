"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Home, Building2, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Page } from "@/types/page";
import type { Tenant } from "@/types/tenant";

export default function PaginasPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/pages", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch("/api/tenants", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ])
      .then(([pagesData, tenantsData]) => {
        if (!cancelled) {
          setPages(Array.isArray(pagesData) ? pagesData : []);
          setTenants(Array.isArray(tenantsData) ? tenantsData : []);
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
  }, []);

  const pageByTenantId = new Map(pages.map((p) => [p.tenantId, p]));

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar página");
    } finally {
      setCreating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Páginas</h1>
        <p className="text-muted-foreground">
          Escolha a página que deseja editar: Home (grupo) ou a página específica de cada empresa.
          Monte a página com módulos (Hero, Destaque, Texto, etc.).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Home (grupo master) */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Home</CardTitle>
            </div>
            <CardDescription>
              Página inicial do site (grupo master). Conteúdo modular com os mesmos tipos de módulo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/conteudo">
              <Button variant="outline" className="w-full">
                <Pencil className="mr-2 h-4 w-4" />
                Editar conteúdo
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Página por empresa */}
        {tenants.map((tenant) => {
          const page = pageByTenantId.get(tenant.id);
          return (
            <Card key={tenant.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {tenant.logoUrl ? (
                    <img
                      src={tenant.logoUrl}
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
                    ? "Página específica desta empresa. Edite módulos, aparência e textos."
                    : "Crie a página específica desta empresa e monte com módulos."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {page ? (
                  <Link href={`/dashboard/paginas/tenant/${tenant.id}/editar`}>
                    <Button variant="outline" className="w-full">
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar página
                    </Button>
                  </Link>
                ) : (
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
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tenants.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p>Nenhuma empresa cadastrada. Cadastre empresas para criar páginas específicas.</p>
            <Link href="/dashboard/empresas/new">
              <Button variant="outline" className="mt-4">
                Nova empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
