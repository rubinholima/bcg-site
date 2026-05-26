"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExpandableSection,
  FormGrid,
} from "@/components/dashboard/players/ExpandableSection";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { maskBrlInput, parseBrlAmount, formatBrlAmount } from "@/lib/format-money-brl";
import { api } from "@/lib/api";
import { getEmployeeTypeLabel } from "@/lib/employee-types";
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
  employee?: { id: string; name: string; type: string; email?: string | null };
  jobRole?: { id: string; name: string; type: string };
  department?: { id: string; name: string } | null;
  tenant?: { id: string; name: string; slug: string };
}

const CONTRACT_TYPES = ["CLT", "PJ", "estagio", "atleta"] as const;
const STATUSES = ["ativo", "afastado", "desligado"] as const;

const selectClassName =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  estagio: "Estágio",
  atleta: "Contrato de atleta",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  desligado: "Desligado",
};

interface EmploymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  employees: EmployeeRow[];
  jobRoles: JobRoleRow[];
  departments: DepartmentRow[];
  edit?: EmploymentRow | null;
  onSuccess: () => void;
  /** Após criar vínculo — abre fluxo de contrato PDF (ex.: lista de contratos). */
  onAfterCreate?: (employment: EmploymentRow) => void;
  /** Abre gerar PDF / enviar assinatura (vínculo já salvo). */
  onOpenContracts?: (employment: EmploymentRow) => void;
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
  onAfterCreate,
  onOpenContracts,
}: EmploymentFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [contractType, setContractType] = useState("CLT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salaryBase, setSalaryBase] = useState("");
  const [status, setStatus] = useState("ativo");
  const [notes, setNotes] = useState("");
  const [openContractAfterCreate, setOpenContractAfterCreate] = useState(false);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [cadastroMissing, setCadastroMissing] = useState(false);

  const tenantEmployees = employees.filter((e) => e.tenant.id === tenantId);
  const tenantJobRoles = jobRoles.filter((r) => r.tenant.id === tenantId);
  const tenantDepartments = departments.filter((d) => d.tenant.id === tenantId);

  const selectedJobRoleName =
    edit?.jobRole?.name ?? tenantJobRoles.find((r) => r.id === jobRoleId)?.name ?? "";
  const selectedDepartmentName =
    edit?.department?.name ?? tenantDepartments.find((d) => d.id === departmentId)?.name ?? "";

  const loadCadastroFromEmployee = useCallback(async (empId: string) => {
    setLoadingCadastro(true);
    setCadastroMissing(false);
    try {
      const params = new URLSearchParams({ employeeId: empId });
      const { data } = await api.get<EmploymentRow[]>(`/rh/employments?${params.toString()}`);
      const rows = Array.isArray(data) ? data : [];
      const fromCadastro = rows.find((r) => r.status === "ativo") ?? rows[0];
      if (fromCadastro?.jobRoleId) {
        setJobRoleId(fromCadastro.jobRoleId);
        setDepartmentId(fromCadastro.departmentId ?? "");
      } else {
        setJobRoleId("");
        setDepartmentId("");
        setCadastroMissing(true);
      }
    } catch {
      setJobRoleId("");
      setDepartmentId("");
      setCadastroMissing(true);
    } finally {
      setLoadingCadastro(false);
    }
  }, []);

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
      setSalaryBase(edit.salaryBase != null ? formatBrlAmount(edit.salaryBase) : "");
      setStatus(edit.status);
      setNotes("");
      setSalaryError(null);
      setOpenContractAfterCreate(false);
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
      setOpenContractAfterCreate(false);
    }
  }, [open, edit, tenants]);

  useEffect(() => {
    if (!open || edit || !employeeId) {
      if (!employeeId && !edit) {
        setJobRoleId("");
        setDepartmentId("");
        setCadastroMissing(false);
      }
      return;
    }
    loadCadastroFromEmployee(employeeId);
  }, [open, edit, employeeId, loadCadastroFromEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryError(null);
    if (!tenantId?.trim() || !employeeId?.trim() || !startDate) return;
    if (!jobRoleId?.trim()) {
      alert(
        "Este colaborador não tem cargo/departamento no cadastro. Cadastre em RH → Colaboradores antes de criar o vínculo.",
      );
      return;
    }
    const salaryParsed = parseBrlAmount(salaryBase);
    if (salaryParsed == null || salaryParsed <= 0) {
      setSalaryError("Informe o salário base em reais (R$).");
      return;
    }
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
        salaryBase: salaryParsed,
        status,
        notes: notes.trim() || undefined,
      };
      if (edit) {
        await api.patch(`/rh/employments/${edit.id}`, payload);
        onSuccess();
        onOpenChange(false);
      } else {
        const { data } = await api.post<EmploymentRow>("/rh/employments", payload);
        onSuccess();
        onOpenChange(false);
        if (openContractAfterCreate && onAfterCreate && data?.id) {
          onAfterCreate(data);
        }
        setOpenContractAfterCreate(false);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(48rem,calc(100vw-1.5rem))] max-h-[min(90vh,calc(100dvh-2rem))]">
        <form onSubmit={handleSubmit} className="min-w-0">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar vínculo" : "Novo vínculo"}</DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-4 py-4">
            <ExpandableSection
              title="Empresa e colaborador"
              description="Clube/empresa e pessoa vinculada"
              defaultOpen
            >
              <FormGrid cols={2}>
                <div className="grid min-w-0 gap-2 sm:col-span-2">
                  <Label htmlFor="empl-tenant">Clube / Empresa *</Label>
                  <select
                    id="empl-tenant"
                    required
                    disabled={!!edit}
                    className={selectClassName}
                    value={tenantId}
                    onChange={(e) => {
                      setTenantId(e.target.value);
                      setEmployeeId("");
                      setJobRoleId("");
                      setDepartmentId("");
                      setCadastroMissing(false);
                    }}
                  >
                    <option value="">Selecione</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid min-w-0 gap-2 sm:col-span-2">
                  <Label htmlFor="empl-employee">Colaborador *</Label>
                  <select
                    id="empl-employee"
                    required
                    disabled={!!edit}
                    className={selectClassName}
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  >
                    <option value="">Selecione o colaborador</option>
                    {tenantEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} · {getEmployeeTypeLabel(emp.type)}
                      </option>
                    ))}
                  </select>
                </div>
              </FormGrid>
            </ExpandableSection>

            <ExpandableSection
              title="Cargo e departamento"
              description="Herdado do cadastro do colaborador"
              defaultOpen
            >
              {!employeeId && !edit ? (
                <p className="text-sm text-muted-foreground">
                  Selecione o colaborador acima para carregar cargo e departamento.
                </p>
              ) : loadingCadastro ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando cadastro do colaborador…
                </div>
              ) : (
                <FormGrid cols={2}>
                  <div className="grid min-w-0 gap-2">
                    <Label>Cargo</Label>
                    <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium uppercase min-h-[38px] flex items-center">
                      {selectedJobRoleName || "—"}
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label>Departamento</Label>
                    <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium uppercase min-h-[38px] flex items-center">
                      {selectedDepartmentName || "—"}
                    </div>
                  </div>
                </FormGrid>
              )}
              {cadastroMissing && employeeId ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Cadastre cargo e departamento em <strong>RH → Colaboradores</strong> antes de criar o vínculo.
                </p>
              ) : null}
            </ExpandableSection>

            <ExpandableSection
              title="Contrato"
              description="Dados do vínculo, salário e geração do PDF para assinatura"
              defaultOpen
            >
              <FormGrid cols={2}>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="empl-contractType">Tipo de contrato *</Label>
                  <select
                    id="empl-contractType"
                    required
                    className={selectClassName}
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                  >
                    {CONTRACT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {CONTRACT_TYPE_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="empl-status">Status *</Label>
                  <select
                    id="empl-status"
                    required
                    className={selectClassName}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="empl-startDate">Data de admissão *</Label>
                  <Input
                    id="empl-startDate"
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="empl-endDate">Data de desligamento</Label>
                  <Input
                    id="empl-endDate"
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="grid min-w-0 gap-2 sm:col-span-2">
                  <Label htmlFor="empl-salaryBase">Salário base *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="empl-salaryBase"
                      inputMode="numeric"
                      className="pl-10 text-foreground tabular-nums"
                      value={salaryBase}
                      onChange={(e) => {
                        setSalaryError(null);
                        setSalaryBase(maskBrlInput(e.target.value));
                      }}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  {salaryError ? <p className="text-xs text-destructive">{salaryError}</p> : null}
                </div>
              </FormGrid>

              <div className="mt-6 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">Contrato e assinatura</p>
                <p className="text-sm text-muted-foreground">
                  {edit
                    ? "Gera o PDF a partir do modelo do Jurídico (Contratos base), preenche com os dados deste vínculo e envia para assinatura. Salve alterações no botão abaixo antes, se necessário."
                    : "Primeiro salve o vínculo com o botão Salvar abaixo. Depois você pode gerar o PDF — ou use o atalho aqui para salvar e já abrir o contrato."}
                </p>
                {edit && onOpenContracts ? (
                  <Button
                    type="button"
                    variant="default"
                    className="w-full sm:w-auto"
                    onClick={() => onOpenContracts(edit)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar contrato e enviar para assinatura
                  </Button>
                ) : !edit ? (
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={saving}
                    className="w-full sm:w-auto"
                    onClick={() => setOpenContractAfterCreate(true)}
                  >
                    {saving && openContractAfterCreate ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Salvar e abrir contrato
                  </Button>
                ) : null}
              </div>
            </ExpandableSection>

            <ExpandableSection title="Observações">
              <div className="grid min-w-0 gap-2">
                <textarea
                  id="empl-notes"
                  className="min-h-[72px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações"
                />
              </div>
            </ExpandableSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              onClick={() => setOpenContractAfterCreate(false)}
            >
              {saving && !openContractAfterCreate && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
