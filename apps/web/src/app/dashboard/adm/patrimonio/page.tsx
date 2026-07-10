"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Warehouse,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Package,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { AssetCategoryFormDialog, type AssetCategoryRow } from "./components/AssetCategoryFormDialog";
import { AssetFormDialog, type AssetRow } from "./components/AssetFormDialog";
import { ASSET_CATEGORY_KIND_LABEL, ASSET_PIECE_LABEL } from "./patrimonio-labels";
import { patrimonioMediaThumbSrc } from "./patrimonio-media";
import { isTechnologyAssetKind } from "@/lib/infrastructure-tech-kinds";

type TabId = "bens" | "categorias";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "bens", label: "Bens patrimoniais", icon: Package },
  { id: "categorias", label: "Categorias", icon: FolderTree },
];

const NATIVE_SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full min-w-0";

const STATUS_LABEL: Record<string, string> = {
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
  emprestado: "Emprestado",
  baixado: "Baixado",
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

export default function AdmPatrimonioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("bens");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategoryRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<AssetCategoryRow | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetEdit, setAssetEdit] = useState<AssetRow | null>(null);

  const [deleteKind, setDeleteKind] = useState<"category" | "asset" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const categoryGroups = useMemo(() => {
    if (categories.length === 0) return [];
    if (tenantId) return [{ tenant: categories[0]!.tenant, items: categories }];
    return groupRowsByTenant(categories);
  }, [categories, tenantId]);

  const assetGroups = useMemo(() => {
    if (assets.length === 0) return [];
    if (tenantId) return [{ tenant: assets[0]!.tenant, items: assets }];
    return groupRowsByTenant(assets);
  }, [assets, tenantId]);

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
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  if (!canAccessModule("adm_patrimonio") && !authLoading) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 pb-6 pt-2 md:pt-4">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao dashboard
        </Link>
        <Card className="w-full min-w-0 overflow-hidden border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-8 w-8 text-muted-foreground shrink-0" />
              <CardTitle className="text-xl">Patrimônio</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 min-w-0 px-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid gap-2 min-w-[200px] flex-1 sm:flex-none">
                <label className="text-sm font-medium text-muted-foreground">Clube/Empresa</label>
                <select
                  className={NATIVE_SELECT_CLASS + " min-h-10"}
                  value={tenantId || "__all__"}
                  onChange={(e) => setTenantId(e.target.value === "__all__" ? "" : e.target.value)}
                >
                  <option value="__all__">Todos</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {activeTab === "bens" && (
                <>
                  <div className="grid gap-2 min-w-[140px] flex-1 sm:flex-none">
                    <label className="text-sm font-medium text-muted-foreground">Situação</label>
                    <select
                      className={NATIVE_SELECT_CLASS + " min-h-10"}
                      value={filterStatus || "__all__"}
                      onChange={(e) => setFilterStatus(e.target.value === "__all__" ? "" : e.target.value)}
                    >
                      <option value="__all__">Todas</option>
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2 min-w-[160px] flex-1 sm:flex-none">
                    <label className="text-sm font-medium text-muted-foreground">Peça (kit)</label>
                    <select
                      className={NATIVE_SELECT_CLASS + " min-h-10"}
                      value={filterPieceType || "__all__"}
                      onChange={(e) => setFilterPieceType(e.target.value === "__all__" ? "" : e.target.value)}
                    >
                      <option value="__all__">Todas</option>
                      {Object.entries(ASSET_PIECE_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 border-b">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-4 w-4 mr-1" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {activeTab === "categorias" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setCategoryEdit(null); setCategoryDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova categoria
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {tenantId
                      ? "Nenhuma categoria para este clube/empresa. Use «Nova categoria»."
                      : "Nenhuma categoria cadastrada. Use «Nova categoria» ou filtre por clube/empresa acima."}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {categoryGroups.map((group) => (
                      <div
                        key={group.tenant.id}
                        className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
                      >
                        {showTenantIndex && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-muted/50 border-b border-border">
                            <span className="font-semibold text-foreground text-sm">{group.tenant.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {group.items.length} {group.items.length === 1 ? "categoria" : "categorias"}
                            </span>
                          </div>
                        )}
                        <Table className="w-full table-fixed text-sm">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[30%] min-w-0">Categoria</TableHead>
                              <TableHead className="w-[12%] min-w-0">Código</TableHead>
                              <TableHead className="min-w-0">Tipo</TableHead>
                              <TableHead className="w-[76px] text-right pr-1">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium align-middle min-w-0">
                                  <span className="line-clamp-2 break-words" title={c.name}>
                                    {c.name}
                                  </span>
                                </TableCell>
                                <TableCell className="align-middle text-muted-foreground whitespace-normal break-all min-w-0">
                                  {c.code ?? "—"}
                                </TableCell>
                                <TableCell className="align-middle min-w-0">
                                  <span className="line-clamp-2 text-xs sm:text-sm text-muted-foreground" title={ASSET_CATEGORY_KIND_LABEL[c.kind] ?? c.kind}>
                                    {ASSET_CATEGORY_KIND_LABEL[c.kind] ?? c.kind}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right align-middle">
                                  <div className="flex justify-end gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setCategoryEdit(c); setCategoryDialogOpen(true); }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => { setDeleteKind("category"); setDeleteId(c.id); }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "bens" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setAssetEdit(null); setAssetDialogOpen(true); }} disabled={tenants.length === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo bem
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {tenantId
                      ? "Nenhum bem para este clube/empresa com os filtros atuais."
                      : "Nenhum bem cadastrado. Use «Novo bem» ou filtre por clube/empresa."}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {assetGroups.map((group) => (
                      <div
                        key={group.tenant.id}
                        className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
                      >
                        {showTenantIndex && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-muted/50 border-b border-border">
                            <span className="font-semibold text-foreground text-sm">{group.tenant.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {group.items.length} {group.items.length === 1 ? "bem" : "bens"}
                            </span>
                          </div>
                        )}
                        <Table className="w-full table-fixed text-sm">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-10 px-1">Foto</TableHead>
                              <TableHead className="min-w-0 w-[24%]">Descrição</TableHead>
                              <TableHead className="min-w-0 w-[22%]">Categoria</TableHead>
                              <TableHead className="min-w-0 hidden sm:table-cell w-[18%]">Kit / nº / jogador</TableHead>
                              <TableHead className="min-w-0 hidden md:table-cell w-[14%]">Local</TableHead>
                              <TableHead className="w-[5.5rem] min-w-0">Situação</TableHead>
                              <TableHead className="w-[4.5rem] text-right pr-1">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
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
                              const tagOrKit = kitLine || (a.tagNumber ? `Etq. ${a.tagNumber}` : "—");
                              return (
                                <TableRow key={a.id}>
                                  <TableCell className="px-2 align-middle w-11">
                                    {thumb ? (
                                      <img
                                        src={thumb}
                                        alt=""
                                        className="h-9 w-9 rounded object-cover border border-border"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="align-middle min-w-0 font-medium">
                                    <span className="line-clamp-2 break-words" title={a.description}>
                                      {a.description}
                                    </span>
                                    <span className="mt-1 block text-xs text-muted-foreground sm:hidden">{tagOrKit}</span>
                                  </TableCell>
                                  <TableCell className="align-middle min-w-0">
                                    <div className="line-clamp-1 font-medium" title={a.category.name}>
                                      {a.category.name}
                                    </div>
                                    <div className="line-clamp-2 text-[11px] sm:text-xs text-muted-foreground" title={ASSET_CATEGORY_KIND_LABEL[a.category.kind] ?? a.category.kind}>
                                      {ASSET_CATEGORY_KIND_LABEL[a.category.kind] ?? a.category.kind}
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-middle min-w-0 hidden sm:table-cell text-xs text-muted-foreground">
                                    <span className="line-clamp-3 break-words" title={tagOrKit}>
                                      {tagOrKit}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-middle min-w-0 hidden md:table-cell">
                                    <span className="line-clamp-2 text-xs break-words" title={a.location ?? ""}>
                                      {a.location ?? "—"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-middle text-xs whitespace-normal min-w-0">
                                    {STATUS_LABEL[a.status] ?? a.status}
                                  </TableCell>
                                  <TableCell className="text-right align-middle">
                                    <div className="flex justify-end gap-0.5">
                                      {isTechnologyAssetKind(a.category.kind) ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                          <Link
                                            href={`/dashboard/adm/patrimonio/${a.id}?tab=infraestrutura`}
                                            title="Ficha de infraestrutura"
                                          >
                                            <Server className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      ) : null}
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setAssetEdit(a); setAssetDialogOpen(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => { setDeleteKind("asset"); setDeleteId(a.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
        onPhotoUpdated={() => {
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
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
