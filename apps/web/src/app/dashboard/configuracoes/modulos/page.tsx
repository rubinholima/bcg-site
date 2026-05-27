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
  type MenuDepartmentGroup,
} from "@/lib/dashboard-menu.config";
import { AccessPermissionTree } from "@/components/dashboard/access/AccessPermissionTree";
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
    ])
      .then(([, res]) => {
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
  }, [modules, menuDepartments, slugToDepartment]);

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
    const departments = new Set(
      displayModules.filter((d) => roleChecked(d, selectedRole)).map((d) => d.departmentId),
    );
    return {
      moduleCount: enabled.length,
      sectionCount: departments.size,
      enabledModules: enabled.map((m) => MODULE_DISPLAY_NAMES[m.slug] ?? m.name),
    };
  }, [mergedModuleState, selectedRole, displayModules]);

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
    (rows: DisplayRow[], role: ManagedRoleKey, value: boolean) => {
      if (rows.length === 0) return;

      setModules((prev) => {
        const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
        for (const d of rows) {
          const raw = bySlug.get(d.slug);
          const existing: ModulePermission = {
            slug: d.slug,
            name: MODULE_DISPLAY_NAMES[d.slug] ?? d.name,
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
          bySlug.set(d.slug, applyRoleToRow(existing, role, value));
        }
        return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDirty(true);
      setSaveBanner(null);
    },
    [],
  );

  const handleDepartmentToggle = (role: ManagedRoleKey, rows: DisplayRow[]) => {
    const state = getSectionAccessState(rows, role);
    handleDepartmentAccess(rows, role, state !== "all");
  };

  const handleModuleToggle = (slug: string, role: ManagedRoleKey, value: boolean) => {
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
            comissao: dm.comissao,
          }
        : null;
      const found = prev.find((m) => m.slug === slug);
      if (found) {
        return prev.map((m) => (m.slug === slug ? applyRoleToRow(m, role, value) : m));
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
          comissao: false,
        } satisfies ModulePermission);
      return [...prev, applyRoleToRow(base, role, value)];
    });
    setDirty(true);
    setSaveBanner(null);
  };

  const rolePermissionsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of mergedModuleState) {
      map.set(m.slug, roleChecked(m, selectedRole));
    }
    return map;
  }, [mergedModuleState, selectedRole]);

  const isAccessEnabled = useCallback(
    (accessSlug: string, legacyModuleSlug?: string) => {
      const read = (slug: string) => {
        if (accessMode === "role") {
          if (rolePermissionsMap.has(slug)) return rolePermissionsMap.get(slug) ?? false;
          return false;
        }
        if (userCustomAccess) {
          if (slug in userPermissions) return userPermissions[slug] ?? false;
        }
        const userRole = selectedUserRole as ManagedRoleKey;
        const mod = mergedModuleState.find((m) => m.slug === slug);
        return mod ? roleChecked(mod, userRole) : false;
      };
      if (read(accessSlug)) return true;
      if (legacyModuleSlug && legacyModuleSlug !== accessSlug && read(legacyModuleSlug)) return true;
      return false;
    },
    [accessMode, rolePermissionsMap, userCustomAccess, userPermissions, selectedUserRole, mergedModuleState],
  );

  const handleTreeToggleAccess = (accessSlug: string, value: boolean) => {
    if (accessMode === "role") {
      handleModuleToggle(accessSlug, selectedRole, value);
      return;
    }
    setUserPermissions((prev) => ({ ...prev, [accessSlug]: value }));
    setUserCustomAccess(true);
    setUserDirty(true);
    setSaveBanner(null);
  };

  const applySlugsToRole = useCallback(
    (slugs: string[], role: ManagedRoleKey, value: boolean) => {
      setModules((prev) => {
        const bySlug = new Map(prev.map((m) => [m.slug, { ...m }]));
        for (const slug of slugs) {
          const d = displayModules.find((x) => x.slug === slug);
          const raw = bySlug.get(slug);
          const existing: ModulePermission = {
            slug,
            name: MODULE_DISPLAY_NAMES[slug] ?? d?.name ?? slug,
            sortOrder: d?.sortOrder ?? raw?.sortOrder ?? 0,
            functionalArea: d?.functionalArea ?? raw?.functionalArea ?? "outros",
            company_admin: raw?.company_admin ?? d?.company_admin ?? false,
            editor: raw?.editor ?? d?.editor ?? false,
            gerente: raw?.gerente ?? d?.gerente ?? false,
            administrativo: raw?.administrativo ?? d?.administrativo ?? false,
            analista: raw?.analista ?? d?.analista ?? false,
            diretoria: raw?.diretoria ?? d?.diretoria ?? false,
            medico: raw?.medico ?? d?.medico ?? false,
            psicologo: raw?.psicologo ?? d?.psicologo ?? false,
            comissao: raw?.comissao ?? d?.comissao ?? false,
          };
          bySlug.set(slug, applyRoleToRow(existing, role, value));
        }
        return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setDirty(true);
      setSaveBanner(null);
    },
    [displayModules],
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
                          {MANAGED_ROLE_LABELS[selectedUserRole as ManagedRoleKey] ?? selectedUserRole}
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
              <div className="rounded-lg border bg-muted/25 px-4 py-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {MANAGED_ROLE_LABELS[selectedRole]} — {roleSummary.moduleCount} módulo
                  {roleSummary.moduleCount === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Perfis servem como modelo para grupos; use &quot;Por usuário&quot; para exceções individuais.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acesso por menu</CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Cada linha é um item do menu — marque individualmente. Grupos Omie (Financeiro, Compras,
              Estoque) compartilham permissão porque dependem uns dos outros.
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
