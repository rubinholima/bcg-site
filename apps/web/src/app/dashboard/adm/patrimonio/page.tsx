"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Package,
  Server,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardDeptSearch,
  DashboardDeptSection,
  DashboardDeptTabs,
  DashboardDeptToolbarAside,
  DashboardEmptyState,
  DashboardFieldLabel,
  DashboardFilterBox,
  DashboardListRow,
  DashboardLoadingState,
  DashboardStatGrid,
} from "@/components/dashboard/DashboardDeptHeader";
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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tenant } from "@/types/tenant";
import { AssetCategoryFormDialog, type AssetCategoryRow } from "./components/AssetCategoryFormDialog";
import { AssetFormDialog, type AssetRow } from "./components/AssetFormDialog";
import { ASSET_CATEGORY_KIND_LABEL, ASSET_PIECE_LABEL } from "./patrimonio-labels";
import { patrimonioMediaThumbSrc } from "./patrimonio-media";
import { isTechnologyAssetKind } from "@/lib/infrastructure-tech-kinds";
import { NativeSelect } from "@/components/ui/native-select";

type TabId = "bens" | "categorias";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "bens", label: "Bens patrimoniais", icon: Package },
  { id: "categorias", label: "Categorias", icon: FolderTree },
];

const STATUS_LABEL: Record<string, string> = {
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
  emprestado: "Emprestado",
  baixado: "Baixado",
};

const STATUS_BADGE: Record<string, string> = {
  em_uso: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  em_manutencao: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  emprestado: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  baixado: "bg-muted text-muted-foreground",
};

