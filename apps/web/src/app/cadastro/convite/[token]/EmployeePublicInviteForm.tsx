"use client";

import { useMemo, useRef, useState } from "react";
import { Baby, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBaseUrl } from "@/lib/apiProxy";
import {
  EMPTY_EMPLOYEE_ADDRESS,
  parseEmployeeAddress,
  type EmployeeAddress,
  type EmployeeDependentRow,
} from "@/lib/employee-types";
import {
  getPlayerDocumentTypeLabel,
  PLAYER_DOCUMENT_TYPE_OPTIONS,
  type PlayerRegistrationDocument,
} from "@/lib/player-registration-profile";
import type { PublicRegistrationInviteData } from "./page";

const EMPLOYEE_DOC_TYPES = [
  ...PLAYER_DOCUMENT_TYPE_OPTIONS,
  { value: "ctps", label: "CTPS (arquivo)" },
  { value: "exame_admissional", label: "Exame admissional" },
  { value: "exame_demissional", label: "Exame demissional" },
  { value: "reservista", label: "Reservista" },
] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseInitialDocs(raw: unknown): PlayerRegistrationDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is PlayerRegistrationDocument =>
      !!d &&
      typeof d === "object" &&
      typeof (d as PlayerRegistrationDocument).fileUrl === "string",
  );
}

function parseInitialDependents(raw: unknown): EmployeeDependentRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && typeof d === "object" && typeof (d as EmployeeDependentRow).name === "string")
    .map((d) => {
      const row = d as EmployeeDependentRow;
      const bd = row.birthDate ?? "";
      return {
        name: row.name,
        birthDate: bd.includes("T") ? bd.slice(0, 10) : bd,
        birthCertificateFileUrl: row.birthCertificateFileUrl ?? "",
        schoolAttendanceFileUrl: row.schoolAttendanceFileUrl ?? "",
        vaccinationCardFileUrl: row.vaccinationCardFileUrl ?? "",
      };
    });
}

interface EmployeePublicInviteFormProps {
  token: string;
  initial: PublicRegistrationInviteData;
}

