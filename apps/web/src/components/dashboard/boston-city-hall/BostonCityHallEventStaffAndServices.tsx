"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type StaffRow = {
  id: string;
  roleLabel: string;
  contractorName: string | null;
  locationLabel: string | null;
  responsibility: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  rateType: string | null;
  rateAmount: string | null;
  plannedCost: string | null;
  actualCost: string | null;
  status: string;
  employeeId: string | null;
  supplierId: string | null;
  employee?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
};

type ServiceRow = {
  id: string;
  description: string;
  operationalStatus: string;
  contractedAmount: string | null;
  plannedCost: string | null;
  actualCost: string | null;
  supplierId: string | null;
  supplier?: { name: string } | null;
};

type Lookup = { id: string; name: string; code?: string | null };

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function BostonCityHallEventStaffAndServices({ eventId }: { eventId: string }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffDialog, setStaffDialog] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);
  const [cancelStaffId, setCancelStaffId] = useState<string | null>(null);
  const [empQuery, setEmpQuery] = useState("");
  const [empHits, setEmpHits] = useState<Lookup[]>([]);
  const [supQuery, setSupQuery] = useState("");
  const [supHits, setSupHits] = useState<Lookup[]>([]);
  const [form, setForm] = useState({
    roleLabel: "",
    employeeId: "",
    contractorName: "",
    supplierId: "",
    responsibility: "",
    locationLabel: "",
    plannedStartAt: "",
    plannedEndAt: "",
    actualStartAt: "",
    actualEndAt: "",
    rateType: "fixed",
    rateAmount: "",
    plannedCost: "",
    actualCost: "",
    status: "planned",
  });
  const [serviceDesc, setServiceDesc] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(null);

  const base = `/boston-city-hall/events/${encodeURIComponent(eventId)}`;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get<StaffRow[]>(`${base}/staff-assignments`),
        api.get<ServiceRow[]>(`${base}/service-commitments`),
      ]);
      setStaff(Array.isArray(sRes.data) ? sRes.data : []);
      setServices(Array.isArray(cRes.data) ? cRes.data : []);
    } catch {
      setFeedback({
        title: "Erro ao carregar",
        message: "Não foi possível carregar equipe e serviços deste evento.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (empQuery.trim().length < 2) {
      setEmpHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .get<Lookup[]>(`${base}/staff-lookups/employees?q=${encodeURIComponent(empQuery.trim())}`)
        .then((r) => setEmpHits(Array.isArray(r.data) ? r.data : []));
    }, 250);
    return () => window.clearTimeout(t);
  }, [base, empQuery]);

  useEffect(() => {
    if (supQuery.trim().length < 2) {
      setSupHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .get<Lookup[]>(`${base}/staff-lookups/suppliers?q=${encodeURIComponent(supQuery.trim())}`)
        .then((r) => setSupHits(Array.isArray(r.data) ? r.data : []));
    }, 250);
    return () => window.clearTimeout(t);
  }, [base, supQuery]);

  const openNewStaff = () => {
    setEditStaff(null);
    setForm({
      roleLabel: "",
      employeeId: "",
      contractorName: "",
      supplierId: "",
      responsibility: "",
      locationLabel: "",
      plannedStartAt: "",
      plannedEndAt: "",
      actualStartAt: "",
      actualEndAt: "",
      rateType: "fixed",
      rateAmount: "",
      plannedCost: "",
      actualCost: "",
      status: "planned",
    });
    setStaffDialog(true);
  };

  const openEditStaff = (row: StaffRow) => {
    setEditStaff(row);
    setForm({
      roleLabel: row.roleLabel,
      employeeId: row.employeeId ?? "",
      contractorName: row.contractorName ?? "",
      supplierId: row.supplierId ?? "",
      responsibility: row.responsibility ?? "",
      locationLabel: row.locationLabel ?? "",
      plannedStartAt: isoToLocal(row.plannedStartAt),
      plannedEndAt: isoToLocal(row.plannedEndAt),
      actualStartAt: isoToLocal(row.actualStartAt),
      actualEndAt: isoToLocal(row.actualEndAt),
      rateType: row.rateType ?? "fixed",
      rateAmount: row.rateAmount ?? "",
      plannedCost: row.plannedCost ?? "",
      actualCost: row.actualCost ?? "",
      status: row.status,
    });
    setStaffDialog(true);
  };

  const saveStaff = async () => {
    if (!form.roleLabel.trim()) return;
    const payload = {
      roleLabel: form.roleLabel.trim(),
      employeeId: form.employeeId || null,
      contractorName: form.contractorName.trim() || null,
      supplierId: form.supplierId || null,
      responsibility: form.responsibility.trim() || null,
      locationLabel: form.locationLabel.trim() || null,
      plannedStartAt: localToIso(form.plannedStartAt),
      plannedEndAt: localToIso(form.plannedEndAt),
      actualStartAt: localToIso(form.actualStartAt),
      actualEndAt: localToIso(form.actualEndAt),
      rateType: form.rateType,
      rateAmount: form.rateAmount || null,
      plannedCost: form.plannedCost || null,
      actualCost: form.actualCost || null,
      status: form.status,
    };
    try {
      if (editStaff) {
        await api.patch(`${base}/staff-assignments/${editStaff.id}`, payload);
      } else {
        await api.post(`${base}/staff-assignments`, payload);
      }
      setStaffDialog(false);
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar o turno.", variant: "error" });
    }
  };

  const addService = async () => {
    if (!serviceDesc.trim()) return;
    try {
      await api.post(`${base}/service-commitments`, {
        description: serviceDesc.trim(),
        supplierId: form.supplierId || null,
      });
      setServiceDesc("");
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível registrar o serviço.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-200">Equipe e turnos</h3>
          <Button type="button" size="sm" className="min-h-[36px]" onClick={openNewStaff}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar turno
          </Button>
        </div>
        {staff.length === 0 ? (
          <BchEmptyState message="Nenhum turno cadastrado." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Planejado</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[88px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.roleLabel}</TableCell>
                  <TableCell>
                    {row.employee?.name ?? row.contractorName ?? row.supplier?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {row.plannedStartAt
                      ? new Date(row.plannedStartAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.actualCost ?? row.plannedCost ?? "—"}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    {row.status !== "cancelled" ? (
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditStaff(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCancelStaffId(row.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label className="text-xs">Serviço</Label>
            <Input value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} className="h-9 text-foreground" />
          </div>
          <Button type="button" size="sm" variant="outline" className="min-h-[36px]" onClick={() => void addService()}>
            Vincular serviço
          </Button>
        </div>
        {services.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Custo real</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                  <TableCell>{row.actualCost ?? row.plannedCost ?? "—"}</TableCell>
                  <TableCell>{row.operationalStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <BchEmptyState message="Nenhum serviço vinculado." />
        )}
      </section>

      <Dialog open={staffDialog} onOpenChange={setStaffDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editStaff ? "Editar turno" : "Novo turno"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Função *</Label>
              <Input value={form.roleLabel} onChange={(e) => setForm({ ...form, roleLabel: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Buscar colaborador</Label>
              <Input value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} className="text-foreground" placeholder="Nome ou matrícula" />
              {empHits.length > 0 ? (
                <ul className="max-h-32 overflow-y-auto rounded border border-slate-700 text-sm">
                  {empHits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="block w-full px-2 py-1.5 text-left hover:bg-slate-800"
                        onClick={() => {
                          setForm({ ...form, employeeId: h.id, contractorName: "" });
                          setEmpQuery(h.name);
                          setEmpHits([]);
                        }}
                      >
                        {h.name}
                        {h.code ? ` · ${h.code}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>Contratado avulso</Label>
              <Input
                value={form.contractorName}
                onChange={(e) => setForm({ ...form, contractorName: e.target.value, employeeId: "" })}
                className="text-foreground"
              />
            </div>
            <div className="space-y-1">
              <Label>Responsabilidade</Label>
              <Input value={form.responsibility} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Início planejado</Label>
              <Input type="datetime-local" value={form.plannedStartAt} onChange={(e) => setForm({ ...form, plannedStartAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fim planejado</Label>
              <Input type="datetime-local" value={form.plannedEndAt} onChange={(e) => setForm({ ...form, plannedEndAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Início real</Label>
              <Input type="datetime-local" value={form.actualStartAt} onChange={(e) => setForm({ ...form, actualStartAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fim real</Label>
              <Input type="datetime-local" value={form.actualEndAt} onChange={(e) => setForm({ ...form, actualEndAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de taxa</Label>
              <NativeSelect value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value })}>
                <option value="fixed">Fixo</option>
                <option value="hourly">Por hora</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Valor taxa</Label>
              <Input value={form.rateAmount} onChange={(e) => setForm({ ...form, rateAmount: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo planejado</Label>
              <Input value={form.plannedCost} onChange={(e) => setForm({ ...form, plannedCost: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo real</Label>
              <Input value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Local / posto</Label>
              <Input value={form.locationLabel} onChange={(e) => setForm({ ...form, locationLabel: e.target.value })} className="text-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStaffDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveStaff()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelStaffId} onOpenChange={(o) => !o && setCancelStaffId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar turno?</AlertDialogTitle>
            <AlertDialogDescription>O turno permanece no histórico com status cancelado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!cancelStaffId) return;
                void api.post(`${base}/staff-assignments/${cancelStaffId}/cancel`).then(() => {
                  setCancelStaffId(null);
                  void reload();
                });
              }}
            >
              Cancelar turno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant={feedback?.variant ?? "error"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