function groupRowsByTenant<T extends { tenant: { id: string; name: string; slug: string } }>(rows: T[]) {
  const m = new Map<string, { tenant: T["tenant"]; items: T[] }>();
  for (const r of rows) {
    const id = r.tenant.id;
    let g = m.get(id);
    if (!g) {
      g = { tenant: r.tenant, items: [] };
      m.set(id, g);
    }
    g.items.push(r);
  }
  return [...m.values()].sort((a, b) =>
    a.tenant.name.localeCompare(b.tenant.name, "pt", { sensitivity: "base" }),
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_BADGE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function AdmPatrimonioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("bens");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategoryRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [search, setSearch] = useState("");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<AssetCategoryRow | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetEdit, setAssetEdit] = useState<AssetRow | null>(null);

  const [deleteKind, setDeleteKind] = useState<"category" | "asset" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "error" });

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPieceType, setFilterPieceType] = useState<string>("");

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadCategories = useCallback(async (forTenant?: string) => {
    try {
      const eff = forTenant !== undefined ? forTenant : tenantId;
      const qs = eff ? `?tenantId=${encodeURIComponent(eff)}` : "";
      const { data } = await api.get<AssetCategoryRow[]>(`/patrimonio/asset-categories${qs}`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, [tenantId]);

  const loadAssets = useCallback(async (forTenant?: string) => {
    try {
      const eff = forTenant !== undefined ? forTenant : tenantId;
      const params = new URLSearchParams();
      if (eff) params.set("tenantId", eff);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPieceType) params.set("pieceType", filterPieceType);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get<AssetRow[]>(`/patrimonio/assets${qs}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    }
  }, [tenantId, filterStatus, filterPieceType]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "categorias") {
        await loadCategories();
      } else {
        await loadAssets();
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadCategories, loadAssets]);

  useEffect(() => {
    if (!canAccessModule("adm_patrimonio") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("adm_patrimonio")) return;
    setLoading(true);
    if (activeTab === "categorias") {
      loadCategories().finally(() => setLoading(false));
    } else {
      loadAssets().finally(() => setLoading(false));
    }
  }, [activeTab, tenantId, canAccessModule, loadCategories, loadAssets]);

  useEffect(() => {
    if (!canAccessModule("adm_patrimonio")) return;
    loadCategories();
    loadAssets();
  }, [tenantId, filterStatus, filterPieceType, canAccessModule, loadCategories, loadAssets]);

  const showTenantIndex = !tenantId;

  const stats = useMemo(
    () => ({
      bens: assets.length,
      categorias: categories.length,
      emUso: assets.filter((a) => a.status === "em_uso").length,
    }),
    [assets, categories],
  );

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => {
      const hay = [
        a.description,
        a.category.name,
        ASSET_CATEGORY_KIND_LABEL[a.category.kind],
        a.location,
        a.tagNumber,
        a.responsibleName,
        a.assignedPlayer?.name,
        a.pieceType ? ASSET_PIECE_LABEL[a.pieceType] : null,
        STATUS_LABEL[a.status],
        a.tenant.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [assets, search]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      const hay = [c.name, c.code, ASSET_CATEGORY_KIND_LABEL[c.kind], c.tenant.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [categories, search]);

  const categoryGroups = useMemo(() => {
    if (filteredCategories.length === 0) return [];
    if (tenantId) return [{ tenant: filteredCategories[0]!.tenant, items: filteredCategories }];
    return groupRowsByTenant(filteredCategories);
  }, [filteredCategories, tenantId]);

  const assetGroups = useMemo(() => {
    if (filteredAssets.length === 0) return [];
    if (tenantId) return [{ tenant: filteredAssets[0]!.tenant, items: filteredAssets }];
    return groupRowsByTenant(filteredAssets);
  }, [filteredAssets, tenantId]);

  const handleDeleteConfirm = async () => {
    if (!deleteKind || !deleteId) return;
    setDeleting(true);
    try {
      if (deleteKind === "category") await api.delete(`/patrimonio/asset-categories/${deleteId}`);
      if (deleteKind === "asset") await api.delete(`/patrimonio/assets/${deleteId}`);
      loadCategories();
      loadAssets();
      setDeleteKind(null);
      setDeleteId(null);
      setFeedback({
        open: true,
        title: "Excluído",
        message: deleteKind === "category" ? "Categoria removida." : "Bem removido do patrimônio.",
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao excluir",
        message: err instanceof Error ? err.message : "Não foi possível excluir. Tente novamente.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!canAccessModule("adm_patrimonio") && !authLoading) {
    router.replace("/403");
    return null;
  }

  const listCount = activeTab === "bens" ? filteredAssets.length : filteredCategories.length;
  const tenantLabel = tenantId
    ? tenants.find((t) => t.id === tenantId)?.name ?? "Clube selecionado"
    : "Todos os clubes e empresas";

  const pageActions = (
    <DashboardDeptToolbarAside>
      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => void refresh()} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        Atualizar
      </Button>
      <Button
        size="sm"
        className="min-h-[44px]"
        onClick={() => {
          if (activeTab === "categorias") {
            setCategoryEdit(null);
            setCategoryDialogOpen(true);
          } else {
            setAssetEdit(null);
            setAssetDialogOpen(true);
          }
        }}
        disabled={activeTab === "bens" && tenants.length === 0}
      >
        <Plus className="mr-2 h-4 w-4" />
        {activeTab === "categorias" ? "Nova categoria" : "Novo bem"}
      </Button>
    </DashboardDeptToolbarAside>
  );

  return (
    <>
      <DashboardStatGrid
        items={[
          { label: "Bens cadastrados", value: stats.bens, tone: "emerald" },
          { label: "Em uso", value: stats.emUso, tone: "sky" },
          { label: "Categorias", value: stats.categorias, tone: "amber" },
        ]}
      />

      <DashboardDeptSection
        title="Lista"
        description={tenantLabel}
        aside={pageActions}
      >
        <DashboardDeptTabs tabs={TABS} active={activeTab} onChange={(id) => { setActiveTab(id); setSearch(""); }} />

        <DashboardFilterBox accent="emerald" className={activeTab === "bens" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}>
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
            <DashboardFieldLabel accent="emerald">Clube / Empresa</DashboardFieldLabel>
            <NativeSelect
              value={tenantId || "__all__"}
              onChange={(e) => setTenantId(e.target.value === "__all__" ? "" : e.target.value)}
            >
              <option value="__all__">Todos</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          {activeTab === "bens" && (
            <>
              <div className="grid gap-1.5">
                <DashboardFieldLabel accent="emerald">Situação</DashboardFieldLabel>
                <NativeSelect
                  value={filterStatus || "__all__"}
                  onChange={(e) => setFilterStatus(e.target.value === "__all__" ? "" : e.target.value)}
                >
                  <option value="__all__">Todas</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <DashboardFieldLabel accent="emerald">Peça (kit)</DashboardFieldLabel>
                <NativeSelect
                  value={filterPieceType || "__all__"}
                  onChange={(e) => setFilterPieceType(e.target.value === "__all__" ? "" : e.target.value)}
                >
                  <option value="__all__">Todas</option>
                  {Object.entries(ASSET_PIECE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </>
          )}
        </DashboardFilterBox>

        <DashboardDeptSearch
          value={search}
          onChange={setSearch}
          placeholder={
            activeTab === "bens"
              ? "Buscar por descrição, categoria, local, jogador…"
              : "Buscar por nome, código ou tipo de categoria…"
          }
        />

        <p className="text-sm text-muted-foreground">
          {listCount === 0
            ? "Nenhum registro encontrado"
            : `${listCount} ${activeTab === "bens" ? (listCount === 1 ? "bem" : "bens") : listCount === 1 ? "categoria" : "categorias"}`}
        </p>

          {loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </p>
          ) : activeTab === "categorias" ? (
            filteredCategories.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {tenantId
                  ? "Nenhuma categoria para este clube. Clique em «Nova categoria»."
                  : "Nenhuma categoria cadastrada. Crie a primeira categoria para organizar os bens."}
              </p>
            ) : (
              <div className="space-y-5">
                {categoryGroups.map((group) => (
                  <div key={group.tenant.id} className="space-y-2">
                    {showTenantIndex && (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                        <span className="text-sm font-semibold text-foreground">{group.tenant.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {group.items.length} {group.items.length === 1 ? "categoria" : "categorias"}
                        </span>
                      </div>
                    )}
                    <ul className="space-y-2">
                      {group.items.map((c) => (
                        <li key={c.id}>
                          <div className="flex min-h-[56px] w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="font-semibold leading-snug text-foreground">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[c.code ? `Cód. ${c.code}` : null, ASSET_CATEGORY_KIND_LABEL[c.kind] ?? c.kind]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-[36px]"
                                onClick={() => {
                                  setCategoryEdit(c);
                                  setCategoryDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                                title="Excluir categoria"
                                onClick={() => {
                                  setDeleteKind("category");
                                  setDeleteId(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          ) : filteredAssets.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {tenantId
                ? "Nenhum bem com os filtros atuais. Ajuste os filtros ou cadastre um novo bem."
                : "Nenhum bem cadastrado. Clique em «Novo bem» para começar."}
            </p>
          ) : (
            <div className="space-y-5">
              {assetGroups.map((group) => (
                <div key={group.tenant.id} className="space-y-2">
                  {showTenantIndex && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                      <span className="text-sm font-semibold text-foreground">{group.tenant.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {group.items.length} {group.items.length === 1 ? "bem" : "bens"}
                      </span>
                    </div>
                  )}
                  <ul className="space-y-2">
                    {group.items.map((a) => {
                      const thumb = patrimonioMediaThumbSrc(a.photoUrl);
                      const kitLine = [
                        a.pieceType ? ASSET_PIECE_LABEL[a.pieceType] ?? a.pieceType : null,
                        a.shirtNumber != null ? `#${a.shirtNumber}` : null,
                        a.size?.trim() || null,
                        a.assignedPlayer?.name || null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const tagOrKit = kitLine || (a.tagNumber ? `Etq. ${a.tagNumber}` : null);
                      const secondary = [
                        a.category.name,
                        ASSET_CATEGORY_KIND_LABEL[a.category.kind] ?? a.category.kind,
                      ].join(" · ");
                      const tertiary = [a.location, tagOrKit].filter(Boolean).join(" · ");

                      return (
                        <li key={a.id}>
                          <div className="flex min-h-[64px] w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                              onClick={() => {
                                setAssetEdit(a);
                                setAssetDialogOpen(true);
                              }}
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                {thumb ? (
                                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold leading-snug text-foreground">{a.description}</p>
                                  <StatusBadge status={a.status} />
                                </div>
                                <p className="truncate text-xs text-muted-foreground">{secondary}</p>
                                {tertiary ? (
                                  <p className="truncate text-xs text-muted-foreground">{tertiary}</p>
                                ) : null}
                              </div>
                            </button>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[3.75rem] sm:pl-0">
                              {isTechnologyAssetKind(a.category.kind) ? (
                                <Button variant="outline" size="sm" className="min-h-[36px]" asChild>
                                  <Link href={`/dashboard/adm/patrimonio/${a.id}?tab=infraestrutura`}>
                                    <Server className="mr-1.5 h-3.5 w-3.5" />
                                    Infra
                                  </Link>
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-[36px]"
                                onClick={() => {
                                  setAssetEdit(a);
                                  setAssetDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                                title="Excluir bem"
                                onClick={() => {
                                  setDeleteKind("asset");
                                  setDeleteId(a.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
      </DashboardDeptSection>

      <AssetCategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        tenants={tenants}
        edit={categoryEdit}
        onSuccess={(savedTenantId) => {
          setCategoryEdit(null);
          if (savedTenantId) {
            setTenantId(savedTenantId);
            void loadCategories(savedTenantId);
          }
        }}
      />

      <AssetFormDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        tenants={tenants}
        categories={categories}
        tenantId={tenantId}
        edit={assetEdit}
        onSuccess={(savedTenantId) => {
          setAssetEdit(null);
          if (savedTenantId) {
            setTenantId(savedTenantId);
            void loadAssets(savedTenantId);
            void loadCategories(savedTenantId);
          }
        }}
        onPhotoUpdated={(photoUrl) => {
          setAssetEdit((prev) => (prev ? { ...prev, photoUrl: photoUrl || null } : prev));
          void loadAssets(tenantId || undefined);
        }}
      />

      <AlertDialog open={!!deleteKind} onOpenChange={(open) => !open && setDeleteKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteKind === "category" && "Excluir esta categoria? Ela não pode possuir bens vinculados."}
              {deleteKind === "asset" && "Excluir este bem do patrimônio? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
