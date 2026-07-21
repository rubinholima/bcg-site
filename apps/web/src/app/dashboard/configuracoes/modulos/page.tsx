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
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";
import {
  getMenuAccessTree,
  buildModuleCatalog,
  getMenuDepartmentGroups,
  getUniqueModuleSlugs,
  type MenuAccessTreeNode,
  type MenuDepartmentGroup,
} from "@/lib/dashboard-menu.config";
import { AccessPermissionTree } from "@/components/dashboard/access/AccessPermissionTree";
import {
  applyAdditivePreset,
  buildMatrixExportPayload,
  getPresetById,
  MANAGED_ROLES,
  PERMISSION_PRESETS,
} from "@/lib/permission-presets";
import {
  type ModulePermissionRow,
  normalizeModuleFromApi,
  getRolePermission,
  setRolePermission,
  permissionsPayload,
  emptyPermissions,
} from "@/lib/module-permission-matrix";
import {
  type PlatformRole,
  managedRolesFromCatalog,
  roleLabelsFromCatalog,
} from "@/lib/platform-roles";

interface DisplayRow extends Omit<ModulePermissionRow, "functionalArea"> {
  functionalArea: string;
  /** Caminho amigável no menu (breadcrumb). */
  path: string;
  /** Itens do menu lateral que este módulo libera. */
  menuLabels: string[];
  departmentId: string;
}

interface DepartmentSection extends MenuDepartmentGroup {
  rows: DisplayRow[];
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

interface UserListItem {
  id: string | null;
  email: string;
  name: string | null;
  role: string;
}

interface UserModulePermissionsResponse {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  customModuleAccess: boolean;
  permissions: Record<string, boolean>;
}

type AccessMode = "role" | "user";

function resolveModuleRow(
  slug: string,
  display: DisplayRow | undefined,
  raw: ModulePermissionRow | undefined,
  managedRoleSlugs: string[],
): ModulePermissionRow {
  return {
    slug,
    name: MODULE_DISPLAY_NAMES[slug] ?? display?.name ?? raw?.name ?? slug,
    sortOrder: display?.sortOrder ?? raw?.sortOrder ?? 0,
    functionalArea: display?.functionalArea ?? raw?.functionalArea ?? "outros",
    permissions: {
      ...emptyPermissions(managedRoleSlugs),
      ...(raw?.permissions ?? display?.permissions ?? {}),
    },
  };
}

interface RoleAccessSummary {
  role: string;
  moduleCount: number;
  sectionCount: number;
  byDepartment: { label: string; modules: { slug: string; label: string }[] }[];
  enabledMenuItems: string[];
}

function permissionEnabled(
  map: Map<string, boolean>,
  accessSlug: string,
  moduleSlug?: string,
): boolean {
  if (map.get(accessSlug)) return true;
  if (moduleSlug && moduleSlug !== accessSlug && map.get(moduleSlug)) return true;
  return false;
}

function buildRoleAccessSummary(
  role: string,
  moduleState: ModulePermissionRow[],
  rows: DisplayRow[],
  departments: MenuDepartmentGroup[],
  menuTree: MenuAccessTreeNode[],
): RoleAccessSummary {
  const enabledRows = rows.filter((d) => getRolePermission(d, role));
  const enabledPermMap = new Map(
    moduleState.filter((m) => getRolePermission(m, role)).map((m) => [m.slug, true] as const),
  );

  const byDepartment: { label: string; modules: { slug: string; label: string }[] }[] = [];
  for (const dept of departments) {
    const mods = enabledRows
      .filter((r) => r.departmentId === dept.id)
      .map((r) => ({
        slug: r.slug,
        label: MODULE_DISPLAY_NAMES[r.slug] ?? r.name,
      }));
    if (mods.length > 0) {
      byDepartment.push({ label: dept.label, modules: mods });
    }
  }
  const orphanMods = enabledRows
    .filter((r) => r.departmentId === "outros")
    .map((r) => ({
      slug: r.slug,
      label: MODULE_DISPLAY_NAMES[r.slug] ?? r.name,
    }));
  if (orphanMods.length > 0) {
    byDepartment.push({ label: "Outros módulos", modules: orphanMods });
  }

  const enabledMenuItems: string[] = [];
  const walkTree = (nodes: MenuAccessTreeNode[]) => {
    for (const node of nodes) {
      if (node.kind === "leaf" && node.accessSlug) {
        if (permissionEnabled(enabledPermMap, node.accessSlug, node.moduleSlug)) {
          enabledMenuItems.push(node.label);
        }
      } else if (node.children.length > 0) {
        walkTree(node.children);
      }
    }
  };
  walkTree(menuTree);

  return {
    role,
    moduleCount: enabledRows.length,
    sectionCount: new Set(enabledRows.map((d) => d.departmentId)).size,
    byDepartment,
    enabledMenuItems,
  };
}

type SectionAccessState = "all" | "none" | "partial";

function getSectionAccessState(rows: DisplayRow[], role: string): SectionAccessState {
  if (rows.length === 0) return "none";
  const enabled = rows.filter((r) => getRolePermission(r, role)).length;
  if (enabled === 0) return "none";
  if (enabled === rows.length) return "all";
  return "partial";
}

function auditChangeLabel(row: AuditChangeRow, roleLabels: Record<string, string>): string {
  const mod = MODULE_DISPLAY_NAMES[row.slug] ?? row.slug;
  const rl = roleLabels[row.role] ?? row.role;
  return `${mod} (${rl}): ${row.from ? "ativo" : "inativo"} → ${row.to ? "ativo" : "inativo"}`;
}

function normalizeModuleRows(data: unknown, managedRoles: string[]): ModulePermissionRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const r = item as {
        slug?: string;
        name?: string;
        sortOrder?: number;
        functionalArea?: string;
        permissions?: Record<string, boolean>;
      };
      if (!r.slug) return null;
      return normalizeModuleFromApi(
        {
          slug: r.slug,
          name: r.name ?? r.slug,
          sortOrder: r.sortOrder ?? 0,
          functionalArea: r.functionalArea,
          permissions: r.permissions,
        },
        managedRoles,
      );
    })
    .filter((row): row is ModulePermissionRow => row !== null);
}

