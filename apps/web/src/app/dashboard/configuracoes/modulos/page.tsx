"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Info } from "lucide-react";
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
  PERMISSION_PRESETS,
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

/** Colunas da matriz — company_admin e editor inalterados; gerente e administrativo são papéis distintos (ModuleRole). */
export type InstitutionMatrixCol =
  | "company_admin"
  | "editor"
  | "gerente"
  | "administrativo"
  | "analista"
  | "diretoria"
  | "saude_staff";

const MATRIX_COLUMNS: readonly {
  id: InstitutionMatrixCol;
  shortLabel: string;
  hintLabel: string;
}[] = [
  {
    id: "company_admin",
    shortLabel: "Company admin",
    hintLabel: "Role company_admin na API: administrador da empresa ou clube no tenant.",
  },
  {
    id: "editor",
    shortLabel: "Editor",
    hintLabel: "Role editor: produção de conteúdo e cadastros liberados nesta coluna.",
  },
  {
    id: "gerente",
    shortLabel: "Gerente",
    hintLabel: "Role gerente: papel distinto de company admin e editor; marque por módulo quem com perfil gerente acessa.",
  },
  {
    id: "administrativo",
    shortLabel: "Administrativo",
    hintLabel:
      "Role administrativo: papel operacional/administrativo distinto de company admin e de editor; marque por módulo.",
  },
  {
    id: "analista",
    shortLabel: "Analista",
    hintLabel: "Análises operacionais e relatórios (escopo habitualmente mais restrito).",
  },
  {
    id: "diretoria",
    shortLabel: "Diretoria",
    hintLabel: "Dados sensíveis dos atletas e avaliações (área institucional).",
  },
  {
    id: "saude_staff",
    shortLabel: "Saúde",
    hintLabel:
      "Equipe médica e psicológica: marca ou desmarca médico + psicólogo na mesma política.",
  },
] as const;

function applyMatrixColumnToRow(
  row: ModulePermission,
  columnId: InstitutionMatrixCol,
  value: boolean,
): ModulePermission {
  if (columnId === "saude_staff") {
    return { ...row, medico: value, psicologo: value };
  }
  return {
    ...row,
    [columnId]: value,
  };
}

/** Valor visual da checkbox (coluna Saúde = médico ∧ psicólogo). */
function matrixCheckboxChecked(mod: ModulePermission, columnId: InstitutionMatrixCol): boolean {
  if (columnId === "saude_staff") {
    return Boolean(mod.medico && mod.psicologo);
  }
  return Boolean(mod[columnId]);
}

