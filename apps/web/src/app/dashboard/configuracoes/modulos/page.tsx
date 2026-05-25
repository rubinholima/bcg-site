"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES, DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import {
  DASHBOARD_MENU,
  PLAYER_TABS,
  getUniqueModuleSlugs,
  type MenuItemConfig,
} from "@/lib/dashboard-menu.config";
import { getAreaMeta, sortAreaKeys } from "@/lib/module-functional-areas";
import {
  applyAdditivePreset,
  buildMatrixExportPayload,
  getPresetById,
  MANAGED_ROLE_LABELS,
  MANAGED_ROLES,
  PERMISSION_PRESETS,
  type ManagedRoleKey,
  type ModulePermissionRow,
} from "@/lib/permission-presets";

interface ModulePermission {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea?: string;
  company_admin: boolean;
  editor: boolean;
  gerente: boolean;
  administrativo: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
  comissao: boolean;
}

interface DisplayRow extends Omit<ModulePermission, "functionalArea"> {
  functionalArea: string;
  /** Caminho amigável no menu (breadcrumb). */
  path: string;
}

interface AuditChangeRow {
  slug: string;
  role: string;
  from: boolean;
  to: boolean;
}

interface AuditEntry {
  id: string;
  createdAt: string;
  actorSub: string;
  actorEmail: string | null;
  changeCount: number;
  changes?: AuditChangeRow[];
}

interface ModuleTreeNode {
  slug: string;
  label: string;
  path: string;
  depth: number;
}

/** Papéis armazenados na API por módulo (auditoria e presets). */
const AUDIT_ROLE_LABELS: Record<string, { short: string }> = {
  company_admin: { short: MANAGED_ROLE_LABELS.company_admin },
  editor: { short: MANAGED_ROLE_LABELS.editor },
  gerente: { short: MANAGED_ROLE_LABELS.gerente },
  administrativo: { short: MANAGED_ROLE_LABELS.administrativo },
  analista: { short: MANAGED_ROLE_LABELS.analista },
  diretoria: { short: MANAGED_ROLE_LABELS.diretoria },
  comissao: { short: MANAGED_ROLE_LABELS.comissao },
  medico: { short: MANAGED_ROLE_LABELS.medico },
  psicologo: { short: MANAGED_ROLE_LABELS.psicologo },
};

function applyRoleToRow(row: ModulePermission, role: ManagedRoleKey, value: boolean): ModulePermission {
  return { ...row, [role]: value };
}

function roleChecked(mod: ModulePermission, role: ManagedRoleKey): boolean {
  return Boolean(mod[role]);
}

type SectionAccessState = "all" | "none" | "partial";

function getSectionAccessState(rows: DisplayRow[], role: ManagedRoleKey): SectionAccessState {
  if (rows.length === 0) return "none";
  const enabled = rows.filter((r) => r[role]).length;
  if (enabled === 0) return "none";
  if (enabled === rows.length) return "all";
  return "partial";
}

function auditChangeLabel(row: AuditChangeRow): string {
  const mod = MODULE_DISPLAY_NAMES[row.slug] ?? row.slug;
  const rl = AUDIT_ROLE_LABELS[row.role]?.short ?? row.role;
  return `${mod} (${rl}): ${row.from ? "ativo" : "inativo"} → ${row.to ? "ativo" : "inativo"}`;
}

function buildPermissionsPayload(
  displayRows: DisplayRow[],
  modulesState: ModulePermission[],
): Record<
  string,
  {
    company_admin: boolean;
    editor: boolean;
    gerente: boolean;
    administrativo: boolean;
    analista: boolean;
    diretoria: boolean;
    medico: boolean;
    psicologo: boolean;
    comissao: boolean;
  }
> {
  const map = new Map(modulesState.map((m) => [m.slug, m]));
  const out: Record<
    string,
    {
      company_admin: boolean;
      editor: boolean;
      gerente: boolean;
      administrativo: boolean;
      analista: boolean;
      diretoria: boolean;
      medico: boolean;
      psicologo: boolean;
      comissao: boolean;
    }
  > = {};
  for (const d of displayRows) {
    const mod = map.get(d.slug);
    out[d.slug] = {
      company_admin: mod?.company_admin ?? d.company_admin,
      editor: mod?.editor ?? d.editor,
      gerente: mod?.gerente ?? d.gerente,
      administrativo: mod?.administrativo ?? d.administrativo,
      analista: mod?.analista ?? d.analista,
      diretoria: mod?.diretoria ?? d.diretoria,
      medico: mod?.medico ?? d.medico,
      psicologo: mod?.psicologo ?? d.psicologo,
      comissao: mod?.comissao ?? d.comissao,
    };
  }
  return out;
}

