"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenueCatalogPackage, VenueCatalogService } from "@/types/boston-city-hall";
import {
  formatCatalogMoney,
  VENUE_CATALOG_BILLING_UNIT_LABEL,
  VENUE_CATALOG_BILLING_UNITS,
  VENUE_CATALOG_CATEGORIES,
  VENUE_CATALOG_CATEGORY_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type Tab = "services" | "packages";

type ServiceForm = {
  name: string;
  description: string;
  category: string;
  defaultPrice: string;
  billingUnit: string;
  sortOrder: string;
  active: string;
};

type PackageItemRow = { serviceId: string; quantity: string };

type PackageForm = {
  name: string;
  description: string;
  defaultPrice: string;
  sortOrder: string;
  active: string;
  items: PackageItemRow[];
};

const emptyServiceForm = (): ServiceForm => ({
  name: "",
  description: "",
  category: "venue",
  defaultPrice: "",
  billingUnit: "flat",
  sortOrder: "0",
  active: "true",
});

const emptyPackageForm = (): PackageForm => ({
  name: "",
  description: "",
  defaultPrice: "",
  sortOrder: "0",
  active: "true",
  items: [],
});

export function BostonCityHallCatalog() {
  const [tab, setTab] = useState<Tab>("services");

  const [services, setServices] = useState<VenueCatalogService[]>([]);
  const [packages, setPackages] = useState<VenueCatalogPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [serviceDialog, setServiceDialog] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm());
  const [serviceEditId, setServiceEditId] = useState<string | null>(null);

  const [packageDialog, setPackageDialog] = useState(false);
  const [packageForm, setPackageForm] = useState<PackageForm>(emptyPackageForm());
  const [packageEditId, setPackageEditId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadServices = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchDebounced) params.set("q", searchDebounced);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (activeFilter !== "all") params.set("active", activeFilter);
    const qs = params.toString();
    const res = await api.get<VenueCatalogService[]>(
      `/boston-city-hall/catalog/services${qs ? `?${qs}` : ""}`,
    );
    setServices(Array.isArray(res.data) ? res.data : []);
  }, [searchDebounced, categoryFilter, activeFilter]);

  const loadPackages = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchDebounced) params.set("q", searchDebounced);
    if (activeFilter !== "all") params.set("active", activeFilter);
    const qs = params.toString();
    const res = await api.get<VenueCatalogPackage[]>(
      `/boston-city-hall/catalog/packages${qs ? `?${qs}` : ""}`,
    );
    setPackages(Array.isArray(res.data) ? res.data : []);
  }, [searchDebounced, activeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([loadServices(), loadPackages()]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, [loadServices, loadPackages]);

  useEffect(() => {
    load();
  }, [load]);

  const activeServicesForPicker = useMemo(
    () => services.filter((s) => s.active),
    [services],
  );

  const openCreateService = () => {
    setServiceEditId(null);
    setServiceForm(emptyServiceForm());
    setDialogError(null);
    setServiceDialog(true);
  };

  const openEditService = (s: VenueCatalogService) => {
    setServiceEditId(s.id);
    setServiceForm({
      name: s.name,
      description: s.description ?? "",
      category: s.category,
      defaultPrice: s.defaultPrice,
      billingUnit: s.billingUnit,
      sortOrder: String(s.sortOrder),
      active: s.active ? "true" : "false",
    });
    setDialogError(null);
    setServiceDialog(true);
  };

  const saveService = async () => {
    if (!serviceForm.name.trim()) {
      setDialogError("Informe o nome do serviço.");
      return;
    }
    if (!serviceForm.defaultPrice.trim()) {
      setDialogError("Informe o preço padrão.");
      return;
    }
    setSaving(true);
    setDialogError(null);
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || undefined,
      category: serviceForm.category,
      defaultPrice: serviceForm.defaultPrice.trim(),
      billingUnit: serviceForm.billingUnit,
      sortOrder: Number.parseInt(serviceForm.sortOrder, 10) || 0,
      active: serviceForm.active === "true",
    };
    try {
      if (serviceEditId) {
        await api.patch(`/boston-city-hall/catalog/services/${serviceEditId}`, payload);
      } else {
        await api.post("/boston-city-hall/catalog/services", payload);
      }
      setServiceDialog(false);
      await load();
      setFeedback({
        open: true,
        title: serviceEditId ? "Serviço atualizado" : "Serviço cadastrado",
        message: "Catálogo salvo com sucesso.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  };

  const openCreatePackage = () => {
    setPackageEditId(null);
    setPackageForm(emptyPackageForm());
    setDialogError(null);
    setPackageDialog(true);
  };

  const openEditPackage = async (p: VenueCatalogPackage) => {
    setPackageEditId(p.id);
    setDialogError(null);
    setPackageDialog(true);
    try {
      const res = await api.get<VenueCatalogPackage>(`/boston-city-hall/catalog/packages/${p.id}`);
      const pkg = res.data ?? p;
      setPackageForm({
        name: pkg.name,
        description: pkg.description ?? "",
        defaultPrice: pkg.defaultPrice,
        sortOrder: String(pkg.sortOrder),
        active: pkg.active ? "true" : "false",
        items: pkg.items.map((it) => ({
          serviceId: it.serviceId,
          quantity: it.quantity,
        })),
      });
    } catch {
      setPackageForm({
        name: p.name,
        description: p.description ?? "",
        defaultPrice: p.defaultPrice,
        sortOrder: String(p.sortOrder),
        active: p.active ? "true" : "false",
        items: p.items.map((it) => ({ serviceId: it.serviceId, quantity: it.quantity })),
      });
    }
  };

  const savePackage = async () => {
    if (!packageForm.name.trim()) {
      setDialogError("Informe o nome do pacote.");
      return;
    }
    if (!packageForm.defaultPrice.trim()) {
      setDialogError("Informe o preço padrão do pacote.");
      return;
    }
    setSaving(true);
    setDialogError(null);
    const payload = {
      name: packageForm.name.trim(),
      description: packageForm.description.trim() || undefined,
      defaultPrice: packageForm.defaultPrice.trim(),
      sortOrder: Number.parseInt(packageForm.sortOrder, 10) || 0,
      active: packageForm.active === "true",
      items: packageForm.items
        .filter((it) => it.serviceId)
        .map((it) => ({
          serviceId: it.serviceId,
          quantity: it.quantity.trim() || "1",
        })),
    };
    try {
      if (packageEditId) {
        await api.patch(`/boston-city-hall/catalog/packages/${packageEditId}`, payload);
      } else {
        await api.post("/boston-city-hall/catalog/packages", payload);
      }
      setPackageDialog(false);
      await load();
      setFeedback({
        open: true,
        title: packageEditId ? "Pacote atualizado" : "Pacote cadastrado",
        message: "Catálogo salvo com sucesso.",
        variant: "success",
      });
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : "Erro ao salvar pacote.");
    } finally {
      setSaving(false);
    }
  };

  const addPackageItemRow = () => {
    setPackageForm((f) => ({
      ...f,
      items: [...f.items, { serviceId: "", quantity: "1" }],
    }));
  };

  return (
    <>
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        <button
          type="button"
          className={cn(
            "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
            tab === "services"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("services")}
        >
          Serviços
        </button>
        <button
          type="button"
          className={cn(
            "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
            tab === "packages"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("packages")}
        >
          Pacotes
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            {tab === "services" ? "Catálogo de serviços" : "Pacotes comerciais"}
          </CardTitle>
          <Button
            onClick={tab === "services" ? openCreateService : openCreatePackage}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {tab === "services" ? "Novo serviço" : "Novo pacote"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-9"
              />
            </div>
            {tab === "services" ? (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="min-h-[44px] w-full lg:w-[170px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {VENUE_CATALOG_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {VENUE_CATALOG_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" onClick={() => load()} className="min-h-[44px]">
                Tentar novamente
              </Button>
            </div>
          ) : tab === "services" ? (
            services.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum serviço cadastrado.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="hidden md:table-cell">Unidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((s) => (
                      <TableRow
                        key={s.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/40",
                          !s.active && "opacity-70",
                        )}
                        onClick={() => openEditService(s)}
                      >
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {VENUE_CATALOG_CATEGORY_LABEL[s.category] ?? s.category}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {formatCatalogMoney(s.defaultPrice)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {VENUE_CATALOG_BILLING_UNIT_LABEL[s.billingUnit] ?? s.billingUnit}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                              s.active
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-zinc-500/20 text-zinc-400",
                            )}
                          >
                            {s.active ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : packages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum pacote cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço padrão</TableHead>
                    <TableHead className="hidden sm:table-cell">Serviços</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((p) => (
                    <TableRow
                      key={p.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        !p.active && "opacity-70",
                      )}
                      onClick={() => openEditPackage(p)}
                    >
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {formatCatalogMoney(p.defaultPrice)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {p.itemsCount} item(ns)
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            p.active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-zinc-500/20 text-zinc-400",
                          )}
                        >
                          {p.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{serviceEditId ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="svc-name">Nome *</Label>
              <Input
                id="svc-name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-desc">Descrição</Label>
              <textarea
                id="svc-desc"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={serviceForm.description}
                onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="svc-cat">Categoria</Label>
                <NativeSelect
                  id="svc-cat"
                  value={serviceForm.category}
                  onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {VENUE_CATALOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {VENUE_CATALOG_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="svc-unit">Unidade</Label>
                <NativeSelect
                  id="svc-unit"
                  value={serviceForm.billingUnit}
                  onChange={(e) => setServiceForm((f) => ({ ...f, billingUnit: e.target.value }))}
                >
                  {VENUE_CATALOG_BILLING_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {VENUE_CATALOG_BILLING_UNIT_LABEL[u]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="svc-price">Preço padrão (R$) *</Label>
                <Input
                  id="svc-price"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={serviceForm.defaultPrice}
                  onChange={(e) => setServiceForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="svc-order">Ordem</Label>
                <Input
                  id="svc-order"
                  inputMode="numeric"
                  value={serviceForm.sortOrder}
                  onChange={(e) => setServiceForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="svc-active">Status</Label>
              <NativeSelect
                id="svc-active"
                value={serviceForm.active}
                onChange={(e) => setServiceForm((f) => ({ ...f, active: e.target.value }))}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </NativeSelect>
            </div>
            {dialogError && serviceDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveService} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={packageDialog} onOpenChange={setPackageDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{packageEditId ? "Editar pacote" : "Novo pacote"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="pkg-name">Nome *</Label>
              <Input
                id="pkg-name"
                value={packageForm.name}
                onChange={(e) => setPackageForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pkg-desc">Descrição</Label>
              <textarea
                id="pkg-desc"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={packageForm.description}
                onChange={(e) => setPackageForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pkg-price">Preço padrão (R$) *</Label>
                <Input
                  id="pkg-price"
                  inputMode="decimal"
                  value={packageForm.defaultPrice}
                  onChange={(e) => setPackageForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pkg-order">Ordem</Label>
                <Input
                  id="pkg-order"
                  inputMode="numeric"
                  value={packageForm.sortOrder}
                  onChange={(e) => setPackageForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pkg-active">Status</Label>
              <NativeSelect
                id="pkg-active"
                value={packageForm.active}
                onChange={(e) => setPackageForm((f) => ({ ...f, active: e.target.value }))}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </NativeSelect>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Serviços incluídos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPackageItemRow}>
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar
                </Button>
              </div>
              {packageForm.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum serviço no pacote.</p>
              ) : (
                packageForm.items.map((row, idx) => (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="grid flex-1 gap-1.5">
                      <NativeSelect
                        value={row.serviceId}
                        onChange={(e) =>
                          setPackageForm((f) => {
                            const items = [...f.items];
                            items[idx] = { ...items[idx], serviceId: e.target.value };
                            return { ...f, items };
                          })
                        }
                      >
                        <option value="">Selecione o serviço…</option>
                        {(activeServicesForPicker.length ? activeServicesForPicker : services).map(
                          (s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ),
                        )}
                      </NativeSelect>
                    </div>
                    <div className="grid w-full gap-1.5 sm:w-24">
                      <Input
                        inputMode="decimal"
                        placeholder="Qtd"
                        value={row.quantity}
                        onChange={(e) =>
                          setPackageForm((f) => {
                            const items = [...f.items];
                            items[idx] = { ...items[idx], quantity: e.target.value };
                            return { ...f, items };
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] shrink-0"
                      onClick={() =>
                        setPackageForm((f) => ({
                          ...f,
                          items: f.items.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {dialogError && packageDialog ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={savePackage} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
