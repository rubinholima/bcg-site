"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { type DepartmentRow } from "./DepartmentFormDialog";
import { type JobRoleRow } from "./JobRoleFormDialog";
import { type EmployeeRow } from "./EmployeeFormDialog";

export interface EmploymentRow {
  id: string;
  tenantId: string;
  employeeId: string;
  jobRoleId: string;
  departmentId: string | null;
  contractType: string;
  startDate: string;
  endDate: string | null;
  salaryBase: number | null;
  status: string;
  employee?: { id: string; name: string; type: string };
  jobRole?: { id: string; name: string; type: string };
  department?: { id: string; name: string } | null;
  tenant?: { id: string; name: string; slug: string };
}

const CONTRACT_TYPES = ["CLT", "PJ", "estagio", "atleta"] as const;
const STATUSES = ["ativo", "afastado", "desligado"] as const;

interface EmploymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  employees: EmployeeRow[];
  jobRoles: JobRoleRow[];
  departments: DepartmentRow[];
  edit?: EmploymentRow | null;
  onSuccess: () => void;
}

export function EmploymentFormDialog({
  open,
  onOpenChange,
  tenants,
  employees,
  jobRoles,
  departments,
  edit,
  onSuccess,
}: EmploymentFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [contractType, setContractType] = useState("CLT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salaryBase, setSalaryBase] = useState<number | "">("");
  const [status, setStatus] = useState("ativo");
  const [notes, setNotes] = useState("");

  const tenantEmployees = employees.filter((e) => e.tenant.id === tenantId);
  const tenantJobRoles = jobRoles.filter((r) => r.tenant.id === tenantId);
  const tenantDepartments = departments.filter((d) => d.tenant.id === tenantId);

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setTenantId(edit.tenantId);
      setEmployeeId(edit.employeeId);
      setJobRoleId(edit.jobRoleId);
      setDepartmentId(edit.departmentId ?? "");
      setContractType(edit.contractType);
      setStartDate(edit.startDate.slice(0, 10));
      setEndDate(edit.endDate ? edit.endDate.slice(0, 10) : "");
      setSalaryBase(edit.salaryBase ?? "");
      setStatus(edit.status);
      setNotes("");
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setEmployeeId("");
      setJobRoleId("");
      setDepartmentId("");
      setContractType("CLT");
      setStartDate("");
      setEndDate("");
      setSalaryBase("");
      setStatus("ativo");
      setNotes("");
    }
  }, [open, edit, tenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !employeeId?.trim() || !jobRoleId?.trim() || !startDate) return;
    setSaving(true);
    try {
      const payload = {
        tenantId,
        employeeId,
        jobRoleId,
        departmentId: departmentId || undefined,
        contractType,
        startDate: `${startDate}T12:00:00.000Z`,
        endDate: endDate ? `${endDate}T12:00:00.000Z` : undefined,
        salaryBase: salaryBase === "" ? undefined : Number(salaryBase),
        status,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/rh/employments/${edit.id}`, payload);
      } else {
        await api.post("/rh/employments", payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar vínculo" : "Novo vínculo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="empl-tenant">Clube/Empresa *</Label>
              <select
                id="empl-tenant"
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empl-employee">Colaborador *</Label>
              <select
                id="empl-employee"
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenantEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empl-jobRole">Cargo *</Label>
              <select
                id="empl-jobRole"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={jobRoleId}
                onChange={(e) => setJobRoleId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenantJobRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empl-department">Departamento</Label>
              <select
                id="empl-department"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">Nenhum</option>
                {tenantDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="empl-contractType">Tipo contrato *</Label>
                <select
                  id="empl-contractType"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                >
                  {CONTRACT_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="empl-status">Status *</Label>
                <select
                  id="empl-status"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="empl-startDate">Data admissão *</Label>
                <Input
                  id="empl-startDate"
                  type="date"
                  className="text-foreground"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="empl-endDate">Data desligamento</Label>
                <Input
                  id="empl-endDate"
                  type="date"
                  className="text-foreground"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empl-salaryBase">Salário base (R$)</Label>
              <Input
                id="empl-salaryBase"
                type="number"
                step="0.01"
                min={0}
                value={salaryBase}
                onChange={(e) => setSalaryBase(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empl-notes">Observações</Label>
              <textarea
                id="empl-notes"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