function normalizeModuleRows(data: unknown): ModulePermission[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const r = item as Partial<ModulePermission> & { slug: string };
    return {
      slug: r.slug,
      name: r.name ?? r.slug,
      sortOrder: r.sortOrder ?? 0,
      functionalArea: r.functionalArea,
      company_admin: r.company_admin ?? false,
      editor: r.editor ?? false,
      gerente: r.gerente ?? false,
      administrativo: r.administrativo ?? false,
      analista: r.analista ?? false,
      diretoria: r.diretoria ?? false,
      medico: r.medico ?? false,
      psicologo: r.psicologo ?? false,
      comissao: r.comissao ?? false,
    };
  });
}

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
  const [selectedRole, setSelectedRole] = useState<ManagedRoleKey>("administrativo");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const refreshAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/modules/audit?details=1", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { entries?: AuditEntry[] };
      if (data.entries) setAuditEntries(data.entries);
    } catch {
      /* ignora falha opcional em auditoria */
    }
  }, []);

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
      .then((data: unknown) => {
        if (!cancelled) setModules(normalizeModuleRows(data));
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
    refreshAudit().finally(() => {
      if (!cancelled) setAuditLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, refreshAudit]);

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
        gerente: existing?.gerente ?? false,
        administrativo: existing?.administrativo ?? false,
        analista: existing?.analista ?? false,
        diretoria: existing?.diretoria ?? false,
        medico: existing?.medico ?? false,
        psicologo: existing?.psicologo ?? false,
        comissao: existing?.comissao ?? false,
      };
    });
  }, [modules, moduleTree]);

  /** Estado efetivo da matriz (API + edição local); usado para salvar, exportar e presets. */
  const mergedModuleState = useMemo<ModulePermission[]>(
    () =>
      displayModules.map((d) => ({
        slug: d.slug,
        name: MODULE_DISPLAY_NAMES[d.slug] ?? d.name,
        sortOrder: d.sortOrder,
        functionalArea: d.functionalArea,
        company_admin: d.company_admin,
        editor: d.editor,
        gerente: d.gerente,
        administrativo: d.administrativo,
        analista: d.analista,
        diretoria: d.diretoria,
        medico: d.medico,
        psicologo: d.psicologo,
        comissao: d.comissao,
      })),
    [displayModules],
  );

  const roleSummary = useMemo(() => {
    const enabled = mergedModuleState.filter((m) => roleChecked(m, selectedRole));
    const sections = new Set(enabled.map((m) => m.functionalArea || "outros"));
    return {
      moduleCount: enabled.length,
      sectionCount: sections.size,
      enabledModules: enabled.map((m) => MODULE_DISPLAY_NAMES[m.slug] ?? m.name),
    };
  }, [mergedModuleState, selectedRole]);

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

  /** Marca/desmarca um perfil em todos os módulos visíveis desta seção. */
  const handleSectionAccess = useCallback(
    (areaKey: string, role: ManagedRoleKey, value: boolean) => {
      const slugs = filteredRows
        .filter((r) => (r.functionalArea || "outros") === areaKey)
        .map((r) => r.slug);
      if (slugs.length === 0) return;

      setModules((prev) => {
        const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
        for (const slug of slugs) {
          const d = filteredRows.find((r) => r.slug === slug);
          if (!d) continue;
          const raw = bySlug.get(slug);
          const existing: ModulePermission = {
            slug,
            name: MODULE_DISPLAY_NAMES[slug] ?? d.name,
            sortOrder: d.sortOrder,
            functionalArea: d.functionalArea,
            company_admin: raw?.company_admin ?? d.company_admin,
            editor: raw?.editor ?? d.editor,
            gerente: raw?.gerente ?? d.gerente,
            administrativo: raw?.administrativo ?? d.administrativo,
            analista: raw?.analista ?? d.analista,
            diretoria: raw?.diretoria ?? d.diretoria,
            medico: raw?.medico ?? d.medico,
            psicologo: raw?.psicologo ?? d.psicologo,
            comissao: raw?.comissao ?? d.comissao,
          };
          bySlug.set(slug, applyRoleToRow(existing, role, value));
        }
        return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDirty(true);
      setSaveBanner(null);
    },
    [filteredRows],
  );

  const handleSectionToggle = (areaKey: string, role: ManagedRoleKey, rows: DisplayRow[]) => {
    const state = getSectionAccessState(rows, role);
    handleSectionAccess(areaKey, role, state !== "all");
  };

  const handleExportSnapshot = useCallback(() => {
    const payload = buildMatrixExportPayload(mergedModuleState as ModulePermissionRow[]);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bcg-matriz-permissoes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSaveBanner("Exportação JSON gerada (backup / compliance). Mantenha o arquivo sob controle.");
  }, [mergedModuleState]);

  const runApplyPreset = useCallback(async () => {
    const preset = getPresetById(presetId);
    if (!preset || !mergedModuleState.length || !displayModules.length) {
      setPresetDialogOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    setSaveBanner(null);
    try {
      const next = applyAdditivePreset(
        displayModules.map((d) => ({
          slug: d.slug,
          sortOrder: d.sortOrder,
          functionalArea: d.functionalArea,
          name: MODULE_DISPLAY_NAMES[d.slug] ?? d.name,
        })),
        mergedModuleState as ModulePermissionRow[],
        preset.grants,
      );
      const permissions = buildPermissionsPayload(displayModules, next as ModulePermission[]);
      const res = await fetch("/api/settings/modules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao aplicar pacote"));
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; changedCells?: number };
      setModules(next as ModulePermission[]);
      setDirty(false);
      if (typeof data.changedCells === "number") {
        setSaveBanner(
          data.changedCells > 0
            ? `Pacote “${preset.title}”: ${data.changedCells} célula(s) gravada(s); auditoria atualizada.`
            : `Pacote “${preset.title}”: nada a alterar vs. servidor (já igual).`,
        );
      } else {
        setSaveBanner(`Pacote “${preset.title}” gravado no servidor.`);
      }
      await refreshAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar pacote");
    } finally {
      setSaving(false);
      setPresetDialogOpen(false);
    }
  }, [presetId, mergedModuleState, displayModules, refreshAudit]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveBanner(null);
    try {
      const permissions = buildPermissionsPayload(displayModules, mergedModuleState);
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
      await refreshAudit();
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
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Acessos ao sistema</h1>
          <Link
            href="/dashboard/manual#permissoes-modulos"
            className="text-sm text-primary hover:underline"
          >
            Ajuda
          </Link>
        </div>
      </div>

      <div className="space-y-4 max-w-[960px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 min-w-0 max-w-md">
            <label htmlFor="mod-search" className="sr-only">
              Buscar seções ou módulos
            </label>
            <Input
              id="mod-search"
              type="search"
              placeholder="Buscar seção ou módulo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {dirty && (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            )}
            <Link href="/dashboard/configuracoes">
              <Button type="button" variant="outline" disabled={saving}>
                Voltar
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}
        {saveBanner && (
          <div className="rounded-md border border-green-700/40 bg-green-950/35 p-3 text-sm text-green-100">
            {saveBanner}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {MANAGED_ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={selectedRole === role ? "default" : "outline"}
                  className="shrink-0"
                  onClick={() => setSelectedRole(role)}
                >
                  {MANAGED_ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
            <div className="rounded-lg border bg-muted/25 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {MANAGED_ROLE_LABELS[selectedRole]} — {roleSummary.moduleCount} módulo
                {roleSummary.moduleCount === 1 ? "" : "s"} em {roleSummary.sectionCount} seção
                {roleSummary.sectionCount === 1 ? "" : "ões"}
              </p>
              {roleSummary.enabledModules.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {roleSummary.enabledModules.map((name) => (
                    <span
                      key={name}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-foreground border border-primary/20"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum módulo liberado para este perfil.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acesso por seção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Carregando…</p>
            ) : areasWithModules.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Nenhuma seção com o termo pesquisado.</p>
            ) : (
              areasWithModules.map(({ area, meta, modules: rows }) => {
                const access = getSectionAccessState(rows, selectedRole);
                const enabledInSection = rows.filter((r) => r[selectedRole]).length;
                return (
                  <div
                    key={area}
                    className="rounded-xl border bg-card px-4 py-4 sm:px-5 space-y-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{meta.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {enabledInSection}/{rows.length} módulos liberados
                          {access === "partial" ? " · parcial" : ""}
                        </p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer shrink-0 self-start sm:self-center">
                        <span className="text-sm text-muted-foreground">
                          {access === "all" ? "Liberado" : access === "partial" ? "Parcial" : "Bloqueado"}
                        </span>
                        <input
                          type="checkbox"
                          checked={access === "all"}
                          ref={(el) => {
                            if (el) el.indeterminate = access === "partial";
                          }}
                          onChange={() => handleSectionToggle(area, selectedRole, rows)}
                          className="h-5 w-5 rounded-md border-input accent-primary cursor-pointer"
                          aria-label={`Acesso à seção ${meta.title}`}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map((m) => {
                        const on = m[selectedRole];
                        return (
                          <span
                            key={m.slug}
                            className={`text-xs px-2 py-0.5 rounded-md border ${
                              on
                                ? "bg-primary/10 border-primary/25 text-foreground"
                                : "bg-muted/40 border-transparent text-muted-foreground line-through decoration-muted-foreground/50"
                            }`}
                          >
                            {MODULE_DISPLAY_NAMES[m.slug] ?? m.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pacotes e backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Select
                value={presetId || "__unset"}
                onValueChange={(v) => setPresetId(v === "__unset" ? "" : v)}
              >
                <SelectTrigger className="w-full sm:max-w-md text-foreground">
                  <SelectValue placeholder="Pacote pronto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset">Nenhum</SelectItem>
                  {PERMISSION_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!presetId || saving}
                  onClick={() => presetId && setPresetDialogOpen(true)}
                >
                  Aplicar pacote
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportSnapshot}
                  disabled={saving}
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden />
                  Exportar JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico</CardTitle>
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
                      <th className="w-10 px-2 py-2" aria-label="Detalhar" />
                      <th className="px-3 py-2 text-left font-medium">Data (UTC)</th>
                      <th className="px-3 py-2 text-left font-medium">E-mail</th>
                      <th className="px-3 py-2 text-left font-medium">Células alteradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.slice(0, 15).map((e) => (
                      <Fragment key={e.id}>
                        <tr className="border-b last:border-b-0 hover:bg-muted/20">
                          <td className="px-2 py-1 align-middle w-10">
                            <button
                              type="button"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              aria-expanded={expandedAuditId === e.id}
                              aria-label={expandedAuditId === e.id ? "Ocultar detalhes da alteração" : "Ver detalhes"}
                              onClick={() =>
                                setExpandedAuditId((id) =>
                                  id === e.id ? null : e.id,
                                )
                              }
                            >
                              {expandedAuditId === e.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {new Date(e.createdAt).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-3 py-2 max-w-[200px] truncate" title={e.actorEmail ?? e.actorSub}>
                            {e.actorEmail ?? "(sem e-mail)"}
                          </td>
                          <td className="px-3 py-2">{e.changeCount}</td>
                        </tr>
                        {expandedAuditId === e.id &&
                          e.changes &&
                          e.changes.length > 0 && (
                            <tr className="border-b bg-muted/15">
                              <td colSpan={4} className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground block mb-2">Alterações gravadas neste pacote:</span>
                                <ul className="list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
                                  {e.changes.map((c, i) => (
                                    <li key={`${e.id}-${i}-${c.slug}-${c.role}`}>
                                      {auditChangeLabel(c)}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={presetDialogOpen} onOpenChange={(open) => !saving && setPresetDialogOpen(open)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar aplicação do pacote</AlertDialogTitle>
              <AlertDialogDescription>
                {presetId && getPresetById(presetId)
                  ? getPresetById(presetId)!.title
                  : "Aplicar pacote de permissões?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={saving}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                disabled={saving}
                onClick={(ev) => {
                  ev.preventDefault();
                  void runApplyPreset();
                }}
              >
                {saving ? "Gravando…" : "Aplicar e gravar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
