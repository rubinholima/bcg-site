"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getPublicImageUrl } from "@/lib/media-url";

type TabId = "categorias" | "bens";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "categorias", label: "Categorias", icon: FolderTree },
  { id: "bens", label: "Bens patrimoniais", icon: Package },
];

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
}

const NATIVE_SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full min-w-0";

const STATUS_LABEL: Record<string, string> = {
  em_uso: "Em uso",
  em_manutencao: "Em manutenção",
  emprestado: "Emprestado",
  baixado: "Baixado",
};

export default function AdmPatrimonioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("categorias");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategoryRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);

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

  const loadCategories = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<AssetCategoryRow[]>(`/patrimonio/asset-categories${qs}`);
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  }, [tenantId]);

  const loadAssets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPieceType) params.set("pieceType", filterPieceType);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const { data } = await api.get<AssetRow[]>(`/patrimonio/assets${qs}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    }
  }, [tenantId, filterStatus, filterPieceType]);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    try {
      const { data } = await api.get<PlayerOption[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`);
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  }, [tenantId]);

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
    loadCategories();
    loadAssets();
  }, [tenantId, loadCategories, loadAssets]);

  useEffect(() => {
    loadPlayers();
  }, [tenantId, loadPlayers]);

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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao dashboard
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle>Patrimônio</CardTitle>
                <CardDescription>
                  Bens patrimoniais (empresa e clube). Para clubes: kit uniforme (camisa, calção, meião) com tamanho, número e jogador atribuído.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                ) : !tenantId ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa para listar categorias.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Clube/Empresa</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.code ?? "—"}</TableCell>
                            <TableCell>{ASSET_CATEGORY_KIND_LABEL[c.kind] ?? c.kind}</TableCell>
                            <TableCell>{c.tenant.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCategoryEdit(c); setCategoryDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("category"); setDeleteId(c.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {activeTab === "bens" && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => { setAssetEdit(null); setAssetDialogOpen(true); }} disabled={!tenantId && tenants.length > 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo bem
                  </Button>
                </div>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !tenantId && tenants.length > 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa para listar bens.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-14">Foto</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Peça</TableHead>
                          <TableHead>Nº / Tamanho</TableHead>
                          <TableHead>Jogador</TableHead>
                          <TableHead>Localização</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.description}</TableCell>
                            <TableCell>
                              {a.photoUrl?.trim() ? (
                                <img
                                  src={getPublicImageUrl(a.photoUrl.trim())}
                                  alt=""
                                  className="h-10 w-10 rounded object-cover border border-border"
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>{a.category.name}</TableCell>
                            <TableCell className="max-w-[140px] text-xs text-muted-foreground">
                              {ASSET_CATEGORY_KIND_LABEL[a.category.kind] ?? a.category.kind}
                            </TableCell>
                            <TableCell>{a.pieceType ? ASSET_PIECE_LABEL[a.pieceType] ?? a.pieceType : "—"}</TableCell>
                            <TableCell>
                              {a.shirtNumber != null ? `#${a.shirtNumber}` : ""}
                              {a.size ? ` ${a.size}` : ""}
                              {!a.shirtNumber && !a.size ? (a.tagNumber ?? "—") : ""}
                            </TableCell>
                            <TableCell>{a.assignedPlayer?.name ?? "—"}</TableCell>
                            <TableCell>{a.location ?? "—"}</TableCell>
                            <TableCell>{STATUS_LABEL[a.status] ?? a.status}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAssetEdit(a); setAssetDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("asset"); setDeleteId(a.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
        onSuccess={() => { loadCategories(); setCategoryEdit(null); }}
      />

      <AssetFormDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        tenants={tenants}
        categories={categories}
        players={players}
        tenantId={tenantId}
        edit={assetEdit}
        onSuccess={() => { loadAssets(); loadCategories(); setAssetEdit(null); }}
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
