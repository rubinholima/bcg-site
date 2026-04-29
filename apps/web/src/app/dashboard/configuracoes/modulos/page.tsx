"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES, DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import {
  DASHBOARD_MENU,
  PLAYER_TABS,
  getUniqueModuleSlugs,
  type MenuItemConfig,
} from "@/lib/dashboard-menu.config";
import { getAreaMeta, sortAreaKeys } from "@/lib/module-functional-areas";

interface ModulePermission {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea?: string;
  company_admin: boolean;
  editor: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
}

interface DisplayRow extends Omit<ModulePermission, "functionalArea"> {
  functionalArea: string;
  /** Caminho amigável no menu (breadcrumb). */
  path: string;
}

interface AuditEntry {
  id: string;
  createdAt: string;
  actorSub: string;
  actorEmail: string | null;
  changeCount: number;
}

interface ModuleTreeNode {
  slug: string;
  label: string;
  path: string;
  depth: number;
}

/** Nó da árvore para ordem igual ao menu. */
const ROLE_KEYS = [
  "company_admin",
  "editor",
  "analista",
  "diretoria",
  "medico",
  "psicologo",
] as const;

type RoleKey = (typeof ROLE_KEYS)[number];

const ROLE_LABELS: Record<RoleKey, { short: string; hint: string }> = {
  company_admin: {
    short: "Company Admin",
    hint: "Administrador do tenant / clube; aceso amplo sujeito aos módulos marcados.",
  },
  editor: {
    short: "Editor",
    hint: "Produção de conteúdo e cadastros do dia a dia quando liberado.",
  },
  analista: {
    short: "Analista",
    hint: "Análises e relatórios operacionais (escopo habitualmente mais restrito).",
  },
  diretoria: {
    short: "Diretoria",
    hint: "Dados sensíveis dos atletas e avaliações (área institucional).",
  },
  medico: {
    short: "Médico",
    hint: "Histórico e dados de saúde — tratar conforme LGPD.",
  },
  psicologo: {
    short: "Psicólogo",
    hint: "Avaliações psicológicas e relacionadas (sigilo profissional).",
  },
};

