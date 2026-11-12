"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { DashboardDeptTabs } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { EPI_DELIVERY_STATUS_LABELS } from "@/lib/rh-labels";
import { hasRhCapability } from "@/lib/rh-capabilities";
import { useAuth } from "@/context/AuthContext";

type Tab = "catalogo" | "requisitos" | "entregas" | "pendencias";

type CatalogItem = { id: string; code: string; name: string; active: boolean; category?: string | null };
type RequirementGroup = {
  id: string;
  name: string;
  scopeType: string;
  items: Array<{ id: string; catalogItemId: string; required: boolean; catalogItem?: { name?: string } }>;
};
type Delivery = {
  id: string;
  deliveryDate: string;
  status: string;
  quantity: number | string;
  employee?: { id?: string; name?: string };
  catalogItem?: { name?: string };
  acknowledgements?: Array<{ status: string }>;
};
type Employee = { id: string; name: string };

type Props = { tenantId: string };

export function EpiOperationalPanel({ tenantId }: Props) {
  const { modules, role } = useAuth();
  const canManage = hasRhCapability(modules, "rh_epi_manage", role);
  const canDeliver = hasRhCapability(modules, "rh_epi_delivery", role);

  const [tab, setTab] = useState<Tab>("catalogo");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [requirements, setRequirements] = useState<RequirementGroup[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const [catalogDialog, setCatalogDialog] = useState(false);
  const [catalogForm, setCatalogForm] = useState({ code: "", name: "", category: "" });

  const [reqDialog, setReqDialog] = useState(false);
  const [reqForm, setReqForm] = useState({
    name: "",
    scopeType: "geral",
    effectiveFrom: "",
    selectedItems: [] as string[],
  });

  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    employeeId: "",
    catalogItemId: "",
    quantity: "1",
    deliveryDate: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const qs = `?tenantId=${encodeURIComponent(tenantId)}`;
    try {
      const [cat, req, del, emps] = await Promise.all([
        api.get<CatalogItem[]>(`/rh/epi/catalog${qs}`),
        api.get<RequirementGroup[]>(`/rh/epi/requirements${qs}`),
        api.get<Delivery[]>(`/rh/epi/deliveries${qs}`),
        api.get<Employee[]>(`/rh/employees${qs}`),
      ]);
      setCatalog(Array.isArray(cat.data) ? cat.data : []);
      setRequirements(Array.isArray(req.data) ? req.data : []);
      setDeliveries(Array.isArray(del.data) ? del.data : []);
      setEmployees(Array.isArray(emps.data) ? emps.data : []);
    } catch {
      setCatalog([]);
      setRequirements([]);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCatalog = async () => {
    if (!catalogForm.code.trim() || !catalogForm.name.trim()) {
      setFeedback({ open: true, title: "Atenção", message: "Código e nome são obrigatórios." });
      return;
    }
    try {
      await api.post("/rh/epi/catalog", { tenantId, ...catalogForm });
      setCatalogDialog(false);
      setCatalogForm({ code: "", name: "", category: "" });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar o item." });
    }
  };

  const saveRequirement = async () => {
    if (!reqForm.name.trim() || !reqForm.effectiveFrom) {
      setFeedback({ open: true, title: "Atenção", message: "Nome e vigência são obrigatórios." });
      return;
    }
    try {
      await api.post("/rh/epi/requirements", {
        tenantId,
        name: reqForm.name,
        scopeType: reqForm.scopeType,
        effectiveFrom: reqForm.effectiveFrom,
        items: reqForm.selectedItems.map((catalogItemId) => ({ catalogItemId, required: true })),
      });
      setReqDialog(false);
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar o grupo." });
    }
  };

  const saveDelivery = async () => {
    if (!deliveryForm.employeeId || !deliveryForm.catalogItemId || !deliveryForm.deliveryDate) {
      setFeedback({ open: true, title: "Atenção", message: "Preencha colaborador, item e data." });
      return;
    }
    try {
      await api.post("/rh/epi/deliveries", {
        ...deliveryForm,
        quantity: Number(deliveryForm.quantity) || 1,
      });
      setDeliveryDialog(false);
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar a entrega." });
    }
  };

  const patchDeliveryStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/rh/epi/deliveries/${id}/status`, { status });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível atualizar o status." });
    }
  };

  if (!tenantId) {
    return <p className="text-muted-foreground text-sm py-6">Selecione um clube/empresa no filtro.</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingDeliveries = deliveries.filter(
    (d) => d.acknowledgements?.some((a) => a.status === "pendente") || d.status === "PENDENTE",
  );

  return (
    <div className="space-y-4">
      <DashboardDeptTabs
        tabs={[
          { id: "catalogo", label: "Catálogo" },
          { id: "requisitos", label: "Requisitos" },
          { id: "entregas", label: "Entregas" },
          { id: "pendencias", label: "Pendências" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "catalogo" && (
        <div className="pt-2 space-y-3">
          {canManage && (
            <Button size="sm" className="min-h-[44px]" type="button" onClick={() => setCatalogDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo item
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.category ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "requisitos" && (
        <div className="pt-2 space-y-3">
          {canManage && (
            <Button size="sm" className="min-h-[44px]" type="button" onClick={() => setReqDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo grupo
            </Button>
          )}
          {requirements.map((g) => (
            <div key={g.id} className="rounded-lg border border-border p-3">
              <p className="font-medium text-sm">{g.name}</p>
              <p className="text-xs text-muted-foreground">{g.scopeType}</p>
              <ul className="mt-2 text-sm list-disc pl-5">
                {g.items.map((i) => (
                  <li key={i.id}>{i.catalogItem?.name ?? i.catalogItemId}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(tab === "entregas" || tab === "pendencias") && (
        <div className="pt-2 space-y-3">
          {canDeliver && tab === "entregas" && (
            <Button size="sm" className="min-h-[44px]" type="button" onClick={() => setDeliveryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova entrega
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tab === "pendencias" ? pendingDeliveries : deliveries).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDateDayMonYear(d.deliveryDate)}</TableCell>
                  <TableCell>{d.employee?.name ?? "—"}</TableCell>
                  <TableCell>{d.catalogItem?.name ?? "—"}</TableCell>
                  <TableCell>{EPI_DELIVERY_STATUS_LABELS[d.status] ?? d.status}</TableCell>
                  <TableCell>
                    {canManage && (
                      <NativeSelect
                        className="min-h-[44px] text-foreground"
                        value={d.status}
                        onChange={(e) => patchDeliveryStatus(d.id, e.target.value)}
                      >
                        {Object.keys(EPI_DELIVERY_STATUS_LABELS).map((k) => (
                          <option key={k} value={k}>
                            {EPI_DELIVERY_STATUS_LABELS[k]}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={catalogDialog} onOpenChange={setCatalogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item de EPI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input className="min-h-[44px] text-foreground" placeholder="Código" value={catalogForm.code} onChange={(e) => setCatalogForm((f) => ({ ...f, code: e.target.value }))} />
            <Input className="min-h-[44px] text-foreground" placeholder="Nome" value={catalogForm.name} onChange={(e) => setCatalogForm((f) => ({ ...f, name: e.target.value }))} />
            <Input className="min-h-[44px] text-foreground" placeholder="Categoria" value={catalogForm.category} onChange={(e) => setCatalogForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveCatalog}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reqDialog} onOpenChange={setReqDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grupo de requisitos</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input className="min-h-[44px] text-foreground" placeholder="Nome" value={reqForm.name} onChange={(e) => setReqForm((f) => ({ ...f, name: e.target.value }))} />
            <NativeSelect className="min-h-[44px] text-foreground" value={reqForm.scopeType} onChange={(e) => setReqForm((f) => ({ ...f, scopeType: e.target.value }))}>
              <option value="geral">Geral</option>
              <option value="departamento">Departamento</option>
              <option value="cargo">Cargo</option>
            </NativeSelect>
            <Input type="date" className="min-h-[44px] text-foreground" value={reqForm.effectiveFrom} onChange={(e) => setReqForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {catalog.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm min-h-[44px]">
                  <Checkbox
                    checked={reqForm.selectedItems.includes(item.id)}
                    onCheckedChange={(checked) =>
                      setReqForm((f) => ({
                        ...f,
                        selectedItems: checked
                          ? [...f.selectedItems, item.id]
                          : f.selectedItems.filter((id) => id !== item.id),
                      }))
                    }
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveRequirement}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveryDialog} onOpenChange={setDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrega de EPI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelectField
              className="min-h-[44px]"
              placeholder="Colaborador"
              options={employees.map((e) => ({ value: e.id, label: e.name }))}
              value={deliveryForm.employeeId}
              onChange={(e) => setDeliveryForm((f) => ({ ...f, employeeId: e.target.value }))}
            />
            <NativeSelectField
              className="min-h-[44px]"
              placeholder="Item"
              options={catalog.map((c) => ({ value: c.id, label: c.name }))}
              value={deliveryForm.catalogItemId}
              onChange={(e) => setDeliveryForm((f) => ({ ...f, catalogItemId: e.target.value }))}
            />
            <Input type="date" className="min-h-[44px] text-foreground" value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm((f) => ({ ...f, deliveryDate: e.target.value }))} />
            <Input type="number" className="min-h-[44px] text-foreground" placeholder="Quantidade" value={deliveryForm.quantity} onChange={(e) => setDeliveryForm((f) => ({ ...f, quantity: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveDelivery}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}
