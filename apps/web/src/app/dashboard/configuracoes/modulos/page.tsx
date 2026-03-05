"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";
import {
  DASHBOARD_MENU,
  PLAYER_TABS,
  getUniqueModuleSlugs,
} from "@/lib/dashboard-menu.config";

interface ModulePermission {
  slug: string;
  name: string;
  sortOrder: number;
  company_admin: boolean;
  editor: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
}

/** Nó da árvore para exibição hierárquica. */
interface ModuleTreeNode {
  slug: string;
  label: string;
  path: string;
  depth: number;
  isGroup?: boolean;
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

  type RoleKey = "company_admin" | "editor" | "analista" | "diretoria" | "medico" | "psicologo";

  /** Monta árvore de módulos a partir do menu + abas do jogador. Mescla com permissões da API. */
  const moduleTree = useMemo(() => {
    const permMap = new Map(modules.map((m) => [m.slug, m]));
    const nodes: ModuleTreeNode[] = [];
    const seen = new Set<string>();

    function walk(items: typeof DASHBOARD_MENU, path: string, depth: number) {
      for (const item of items) {
        if (item.children) {
          walk(item.children, path ? `${path} › ${item.label}` : item.label, depth + 1);
        } else if (item.href && !item.external && !seen.has(item.moduleSlug)) {
          seen.add(item.moduleSlug);
          nodes.push({
            slug: item.moduleSlug,
            label: item.label,
            path: path ? `${path} › ${item.label}` : item.label,
            depth,
            isGroup: false,
          });
        }
      }
    }
    walk(DASHBOARD_MENU, "", 0);

    for (const tab of PLAYER_TABS) {
      if (tab.moduleSlug && !seen.has(tab.moduleSlug)) {
        seen.add(tab.moduleSlug);
        nodes.push({
          slug: tab.moduleSlug,
          label: tab.label,
          path: `Jogadores › ${tab.label}`,
          depth: 0,
          isGroup: false,
        });
      }
    }

    for (const slug of getUniqueModuleSlugs()) {
      if (!seen.has(slug) && permMap.has(slug)) {
        nodes.push({
          slug,
          label: MODULE_DISPLAY_NAMES[slug] ?? slug,
          path: slug,
          depth: 0,
          isGroup: false,
        });
      }
    }
    return nodes;
  }, [modules]);

  const displayModules = useMemo(() => {
    const permMap = new Map(modules.map((m) => [m.slug, m]));
    const slugs = getUniqueModuleSlugs();
    return slugs.map((slug) => {
      const existing = permMap.get(slug);
      const label = MODULE_DISPLAY_NAMES[slug] ?? moduleTree.find((n) => n.slug === slug)?.label ?? slug;
      return {
        slug,
        name: label,
        sortOrder: existing?.sortOrder ?? 0,
        company_admin: existing?.company_admin ?? false,
        editor: existing?.editor ?? false,
        analista: existing?.analista ?? false,
        diretoria: existing?.diretoria ?? false,
        medico: existing?.medico ?? false,
        psicologo: existing?.psicologo ?? false,
      };
    });
  }, [modules, moduleTree]);

  const handleToggle = (slug: string, role: RoleKey, value: boolean) => {
    setModules((prev) => {
      const found = prev.find((m) => m.slug === slug);
      if (found) {
        return prev.map((m) => (m.slug === slug ? { ...m, [role]: value } : m));
      }
      return [...prev, {
        slug, name: slug, sortOrder: 0,
        company_admin: false, editor: false, analista: false, diretoria: false, medico: false, psicologo: false,
        [role]: value,
      } as ModulePermission];
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const permissions: Record<
        string,
        { company_admin: boolean; editor: boolean; analista: boolean; diretoria: boolean; medico: boolean; psicologo: boolean }
      > = {};
      for (const m of displayModules) {
        const mod = modules.find((x) => x.slug === m.slug) ?? m;
        permissions[m.slug] = {
          company_admin: mod.company_admin,
          editor: mod.editor,
          analista: mod.analista,
          diretoria: mod.diretoria,
          medico: mod.medico,
          psicologo: mod.psicologo,
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
              Marque quais perfis podem acessar cada módulo. Super admin sempre tem acesso. Diretoria, Médico e Psicólogo são perfis específicos para abas dos jogadores.
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
                      <th className="w-[220px] px-4 py-3 text-left font-medium">Módulo / Caminho</th>
                      <th className="w-[110px] px-3 py-3 text-left font-medium">Company Admin</th>
                      <th className="w-[80px] px-3 py-3 text-left font-medium">Editor</th>
                      <th className="w-[80px] px-3 py-3 text-left font-medium">Analista</th>
                      <th className="w-[80px] px-3 py-3 text-left font-medium">Diretoria</th>
                      <th className="w-[80px] px-3 py-3 text-left font-medium">Médico</th>
                      <th className="w-[90px] px-3 py-3 text-left font-medium">Psicólogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayModules.map((m) => {
                      const path = moduleTree.find((n) => n.slug === m.slug)?.path;
                      return (
                        <tr key={m.slug} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <div className="font-medium">{MODULE_DISPLAY_NAMES[m.slug] ?? m.name}</div>
                            {path && path !== m.name && (
                              <div className="text-xs text-muted-foreground mt-0.5">{path}</div>
                            )}
                          </td>
                          {(["company_admin", "editor", "analista", "diretoria", "medico", "psicologo"] as const).map(
                            (role) => {
                              const mod = modules.find((x) => x.slug === m.slug) ?? m;
                              return (
                                <td key={role} className="px-3 py-3 align-middle">
                                  <label className="inline-flex cursor-pointer items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={mod[role]}
                                      onChange={(e) =>
                                        handleToggle(m.slug, role, e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-input"
                                    />
                                    <span className="text-muted-foreground text-xs">Sim</span>
                                  </label>
                                </td>
                              );
                            }
                          )}
                        </tr>
                      );
                    })}
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