export default function ModulosPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [modules, setModules] = useState<ModulePermission[]>([]);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/403");
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

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    fetch("/api/settings/modules/audit", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries?: AuditEntry[] } | null) => {
        if (!cancelled && data?.entries) setAuditEntries(data.entries);
      })
      .catch(() => {
        /* auditoria opcional */
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  /** Ordem igual à sidebar/menu. */
  const moduleTree = useMemo(() => {
    const nodes: ModuleTreeNode[] = [];
    const seen = new Set<string>();

    function walk(items: MenuItemConfig[], path: string, depth: number) {
      for (const item of items) {
        if (item.children?.length) {
          const parentPath = path ? `${path} › ${item.label}` : item.label;
          walk(item.children, parentPath, depth + 1);
        } else if (item.href && !item.external && !seen.has(item.moduleSlug)) {
          seen.add(item.moduleSlug);
          nodes.push({
            slug: item.moduleSlug,
            label: item.label,
            path: path ? `${path} › ${item.label}` : item.label,
            depth,
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
          path: `${DASHBOARD_LABELS.atletas} › ${tab.label}`,
          depth: 0,
        });
      }
    }

    const permMap = new Map(modules.map((m) => [m.slug, m]));
    const allSlugs = getUniqueModuleSlugs();
    for (const slug of allSlugs) {
      if (!seen.has(slug) && permMap.has(slug)) {
        seen.add(slug);
        nodes.push({
          slug,
          label: MODULE_DISPLAY_NAMES[slug] ?? slug,
          path: slug,
          depth: 0,
        });
      }
    }
    return nodes;
  }, [modules]);

  const displayModules: DisplayRow[] = useMemo(() => {
    const permMap = new Map(modules.map((m) => [m.slug, m]));
    return moduleTree.map((node) => {
      const existing = permMap.get(node.slug);
      return {
        slug: node.slug,
        name: MODULE_DISPLAY_NAMES[node.slug] ?? node.label,
        path: node.path,
        sortOrder: existing?.sortOrder ?? 0,
        functionalArea: existing?.functionalArea ?? "outros",
        company_admin: existing?.company_admin ?? false,
        editor: existing?.editor ?? false,
        analista: existing?.analista ?? false,
        diretoria: existing?.diretoria ?? false,
        medico: existing?.medico ?? false,
        psicologo: existing?.psicologo ?? false,
      };
    });
  }, [modules, moduleTree]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayModules;
    return displayModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q),
    );
  }, [displayModules, search]);

  /** Agrupa por área funcional (API / banco). */
  const areasWithModules = useMemo(() => {
    const map = new Map<string, DisplayRow[]>();
    for (const m of filteredRows) {
      const a = m.functionalArea || "outros";
      if (!map.has(a)) map.set(a, []);
      map.get(a)!.push(m);
    }
    const ordered = sortAreaKeys([...map.keys()]);
    return ordered.map((area) => ({
      area,
      meta: getAreaMeta(area),
      modules: map.get(area) ?? [],
    }));
  }, [filteredRows]);

  /** Marca/desmarca um perfil em todos os módulos visíveis desta área. */
  const handleBulkArea = useCallback((areaKey: string, role: RoleKey, value: boolean) => {
    const slugs = filteredRows
      .filter((r) => (r.functionalArea || "outros") === areaKey)
      .map((r) => r.slug);
    if (slugs.length === 0) return;

    setModules((prev) => {
      const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
      for (const slug of slugs) {
        const d = filteredRows.find((r) => r.slug === slug);
        if (!d) continue;
        const existing = bySlug.get(slug);
        bySlug.set(slug, {
          slug,
          name: MODULE_DISPLAY_NAMES[slug] ?? d.name,
          sortOrder: d.sortOrder,
          functionalArea: d.functionalArea,
          company_admin: existing?.company_admin ?? d.company_admin,
          editor: existing?.editor ?? d.editor,
          analista: existing?.analista ?? d.analista,
          diretoria: existing?.diretoria ?? d.diretoria,
          medico: existing?.medico ?? d.medico,
          psicologo: existing?.psicologo ?? d.psicologo,
          [role]: value,
        });
      }
      return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    setDirty(true);
    setSaveBanner(null);
  }, [filteredRows]);

  const handleToggle = (slug: string, role: RoleKey, value: boolean) => {
    setModules((prev) => {
      const found = prev.find((m) => m.slug === slug);
      const dm = displayModules.find((x) => x.slug === slug);
      if (found) {
        return prev.map((m) => (m.slug === slug ? { ...m, [role]: value } : m));
      }
      return [
        ...prev,
        {
          slug,
          name: MODULE_DISPLAY_NAMES[slug] ?? dm?.name ?? slug,
          sortOrder: dm?.sortOrder ?? 0,
          functionalArea: dm?.functionalArea ?? "outros",
          company_admin: false,
          editor: false,
          analista: false,
          diretoria: false,
          medico: false,
          psicologo: false,
          [role]: value,
        } satisfies ModulePermission,
      ];
    });
    setDirty(true);
    setSaveBanner(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveBanner(null);
    try {
      const permissions: Record<
        string,
        {
          company_admin: boolean;
          editor: boolean;
          analista: boolean;
          diretoria: boolean;
          medico: boolean;
          psicologo: boolean;
        }
      > = {};
      for (const m of displayModules) {
        const mod = modules.find((x) => x.slug === m.slug);
        permissions[m.slug] = {
          company_admin: mod?.company_admin ?? m.company_admin,
          editor: mod?.editor ?? m.editor,
          analista: mod?.analista ?? m.analista,
          diretoria: mod?.diretoria ?? m.diretoria,
          medico: mod?.medico ?? m.medico,
          psicologo: mod?.psicologo ?? m.psicologo,
        };
      }
      const res = await fetch("/api/settings/modules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao salvar"));
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; changedCells?: number };
      setDirty(false);
      if (typeof data.changedCells === "number") {
        if (data.changedCells > 0) {
          setSaveBanner(`Alterações gravadas (${data.changedCells} células na matriz). Registro em auditoria.`);
        } else {
          setSaveBanner("Nenhuma alteração efetiva — valores já iguais ao servidor.");
        }
      } else setSaveBanner("Alterações gravadas.");
      const aud = await fetch("/api/settings/modules/audit", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (aud?.entries) setAuditEntries(aud.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!saveBanner) return;
    const t = setTimeout(() => setSaveBanner(null), 8000);
    return () => clearTimeout(t);
  }, [saveBanner]);

  if (authLoading || (!isSuperAdmin && modules.length === 0 && loading)) {
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
      <div className="flex items-start gap-4">
        <Link href="/dashboard/configuracoes">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Permissões e governança</h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-3xl">
            As políticas abaixo valem por <strong>papel corporativo</strong> (ex.: Editor, Company Admin): escolhem quais
            módulos do dashboard cada perfil vê e usa. Agrupamos por área para você aplicar permissões sem varrer uma
            tabela infinita linha a linha — use <strong>ações nesta área</strong> para marcar um perfil em todos os itens do
            bloco de uma só vez. Alterações ficam registradas em auditoria. Super admin continua sempre com acesso total.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 max-w-md">
            <label htmlFor="mod-search" className="sr-only">
              Buscar módulos
            </label>
            <Input
              id="mod-search"
              type="search"
              placeholder="Buscar por nome, caminho ou identificador do módulo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-foreground"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Matriz por área funcional</CardTitle>
            <CardDescription>
              Dobre cada grupo para revisar apenas o que importa neste momento (LGPD na área de saúde, ADM só em
              departamentos administrativos, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}
            {saveBanner && (
              <div className="rounded-md border border-green-700/40 bg-green-950/35 p-3 text-sm text-green-100">
                {saveBanner}
              </div>
            )}

            {loading ? (
              <p className="text-muted-foreground py-8">Carregando módulos...</p>
            ) : (
              <div className="space-y-4">
                {areasWithModules.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center">Nenhum módulo com o termo pesquisado.</p>
                )}

                {areasWithModules.map(({ area, meta, modules: rows }) => (
                  <details
                    key={area}
                    className="group rounded-xl border bg-card overflow-hidden shadow-sm scroll-mt-4 open:shadow-md"
                  >
                    <summary className="cursor-pointer select-none px-4 py-4 sm:px-6 list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-start justify-between gap-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-base text-foreground block">{meta.title}</span>
                        <span className="text-sm text-muted-foreground mt-0.5 block max-w-xl">{meta.description}</span>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {rows.length} módulo{rows.length === 1 ? "" : "s"} nesta área
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center shrink-0 pt-1">
                        {(ROLE_KEYS as readonly RoleKey[]).map((rk) => (
                          <div key={rk} className="flex rounded-md border bg-background shadow-sm overflow-hidden">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[11px] border-0 rounded-none border-e"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBulkArea(area, rk, true);
                              }}
                            >
                              ✓ {ROLE_LABELS[rk].short}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[11px] border-0 rounded-none"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBulkArea(area, rk, false);
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                      <span className="hidden sm:inline text-muted-foreground group-open:hidden text-xs whitespace-nowrap">
                        Abrir ▸
                      </span>
                      <span className="hidden sm:inline text-muted-foreground not-group-open:hidden text-xs whitespace-nowrap">
                        Fechar ▸
                      </span>
                    </summary>
                    <div className="overflow-x-auto border-t">
                      <table className="w-full text-sm min-w-[720px]">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="sticky left-0 z-[1] bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/85 px-3 py-3 text-left font-medium w-[220px] sm:w-[260px]">
                              Módulo
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[100px]" title={ROLE_LABELS.company_admin.hint}>
                              Co. Admin
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[100px]" title={ROLE_LABELS.editor.hint}>
                              Editor
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[90px]" title={ROLE_LABELS.analista.hint}>
                              Analist.
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[90px]" title={ROLE_LABELS.diretoria.hint}>
                              Diret.
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[90px]" title={ROLE_LABELS.medico.hint}>
                              Médico
                            </th>
                            <th className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[100px]" title={ROLE_LABELS.psicologo.hint}>
                              Psicól.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((m) => {
                            const mod = modules.find((x) => x.slug === m.slug) ?? m;
                            return (
                              <tr key={`${area}-${m.slug}`} className="border-b last:border-b-0">
                                <td className="sticky left-0 z-[1] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 px-3 py-3 align-top border-r border-border/50">
                                  <div className="font-medium leading-snug">{MODULE_DISPLAY_NAMES[m.slug] ?? m.name}</div>
                                  {m.path && m.path !== m.name && (
                                    <div className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                                      {m.path}
                                    </div>
                                  )}
                                </td>
                                {(ROLE_KEYS as readonly RoleKey[]).map((role) => (
                                  <td key={role} className="px-2 py-3 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(mod[role])}
                                      onChange={(e) => handleToggle(m.slug, role, e.target.checked)}
                                      className="h-5 w-5 rounded-md border-input accent-primary cursor-pointer shrink-0"
                                      aria-label={`${ROLE_LABELS[role].short}: ${MODULE_DISPLAY_NAMES[m.slug] ?? m.name}`}
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {dirty && (
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar todas as alterações"}
                </Button>
              )}
              <Link href="/dashboard/configuracoes">
                <Button type="button" variant="outline" disabled={saving}>
                  Voltar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de alterações na matriz</CardTitle>
            <CardDescription>Quem ajustou políticas nesta tela (últimos registros; não altera regras ao visualizar).</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <p className="text-muted-foreground text-sm">Carregando auditoria...</p>
            ) : auditEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ainda não há registros neste ambiente.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium">Data (UTC)</th>
                      <th className="px-3 py-2 text-left font-medium">E-mail</th>
                      <th className="px-3 py-2 text-left font-medium">Células alteradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.slice(0, 15).map((e) => (
                      <tr key={e.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-3 py-2 max-w-[200px] truncate" title={e.actorEmail ?? e.actorSub}>
                          {e.actorEmail ?? "(sem e-mail)"}
                        </td>
                        <td className="px-3 py-2">{e.changeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