function AccessSummaryPanel({
  summary,
  roleLabels,
  hint,
  editable,
  isModuleEnabled,
  onToggleModule,
}: {
  summary: RoleAccessSummary;
  roleLabels: Record<string, string>;
  hint?: string;
  editable?: boolean;
  isModuleEnabled?: (slug: string) => boolean;
  onToggleModule?: (slug: string, value: boolean) => void;
}) {
  const roleLabel = roleLabels[summary.role] ?? summary.role;
  return (
    <div className="rounded-lg border bg-muted/25 px-4 py-3 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">
          {roleLabel} — {summary.moduleCount} módulo{summary.moduleCount === 1 ? "" : "s"}
          {summary.sectionCount > 0
            ? ` em ${summary.sectionCount} departamento${summary.sectionCount === 1 ? "" : "s"}`
            : ""}
        </p>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
        {editable ? (
          <p className="text-xs text-muted-foreground mt-1">
            Marque ou desmarque abaixo e use a árvore de menu para liberar itens adicionais. Depois
            clique em <strong className="text-foreground">Salvar alterações</strong>.
          </p>
        ) : null}
      </div>

      {summary.moduleCount === 0 && !editable ? (
        <p className="text-sm text-muted-foreground">Nenhum módulo liberado para este perfil.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Módulos com acesso
            </p>
            {summary.moduleCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum módulo liberado — use a árvore abaixo para marcar permissões.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.byDepartment.map((dept) => (
                  <div key={dept.label}>
                    <p className="text-xs font-medium text-foreground/90 mb-1">{dept.label}</p>
                    <ul className="flex flex-wrap gap-2">
                      {dept.modules.map((mod) =>
                        editable && onToggleModule ? (
                          <li key={`${dept.label}-${mod.slug}`}>
                            <label className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-foreground cursor-pointer hover:bg-primary/15">
                              <input
                                type="checkbox"
                                checked={isModuleEnabled?.(mod.slug) ?? true}
                                onChange={(e) => onToggleModule(mod.slug, e.target.checked)}
                                className="h-4 w-4 rounded border-input accent-primary shrink-0"
                                aria-label={mod.label}
                              />
                              {mod.label}
                            </label>
                          </li>
                        ) : (
                          <li
                            key={`${dept.label}-${mod.slug}`}
                            className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            {mod.label}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summary.enabledMenuItems.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Itens do menu liberados ({summary.enabledMenuItems.length})
              </p>
              <ul className="grid gap-1 sm:grid-cols-2 text-sm text-foreground/90">
                {summary.enabledMenuItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 min-w-0">
                    <span className="text-primary mt-0.5 shrink-0" aria-hidden>
                      •
                    </span>
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ModulosPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [modules, setModules] = useState<ModulePermissionRow[]>([]);
  const [managedRoleSlugs, setManagedRoleSlugs] = useState<string[]>([...MANAGED_ROLES]);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [accessMode, setAccessMode] = useState<AccessMode>("role");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [userCustomAccess, setUserCustomAccess] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<string>("");
  const [userDirty, setUserDirty] = useState(false);
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
    const catalog = buildModuleCatalog(MODULE_DISPLAY_NAMES);
    Promise.all([
      fetch("/api/settings/modules/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog }),
      }),
      fetch("/api/settings/modules", { credentials: "include" }),
      fetch("/api/settings/roles?includeInactive=1", { credentials: "include" }),
    ])
      .then(([, modulesRes, rolesRes]) => {
        if (!modulesRes.ok) throw new Error("Erro ao carregar módulos");
        return Promise.all([
          modulesRes.json(),
          rolesRes.ok ? rolesRes.json() : Promise.resolve({ roles: [] as PlatformRole[] }),
        ]);
      })
      .then(([modulesData, rolesData]) => {
        if (cancelled) return;
        const roles = (rolesData as { roles?: PlatformRole[] }).roles ?? [];
        const slugs = managedRolesFromCatalog(roles);
        const labels = roleLabelsFromCatalog(roles);
        const effectiveSlugs = slugs.length > 0 ? slugs : [...MANAGED_ROLES];
        setManagedRoleSlugs(effectiveSlugs);
        setRoleLabels(labels);
        setModules(normalizeModuleRows(modulesData, effectiveSlugs));
        setSelectedRole((prev) =>
          prev && effectiveSlugs.includes(prev) ? prev : effectiveSlugs[0] ?? "",
        );
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
    fetch("/api/users", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UserListItem[]) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data.filter((u) => u.id) : [];
          setUsers(list);
          if (list.length > 0) {
            setSelectedUserId((prev) => prev || list[0].id!);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const loadUserPermissions = useCallback(async (userId: string) => {
    const res = await fetch(`/api/settings/modules/users/${encodeURIComponent(userId)}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Erro ao carregar acessos do usuário");
    const data = (await res.json()) as UserModulePermissionsResponse;
    setUserPermissions(data.permissions ?? {});
    setUserCustomAccess(data.customModuleAccess);
    setSelectedUserRole(data.role);
    setUserDirty(false);
    return data;
  }, []);

  useEffect(() => {
    if (!isSuperAdmin || accessMode !== "user" || !selectedUserId) return;
    let cancelled = false;
    loadUserPermissions(selectedUserId).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
    });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, accessMode, selectedUserId, loadUserPermissions]);

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

  const menuTree = useMemo(() => getMenuAccessTree(), []);

  const menuDepartments = useMemo(() => getMenuDepartmentGroups(), []);

  const slugToDepartment = useMemo(() => {
    const map = new Map<string, { departmentId: string; departmentLabel: string; menuLabels: string[] }>();
    for (const dept of menuDepartments) {
      for (const mod of dept.modules) {
        const prev = map.get(mod.slug);
        const labels = prev
          ? [...prev.menuLabels, ...mod.menuLabels.filter((l) => !prev.menuLabels.includes(l))]
          : mod.menuLabels;
        map.set(mod.slug, {
          departmentId: dept.id,
          departmentLabel: dept.label,
          menuLabels: labels,
        });
      }
    }
    return map;
  }, [menuDepartments]);

  const displayModules: DisplayRow[] = useMemo(() => {
    const permMap = new Map(modules.map((m) => [m.slug, m]));
    const slugOrder: string[] = [];
    const seen = new Set<string>();

    for (const dept of menuDepartments) {
      for (const mod of dept.modules) {
        if (!seen.has(mod.slug)) {
          seen.add(mod.slug);
          slugOrder.push(mod.slug);
        }
      }
    }
    for (const slug of getUniqueModuleSlugs()) {
      if (!seen.has(slug)) {
        seen.add(slug);
        slugOrder.push(slug);
      }
    }
    for (const m of modules) {
      if (!seen.has(m.slug)) {
        seen.add(m.slug);
        slugOrder.push(m.slug);
      }
    }

    return slugOrder.map((slug) => {
      const existing = permMap.get(slug);
      const deptInfo = slugToDepartment.get(slug);
      return {
        slug,
        name: MODULE_DISPLAY_NAMES[slug] ?? existing?.name ?? slug,
        path: deptInfo ? `${deptInfo.departmentLabel} › ${MODULE_DISPLAY_NAMES[slug] ?? slug}` : slug,
        menuLabels: deptInfo?.menuLabels ?? [],
        departmentId: deptInfo?.departmentId ?? "outros",
        sortOrder: existing?.sortOrder ?? 0,
        functionalArea: existing?.functionalArea ?? "outros",
        permissions: existing?.permissions ?? emptyPermissions(managedRoleSlugs),
      };
    });
  }, [modules, menuDepartments, slugToDepartment, managedRoleSlugs]);

  /** Estado efetivo da matriz (API + edição local); usado para salvar, exportar e presets. */
  const mergedModuleState = useMemo<ModulePermissionRow[]>(
    () =>
      displayModules.map((d) => ({
        slug: d.slug,
        name: MODULE_DISPLAY_NAMES[d.slug] ?? d.name,
        sortOrder: d.sortOrder,
        functionalArea: d.functionalArea,
        permissions: { ...d.permissions },
      })),
    [displayModules],
  );

  const roleSummary = useMemo(
    () =>
      buildRoleAccessSummary(
        selectedRole,
        mergedModuleState,
        displayModules,
        menuDepartments,
        menuTree,
      ),
    [selectedRole, mergedModuleState, displayModules, menuDepartments, menuTree],
  );

  const userEffectiveSummary = useMemo(() => {
    if (accessMode !== "user" || userCustomAccess) return null;
    const role = selectedUserRole;
    if (!managedRoleSlugs.includes(role)) return null;
    return buildRoleAccessSummary(role, mergedModuleState, displayModules, menuDepartments, menuTree);
  }, [
    accessMode,
    userCustomAccess,
    selectedUserRole,
    managedRoleSlugs,
    mergedModuleState,
    displayModules,
    menuDepartments,
    menuTree,
  ]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return displayModules;
    return displayModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.menuLabels.some((l) => l.toLowerCase().includes(q)),
    );
  }, [displayModules, search]);

  /** Agrupa por menu lateral (Depto Adm, Cadastros, etc.). */
  const departmentsWithModules = useMemo((): DepartmentSection[] => {
    const rowBySlug = new Map(filteredRows.map((r) => [r.slug, r]));
    const usedSlugs = new Set<string>();
    const sections: DepartmentSection[] = [];

    for (const dept of menuDepartments) {
      const rows: DisplayRow[] = [];
      for (const mod of dept.modules) {
        const row = rowBySlug.get(mod.slug);
        if (row) {
          rows.push(row);
          usedSlugs.add(mod.slug);
        }
      }
      if (rows.length > 0) {
        sections.push({ ...dept, rows });
      }
    }

    const orphanRows = filteredRows.filter((r) => !usedSlugs.has(r.slug));
    if (orphanRows.length > 0) {
      sections.push({
        id: "outros",
        label: "Outros módulos",
        modules: orphanRows.map((r) => ({ slug: r.slug, menuLabels: r.menuLabels })),
        rows: orphanRows,
      });
    }

    return sections;
  }, [filteredRows, menuDepartments]);

  /** Marca/desmarca um perfil em todos os módulos visíveis deste menu. */
  const handleDepartmentAccess = useCallback(
    (rows: DisplayRow[], role: string, value: boolean) => {
      if (rows.length === 0) return;

      setModules((prev) => {
        const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
        for (const d of rows) {
          const raw = bySlug.get(d.slug);
          const existing = resolveModuleRow(d.slug, d, raw, managedRoleSlugs);
          bySlug.set(d.slug, setRolePermission(existing, role, value));
        }
        return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDirty(true);
      setSaveBanner(null);
    },
    [managedRoleSlugs],
  );

  const handleDepartmentToggle = (role: string, rows: DisplayRow[]) => {
    const state = getSectionAccessState(rows, role);
    handleDepartmentAccess(rows, role, state !== "all");
  };

  const handleModuleToggle = (slug: string, role: string, value: boolean) => {
    setModules((prev) => {
      const dm = displayModules.find((x) => x.slug === slug);
      const found = prev.find((m) => m.slug === slug);
      if (found) {
        return prev.map((m) => (m.slug === slug ? setRolePermission(m, role, value) : m));
      }
      const base = resolveModuleRow(slug, dm, undefined, managedRoleSlugs);
      return [...prev, setRolePermission(base, role, value)];
    });
    setDirty(true);
    setSaveBanner(null);
  };

  const rolePermissionsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of mergedModuleState) {
      map.set(m.slug, getRolePermission(m, selectedRole));
    }
    return map;
  }, [mergedModuleState, selectedRole]);

  const isAccessEnabled = useCallback(
    (accessSlug: string, moduleSlug?: string) => {
      if (accessMode === "role") {
        return permissionEnabled(rolePermissionsMap, accessSlug, moduleSlug);
      }
      if (userCustomAccess) {
        return (
          Boolean(userPermissions[accessSlug]) ||
          Boolean(moduleSlug && moduleSlug !== accessSlug && userPermissions[moduleSlug])
        );
      }
      const userRole = selectedUserRole;
      const mod = mergedModuleState.find((m) => m.slug === accessSlug);
      const legacyMod =
        moduleSlug && moduleSlug !== accessSlug
          ? mergedModuleState.find((m) => m.slug === moduleSlug)
          : undefined;
      return (
        (mod ? getRolePermission(mod, userRole) : false) ||
        (legacyMod ? getRolePermission(legacyMod, userRole) : false)
      );
    },
    [accessMode, rolePermissionsMap, userCustomAccess, userPermissions, selectedUserRole, mergedModuleState],
  );

  const syncModuleSlugPermission = (
    accessSlug: string,
    value: boolean,
    opts?: { moduleSlug?: string; accessGroup?: string },
  ) => {
    if (opts?.accessGroup) return;
    if (opts?.moduleSlug && opts.moduleSlug !== accessSlug) {
      handleModuleToggle(opts.moduleSlug, selectedRole, value);
    }
  };

  const handleTreeToggleAccess = (
    accessSlug: string,
    value: boolean,
    opts?: { moduleSlug?: string; accessGroup?: string },
  ) => {
    if (accessMode === "role") {
      handleModuleToggle(accessSlug, selectedRole, value);
      syncModuleSlugPermission(accessSlug, value, opts);
      return;
    }
    setUserPermissions((prev) => {
      const next = { ...prev, [accessSlug]: value };
      if (opts?.moduleSlug && opts.moduleSlug !== accessSlug && !opts?.accessGroup) {
        next[opts.moduleSlug] = value;
      }
      return next;
    });
    setUserCustomAccess(true);
    setUserDirty(true);
    setSaveBanner(null);
  };

  const applySlugsToRole = useCallback(
    (slugs: string[], role: string, value: boolean) => {
      setModules((prev) => {
        const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
        for (const slug of slugs) {
          const d = displayModules.find((x) => x.slug === slug);
          const raw = bySlug.get(slug);
          const existing = resolveModuleRow(slug, d, raw, managedRoleSlugs);
          bySlug.set(slug, setRolePermission(existing, role, value));
        }
        return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDirty(true);
      setSaveBanner(null);
    },
    [displayModules, managedRoleSlugs],
  );

  const handlePersonalizeUser = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/settings/modules/users/${encodeURIComponent(selectedUserId)}/copy-from-role`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao personalizar acessos");
      const data = (await res.json()) as UserModulePermissionsResponse;
      setUserPermissions(data.permissions ?? {});
      setUserCustomAccess(true);
      setUserDirty(false);
      setSaveBanner("Acessos copiados do perfil — agora você pode ajustar individualmente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleInheritFromRole = () => {
    setUserCustomAccess(false);
    setUserDirty(true);
    setSaveBanner(null);
  };

  const handleSaveUser = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    setSaveBanner(null);
    try {
      const body = userCustomAccess
        ? {
            permissions: Object.fromEntries(
              displayModules.map((d) => [d.slug, userPermissions[d.slug] ?? false]),
            ),
            customModuleAccess: true,
          }
        : { customModuleAccess: false };
      const res = await fetch(`/api/settings/modules/users/${encodeURIComponent(selectedUserId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao salvar usuário"));
      setUserDirty(false);
      setSaveBanner(
        userCustomAccess
          ? "Acessos personalizados gravados para o usuário."
          : "Usuário voltou a herdar o perfil.",
      );
      await loadUserPermissions(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleExportSnapshot = useCallback(() => {
    const payload = buildMatrixExportPayload(mergedModuleState);
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
        mergedModuleState,
        preset.grants,
        managedRoleSlugs,
      );
      const permissions = permissionsPayload(next);
      const res = await fetch("/api/settings/modules", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro ao aplicar pacote"));
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; changedCells?: number };
      setModules(next);
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
  }, [presetId, mergedModuleState, displayModules, managedRoleSlugs, refreshAudit]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveBanner(null);
    try {
      const permissions = permissionsPayload(mergedModuleState);
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

  const handleSaveAll = async () => {
    if (accessMode === "user" && userDirty) {
      await handleSaveUser();
      return;
    }
    if (dirty) {
      await handleSave();
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
        <Link href="/dashboard">
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
            {dirty || userDirty ? (
              <Button type="button" onClick={() => void handleSaveAll()} disabled={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            ) : null}
            <Link href="/dashboard">
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
            <CardTitle className="text-lg">Quem configurar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={accessMode === "role" ? "default" : "outline"}
                onClick={() => setAccessMode("role")}
              >
                Por perfil (grupo)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={accessMode === "user" ? "default" : "outline"}
                onClick={() => setAccessMode("user")}
              >
                Por usuário
              </Button>
            </div>

            {accessMode === "role" ? (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {managedRoleSlugs.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={selectedRole === role ? "default" : "outline"}
                    className="shrink-0"
                    onClick={() => setSelectedRole(role)}
                  >
                    {roleLabels[role] ?? role}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Select
                  value={selectedUserId || "__unset"}
                  onValueChange={(v) => setSelectedUserId(v === "__unset" ? "" : v)}
                >
                  <SelectTrigger className="w-full sm:max-w-lg text-foreground">
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id!} value={u.id!}>
                        {u.name?.trim() ? `${u.name} — ${u.email}` : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  {!userCustomAccess ? (
                    <>
                      <p className="text-sm text-muted-foreground w-full">
                        Herda o perfil{" "}
                        <strong className="text-foreground">
                          {roleLabels[selectedUserRole] ?? selectedUserRole}
                        </strong>
                        . Personalize para definir acessos só deste usuário.
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handlePersonalizeUser()} disabled={saving || !selectedUserId}>
                        Personalizar acessos
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground w-full">
                        Acessos <strong className="text-foreground">personalizados</strong> — independentes do perfil.
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={handleInheritFromRole} disabled={saving}>
                        Voltar a herdar do perfil
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {accessMode === "role" ? (
              <AccessSummaryPanel
                summary={roleSummary}
                roleLabels={roleLabels}
                hint='Perfis servem como modelo para grupos; use "Por usuário" para exceções individuais.'
                editable
                isModuleEnabled={(slug) => rolePermissionsMap.get(slug) ?? false}
                onToggleModule={(slug, value) => handleModuleToggle(slug, selectedRole, value)}
              />
            ) : userEffectiveSummary ? (
              <AccessSummaryPanel
                summary={userEffectiveSummary}
                roleLabels={roleLabels}
                hint="Acessos herdados do perfil — personalize em Por usuário para alterar só este usuário."
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acesso por menu</CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Cada linha é um item do menu — marque individualmente. Financeiro, Compras e Estoque são
              permissões independentes.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Carregando…</p>
            ) : (
              <AccessPermissionTree
                tree={menuTree}
                isEnabled={isAccessEnabled}
                onToggleAccess={handleTreeToggleAccess}
                search={search}
                readOnly={accessMode === "user" && !userCustomAccess}
                expandWithAccess={accessMode === "role"}
              />
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
                                      {auditChangeLabel(c, roleLabels)}
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
