"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  AlertTriangle,
  Package,
  Truck,
  FileText,
  ShoppingBag,
  Loader2,
  Plus,
  Pencil,
  Trash2,
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
import { SupplierFormDialog, type SupplierRow } from "./components/SupplierFormDialog";
import { ProductFormDialog, type ProductRow } from "./components/ProductFormDialog";
import { PurchaseRequisitionFormDialog, type PurchaseRequisitionRow } from "./components/PurchaseRequisitionFormDialog";
import { PurchaseOrderFormDialog, type PurchaseOrderRow } from "./components/PurchaseOrderFormDialog";

type TabId = "alertas" | "produtos" | "fornecedores" | "requisicoes" | "ordens";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "alertas", label: "Alertas de estoque", icon: AlertTriangle },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "fornecedores", label: "Fornecedores", icon: Truck },
  { id: "requisicoes", label: "Requisições de compra", icon: FileText },
  { id: "ordens", label: "Ordens de compra", icon: ShoppingBag },
];

export default function AdmComprasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("alertas");
  const [tenantId, setTenantId] = useState<string>("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<ProductRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisitionRow[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);

  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierEdit, setSupplierEdit] = useState<SupplierRow | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productEdit, setProductEdit] = useState<ProductRow | null>(null);
  const [requisitionDialogOpen, setRequisitionDialogOpen] = useState(false);
  const [requisitionEdit, setRequisitionEdit] = useState<PurchaseRequisitionRow | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderEdit, setOrderEdit] = useState<PurchaseOrderRow | null>(null);

  const [deleteKind, setDeleteKind] = useState<"supplier" | "product" | "requisition" | "order" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadAlertas = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<ProductRow[]>(`/compras/products/stock-alerts${qs}`);
      setAlertas(Array.isArray(data) ? data : []);
    } catch {
      setAlertas([]);
    }
  }, [tenantId]);

  const loadProducts = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<ProductRow[]>(`/compras/products${qs}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }, [tenantId]);

  const loadSuppliers = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<SupplierRow[]>(`/compras/suppliers${qs}`);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      setSuppliers([]);
    }
  }, [tenantId]);

  const loadRequisitions = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<PurchaseRequisitionRow[]>(`/compras/purchase-requisitions${qs}`);
      setRequisitions(Array.isArray(data) ? data : []);
    } catch {
      setRequisitions([]);
    }
  }, [tenantId]);

  const loadOrders = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<PurchaseOrderRow[]>(`/compras/purchase-orders${qs}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    }
  }, [tenantId]);

  const refreshAll = useCallback(() => {
    loadAlertas();
    loadProducts();
    loadSuppliers();
    loadRequisitions();
    loadOrders();
  }, [loadAlertas, loadProducts, loadSuppliers, loadRequisitions, loadOrders]);

  useEffect(() => {
    if (!canAccessModule("adm_compras") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("adm_compras")) return;
    setLoading(true);
    const loads: Promise<void>[] = [];
    if (activeTab === "alertas") loads.push(loadAlertas());
    if (activeTab === "produtos") loads.push(loadProducts());
    if (activeTab === "fornecedores") loads.push(loadSuppliers());
    if (activeTab === "requisicoes") loads.push(loadRequisitions());
    if (activeTab === "ordens") loads.push(loadOrders());
    Promise.all(loads).finally(() => setLoading(false));
  }, [activeTab, tenantId, canAccessModule, loadAlertas, loadProducts, loadSuppliers, loadRequisitions, loadOrders]);

  // Carrega produtos e fornecedores uma vez para os formulários de requisição e ordem
  useEffect(() => {
    if (!canAccessModule("adm_compras") || tenants.length === 0) return;
    loadProducts();
    loadSuppliers();
  }, [canAccessModule, tenants.length, loadProducts, loadSuppliers]);

  const handleDeleteConfirm = async () => {
    if (!deleteKind || !deleteId) return;
    setDeleting(true);
    try {
      if (deleteKind === "supplier") await api.delete(`/compras/suppliers/${deleteId}`);
      if (deleteKind === "product") await api.delete(`/compras/products/${deleteId}`);
      if (deleteKind === "requisition") await api.delete(`/compras/purchase-requisitions/${deleteId}`);
      if (deleteKind === "order") await api.delete(`/compras/purchase-orders/${deleteId}`);
      refreshAll();
      setDeleteKind(null);
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("adm_compras")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Compras
          </h1>
          <p className="text-muted-foreground">
            Departamento administrativo — requisições, ordens, fornecedores e alertas de estoque
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtro por clube/empresa</CardTitle>
          <CardDescription>Opcional. Deixe em branco para ver todos.</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">Todos</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(id)}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {activeTab === "alertas" && (
            <Card>
              <CardHeader>
                <CardTitle>Produtos com estoque abaixo do mínimo</CardTitle>
                <CardDescription>
                  Produtos com currentStock &le; estoque mínimo. Configure o estoque mínimo nos cadastros de produto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertas.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum alerta no momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Mín.</TableHead>
                        <TableHead className="text-right">Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertas.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.sku ?? "—"}</TableCell>
                          <TableCell className="text-right">{p.stockMin}</TableCell>
                          <TableCell className="text-right text-amber-600 font-medium">{p.currentStock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "produtos" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Produtos</CardTitle>
                    <CardDescription>Cadastro de produtos e controle de estoque mínimo.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setProductEdit(null);
                      setProductDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum produto cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Estoque mín.</TableHead>
                        <TableHead className="text-right">Estoque atual</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.sku ?? "—"}</TableCell>
                          <TableCell>{p.unit}</TableCell>
                          <TableCell className="text-right">{p.stockMin}</TableCell>
                          <TableCell className="text-right">{p.currentStock}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setProductEdit(p);
                                  setProductDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  setDeleteKind("product");
                                  setDeleteId(p.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "fornecedores" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Fornecedores</CardTitle>
                    <CardDescription>Cadastro de fornecedores para ordens de compra.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSupplierEdit(null);
                      setSupplierDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo fornecedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {suppliers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum fornecedor cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.contactName ?? "—"}</TableCell>
                          <TableCell>{s.email ?? "—"}</TableCell>
                          <TableCell>{s.phone ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSupplierEdit(s);
                                  setSupplierDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  setDeleteKind("supplier");
                                  setDeleteId(s.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "requisicoes" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Requisições de compra</CardTitle>
                    <CardDescription>Requisições enviadas para cotação e aprovação.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRequisitionEdit(null);
                      setRequisitionDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova requisição
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {requisitions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma requisição.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Solicitante</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total est.</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requisitions.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{r.requestedByName}</TableCell>
                          <TableCell>{new Date(r.requestedAt).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{r.status}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.totalEstimated != null ? `R$ ${r.totalEstimated.toLocaleString("pt-BR")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setRequisitionEdit(r);
                                  setRequisitionDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  setDeleteKind("requisition");
                                  setDeleteId(r.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "ordens" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Ordens de compra</CardTitle>
                    <CardDescription>Ordens enviadas aos fornecedores.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setOrderEdit(null);
                      setOrderDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova ordem
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma ordem de compra.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Nº OP</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{o.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{o.orderNumber ?? "—"}</TableCell>
                          <TableCell>{o.supplier?.name ?? "—"}</TableCell>
                          <TableCell>{new Date(o.orderedAt).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{o.status}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {o.totalAmount != null ? `R$ ${o.totalAmount.toLocaleString("pt-BR")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setOrderEdit(o);
                                  setOrderDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  setDeleteKind("order");
                                  setDeleteId(o.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        tenants={tenants}
        edit={supplierEdit}
        onSuccess={() => {
          loadSuppliers();
          setSupplierEdit(null);
        }}
      />
      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        tenants={tenants}
        edit={productEdit}
        onSuccess={() => {
          loadProducts();
          loadAlertas();
          setProductEdit(null);
        }}
      />
      <PurchaseRequisitionFormDialog
        open={requisitionDialogOpen}
        onOpenChange={setRequisitionDialogOpen}
        tenants={tenants}
        products={products}
        edit={requisitionEdit}
        onSuccess={() => {
          loadRequisitions();
          setRequisitionEdit(null);
        }}
      />
      <PurchaseOrderFormDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        tenants={tenants}
        suppliers={suppliers}
        products={products}
        requisitions={requisitions.map((r) => ({ id: r.id, requestedByName: r.requestedByName, tenantId: r.tenant.id }))}
        edit={orderEdit}
        onSuccess={() => {
          loadOrders();
          setOrderEdit(null);
        }}
      />

      <AlertDialog open={!!deleteKind} onOpenChange={(open) => !open && setDeleteKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteKind === "supplier" && "Tem certeza que deseja excluir este fornecedor?"}
              {deleteKind === "product" && "Tem certeza que deseja excluir este produto?"}
              {deleteKind === "requisition" && "Tem certeza que deseja excluir esta requisição de compra?"}
              {deleteKind === "order" && "Tem certeza que deseja excluir esta ordem de compra?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
