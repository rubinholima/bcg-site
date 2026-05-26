"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
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
import { api } from "@/lib/api";
import { formatCpfForDisplay, formatCpfInput } from "@/lib/format-cpf";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { EMPLOYEE_TYPES, EMPTY_EMPLOYEE_ADDRESS, parseEmployeeAddress, type EmployeeAddress, type EmployeeDependentRow } from "@/lib/employee-types";
import {
  employeeCodeDisplay,
  employeeInternalIdDisplay,
} from "@/lib/rh-employee-display";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { Tenant } from "@/types/tenant";
import { type DepartmentRow } from "./DepartmentFormDialog";
import { type JobRoleRow } from "./JobRoleFormDialog";
import { EmployeeAddressFields } from "./EmployeeAddressFields";
import { RegistrationInviteCard } from "@/components/dashboard/RegistrationInviteCard";
import { EmployeeDependentsSection } from "./EmployeeDependentsSection";
import { EmployeeDependentFormDialog } from "./EmployeeDependentFormDialog";
import { RhDateDocumentRow, RhInlineDocumentPicker } from "./RhInlineDocumentPicker";

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
  address?: unknown;
  pisNumber?: string | null;
  voterTitle?: string | null;
  ctpsUrl?: string | null;
  pixKey?: string | null;
  admissionMedicalExamDate?: string | null;
  admissionMedicalExamFileUrl?: string | null;
  dismissalMedicalExamDate?: string | null;
  dismissalMedicalExamFileUrl?: string | null;
  hasMinorChildren?: boolean;
  dependents?: EmployeeDependentRow[];
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
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase";

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
  const [address, setAddress] = useState<EmployeeAddress>({ ...EMPTY_EMPLOYEE_ADDRESS });
  const [pisNumber, setPisNumber] = useState("");
  const [voterTitle, setVoterTitle] = useState("");
  const [ctpsUrl, setCtpsUrl] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [admissionMedicalExamDate, setAdmissionMedicalExamDate] = useState("");
  const [admissionMedicalExamFileUrl, setAdmissionMedicalExamFileUrl] = useState("");
  const [dismissalMedicalExamDate, setDismissalMedicalExamDate] = useState("");
  const [dismissalMedicalExamFileUrl, setDismissalMedicalExamFileUrl] = useState("");
  const [hasMinorChildren, setHasMinorChildren] = useState(false);
  const [dependents, setDependents] = useState<EmployeeDependentRow[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depEditIndex, setDepEditIndex] = useState<number | null>(null);
  /** Colaborador já gravado ao enviar convite antes de clicar em Salvar */
  const [persistedEmployeeId, setPersistedEmployeeId] = useState<string | null>(null);

  const tenantJobRoles = jobRoles.filter((r) => r.tenant.id === tenantId);
  const tenantDepartments = departments.filter((d) => d.tenant.id === tenantId);

  const resetDocumentation = () => {
    setAddress({ ...EMPTY_EMPLOYEE_ADDRESS });
    setPisNumber("");
    setVoterTitle("");
    setCtpsUrl("");
    setPixKey("");
    setAdmissionMedicalExamDate("");
    setAdmissionMedicalExamFileUrl("");
    setDismissalMedicalExamDate("");
    setDismissalMedicalExamFileUrl("");
    setHasMinorChildren(false);
    setDependents([]);
  };

  const applyDocumentation = (row: EmployeeRow) => {
    setAddress(parseEmployeeAddress(row.address));
    setPisNumber(row.pisNumber ?? "");
    setVoterTitle((row.voterTitle ?? "").toLocaleUpperCase("pt-BR"));
    setCtpsUrl(row.ctpsUrl ?? "");
    setPixKey(row.pixKey ?? "");
    setAdmissionMedicalExamDate(
      row.admissionMedicalExamDate ? row.admissionMedicalExamDate.slice(0, 10) : "",
    );
    setAdmissionMedicalExamFileUrl(row.admissionMedicalExamFileUrl ?? "");
    setDismissalMedicalExamDate(
      row.dismissalMedicalExamDate ? row.dismissalMedicalExamDate.slice(0, 10) : "",
    );
    setDismissalMedicalExamFileUrl(row.dismissalMedicalExamFileUrl ?? "");
    setHasMinorChildren(!!row.hasMinorChildren);
    setDependents(
      (row.dependents ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        birthDate: d.birthDate,
        birthCertificateFileUrl: d.birthCertificateFileUrl,
        schoolAttendanceFileUrl: d.schoolAttendanceFileUrl,
        vaccinationCardFileUrl: d.vaccinationCardFileUrl,
      })),
    );
  };

  useEffect(() => {
    if (!open) {
      setPersistedEmployeeId(null);
      return;
    }

    const resetEmploymentFields = () => {
      setJobRoleId("");
      setDepartmentId("");
      setActiveEmploymentId(null);
    };

    if (edit) {
      setPersistedEmployeeId(edit.id);
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
      resetDocumentation();

      (async () => {
        setLoadingDetails(true);
        try {
          const { data } = await api.get<EmployeeRow>(`/rh/employees/${edit.id}`);
          applyDocumentation(data);
        } catch {
          applyDocumentation(edit);
        } finally {
          setLoadingDetails(false);
        }
      })();

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
      setPersistedEmployeeId(null);
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
      resetDocumentation();
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

  const buildDocumentationPayload = () => ({
    address,
    pisNumber: pisNumber.trim() || undefined,
    voterTitle: voterTitle.trim() || undefined,
    ctpsUrl: ctpsUrl.trim() || undefined,
    pixKey: pixKey.trim() || undefined,
    admissionMedicalExamDate: admissionMedicalExamDate || undefined,
    admissionMedicalExamFileUrl: admissionMedicalExamFileUrl.trim() || undefined,
    dismissalMedicalExamDate: dismissalMedicalExamDate || undefined,
    dismissalMedicalExamFileUrl: dismissalMedicalExamFileUrl.trim() || undefined,
    hasMinorChildren,
  });

  const syncDependents = async (employeeId: string) => {
    if (!hasMinorChildren) {
      await api.post(`/rh/employees/${employeeId}/dependents/sync`, { dependents: [] });
      return;
    }
    await api.post(`/rh/employees/${employeeId}/dependents/sync`, {
      dependents: dependents.map((d) => ({
        name: d.name,
        birthDate: d.birthDate.includes("T") ? d.birthDate : `${d.birthDate}T12:00:00.000Z`,
        birthCertificateFileUrl: d.birthCertificateFileUrl,
        schoolAttendanceFileUrl: d.schoolAttendanceFileUrl,
        vaccinationCardFileUrl: d.vaccinationCardFileUrl,
      })),
    });
  };

  const handleDependentSave = (row: EmployeeDependentRow) => {
    if (depEditIndex != null) {
      const next = [...dependents];
      next[depEditIndex] = row;
      setDependents(next);
    } else {
      setDependents([...dependents, row]);
    }
    setDepDialogOpen(false);
    setDepEditIndex(null);
  };

  const buildEmployeePayload = () => ({
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
    ...buildDocumentationPayload(),
  });

  const saveEmployeeRecord = async (): Promise<string> => {
    const payload = buildEmployeePayload();
    const existingId = edit?.id ?? persistedEmployeeId;

    if (existingId) {
      await api.patch(`/rh/employees/${existingId}`, payload);
      await syncEmployment(existingId);
      await syncDependents(existingId);
      setPersistedEmployeeId(existingId);
      return existingId;
    }

    const { data } = await api.post<{ id: string }>("/rh/employees", payload);
    await syncEmployment(data.id);
    await syncDependents(data.id);
    setPersistedEmployeeId(data.id);
    return data.id;
  };

  const ensureEmployeeForInvite = async (): Promise<string | null> => {
    if (!tenantId?.trim() || !name?.trim() || !jobRoleId?.trim()) {
      alert("Preencha clube/empresa, nome completo e cargo antes de enviar o convite.");
      return null;
    }
    try {
      return await saveEmployeeRecord();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao cadastrar colaborador");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId?.trim() || !name?.trim() || !jobRoleId?.trim()) return;
    setSaving(true);
    try {
      await saveEmployeeRecord();
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
      <DialogContent className="w-[min(48rem,calc(100vw-1.5rem))] max-h-[min(90vh,calc(100dvh-2rem))]">
        <form onSubmit={handleSubmit} className="min-w-0">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-4 py-4">
            <ExpandableSection
              title="Empresa e tipo"
              description="Clube/empresa, tipo e matrícula"
              defaultOpen
            >
              <FormGrid cols={2}>
                <div className="grid min-w-0 gap-2 sm:col-span-2">
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
                <div className="grid min-w-0 gap-2">
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
                    <option value="temporario">{EMPLOYEE_TYPES.temporario}</option>
                    <option value="estagio">{EMPLOYEE_TYPES.estagio}</option>
                  </select>
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label className="text-muted-foreground">Matrícula RH</Label>
                  <Input
                    readOnly
                    value={edit ? employeeCodeDisplay(edit.code) : "Gerada ao salvar"}
                    className="bg-muted/50 font-mono text-sm uppercase text-muted-foreground"
                  />
                </div>
                <div className="grid min-w-0 gap-2 sm:col-span-2">
                  <Label className="text-muted-foreground">ID interno</Label>
                  <Input
                    readOnly
                    value={edit ? employeeInternalIdDisplay(edit.id) : "Gerado ao salvar"}
                    className="bg-muted/50 font-mono text-sm text-muted-foreground"
                  />
                </div>
              </FormGrid>
            </ExpandableSection>

            <ExpandableSection
              title="Contato e convite"
              description="Nome, e-mail ou telefone — envie o link de cadastro"
              defaultOpen
            >
              <div className="space-y-4">
                <FormGrid cols={2}>
                  <div className="grid min-w-0 gap-2 sm:col-span-2">
                    <Label htmlFor="emp-name">Nome completo *</Label>
                    <Input
                      id="emp-name"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLocaleUpperCase("pt-BR"))}
                      placeholder="NOME COMPLETO"
                      className="uppercase"
                      required
                    />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="emp-email">E-mail</Label>
                    <Input
                      id="emp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2">
                    <Label htmlFor="emp-phone">Telefone / WhatsApp</Label>
                    <Input
                      id="emp-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={(e) => setPhone(formatPhoneForDisplay(e.target.value))}
                      placeholder="(11) 99999-9999"
                      inputMode="tel"
                    />
                  </div>
                  <div className="grid min-w-0 gap-2 sm:col-span-2">
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
                </FormGrid>
                <RegistrationInviteCard
                  subjectType="employee"
                  subjectId={edit?.id ?? persistedEmployeeId ?? undefined}
                  name={name || edit?.name || ""}
                  contactEmail={email}
                  contactPhone={phone}
                  ensureSubjectId={edit?.id || persistedEmployeeId ? undefined : ensureEmployeeForInvite}
                />
              </div>
            </ExpandableSection>

            <ExpandableSection
              title="Dados pessoais"
              description="Endereço, departamento e foto"
              defaultOpen={!!edit}
            >
              {loadingDetails ? (
                <p className="mb-4 text-sm text-muted-foreground">Carregando dados…</p>
              ) : null}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Endereço</p>
                <EmployeeAddressFields
                  address={address}
                  onChange={setAddress}
                  birthDate={birthDate}
                  onBirthDateChange={setBirthDate}
                />
                <FormGrid cols={2}>
                  <div className="grid min-w-0 gap-2">
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
                  <div className="grid min-w-0 gap-2 sm:col-span-2">
                    <div className="min-w-0 max-w-full overflow-hidden">
                      <PhotoUploadWithName
                        sizeKey="rh"
                        value={photoUrl}
                        onChange={setPhotoUrl}
                        placeholder="Escolher da biblioteca"
                        urlPlaceholder="URL da imagem"
                        allowAllFolders
                        uploadFolderHint="rh"
                        displayNameAuto={
                          name.trim()
                            ? getPhotoDisplayName(name, PHOTO_DEPARTMENT_BY_SIZE_KEY.rh)
                            : undefined
                        }
                        showAutomaticPhotoNameNote={false}
                      />
                    </div>
                  </div>
                </FormGrid>
              </div>
            </ExpandableSection>

            <ExpandableSection title="Documentação" description="CPF, RG, PIS, título, CTPS, PIX e exames">
              {loadingDetails ? (
                <p className="text-sm text-muted-foreground">Carregando documentação…</p>
              ) : (
                <div className="space-y-4">
                  <FormGrid cols={2}>
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor="emp-cpf">CPF</Label>
                      <Input
                        id="emp-cpf"
                        value={cpf}
                        onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor="emp-rg">RG</Label>
                      <Input
                        id="emp-rg"
                        value={rg}
                        onChange={(e) => setRg(e.target.value.toLocaleUpperCase("pt-BR"))}
                        placeholder="RG"
                        className="uppercase"
                      />
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor="emp-pis">Número do PIS</Label>
                      <Input
                        id="emp-pis"
                        value={pisNumber}
                        onChange={(e) => setPisNumber(e.target.value.toLocaleUpperCase("pt-BR"))}
                        className="uppercase"
                      />
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor="emp-voter">Título de eleitor</Label>
                      <Input
                        id="emp-voter"
                        value={voterTitle}
                        onChange={(e) => setVoterTitle(e.target.value.toLocaleUpperCase("pt-BR"))}
                        className="uppercase"
                      />
                    </div>
                    <div className="grid min-w-0 gap-2 sm:col-span-2">
                      <Label htmlFor="emp-ctps">CTPS digital (URL)</Label>
                      <Input
                        id="emp-ctps"
                        value={ctpsUrl}
                        onChange={(e) => setCtpsUrl(e.target.value)}
                        placeholder="Link da CTPS online"
                      />
                    </div>
                    <div className="grid min-w-0 gap-2 sm:col-span-2">
                      <Label htmlFor="emp-pix">Chave PIX</Label>
                      <Input
                        id="emp-pix"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                      />
                    </div>
                    <RhDateDocumentRow
                      dateId="emp-adm-exam-date"
                      dateLabel="Data exame médico admissional"
                      dateValue={admissionMedicalExamDate}
                      onDateChange={setAdmissionMedicalExamDate}
                      fileLabel="Anexo do exame"
                      fileValue={admissionMedicalExamFileUrl}
                      onFileChange={setAdmissionMedicalExamFileUrl}
                    />
                    <RhDateDocumentRow
                      dateId="emp-dismiss-exam-date"
                      dateLabel="Data exame médico demissional"
                      dateValue={dismissalMedicalExamDate}
                      onDateChange={setDismissalMedicalExamDate}
                      fileLabel="Anexo do exame"
                      fileValue={dismissalMedicalExamFileUrl}
                      onFileChange={setDismissalMedicalExamFileUrl}
                    />
                  </FormGrid>
                </div>
              )}
            </ExpandableSection>

            <EmployeeDependentsSection
              hasMinorChildren={hasMinorChildren}
              onHasMinorChildrenChange={setHasMinorChildren}
              dependents={dependents}
              onDependentsChange={setDependents}
              onAddDependent={() => {
                setDepEditIndex(null);
                setDepDialogOpen(true);
              }}
              onEditDependent={(index) => {
                setDepEditIndex(index);
                setDepDialogOpen(true);
              }}
            />

            <ExpandableSection title="Observações">
              <div className="grid min-w-0 gap-2">
                <textarea
                  id="emp-notes"
                  className="min-h-[72px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground uppercase"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toLocaleUpperCase("pt-BR"))}
                  placeholder="OBSERVAÇÕES"
                />
              </div>
            </ExpandableSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loadingEmployment || loadingDetails}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>

        <EmployeeDependentFormDialog
          open={depDialogOpen}
          onOpenChange={(open) => {
            setDepDialogOpen(open);
            if (!open) setDepEditIndex(null);
          }}
          edit={depEditIndex != null ? dependents[depEditIndex] : null}
          onSave={handleDependentSave}
        />
      </DialogContent>
    </Dialog>
  );
}
