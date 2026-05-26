"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBaseUrl } from "@/lib/apiProxy";
import {
  EMPTY_EMPLOYEE_ADDRESS,
  parseEmployeeAddress,
  type EmployeeAddress,
} from "@/lib/employee-types";
import {
  getPlayerDocumentTypeLabel,
  PLAYER_DOCUMENT_TYPE_OPTIONS,
  type PlayerRegistrationDocument,
} from "@/lib/player-registration-profile";
import type { PublicRegistrationInviteData } from "./page";
import { EmployeePublicInviteForm } from "./EmployeePublicInviteForm";

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

function playerMainAddress(raw: unknown): EmployeeAddress {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EMPLOYEE_ADDRESS };
  const addr = raw as Record<string, unknown>;
  const main = addr.main;
  if (!main || typeof main !== "object") return { ...EMPTY_EMPLOYEE_ADDRESS };
  const m = main as Record<string, unknown>;
  return {
    street: str(m.street),
    number: "",
    complement: str(m.complement),
    neighborhood: str(m.neighborhood),
    city: str(m.city),
    state: "",
    zipCode: str(m.zipCode),
  };
}

interface RegistrationInviteFormProps {
  token: string;
  initial: PublicRegistrationInviteData;
}

export function RegistrationInviteForm({ token, initial }: RegistrationInviteFormProps) {
  if (initial.subjectType === "employee") {
    return <EmployeePublicInviteForm token={token} initial={initial} />;
  }

  const personal = (initial.personal ?? {}) as Record<string, unknown>;

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlayer = initial.subjectType === "player";

  const [birthDate, setBirthDate] = useState(str(initial.birthDate));
  const [nationality, setNationality] = useState(str(initial.nationality));
  const [contactEmail, setContactEmail] = useState(
    str(isPlayer ? initial.contactEmail : initial.email),
  );
  const [contactPhone, setContactPhone] = useState(
    str(isPlayer ? initial.contactPhone : initial.phone),
  );
  const [emergencyName, setEmergencyName] = useState(str(initial.emergencyContactName));
  const [emergencyEmail, setEmergencyEmail] = useState(str(initial.emergencyContactEmail));
  const [emergencyPhone, setEmergencyPhone] = useState(str(initial.emergencyContactPhone));

  const [cpf, setCpf] = useState(str(isPlayer ? personal.cpf : initial.cpf));
  const [rg, setRg] = useState(str(isPlayer ? personal.rg : initial.rg));
  const [rgIssuer, setRgIssuer] = useState(str(personal.rgIssuer));
  const [maritalStatus, setMaritalStatus] = useState(str(personal.maritalStatus));
  const [gender, setGender] = useState(str(personal.gender));
  const [birthPlace, setBirthPlace] = useState(str(personal.birthPlace));

  const [pisNumber, setPisNumber] = useState(str(initial.pisNumber));
  const [voterTitle, setVoterTitle] = useState(str(initial.voterTitle));
  const [pixKey, setPixKey] = useState(str(initial.pixKey));

  const initialAddress = useMemo(
    () =>
      isPlayer
        ? playerMainAddress(initial.address)
        : parseEmployeeAddress(initial.address),
    [initial.address, isPlayer],
  );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = getApiBaseUrl().replace(/\/$/, "");
      const path = isPlayer
        ? `/public/registration-invite/${encodeURIComponent(token)}/player`
        : `/public/registration-invite/${encodeURIComponent(token)}/employee`;

      const body = isPlayer
        ? {
            birthDate: birthDate || undefined,
            nationality: nationality || undefined,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined,
            emergencyContactName: emergencyName || undefined,
            emergencyContactEmail: emergencyEmail || undefined,
            emergencyContactPhone: emergencyPhone || undefined,
            personal: {
              cpf: cpf || undefined,
              rg: rg || undefined,
              rgIssuer: rgIssuer || undefined,
              maritalStatus: maritalStatus || undefined,
              gender: gender || undefined,
              birthPlace: birthPlace || undefined,
            },
            address: {
              main: {
                street: address.street || undefined,
                complement: address.complement || undefined,
                neighborhood: address.neighborhood || undefined,
                city: address.city || undefined,
                zipCode: address.zipCode || undefined,
                phone: contactPhone || undefined,
              },
            },
          }
        : {
            cpf: cpf || undefined,
            rg: rg || undefined,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
            birthDate: birthDate || undefined,
            address,
            pisNumber: pisNumber || undefined,
            voterTitle: voterTitle || undefined,
            pixKey: pixKey || undefined,
          };

      const bodyWithDocs = { ...body, documents };
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithDocs),
      });
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
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Contato</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" id="email">
            <Input
              id="email"
              type="email"
              className="text-foreground"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label="Telefone / WhatsApp" id="phone">
            <Input
              id="phone"
              type="tel"
              className="text-foreground"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
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
          {isPlayer ? (
            <Field label="Nacionalidade" id="nationality">
              <Input
                id="nationality"
                className="text-foreground"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF" id="cpf">
            <Input id="cpf" className="text-foreground" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          </Field>
          <Field label="RG" id="rg">
            <Input id="rg" className="text-foreground" value={rg} onChange={(e) => setRg(e.target.value)} />
          </Field>
          {isPlayer ? (
            <>
              <Field label="Órgão emissor (RG)" id="rgIssuer">
                <Input
                  id="rgIssuer"
                  className="text-foreground"
                  value={rgIssuer}
                  onChange={(e) => setRgIssuer(e.target.value)}
                />
              </Field>
              <Field label="Estado civil" id="marital">
                <Input
                  id="marital"
                  className="text-foreground"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                />
              </Field>
              <Field label="Gênero" id="gender">
                <Input
                  id="gender"
                  className="text-foreground"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </Field>
              <Field label="Naturalidade" id="birthPlace">
                <Input
                  id="birthPlace"
                  className="text-foreground"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
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
              <Field label="Chave PIX" id="pix" className="sm:col-span-2">
                <Input
                  id="pix"
                  className="text-foreground"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </Field>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Anexos</h2>
        <p className="text-sm text-zinc-400">Envie PDF ou foto (RG, CPF, comprovante de residência, etc.).</p>
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
              {PLAYER_DOCUMENT_TYPE_OPTIONS.map((o) => (
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

      {isPlayer ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Emergência</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do contato" id="em-name">
              <Input
                id="em-name"
                className="text-foreground"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </Field>
            <Field label="Telefone" id="em-phone">
              <Input
                id="em-phone"
                className="text-foreground"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </Field>
            <Field label="E-mail" id="em-email" className="sm:col-span-2">
              <Input
                id="em-email"
                type="email"
                className="text-foreground"
                value={emergencyEmail}
                onChange={(e) => setEmergencyEmail(e.target.value)}
              />
            </Field>
          </div>
        </section>
      ) : null}

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
