"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatCpfForDisplay, formatCpfInput } from "@/lib/format-cpf";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { EMPLOYEE_TYPES } from "@/lib/employee-types";
import {
  employeeCodeDisplay,
  employeeInternalIdDisplay,
} from "@/lib/rh-employee-display";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { Tenant } from "@/types/tenant";
import { type DepartmentRow } from "./DepartmentFormDialog";
import { type JobRoleRow } from "./JobRoleFormDialog";

export interface EmployeeRow {
  id: string;
  code: string | null;
  name: string;
  cpf: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  type: string;
  categories: string[] | null;
  notes: string | null;
  photoUrl: string | null;
  playerId: string | null;
  player?: { id: string; name: string; category: string | null; position: string | null } | null;
  tenant: { id: string; name: string; slug: string; logoUrl?: string | null };
}

interface ActiveEmployment {
  id: string;
  jobRoleId: string;
  departmentId: string | null;
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  jobRoles: JobRoleRow[];
  departments: DepartmentRow[];
  edit?: EmployeeRow | null;
  onSuccess: () => void;
}

const selectClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase";

export function EmployeeFormDialog({
  open,
  onOpenChange,
  tenants,
  jobRoles,
  departments,
  edit,
  onSuccess,
}: EmployeeFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [loadingEmployment, setLoadingEmployment] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [type, setType] = useState("staff");
  const [name, setName] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [activeEmploymentId, setActiveEmploymentId] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const tenantJobRoles = jobRoles.filter((r) => r.tenant.id === tenantId);
  const tenantDepartments = departments.filter((d) => d.tenant.id === tenantId);

  useEffect(() => {
    if (!open) return;

    const resetEmploymentFields = () => {
      setJobRoleId("");
      setDepartmentId("");
      setActiveEmploymentId(null);
    };

    if (edit) {
      setTenantId(edit.tenant.id);
      setType(edit.type);
      setName(edit.name);
      setCpf(formatCpfForDisplay(edit.cpf));
      setRg((edit.rg ?? "").toLocaleUpperCase("pt-BR"));
      setEmail(edit.email ?? "");
      setPhone(formatPhoneForDisplay(edit.phone));
      setBirthDate(edit.birthDate ? edit.birthDate.slice(0, 10) : "");
      setNotes((edit.notes ?? "").toLocaleUpperCase("pt-BR"));
      setPhotoUrl(edit.photoUrl ?? "");
      resetEmploymentFields();

      (async () => {
        setLoadingEmployment(true);
        try {
          const params = new URLSearchParams({ employeeId: edit.id, status: "ativo" });
          const { data } = await api.get<ActiveEmployment[]>(`/rh/employments?${params}`);
          const active = Array.isArray(data) ? data[0] : null;
          if (active) {
            setActiveEmploymentId(active.id);
            setJobRoleId(active.jobRoleId);
            setDepartmentId(active.departmentId ?? "");
          }
        } catch {
          resetEmploymentFields();
        } finally {
          setLoadingEmployment(false);
        }
      })();
    } else {
      setTenantId(tenants[0]?.id ?? "");
      setType("staff");
      setName("");
      setCpf("");
      setRg("");
      setEmail("");
      setPhone("");
      setBirthDate("");
      setNotes("");
      setPhotoUrl("");
      resetEmploymentFields();
    }
  }, [open, edit, tenants]);

  const handleTenantChange = (nextTenantId: string) => {
    setTenantId(nextTenantId);
    setJobRoleId("");
    setDepartmentId("");
  };

  const handleJobRoleChange = (nextJobRoleId: string) => {
    setJobRoleId(nextJobRoleId);
    const role = tenantJobRoles.find((r) => r.id === nextJobRoleId);
    if (role?.departmentId) setDepartmentId(role.departmentId);
  };

  const syncEmployment = async (employeeId: string) => {
    if (!jobRoleId.trim()) return;

    const payload = {
      tenantId,
      employeeId,
      jobRoleId,
      departmentId: departmentId || undefined,
    };

    if (activeEmploymentId) {
      await api.patch(`/rh/employments/${activeEmploymentId}`, payload);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    await api.post("/rh/employments", {
      ...payload,
      contractType: "CLT",
      startDate: `${today}T12:00:00.000Z`,
      status: "ativo",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim() || !jobRoleId?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenantId,
        name: name.trim().toLocaleUpperCase("pt-BR"),
        cpf: cpf.trim() || undefined,
        rg: rg.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        type,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      };

      if (edit) {
        await api.patch(`/rh/employees/${edit.id}`, payload);
        await syncEmployment(edit.id);
      } else {
        const { data } = await api.post<{ id: string }>("/rh/employees", payload);
        await syncEmployment(data.id);
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
      <DialogContent className="mx-auto w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="emp-tenant">Clube / Empresa *</Label>
                <select
                  id="emp-tenant"
                  required
                  disabled={!!edit}
                  className={selectClassName}
                  value={tenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
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
                <Label htmlFor="emp-type">Tipo *</Label>
                <select
                  id="emp-type"
                  required
                  className={selectClassName}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="staff">{EMPLOYEE_TYPES.staff}</option>
                  <option value="dirigente">{EMPLOYEE_TYPES.dirigente}</option>
                  <option value="athlete">{EMPLOYEE_TYPES.athlete}</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label className="text-muted-foreground">Matrícula RH</Label>
                <Input
                  readOnly
                  value={edit ? employeeCodeDisplay(edit.code) : "Gerada ao salvar"}
                  className="bg-muted/50 font-mono text-sm uppercase text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp-name">Nome *</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLocaleUpperCase("pt-BR"))}
                placeholder="NOME COMPLETO"
                className="uppercase"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="emp-jobRole">
                  Cargo *
                  {loadingEmployment && (
                    <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </Label>
                <select
                  id="emp-jobRole"
                  required
                  disabled={!tenantId || loadingEmployment}
                  className={selectClassName}
                  value={jobRoleId}
                  onChange={(e) => handleJobRoleChange(e.target.value)}
                >
                  <option value="">Selecione o cargo</option>
                  {tenantJobRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emp-department">Departamento</Label>
                <select
                  id="emp-department"
                  disabled={!tenantId || loadingEmployment}
                  className={selectClassName}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {tenantDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">ID interno</Label>
              <Input
                readOnly
                value={edit ? employeeInternalIdDisplay(edit.id) : "Gerado ao salvar"}
                className="bg-muted/50 font-mono text-sm text-muted-foreground"
              />
            </div>

            <div className="grid gap-2 border-t border-border pt-4">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="rh"
                value={photoUrl}
                onChange={setPhotoUrl}
                placeholder="Escolher da biblioteca"
                urlPlaceholder="URL da foto"
                allowAllFolders
                uploadFolderHint="rh"
                displayNameAuto={
                  name.trim() ? getPhotoDisplayName(name, PHOTO_DEPARTMENT_BY_SIZE_KEY.rh) : undefined
                }
                showAutomaticPhotoNameNote={false}
                showFileFormatHint={false}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="emp-cpf">CPF</Label>
                <Input
                  id="emp-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-rg">RG</Label>
                <Input
                  id="emp-rg"
                  value={rg}
                  onChange={(e) => setRg(e.target.value.toLocaleUpperCase("pt-BR"))}
                  placeholder="RG"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp-birthDate">Data de nascimento</Label>
              <Input
                id="emp-birthDate"
                type="date"
                className="text-foreground"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="emp-email">E-mail</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emp-phone">Telefone</Label>
                <Input
                  id="emp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => setPhone(formatPhoneForDisplay(e.target.value))}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="emp-notes">Observações</Label>
              <textarea
                id="emp-notes"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase"
                value={notes}
                onChange={(e) => setNotes(e.target.value.toLocaleUpperCase("pt-BR"))}
                placeholder="OBSERVAÇÕES"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loadingEmployment}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
