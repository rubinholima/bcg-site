"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";

interface ModulePermission {
  slug: string;
  name: string;
  sortOrder: number;
  company_admin: boolean;
  editor: boolean;
}

export default function ModulosPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<ModulePermission[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/403");
      return;
    }
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    fetch("/api/settings/modules", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar módulos");
        return res.json();
      })
      .then((data: ModulePermission[]) => {
        if (!cancelled) setModules(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const handleToggle = (slug: string, role: "company_admin" | "editor", value: boolean) => {
    setModules((prev) =>
      prev.map((m) =>
        m.slug === slug ? { ...m, [role]: value } : m
      )
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const permissions: Record<string, { company_admin: boolean; editor: boolean }> = {};
      for (const m of modules) {
        permissions[m.slug] = {
          company_admin: m.company_admin,
          editor: m.editor,
        };
      }
      const res = await fetch("/api/settings/modules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao salvar"));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!isSuperAdmin && modules.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Título da página */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Permissões dos Módulos</h1>
          <p className="mt-1 text-muted-foreground">
            Marque quais perfis podem acessar cada módulo. Super admin sempre tem acesso.
          </p>
        </div>
      </div>

      {/* Conteúdo alinhado abaixo do título (mesma coluna) */}
      <div className="space-y-4 pl-0 sm:pl-12">
        <Card>
          <CardHeader>
            <CardTitle>Módulos do dashboard</CardTitle>
            <CardDescription>
              Company Admin e Editor: marque para permitir que o perfil veja e use o módulo no menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-[220px] px-4 py-3 text-left font-medium">Módulo</th>
                      <th className="w-[200px] px-4 py-3 text-left font-medium">Company Admin pode acessar</th>
                      <th className="w-[180px] px-4 py-3 text-left font-medium">Editor pode acessar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((m) => (
                      <tr key={m.slug} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {MODULE_DISPLAY_NAMES[m.slug] ?? m.name}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={m.company_admin}
                              onChange={(e) =>
                                handleToggle(m.slug, "company_admin", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-muted-foreground">Sim</span>
                          </label>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={m.editor}
                              onChange={(e) =>
                                handleToggle(m.slug, "editor", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-muted-foreground">Sim</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 pt-4">
                {dirty && (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </Button>
                )}
                <Link href="/dashboard/configuracoes">
                  <Button variant="outline" disabled={saving}>
                    Voltar
                  </Button>
                </Link>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
