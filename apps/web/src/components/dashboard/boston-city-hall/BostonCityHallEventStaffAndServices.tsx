"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import {
  BCH_BTN_SECONDARY,
  BCH_CARD,
  BCH_DIALOG_CONTENT,
  BCH_TABLE_WRAP,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";
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
import { cn } from "@/lib/utils";

type ShiftRow = {
  id: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  rateAmount: string | null;
  plannedCost: string | null;
  actualCost: string | null;
  status: string;
};

type TeamMemberRow = {
  id: string;
  roleLabel: string;
  areaLabel: string | null;
  responsibility: string | null;
  contractorName: string | null;
  status: string;
  employee?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  supervisor?: {
    id: string;
    roleLabel: string;
    contractorName: string | null;
    employee?: { name: string } | null;
  } | null;
  shifts: ShiftRow[];
};

type ServiceRow = {
  id: string;
  description: string;
  operationalStatus: string;
  contractedAmount: string | null;
  plannedCost: string | null;
  actualCost: string | null;
  quantity: string | null;
  locationLabel?: string | null;
  responsibleName: string | null;
  supplierId: string | null;
  catalogServiceId: string | null;
  supplier?: { name: string } | null;
  catalogService?: { id: string; name: string; category: string | null } | null;
};

type Lookup = { id: string; name: string; code?: string | null; category?: string | null };

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

function personLabel(m: TeamMemberRow): string {
  return m.employee?.name ?? m.contractorName ?? m.supplier?.name ?? "—";
}

function shiftCost(m: TeamMemberRow): string {
  let planned = 0;
  let actual = 0;
  for (const s of m.shifts) {
    if (s.plannedCost) planned += Number(s.plannedCost);
    if (s.actualCost) actual += Number(s.actualCost);
  }
  if (actual > 0) return actual.toFixed(2);
  if (planned > 0) return planned.toFixed(2);
  return "—";
}

function plannedRange(shifts: ShiftRow[]): string {
  const starts = shifts.map((s) => s.plannedStartAt).filter(Boolean) as string[];
  if (starts.length === 0) return "—";
  const min = new Date(Math.min(...starts.map((x) => new Date(x).getTime())));
  const ends = shifts.map((s) => s.plannedEndAt).filter(Boolean) as string[];
  const max = ends.length
    ? new Date(Math.max(...ends.map((x) => new Date(x).getTime())))
    : null;
  const fmt = (d: Date) =>
    d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return max ? `${fmt(min)} – ${fmt(max)}` : fmt(min);
}