/** Papéis armazenados na API por módulo (auditoria e presets). */
const AUDIT_ROLE_LABELS: Record<string, { short: string }> = {
  company_admin: { short: "Company admin" },
  editor: { short: "Editor" },
  gerente: { short: "Gerente" },
  administrativo: { short: "Administrativo" },
  analista: { short: "Analista" },
  diretoria: { short: "Diretoria" },
  medico: { short: "Médico" },
  psicologo: { short: "Psicólogo" },
};

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
      })),
    [displayModules],
  );

  const roleActivatedCounts = useMemo(
    () =>
      MATRIX_COLUMNS.map((col) => ({
        colId: col.id,
        label: col.shortLabel,
        count: (() => {
          if (col.id === "saude_staff") {
            return mergedModuleState.filter((m) => m.medico && m.psicologo).length;
          }
          const key = col.id as keyof Pick<
            ModulePermission,
            "company_admin" | "editor" | "gerente" | "administrativo" | "analista" | "diretoria"
          >;
          return mergedModuleState.filter((m) => m[key]).length;
        })(),
      })),
    [mergedModuleState],
  );

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

  /** Marca/desmarca uma coluna (Company admin, Editor … Saúde) em todos os módulos visíveis desta área. */
  const handleBulkArea = useCallback((areaKey: string, columnId: InstitutionMatrixCol, value: boolean) => {
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
        };
        bySlug.set(slug, applyMatrixColumnToRow(existing, columnId, value));
      }
      return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    setDirty(true);
    setSaveBanner(null);
  }, [filteredRows]);

  const handleToggle = (slug: string, columnId: InstitutionMatrixCol, value: boolean) => {
    setModules((prev) => {
      const dm = displayModules.find((x) => x.slug === slug);
      const baseFromDisplay: ModulePermission | null = dm
        ? {
            slug: dm.slug,
            name: MODULE_DISPLAY_NAMES[dm.slug] ?? dm.name,
            sortOrder: dm.sortOrder,
            functionalArea: dm.functionalArea,
            company_admin: dm.company_admin,
            editor: dm.editor,
            gerente: dm.gerente,
            administrativo: dm.administrativo,
            analista: dm.analista,
            diretoria: dm.diretoria,
            medico: dm.medico,
            psicologo: dm.psicologo,
          }
        : null;
      const found = prev.find((m) => m.slug === slug);
      if (found) {
        return prev.map((m) => (m.slug === slug ? applyMatrixColumnToRow(m, columnId, value) : m));
      }
      const base =
        baseFromDisplay ??
        ({
          slug,
          name: MODULE_DISPLAY_NAMES[slug] ?? dm?.name ?? slug,
          sortOrder: dm?.sortOrder ?? 0,
          functionalArea: dm?.functionalArea ?? "outros",
          company_admin: false,
          editor: false,
          gerente: false,
          administrativo: false,
          analista: false,
          diretoria: false,
          medico: false,
          psicologo: false,
        } satisfies ModulePermission);
      return [...prev, applyMatrixColumnToRow(base, columnId, value)];
    });
    setDirty(true);
    setSaveBanner(null);
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

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}
        {saveBanner && (
          <div className="rounded-md border border-green-700/40 bg-green-950/35 p-3 text-sm text-green-100">
            {saveBanner}
          </div>
        )}

        <Card className="border-dashed">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">Pacotes prontos e cópia da política</CardTitle>
            <CardDescription className="text-sm sm:text-base leading-relaxed max-w-none">
              Trecho opcional: use quando quiser <strong>começar por um pacote sugerido</strong> ou <strong>baixar o que está
              valendo agora</strong> como arquivo — sem dados pessoais, só caixas ligadas/desligadas na matriz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="rounded-xl border border-border/80 bg-muted/35 px-4 py-4 space-y-3"
              role="region"
              aria-labelledby="preset-help-heading"
            >
              <p
                id="preset-help-heading"
                className="text-sm font-semibold text-foreground flex items-start gap-2.5 leading-snug"
              >
                <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
                Como isso funciona (em três pontos)
              </p>
              <ul className="text-sm text-muted-foreground space-y-2.5 pl-1 list-none border-s-2 border-primary/35 ps-4 ms-2">
                <li>
                  <strong className="text-foreground/95">Pacotes só ligam permissões novas.</strong> Ou seja, marcam
                  “sim” onde o pacote recomenda — <strong>não desligam</strong> algo que já estava permitido antes. Para
                  restringir, abra a matriz logo abaixo, desmarque as células e use{' '}
                  <strong className="text-foreground/90">&quot;Salvar todas as alterações&quot;</strong>.
                </li>
                <li>
                  Ao <strong className="text-foreground/95">confirmar um pacote</strong>, gravamos esse acréscimo no
                  servidor (com registro na auditoria), igual ao salvamento manual.
                </li>
                <li>
                  <strong className="text-foreground/95">Exportar JSON</strong> gera apenas o “mapa” atual de permissões por
                  módulo e papel — <strong>não há nomes nem e-mails de usuários.</strong> Útil para evidência interna ou
                  backup da política.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-1 min-w-0 space-y-2 max-w-xl">
                <div>
                  <span className="text-sm font-medium text-foreground">Passo 1 — Escolher um pacote (opcional)</span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Cada opção descreve para quais <strong>módulos</strong> o pacote sugere o acesso em cada <strong>papel</strong>.
                  </p>
                </div>
                <Select
                  value={presetId || "__unset"}
                  onValueChange={(v) => setPresetId(v === "__unset" ? "" : v)}
                >
                  <SelectTrigger className="w-full text-foreground">
                    <SelectValue placeholder="Nenhum — escolher depois na matriz…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unset">Nenhum selecionado</SelectItem>
                    {PERMISSION_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {presetId && getPresetById(presetId) && (
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
                    {getPresetById(presetId)!.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 space-y-2 sm:pt-6">
                <span className="text-sm font-medium text-foreground block">Passos 2 e 3</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!presetId || saving}
                    onClick={() => presetId && setPresetDialogOpen(true)}
                  >
                    Aplicar pacote ao servidor…
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportSnapshot}
                    disabled={saving}
                    title="Apenas política (módulos × papéis); sem dados de usuários"
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden />
                    Baixar política (JSON)
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-[280px] leading-relaxed">
                  &quot;Aplicar&quot; abre uma confirmação: você vê um resumo e só então gravamos. O arquivo JSON você pode gerar a
                  qualquer momento — não altera permissões no sistema.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-2">
              <p className="text-xs font-medium text-foreground">
                Panorama rápido — por <strong>papel</strong>, quantos <strong>módulos</strong> estão liberados na matriz agora
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ou seja: para cada papel, o número conta quantos módulos <strong className="text-foreground/90">têm esse papel
                permitido</strong> na matriz que você vê agora — inclusive se você alterou caixas nesta tela e ainda não clicou
                em &quot;Salvar todas as alterações&quot;.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {roleActivatedCounts.map(({ colId, label, count }) => {
                  const hint = MATRIX_COLUMNS.find((c) => c.id === colId)?.hintLabel ?? "";
                  return (
                  <span
                    key={colId}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-muted text-foreground/90 leading-tight"
                    title={hint ? `${hint} Quantidade de módulos com esse tipo de acesso ligado.` : undefined}
                  >
                    <span className="text-muted-foreground">{label}: </span>
                    <strong className="font-semibold tabular-nums">{count}</strong>
                  </span>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matriz por área funcional</CardTitle>
            <CardDescription>
              Dobre cada grupo para revisar apenas o que importa neste momento (LGPD na área de saúde, ADM só em
              departamentos administrativos, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        {MATRIX_COLUMNS.map((col) => (
                          <div key={col.id} className="flex rounded-md border bg-background shadow-sm overflow-hidden">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[11px] border-0 rounded-none border-e"
                              title={`${col.shortLabel}: ${col.hintLabel}`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBulkArea(area, col.id, true);
                              }}
                            >
                              ✓ {col.shortLabel}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-[11px] border-0 rounded-none"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBulkArea(area, col.id, false);
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
                      <table className="w-full text-sm min-w-[1000px]">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="sticky left-0 z-[1] bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/85 px-3 py-3 text-left font-medium w-[220px] sm:w-[260px]">
                              Módulo
                            </th>
                            {MATRIX_COLUMNS.map((col) => (
                              <th
                                key={col.id}
                                className="px-2 py-3 text-left font-normal text-xs text-muted-foreground max-w-[104px]"
                                title={col.hintLabel}
                              >
                                {col.shortLabel}
                              </th>
                            ))}
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
                                {MATRIX_COLUMNS.map((col) => (
                                  <td key={col.id} className="px-2 py-3 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={matrixCheckboxChecked(mod, col.id)}
                                      onChange={(e) => handleToggle(m.slug, col.id, e.target.checked)}
                                      className="h-5 w-5 rounded-md border-input accent-primary cursor-pointer shrink-0"
                                      aria-label={`${col.shortLabel}: ${MODULE_DISPLAY_NAMES[m.slug] ?? m.name}`}
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
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground text-left pt-2">
                  <p>
                    O pacote apenas <strong>liga permissões novas</strong> onde está previsto — não desliga algo que já
                    existia até você tirar manualmente na matriz.
                  </p>
                  {presetId && getPresetById(presetId) && (
                    <p className="text-foreground/90">{getPresetById(presetId)!.description}</p>
                  )}
                </div>
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
