"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashboardDeptSearch,
  DashboardDeptSection,
  DashboardDeptTabs,
  DashboardDeptToolbarAside,
  DashboardFieldLabel,
  DashboardFilterBox,
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
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { InventoryCategoryRow } from "@/lib/inventory-kinds";
import { Tenant } from "@/types/tenant";
import { ProductsCatalogPanel } from "./components/ProductsCatalogPanel";
import { InventoryCategoryFormDialog } from "./components/InventoryCategoryFormDialog";
import type { ProductRow } from "./components/ProductFormDialog";
import { PurchaseRequisitionWorkflowPanel } from "./components/PurchaseRequisitionWorkflowPanel";
import { WorkflowInboxBanner } from "@/components/settings/WorkflowInboxBanner";
import { type SupplierRow } from "./components/SupplierFormDialog";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";

type TabId = "produtos" | "categorias" | "requisicoes";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "categorias", label: "Categorias", icon: FolderTree },
  { id: "requisicoes", label: "Requisições", icon: ShoppingCart },
];

function groupCustomCategories(rows: InventoryCategoryRow[]) {
  const m = new Map<string, { tenant: NonNullable<InventoryCategoryRow["tenant"]>; items: InventoryCategoryRow[] }>();
  for (const r of rows) {
    if (r.isSystem || !r.tenant) continue;
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

export default function AdmComprasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("produtos");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [assetCategories, setAssetCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategoryRow[]>([]);
  const [productsCount, setProductsCount] = useState(0);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<InventoryCategoryRow | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);

  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "error" });

  const { options: categoryOptions } = useInventoryCategories(tenantId || undefined);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length > 0 && !tenantId) setTenantId(list[0].id);
    } catch {
      setTenants([]);
    }
  }, [tenantId]);

  const loadCategories = useCallback(async (forTenant?: string) => {
    try {
      const eff = forTenant !== undefined ? forTenant : tenantId;
      const qs = eff ? `?tenantId=${encodeURIComponent(eff)}` : "";
      const { data } = await api.get<InventoryCategoryRow[]>(`/compras/inventory-categories${qs}`);
      setInventoryCategories(Array.isArray(data) ? data : []);
    } catch {
      setInventoryCategories([]);
    }
  }, [tenantId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "categorias") await loadCategories();
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadCategories]);

  useEffect(() => {
    if (!canAccessModule("adm_compras") && !authLoading) return;
    void loadTenants();
    api.get<SupplierRow[]>("/compras/suppliers").then(({ data }) => setSuppliers(Array.isArray(data) ? data : []));
    api.get<Array<{ id: string; name: string }>>("/patrimonio/asset-categories").then(({ data }) =>
      setAssetCategories(Array.isArray(data) ? data : []),
    );
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("adm_compras") || !tenantId) return;
    void loadCategories();
  }, [canAccessModule, tenantId, loadCategories]);

  useEffect(() => {
    if (!canAccessModule("adm_compras") || activeTab !== "categorias") return;
    setLoading(true);
    loadCategories().finally(() => setLoading(false));
  }, [activeTab, tenantId, canAccessModule, loadCategories]);

  const systemCategories = useMemo(
    () => inventoryCategories.filter((c) => c.isSystem),
    [inventoryCategories],
  );

  const filteredSystemCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return systemCategories;
    return systemCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [systemCategories, search]);

  const customCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    const custom = inventoryCategories.filter((c) => !c.isSystem);
    if (!q) return custom;
    return custom.filter((c) => c.name.toLowerCase().includes(q));
  }, [inventoryCategories, search]);

  const customGroups = useMemo(() => groupCustomCategories(customCategories), [customCategories]);

  const stats = useMemo(
    () => ({
      produtos: productsCount,
      categorias: inventoryCategories.length,
      sistema: systemCategories.length,
    }),
    [productsCount, inventoryCategories.length, systemCategories.length],
  );

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    setDeleting(true);
    try {
      await api.delete(`/compras/inventory-categories/${deleteCategoryId}`);
      setDeleteCategoryId(null);
      await loadCategories();
      setFeedback({
        open: true,
        title: "Excluído",
        message: "Categoria removida.",
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao excluir",
        message: err instanceof Error ? err.message : "Verifique se há produtos nesta categoria.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("adm_compras")) {
    router.replace("/403");
    return null;
  }

  const tenantLabel = tenantId
    ? tenants.find((t) => t.id === tenantId)?.name ?? "Clube selecionado"
    : "Selecione um clube";

  const listCount =
    activeTab === "categorias"
      ? filteredSystemCategories.length + customCategories.length
      : productsCount;

  const pageActions = (
    <DashboardDeptToolbarAside>
      {activeTab !== "requisicoes" ? (
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => void refresh()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      ) : null}
      {activeTab === "categorias" ? (
        <Button
          size="sm"
          className="min-h-[44px]"
          onClick={() => {
            setCategoryEdit(null);
            setCategoryDialogOpen(true);
          }}
          disabled={!tenantId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      ) : null}
      {activeTab === "produtos" ? (
        <Button
          size="sm"
          className="min-h-[44px]"
          onClick={() => {
            setEditProduct(null);
            setProductDialogOpen(true);
          }}
          disabled={!tenantId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo produto
        </Button>
      ) : null}
    </DashboardDeptToolbarAside>
  );

  return (
    <div className="space-y-6">
      <WorkflowInboxBanner variant="compras" />

      <DashboardStatGrid
        items={[
          { label: "Produtos", value: stats.produtos, tone: "emerald" },
          { label: "Categorias", value: stats.categorias, tone: "amber" },
          { label: "Padrão sistema", value: stats.sistema, tone: "sky" },
        ]}
      />

      <DashboardDeptSection title="Compras" description={tenantLabel} aside={pageActions}>
        <DashboardDeptTabs
          tabs={TABS}
          active={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            setSearch("");
          }}
        />

        {activeTab !== "requisicoes" ? (
          <>
            <DashboardFilterBox accent="emerald" className={activeTab === "produtos" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}>
              <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
                <DashboardFieldLabel accent="emerald">Clube / Empresa</DashboardFieldLabel>
                <NativeSelect
                  value={tenantId || ""}
                  onChange={(e) => setTenantId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {activeTab === "produtos" ? (
                <div className="grid gap-1.5">
                  <DashboardFieldLabel accent="emerald">Categoria</DashboardFieldLabel>
                  <NativeSelect value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                    <option value="todos">Todas</option>
                    {categoryOptions.map((k) => (
                      <option key={k.slug} value={k.slug}>
                        {k.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ) : null}
            </DashboardFilterBox>

            <DashboardDeptSearch
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === "produtos"
                  ? "Buscar produto por nome ou SKU…"
                  : "Buscar categoria por nome…"
              }
            />

            <p className="text-sm text-muted-foreground">
              {listCount === 0
                ? "Nenhum registro encontrado"
                : `${listCount} ${activeTab === "produtos" ? (listCount === 1 ? "produto" : "produtos") : listCount === 1 ? "categoria" : "categorias"}`}
              {activeTab === "produtos" ? (
                <>
                  {" · "}
                  <Link href="/dashboard/adm/estoque" className="text-primary underline">
                    Ir para Estoque
                  </Link>
                </>
              ) : null}
            </p>
          </>
        ) : null}

        {activeTab === "produtos" ? (
          <ProductsCatalogPanel
            embedded
            tenants={tenants}
            tenantId={tenantId}
            search={search}
            kindFilter={kindFilter}
            dialogOpen={productDialogOpen}
            onDialogOpenChange={setProductDialogOpen}
            editProduct={editProduct}
            onEditProductChange={setEditProduct}
            onProductsLoaded={setProductsCount}
          />
        ) : null}

        {activeTab === "categorias" ? (
          !tenantId ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Selecione um clube para ver e cadastrar categorias.
            </p>
          ) : loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </p>
          ) : (
            <div className="space-y-8">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Padrão do sistema</h3>
                <p className="text-xs text-muted-foreground">
                  Categorias já prontas (futebol, ADM, etc.). Não podem ser excluídas.
                </p>
                {filteredSystemCategories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria padrão encontrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredSystemCategories.map((c) => (
                      <li key={c.id}>
                        <div className="flex min-h-[56px] w-full flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">Categoria padrão · disponível para todos os clubes</p>
                          </div>
                          <span className="inline-flex shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Sistema
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Cadastradas por você</h3>
                <p className="text-xs text-muted-foreground">
                  Clique em <strong className="text-foreground">Nova categoria</strong> para criar (ex.: Uniforme de treino, Jogo, Saúde, Outros).
                </p>
                {customCategories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    Nenhuma categoria extra para este clube. Use «Nova categoria» no topo.
                  </p>
                ) : customGroups.length <= 1 ? (
                  <ul className="space-y-2">
                    {customCategories.map((c) => (
                      <li key={c.id}>
                        <div className="flex min-h-[56px] w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug text-foreground">{c.name}</p>
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
                              variant="outline"
                              size="sm"
                              className="min-h-[36px] text-destructive hover:text-destructive"
                              onClick={() => setDeleteCategoryId(c.id)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-5">
                    {customGroups.map((group) => (
                      <div key={group.tenant.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                          <span className="text-sm font-semibold text-foreground">{group.tenant.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {group.items.length} {group.items.length === 1 ? "categoria" : "categorias"}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {group.items.map((c) => (
                            <li key={c.id}>
                              <div className="flex min-h-[56px] w-full flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="font-semibold text-foreground">{c.name}</p>
                                <div className="flex gap-2">
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
                                    Editar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[36px] text-destructive"
                                    onClick={() => setDeleteCategoryId(c.id)}
                                  >
                                    Excluir
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )
        ) : null}

        {activeTab === "requisicoes" ? (
          <PurchaseRequisitionWorkflowPanel
            mode="compras"
            tenants={tenants}
            suppliers={suppliers}
            assetCategories={assetCategories}
            defaultTenantId={tenantId || tenants[0]?.id}
          />
        ) : null}
      </DashboardDeptSection>

      <InventoryCategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        tenants={tenants}
        edit={categoryEdit}
        defaultTenantId={tenantId}
        onSuccess={() => void loadCategories()}
      />

      <AlertDialog open={!!deleteCategoryId} onOpenChange={(o) => !o && setDeleteCategoryId(null)}>
        <AlertDialogContent className="text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Só é possível excluir se não houver produtos vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void handleDeleteCategory()}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