export function EmployeePublicInviteForm({ token, initial }: EmployeePublicInviteFormProps) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(str(initial.email));
  const [phone, setPhone] = useState(str(initial.phone));
  const [birthDate, setBirthDate] = useState(str(initial.birthDate));
  const [cpf, setCpf] = useState(str(initial.cpf));
  const [rg, setRg] = useState(str(initial.rg));
  const [pisNumber, setPisNumber] = useState(str(initial.pisNumber));
  const [voterTitle, setVoterTitle] = useState(str(initial.voterTitle));
  const [ctpsUrl, setCtpsUrl] = useState(str(initial.ctpsUrl));
  const [pixKey, setPixKey] = useState(str(initial.pixKey));
  const [photoUrl, setPhotoUrl] = useState(str(initial.photoUrl));
  const [admissionMedicalExamDate, setAdmissionMedicalExamDate] = useState(
    str(initial.admissionMedicalExamDate),
  );
  const [admissionMedicalExamFileUrl, setAdmissionMedicalExamFileUrl] = useState(
    str(initial.admissionMedicalExamFileUrl),
  );
  const [dismissalMedicalExamDate, setDismissalMedicalExamDate] = useState(
    str(initial.dismissalMedicalExamDate),
  );
  const [dismissalMedicalExamFileUrl, setDismissalMedicalExamFileUrl] = useState(
    str(initial.dismissalMedicalExamFileUrl),
  );
  const [hasMinorChildren, setHasMinorChildren] = useState(!!initial.hasMinorChildren);
  const [dependents, setDependents] = useState<EmployeeDependentRow[]>(() =>
    parseInitialDependents(initial.dependents),
  );
  const [notes, setNotes] = useState(str(initial.notes));

  const initialAddress = useMemo(() => parseEmployeeAddress(initial.address), [initial.address]);
  const [address, setAddress] = useState<EmployeeAddress>(initialAddress);

  const [documents, setDocuments] = useState<PlayerRegistrationDocument[]>(() =>
    parseInitialDocs(initial.submittedDocuments),
  );
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("rg");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setAddr = (key: keyof EmployeeAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadDoc = async () => {
    if (!uploadFile) {
      setUploadError("Selecione um arquivo.");
      return;
    }
    if (!uploadName.trim()) {
      setUploadError("Informe o nome do documento.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const base = getApiBaseUrl().replace(/\/$/, "");
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("name", uploadName.trim());
      fd.append("documentType", uploadType);
      const res = await fetch(
        `${base}/public/registration-invite/${encodeURIComponent(token)}/documents`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Erro ao enviar arquivo");
      }
      const doc = (await res.json()) as PlayerRegistrationDocument;
      setDocuments((prev) => [...prev, doc]);
      setUploadName("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const addDependent = () => {
    setDependents((prev) => [
      ...prev,
      {
        name: "",
        birthDate: "",
        birthCertificateFileUrl: "",
        schoolAttendanceFileUrl: "",
        vaccinationCardFileUrl: "",
      },
    ]);
  };

  const updateDependent = (index: number, patch: Partial<EmployeeDependentRow>) => {
    setDependents((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDependent = (index: number) => {
    setDependents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = getApiBaseUrl().replace(/\/$/, "");
      const body = {
        cpf: cpf || undefined,
        rg: rg || undefined,
        email: email || undefined,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        address,
        pisNumber: pisNumber || undefined,
        voterTitle: voterTitle || undefined,
        ctpsUrl: ctpsUrl.trim() || undefined,
        pixKey: pixKey || undefined,
        photoUrl: photoUrl.trim() || undefined,
        admissionMedicalExamDate: admissionMedicalExamDate || undefined,
        admissionMedicalExamFileUrl: admissionMedicalExamFileUrl.trim() || undefined,
        dismissalMedicalExamDate: dismissalMedicalExamDate || undefined,
        dismissalMedicalExamFileUrl: dismissalMedicalExamFileUrl.trim() || undefined,
        hasMinorChildren,
        dependents: hasMinorChildren
          ? dependents
              .filter((d) => d.name.trim() && d.birthDate.trim())
              .map((d) => ({
                name: d.name.trim(),
                birthDate: d.birthDate.trim(),
                birthCertificateFileUrl: d.birthCertificateFileUrl?.trim() || undefined,
                schoolAttendanceFileUrl: d.schoolAttendanceFileUrl?.trim() || undefined,
                vaccinationCardFileUrl: d.vaccinationCardFileUrl?.trim() || undefined,
              }))
          : [],
        notes: notes.trim() || undefined,
        documents,
      };

      const res = await fetch(
        `${base}/public/registration-invite/${encodeURIComponent(token)}/employee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "Erro ao enviar cadastro");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
        <p className="text-lg font-medium text-green-300">Cadastro enviado!</p>
        <p className="mt-2 text-sm text-zinc-400">
          Aguardando aprovação do RH. Você já pode fechar esta página.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="text-sm text-zinc-400">
        Olá, <span className="text-white font-medium">{initial.name}</span>. Preencha todos os campos
        abaixo. Campos de link aceitam URL (https://…).
      </p>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Contato</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" id="email">
            <Input
              id="email"
              type="email"
              className="text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Telefone / WhatsApp" id="phone">
            <Input
              id="phone"
              type="tel"
              className="text-foreground"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(31) 99999-9999"
            />
          </Field>
          <Field label="Data de nascimento" id="birthDate">
            <Input
              id="birthDate"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </Field>
          <Field label="Foto (URL)" id="photoUrl">
            <Input
              id="photoUrl"
              type="url"
              className="text-foreground"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Documentação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF" id="cpf">
            <Input id="cpf" className="text-foreground" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          </Field>
          <Field label="RG" id="rg">
            <Input id="rg" className="text-foreground" value={rg} onChange={(e) => setRg(e.target.value)} />
          </Field>
          <Field label="PIS" id="pis">
            <Input
              id="pis"
              className="text-foreground"
              value={pisNumber}
              onChange={(e) => setPisNumber(e.target.value)}
            />
          </Field>
          <Field label="Título de eleitor" id="voter">
            <Input
              id="voter"
              className="text-foreground"
              value={voterTitle}
              onChange={(e) => setVoterTitle(e.target.value)}
            />
          </Field>
          <Field label="CTPS digital (URL)" id="ctps" className="sm:col-span-2">
            <Input
              id="ctps"
              type="url"
              className="text-foreground"
              value={ctpsUrl}
              onChange={(e) => setCtpsUrl(e.target.value)}
              placeholder="https://link-da-ctps-digital"
            />
          </Field>
          <Field label="Chave PIX" id="pix" className="sm:col-span-2">
            <Input
              id="pix"
              className="text-foreground"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logradouro" id="street" className="sm:col-span-2">
            <Input
              id="street"
              className="text-foreground"
              value={address.street ?? ""}
              onChange={(e) => setAddr("street", e.target.value)}
            />
          </Field>
          <Field label="Número" id="number">
            <Input
              id="number"
              className="text-foreground"
              value={address.number ?? ""}
              onChange={(e) => setAddr("number", e.target.value)}
            />
          </Field>
          <Field label="Complemento" id="complement">
            <Input
              id="complement"
              className="text-foreground"
              value={address.complement ?? ""}
              onChange={(e) => setAddr("complement", e.target.value)}
            />
          </Field>
          <Field label="Bairro" id="neighborhood">
            <Input
              id="neighborhood"
              className="text-foreground"
              value={address.neighborhood ?? ""}
              onChange={(e) => setAddr("neighborhood", e.target.value)}
            />
          </Field>
          <Field label="Cidade" id="city">
            <Input
              id="city"
              className="text-foreground"
              value={address.city ?? ""}
              onChange={(e) => setAddr("city", e.target.value)}
            />
          </Field>
          <Field label="UF" id="state">
            <Input
              id="state"
              maxLength={2}
              className="text-foreground uppercase"
              value={address.state ?? ""}
              onChange={(e) => setAddr("state", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="CEP" id="zip">
            <Input
              id="zip"
              className="text-foreground"
              value={address.zipCode ?? ""}
              onChange={(e) => setAddr("zipCode", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Exames médicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data exame admissional" id="adm-date">
            <Input
              id="adm-date"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={admissionMedicalExamDate}
              onChange={(e) => setAdmissionMedicalExamDate(e.target.value)}
            />
          </Field>
          <Field label="Link do exame admissional (URL)" id="adm-url">
            <Input
              id="adm-url"
              type="url"
              className="text-foreground"
              value={admissionMedicalExamFileUrl}
              onChange={(e) => setAdmissionMedicalExamFileUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Data exame demissional" id="dismiss-date">
            <Input
              id="dismiss-date"
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={dismissalMedicalExamDate}
              onChange={(e) => setDismissalMedicalExamDate(e.target.value)}
            />
          </Field>
          <Field label="Link do exame demissional (URL)" id="dismiss-url">
            <Input
              id="dismiss-url"
              type="url"
              className="text-foreground"
              value={dismissalMedicalExamFileUrl}
              onChange={(e) => setDismissalMedicalExamFileUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Anexos</h2>
        <p className="text-sm text-zinc-400">
          Envie PDF ou foto (RG, CPF, comprovante de residência, CTPS, etc.) ou use os campos de URL acima.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do documento" id="doc-name">
            <Input
              id="doc-name"
              className="text-foreground"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Ex.: RG frente"
            />
          </Field>
          <Field label="Tipo" id="doc-type">
            <select
              id="doc-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              {EMPLOYEE_DOC_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arquivo" id="doc-file" className="sm:col-span-2">
            <Input
              id="doc-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              className="text-foreground file:text-foreground"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={uploading}
          onClick={handleUploadDoc}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Anexar documento
        </Button>
        {uploadError ? <p className="text-sm text-red-400">{uploadError}</p> : null}
        {documents.length > 0 ? (
          <ul className="space-y-2 rounded-lg border border-white/10 p-3">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {doc.name}{" "}
                  <span className="text-zinc-500">({getPlayerDocumentTypeLabel(doc.documentType)})</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-red-400"
                  onClick={() => setDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          Filhos menores de 14 anos
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={hasMinorChildren ? "default" : "outline"}
            className="min-h-10"
            onClick={() => setHasMinorChildren(true)}
          >
            Sim
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!hasMinorChildren ? "default" : "outline"}
            className="min-h-10"
            onClick={() => {
              setHasMinorChildren(false);
              setDependents([]);
            }}
          >
            Não
          </Button>
        </div>
        {hasMinorChildren ? (
          <div className="space-y-4">
            {dependents.map((dep, index) => (
              <div
                key={`dep-${index}`}
                className="rounded-lg border border-white/10 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Baby className="h-4 w-4 text-amber-400" />
                    Filho(a) {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-400"
                    onClick={() => removeDependent(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Nome ${index + 1}`} id={`dep-name-${index}`}>
                    <Input
                      id={`dep-name-${index}`}
                      className="text-foreground uppercase"
                      value={dep.name}
                      onChange={(e) => updateDependent(index, { name: e.target.value.toUpperCase() })}
                    />
                  </Field>
                  <Field label="Data de nascimento" id={`dep-birth-${index}`}>
                    <Input
                      id={`dep-birth-${index}`}
                      type="date"
                      className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                      value={dep.birthDate}
                      onChange={(e) => updateDependent(index, { birthDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Certidão de nascimento (URL)" id={`dep-cert-${index}`} className="sm:col-span-2">
                    <Input
                      id={`dep-cert-${index}`}
                      type="url"
                      className="text-foreground"
                      value={dep.birthCertificateFileUrl ?? ""}
                      onChange={(e) => updateDependent(index, { birthCertificateFileUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Declaração escolar (URL)" id={`dep-school-${index}`} className="sm:col-span-2">
                    <Input
                      id={`dep-school-${index}`}
                      type="url"
                      className="text-foreground"
                      value={dep.schoolAttendanceFileUrl ?? ""}
                      onChange={(e) => updateDependent(index, { schoolAttendanceFileUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Cartão de vacina (URL)" id={`dep-vac-${index}`} className="sm:col-span-2">
                    <Input
                      id={`dep-vac-${index}`}
                      type="url"
                      className="text-foreground"
                      value={dep.vaccinationCardFileUrl ?? ""}
                      onChange={(e) => updateDependent(index, { vaccinationCardFileUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="min-h-11" onClick={addDependent}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar filho(a)
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Observações</h2>
        <textarea
          id="notes"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informações adicionais (opcional)"
        />
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Enviar cadastro
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