export function BostonCityHallEventStaffAndServices({ eventId }: { eventId: string }) {
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberDialog, setMemberDialog] = useState(false);
  const [shiftDialog, setShiftDialog] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(false);
  const [editMember, setEditMember] = useState<TeamMemberRow | null>(null);
  const [shiftMemberId, setShiftMemberId] = useState<string | null>(null);
  const [editShift, setEditShift] = useState<ShiftRow | null>(null);
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [cancelShiftId, setCancelShiftId] = useState<string | null>(null);
  const [empQuery, setEmpQuery] = useState("");
  const [empHits, setEmpHits] = useState<Lookup[]>([]);
  const [supQuery, setSupQuery] = useState("");
  const [supHits, setSupHits] = useState<Lookup[]>([]);
  const [catQuery, setCatQuery] = useState("");
  const [catHits, setCatHits] = useState<Lookup[]>([]);
  const [memberForm, setMemberForm] = useState({
    roleLabel: "",
    employeeId: "",
    contractorName: "",
    supplierId: "",
    areaLabel: "",
    responsibility: "",
    supervisorId: "",
  });
  const [shiftForm, setShiftForm] = useState({
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
  const [serviceForm, setServiceForm] = useState({
    catalogServiceId: "",
    description: "",
    supplierId: "",
    responsibleName: "",
    quantity: "",
    plannedCost: "",
    contractedAmount: "",
    actualCost: "",
    operationalStatus: "planned",
    notes: "",
  });
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(
    null,
  );

  const base = `/boston-city-hall/events/${encodeURIComponent(eventId)}`;
  const supervisors = useMemo(() => team.filter((t) => t.status === "active"), [team]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get<TeamMemberRow[]>(`${base}/team-members`),
        api.get<ServiceRow[]>(`${base}/service-commitments`),
      ]);
      setTeam(Array.isArray(tRes.data) ? tRes.data : []);
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

  useEffect(() => {
    if (catQuery.trim().length < 1) {
      setCatHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .get<Lookup[]>(`/boston-city-hall/catalog/services?q=${encodeURIComponent(catQuery.trim())}&active=true`)
        .then((r) => setCatHits(Array.isArray(r.data) ? r.data : []));
    }, 250);
    return () => window.clearTimeout(t);
  }, [catQuery]);

  const openNewMember = () => {
    setEditMember(null);
    setMemberForm({
      roleLabel: "",
      employeeId: "",
      contractorName: "",
      supplierId: "",
      areaLabel: "",
      responsibility: "",
      supervisorId: "",
    });
    setEmpQuery("");
    setMemberDialog(true);
  };

  const openEditMember = (m: TeamMemberRow) => {
    setEditMember(m);
    setMemberForm({
      roleLabel: m.roleLabel,
      employeeId: m.employee?.id ?? "",
      contractorName: m.contractorName ?? "",
      supplierId: m.supplier?.id ?? "",
      areaLabel: m.areaLabel ?? "",
      responsibility: m.responsibility ?? "",
      supervisorId: m.supervisor?.id ?? "",
    });
    setMemberDialog(true);
  };

  const saveMember = async () => {
    if (!memberForm.roleLabel.trim()) return;
    try {
      if (editMember) {
        await api.patch(`${base}/team-members/${editMember.id}`, {
          roleLabel: memberForm.roleLabel.trim(),
          areaLabel: memberForm.areaLabel.trim() || null,
          responsibility: memberForm.responsibility.trim() || null,
          supervisorId: memberForm.supervisorId || null,
        });
      } else {
        await api.post(`${base}/team-members`, {
          roleLabel: memberForm.roleLabel.trim(),
          employeeId: memberForm.employeeId || null,
          contractorName: memberForm.contractorName.trim() || null,
          supplierId: memberForm.supplierId || null,
          areaLabel: memberForm.areaLabel.trim() || null,
          responsibility: memberForm.responsibility.trim() || null,
          supervisorId: memberForm.supervisorId || null,
        });
      }
      setMemberDialog(false);
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar a pessoa na equipe.", variant: "error" });
    }
  };

  const openNewShift = (memberId: string) => {
    setShiftMemberId(memberId);
    setEditShift(null);
    setShiftForm({
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
    setShiftDialog(true);
  };

  const openEditShift = (memberId: string, shift: ShiftRow) => {
    setShiftMemberId(memberId);
    setEditShift(shift);
    setShiftForm({
      plannedStartAt: isoToLocal(shift.plannedStartAt),
      plannedEndAt: isoToLocal(shift.plannedEndAt),
      actualStartAt: isoToLocal(shift.actualStartAt),
      actualEndAt: isoToLocal(shift.actualEndAt),
      rateType: "fixed",
      rateAmount: shift.rateAmount ?? "",
      plannedCost: shift.plannedCost ?? "",
      actualCost: shift.actualCost ?? "",
      status: shift.status,
    });
    setShiftDialog(true);
  };

  const saveShift = async () => {
    if (!shiftMemberId) return;
    const payload = {
      plannedStartAt: localToIso(shiftForm.plannedStartAt),
      plannedEndAt: localToIso(shiftForm.plannedEndAt),
      actualStartAt: localToIso(shiftForm.actualStartAt),
      actualEndAt: localToIso(shiftForm.actualEndAt),
      rateType: shiftForm.rateType,
      rateAmount: shiftForm.rateAmount || null,
      plannedCost: shiftForm.plannedCost || null,
      actualCost: shiftForm.actualCost || null,
      status: shiftForm.status,
    };
    try {
      if (editShift) {
        await api.patch(`${base}/staff-assignments/${editShift.id}`, payload);
      } else {
        await api.post(`${base}/team-members/${shiftMemberId}/shifts`, payload);
      }
      setShiftDialog(false);
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar o turno.", variant: "error" });
    }
  };

  const openServiceDialog = (row?: ServiceRow) => {
    setEditService(row ?? null);
    setServiceForm({
      catalogServiceId: row?.catalogServiceId ?? "",
      description: row?.description ?? "",
      supplierId: row?.supplierId ?? "",
      responsibleName: row?.responsibleName ?? "",
      quantity: row?.quantity ?? "",
      plannedCost: row?.plannedCost ?? "",
      contractedAmount: row?.contractedAmount ?? "",
      actualCost: row?.actualCost ?? "",
      operationalStatus: row?.operationalStatus ?? "planned",
      notes: "",
    });
    setServiceDialog(true);
  };

  const saveService = async () => {
    const desc = serviceForm.description.trim() || catHits.find((c) => c.id === serviceForm.catalogServiceId)?.name;
    if (!desc?.trim()) return;
    const payload = {
      catalogServiceId: serviceForm.catalogServiceId || null,
      description: desc.trim(),
      supplierId: serviceForm.supplierId || null,
      responsibleName: serviceForm.responsibleName.trim() || null,
      quantity: serviceForm.quantity || null,
      plannedCost: serviceForm.plannedCost || null,
      contractedAmount: serviceForm.contractedAmount || null,
      actualCost: serviceForm.actualCost || null,
      operationalStatus: serviceForm.operationalStatus,
      notes: serviceForm.notes.trim() || null,
    };
    try {
      if (editService) {
        await api.patch(`${base}/service-commitments/${editService.id}`, payload);
      } else {
        await api.post(`${base}/service-commitments`, payload);
      }
      setServiceDialog(false);
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar o serviço.", variant: "error" });
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
    <div className="space-y-6">
      <section className={cn(BCH_CARD, "space-y-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Equipe do evento</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-[36px]" onClick={openNewMember}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar pessoa à equipe
            </Button>
          </div>
        </div>
        {team.length === 0 ? (
          <BchEmptyState message="Nenhuma pessoa na equipe. Comece adicionando colaboradores, contratados ou fornecedores operacionais." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Escala planejada</TableHead>
                  <TableHead>Turnos</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{personLabel(m)}</TableCell>
                    <TableCell>{m.roleLabel}</TableCell>
                    <TableCell className="text-slate-400">{m.areaLabel ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {m.supervisor
                        ? m.supervisor.employee?.name ?? m.supervisor.contractorName ?? m.supervisor.roleLabel
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{plannedRange(m.shifts)}</TableCell>
                    <TableCell>{m.shifts.length}</TableCell>
                    <TableCell className="text-xs">{shiftCost(m)}</TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditMember(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn("h-8 px-2 text-xs", BCH_BTN_SECONDARY)}
                          onClick={() => openNewShift(m.id)}
                        >
                          Turno
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {team.some((m) => m.shifts.length > 0) ? (
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Turnos</p>
            <div className={BCH_TABLE_WRAP}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.flatMap((m) =>
                    m.shifts.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{personLabel(m)}</TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {s.plannedStartAt
                            ? new Date(s.plannedStartAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {s.plannedEndAt
                            ? new Date(s.plannedEndAt).toLocaleString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{s.actualCost ?? s.plannedCost ?? "—"}</TableCell>
                        <TableCell>{s.status}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditShift(m.id, s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {s.status !== "cancelled" ? (
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCancelShiftId(s.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </section>

      <section className={cn(BCH_CARD, "space-y-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Fornecedores e serviços</h3>
          <Button type="button" size="sm" variant="outline" className={cn("min-h-[36px]", BCH_BTN_SECONDARY)} onClick={() => openServiceDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Vincular serviço
          </Button>
        </div>
        {services.length === 0 ? (
          <BchEmptyState message="Nenhum serviço contratado para este evento." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Planejado</TableHead>
                  <TableHead>Real</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[48px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>{row.catalogService?.name ?? row.description}</div>
                      {row.catalogService && row.description !== row.catalogService.name ? (
                        <div className="text-xs text-slate-500">{row.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-slate-400">{row.responsibleName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{row.contractedAmount ?? row.plannedCost ?? "—"}</TableCell>
                    <TableCell className="text-xs">{row.actualCost ?? "—"}</TableCell>
                    <TableCell>{row.operationalStatus}</TableCell>
                    <TableCell>
                      {row.operationalStatus !== "cancelled" ? (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openServiceDialog(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent className={BCH_DIALOG_CONTENT}>
          <DialogHeader>
            <DialogTitle>{editMember ? "Editar membro" : "Adicionar pessoa à equipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Função operacional *</Label>
              <Input
                value={memberForm.roleLabel}
                onChange={(e) => setMemberForm({ ...memberForm, roleLabel: e.target.value })}
                className="text-foreground"
                placeholder="Ex.: Bartender, Segurança, Produção"
              />
            </div>
            {!editMember ? (
              <>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Buscar colaborador (RH)</Label>
                  <Input value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} className="text-foreground" placeholder="Nome ou matrícula" />
                  {empHits.length > 0 ? (
                    <ul className="max-h-32 overflow-y-auto rounded border border-slate-700 text-sm">
                      {empHits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left hover:bg-slate-800"
                            onClick={() => {
                              setMemberForm({ ...memberForm, employeeId: h.id, contractorName: "", supplierId: "" });
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
                    value={memberForm.contractorName}
                    onChange={(e) => setMemberForm({ ...memberForm, contractorName: e.target.value, employeeId: "" })}
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fornecedor (pessoa)</Label>
                  <Input value={supQuery} onChange={(e) => setSupQuery(e.target.value)} className="text-foreground" placeholder="Buscar fornecedor" />
                  {supHits.length > 0 ? (
                    <ul className="max-h-24 overflow-y-auto rounded border border-slate-700 text-sm">
                      {supHits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            className="block w-full px-2 py-1.5 text-left hover:bg-slate-800"
                            onClick={() => {
                              setMemberForm({ ...memberForm, supplierId: h.id, employeeId: "", contractorName: "" });
                              setSupQuery(h.name);
                              setSupHits([]);
                            }}
                          >
                            {h.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </>
            ) : null}
            <div className="space-y-1">
              <Label>Área / local</Label>
              <Input value={memberForm.areaLabel} onChange={(e) => setMemberForm({ ...memberForm, areaLabel: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Supervisor</Label>
              <NativeSelect value={memberForm.supervisorId} onChange={(e) => setMemberForm({ ...memberForm, supervisorId: e.target.value })}>
                <option value="">Nenhum</option>
                {supervisors
                  .filter((s) => s.id !== editMember?.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {personLabel(s)} · {s.roleLabel}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Responsabilidades</Label>
              <Input
                value={memberForm.responsibility}
                onChange={(e) => setMemberForm({ ...memberForm, responsibility: e.target.value })}
                className="text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMemberDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveMember()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent className={BCH_DIALOG_CONTENT}>
          <DialogHeader>
            <DialogTitle>{editShift ? "Editar turno" : "Adicionar turno"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Início planejado</Label>
              <Input type="datetime-local" value={shiftForm.plannedStartAt} onChange={(e) => setShiftForm({ ...shiftForm, plannedStartAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fim planejado</Label>
              <Input type="datetime-local" value={shiftForm.plannedEndAt} onChange={(e) => setShiftForm({ ...shiftForm, plannedEndAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Início real</Label>
              <Input type="datetime-local" value={shiftForm.actualStartAt} onChange={(e) => setShiftForm({ ...shiftForm, actualStartAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fim real</Label>
              <Input type="datetime-local" value={shiftForm.actualEndAt} onChange={(e) => setShiftForm({ ...shiftForm, actualEndAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de taxa</Label>
              <NativeSelect value={shiftForm.rateType} onChange={(e) => setShiftForm({ ...shiftForm, rateType: e.target.value })}>
                <option value="fixed">Fixo</option>
                <option value="hourly">Por hora</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Valor taxa</Label>
              <Input value={shiftForm.rateAmount} onChange={(e) => setShiftForm({ ...shiftForm, rateAmount: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo planejado</Label>
              <Input value={shiftForm.plannedCost} onChange={(e) => setShiftForm({ ...shiftForm, plannedCost: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo real</Label>
              <Input value={shiftForm.actualCost} onChange={(e) => setShiftForm({ ...shiftForm, actualCost: e.target.value })} className="text-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShiftDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveShift()}>
              Salvar turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={serviceDialog} onOpenChange={setServiceDialog}>
        <DialogContent className={cn(BCH_DIALOG_CONTENT, "max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>{editService ? "Editar serviço" : "Vincular serviço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Catálogo de serviços</Label>
              <Input value={catQuery} onChange={(e) => setCatQuery(e.target.value)} className="text-foreground" placeholder="Buscar no catálogo do venue" />
              {catHits.length > 0 ? (
                <ul className="max-h-32 overflow-y-auto rounded border border-slate-700 text-sm">
                  {catHits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="block w-full px-2 py-1.5 text-left hover:bg-slate-800"
                        onClick={() => {
                          setServiceForm({
                            ...serviceForm,
                            catalogServiceId: h.id,
                            description: h.name,
                          });
                          setCatQuery(h.name);
                          setCatHits([]);
                        }}
                      >
                        {h.name}
                        {h.category ? ` · ${h.category}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição *</Label>
              <Input value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fornecedor</Label>
              <Input value={supQuery} onChange={(e) => setSupQuery(e.target.value)} className="text-foreground" placeholder="Buscar" />
            </div>
            <div className="space-y-1">
              <Label>Contato responsável</Label>
              <Input value={serviceForm.responsibleName} onChange={(e) => setServiceForm({ ...serviceForm, responsibleName: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input value={serviceForm.quantity} onChange={(e) => setServiceForm({ ...serviceForm, quantity: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo planejado</Label>
              <Input value={serviceForm.plannedCost} onChange={(e) => setServiceForm({ ...serviceForm, plannedCost: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Valor contratado</Label>
              <Input value={serviceForm.contractedAmount} onChange={(e) => setServiceForm({ ...serviceForm, contractedAmount: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Custo real</Label>
              <Input value={serviceForm.actualCost} onChange={(e) => setServiceForm({ ...serviceForm, actualCost: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Status operacional</Label>
              <NativeSelect value={serviceForm.operationalStatus} onChange={(e) => setServiceForm({ ...serviceForm, operationalStatus: e.target.value })}>
                <option value="planned">Planejado</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_progress">Em execução</option>
                <option value="completed">Concluído</option>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editService && editService.operationalStatus !== "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                className="text-red-300"
                onClick={() => {
                  void api.post(`${base}/service-commitments/${editService.id}/cancel`).then(() => {
                    setServiceDialog(false);
                    void reload();
                  });
                }}
              >
                Cancelar serviço
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setServiceDialog(false)}>
                Fechar
              </Button>
              <Button type="button" onClick={() => void saveService()}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelShiftId} onOpenChange={(o) => !o && setCancelShiftId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar turno?</AlertDialogTitle>
            <AlertDialogDescription>O turno permanece no histórico com status cancelado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!cancelShiftId) return;
                void api.post(`${base}/staff-assignments/${cancelShiftId}/cancel`).then(() => {
                  setCancelShiftId(null);
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
