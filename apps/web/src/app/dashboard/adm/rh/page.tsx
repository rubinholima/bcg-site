"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Briefcase,
  UserCircle,
  FileText,
  Calendar,
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
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
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
import { DepartmentFormDialog, type DepartmentRow } from "./components/DepartmentFormDialog";
import { JobRoleFormDialog, type JobRoleRow } from "./components/JobRoleFormDialog";
import { EmployeeFormDialog, type EmployeeRow } from "./components/EmployeeFormDialog";
import { EmploymentFormDialog, type EmploymentRow } from "./components/EmploymentFormDialog";
import { LeavePeriodFormDialog, type LeavePeriodRow } from "./components/LeavePeriodFormDialog";
import { FuncionariosGroupedList } from "@/components/dashboard/rh/FuncionariosGroupedList";

type TabId = "departamentos" | "cargos" | "colaboradores" | "vinculos" | "ferias";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "colaboradores", label: "Colaboradores", icon: UserCircle },
  { id: "departamentos", label: "Departamentos", icon: Building2 },
  { id: "cargos", label: "Cargos", icon: Briefcase },
  { id: "vinculos", label: "Vínculos", icon: FileText },
  { id: "ferias", label: "Férias", icon: Calendar },
];

export default function AdmRHPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("colaboradores");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employments, setEmployments] = useState<EmploymentRow[]>([]);
  const [leavePeriods, setLeavePeriods] = useState<LeavePeriodRow[]>([]);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptEdit, setDeptEdit] = useState<DepartmentRow | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleEdit, setRoleEdit] = useState<JobRoleRow | null>(null);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [empEdit, setEmpEdit] = useState<EmployeeRow | null>(null);
  const [emplDialogOpen, setEmplDialogOpen] = useState(false);
  const [emplEdit, setEmplEdit] = useState<EmploymentRow | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveEdit, setLeaveEdit] = useState<LeavePeriodRow | null>(null);

  const [deleteKind, setDeleteKind] = useState<"department" | "jobRole" | "employee" | "employment" | "leavePeriod" | null>(null);
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

  const loadDepartments = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<DepartmentRow[]>(`/rh/departments${qs}`);
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      setDepartments([]);
    }
  }, [tenantId]);

  const loadJobRoles = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<JobRoleRow[]>(`/rh/job-roles${qs}`);
      setJobRoles(Array.isArray(data) ? data : []);
    } catch {
      setJobRoles([]);
    }
  }, [tenantId]);

  const loadEmployees = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<EmployeeRow[]>(`/rh/employees${qs}`);
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    }
  }, [tenantId]);

  const loadEmployments = useCallback(async () => {
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<EmploymentRow[]>(`/rh/employments${qs}`);
      setEmployments(Array.isArray(data) ? data : []);
    } catch {
      setEmployments([]);
    }
  }, [tenantId]);

  const loadLeavePeriods = useCallback(async () => {
    try {
      if (!tenantId) {
        setLeavePeriods([]);
        return;
      }
      const { data: emps } = await api.get<EmploymentRow[]>(`/rh/employments?tenantId=${encodeURIComponent(tenantId)}`);
      const list: LeavePeriodRow[] = [];
      for (const e of Array.isArray(emps) ? emps : []) {
        const { data: periods } = await api.get<LeavePeriodRow[]>(`/rh/leave-periods/by-employment/${e.id}`);
        (Array.isArray(periods) ? periods : []).forEach((p) => list.push({ ...p, employment: e } as LeavePeriodRow));
      }
      list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setLeavePeriods(list);
    } catch {
      setLeavePeriods([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!canAccessModule("adm_rh") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("adm_rh")) return;
    setLoading(true);
    const loads: Promise<void>[] = [];
    if (activeTab === "departamentos") loads.push(loadDepartments());
    if (activeTab === "cargos") loads.push(loadJobRoles());
    if (activeTab === "colaboradores") loads.push(loadEmployees());
    if (activeTab === "vinculos") loads.push(loadEmployments());
    if (activeTab === "ferias") loads.push(loadLeavePeriods());
    Promise.all(loads).finally(() => setLoading(false));
  }, [activeTab, tenantId, canAccessModule, loadDepartments, loadJobRoles, loadEmployees, loadEmployments, loadLeavePeriods]);

  useEffect(() => {
    if (!canAccessModule("adm_rh")) return;
    loadDepartments();
    loadJobRoles();
    loadEmployees();
    loadEmployments();
  }, [canAccessModule, tenantId, loadDepartments, loadJobRoles, loadEmployees, loadEmployments]);

  const handleDeleteConfirm = async () => {
    if (!deleteKind || !deleteId) return;
    setDeleting(true);
    try {
      if (deleteKind === "department") await api.delete(`/rh/departments/${deleteId}`);
      if (deleteKind === "jobRole") await api.delete(`/rh/job-roles/${deleteId}`);
      if (deleteKind === "employee") await api.delete(`/rh/employees/${deleteId}`);
      if (deleteKind === "employment") await api.delete(`/rh/employments/${deleteId}`);
      if (deleteKind === "leavePeriod") await api.delete(`/rh/leave-periods/${deleteId}`);
      loadDepartments();
      loadJobRoles();
      loadEmployees();
      loadEmployments();
      loadLeavePeriods();
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

  if (!canAccessModule("adm_rh")) {
    router.replace("/403");
    return null;
  }

  const distinctTeams = new Set(employees.map((e) => e.tenant.id)).size;
  const groupByTeam = !tenantId && distinctTeams > 1;

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
            <Users className="h-8 w-8" />
            RH
          </h1>
          <p className="text-muted-foreground">
            Departamento administrativo — departamentos, cargos, colaboradores, vínculos, férias e afastamentos
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
          {activeTab === "departamentos" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Departamentos</CardTitle>
                    <CardDescription>Setores do clube/empresa (ex.: Futebol Profissional, Base, Administrativo).</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setDeptEdit(null); setDeptDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo departamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum departamento cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((d) => (
                        <ClickableTableRow
                          key={d.id}
                          onClick={() => {
                            setDeptEdit(d);
                            setDeptDialogOpen(true);
                          }}
                        >
                          <TableCell>{d.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{d.name}</TableCell>
                          <TableCell>{d.code ?? "—"}</TableCell>
                          <TableRowActions align="left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeptEdit(d); setDeptDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("department"); setDeleteId(d.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableRowActions>
                        </ClickableTableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "cargos" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Cargos</CardTitle>
                    <CardDescription>Funções (staff ou atleta) vinculadas a departamentos.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setRoleEdit(null); setRoleDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo cargo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {jobRoles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum cargo cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobRoles.map((r) => (
                        <ClickableTableRow
                          key={r.id}
                          onClick={() => {
                            setRoleEdit(r);
                            setRoleDialogOpen(true);
                          }}
                        >
                          <TableCell>{r.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.code ?? "—"}</TableCell>
                          <TableCell>{r.department?.name ?? "—"}</TableCell>
                          <TableCell>{r.type}</TableCell>
                          <TableRowActions align="left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRoleEdit(r); setRoleDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("jobRole"); setDeleteId(r.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableRowActions>
                        </ClickableTableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "colaboradores" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Colaboradores</CardTitle>
                    <CardDescription>Pessoas (staff ou atletas) cadastradas no RH — clique na linha para editar.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setEmpEdit(null); setEmpDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo colaborador
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {employees.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum colaborador cadastrado.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {groupByTeam
                        ? `${employees.length} colaborador${employees.length > 1 ? "es" : ""} em ${distinctTeams} empresas — agrupado por clube/empresa e tipo`
                        : `${employees.length} colaborador${employees.length > 1 ? "es" : ""} — agrupado por tipo`}
                    </p>
                    <FuncionariosGroupedList
                      employees={employees}
                      groupByTeam={groupByTeam}
                      hideTenantColumn={!!tenantId || groupByTeam}
                      onEdit={(e) => {
                        setEmpEdit(e);
                        setEmpDialogOpen(true);
                      }}
                      onDelete={(id) => {
                        setDeleteKind("employee");
                        setDeleteId(id);
                      }}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "vinculos" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Vínculos</CardTitle>
                    <CardDescription>Contratos (CLT, PJ, estágio, atleta) dos colaboradores.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setEmplEdit(null); setEmplDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo vínculo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {employments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum vínculo cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Clube/Empresa</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Admissão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employments.map((e) => (
                        <ClickableTableRow
                          key={e.id}
                          onClick={() => {
                            setEmplEdit(e);
                            setEmplDialogOpen(true);
                          }}
                        >
                          <TableCell>{e.tenant?.name ?? "—"}</TableCell>
                          <TableCell>{e.employee?.name ?? e.employeeId}</TableCell>
                          <TableCell>{e.jobRole?.name ?? "—"}</TableCell>
                          <TableCell>{e.contractType}</TableCell>
                          <TableCell>{new Date(e.startDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{e.status}</TableCell>
                          <TableRowActions align="left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEmplEdit(e); setEmplDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("employment"); setDeleteId(e.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableRowActions>
                        </ClickableTableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "ferias" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Férias e afastamentos</CardTitle>
                    <CardDescription>Períodos de férias, licenças e afastamentos por vínculo.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setLeaveEdit(null); setLeaveDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leavePeriods.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum período cadastrado. Selecione um clube/empresa para listar.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vínculo (colaborador — cargo)</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leavePeriods.map((p) => {
                        const emp = (p as LeavePeriodRow & { employment?: EmploymentRow }).employment;
                        const vinculoLabel = emp ? `${emp.employee?.name ?? "—"} — ${emp.jobRole?.name ?? "—"}` : p.employmentId;
                        const tipoLabel = p.type === "vacation" ? "Férias" : p.type === "sick_leave" ? "Licença saúde" : p.type === "maternity" ? "Maternidade" : p.type === "accident" ? "Acidente" : p.type;
                        return (
                        <ClickableTableRow
                          key={p.id}
                          onClick={() => {
                            setLeaveEdit(p);
                            setLeaveDialogOpen(true);
                          }}
                        >
                          <TableCell>{vinculoLabel}</TableCell>
                          <TableCell>{tipoLabel}</TableCell>
                          <TableCell>{new Date(p.startDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{new Date(p.endDate).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableRowActions align="left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLeaveEdit(p); setLeaveDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteKind("leavePeriod"); setDeleteId(p.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableRowActions>
                        </ClickableTableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <DepartmentFormDialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen} tenants={tenants} edit={deptEdit} onSuccess={() => { loadDepartments(); setDeptEdit(null); }} />
      <JobRoleFormDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} tenants={tenants} departments={departments} edit={roleEdit} onSuccess={() => { loadJobRoles(); setRoleEdit(null); }} />
      <EmployeeFormDialog open={empDialogOpen} onOpenChange={setEmpDialogOpen} tenants={tenants} jobRoles={jobRoles} departments={departments} edit={empEdit} onSuccess={() => { loadEmployees(); loadEmployments(); setEmpEdit(null); }} />
      <EmploymentFormDialog open={emplDialogOpen} onOpenChange={setEmplDialogOpen} tenants={tenants} employees={employees} jobRoles={jobRoles} departments={departments} edit={emplEdit} onSuccess={() => { loadEmployments(); setEmplEdit(null); }} />
      <LeavePeriodFormDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} employments={employments} edit={leaveEdit} onSuccess={() => { loadLeavePeriods(); setLeaveEdit(null); }} />

      <AlertDialog open={!!deleteKind} onOpenChange={(open) => !open && setDeleteKind(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteKind === "department" && "Tem certeza que deseja excluir este departamento?"}
              {deleteKind === "jobRole" && "Tem certeza que deseja excluir este cargo?"}
              {deleteKind === "employee" && "Tem certeza que deseja excluir este colaborador?"}
              {deleteKind === "employment" && "Tem certeza que deseja excluir este vínculo?"}
              {deleteKind === "leavePeriod" && "Tem certeza que deseja excluir este período de férias/afastamento?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
