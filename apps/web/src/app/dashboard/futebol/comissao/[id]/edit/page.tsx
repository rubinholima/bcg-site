"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { STAFF_ROLES, CONTRACT_TYPES } from "@/lib/staff-roles";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

interface StaffData {
  id: string;
  tenantId: string;
  tenant?: { id: string; name: string; slug?: string };
  name: string;
  photoUrl?: string | null;
  role: string;
  categories?: string[] | null;
  birthDate?: string | null;
  nationality?: string | null;
  cpf?: string | null;
  rg?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  licenseType?: string | null;
  licenseNumber?: string | null;
  licenseValidUntil?: string | null;
  contractType?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  bio?: string | null;
  notes?: string | null;
}

function formatDateInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default function EditComissaoPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [staff, setStaff] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhotoFile) { setPendingPreviewUrl(null); return; }
    const url = URL.createObjectURL(pendingPhotoFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhotoFile]);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseValidUntil, setLicenseValidUntil] = useState("");
  const [contractType, setContractType] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [bio, setBio] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Tenant[]>("/tenants?clubsOnly=1"),
      api.get<StaffData>(`/technical-staff/${id}`),
    ])
      .then(([tenantsRes, staffRes]) => {
        setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
        const s = staffRes.data;
        setStaff(s);
        setName(s.name ?? "");
        setRole(s.role ?? "");
        setCategories(Array.isArray(s.categories) ? s.categories : []);
        const url = s.photoUrl ?? "";
        setPhotoUrl(url);
        setBirthDate(s.birthDate ?? "");
        setNationality(s.nationality ?? "");
        setCpf(s.cpf ?? "");
        setRg(s.rg ?? "");
        setEmail(s.email ?? "");
        setPhone(s.phone ?? "");
        setAddress(s.address ?? "");
        setLicenseType(s.licenseType ?? "");
        setLicenseNumber(s.licenseNumber ?? "");
        setLicenseValidUntil(formatDateInput(s.licenseValidUntil));
        setContractType(s.contractType ?? "");
        setContractStart(formatDateInput(s.contractStart));
        setContractEnd(formatDateInput(s.contractEnd));
        setBio(s.bio ?? "");
        setNotes(s.notes ?? "");
      })
      .catch(() => setError("Membro não encontrado"))
      .finally(() => setLoading(false));
  }, [id]);

  const selectedTenant = tenants.find((t) => t.id === staff?.tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) =>
        selectedTenant.categories!.includes(c.value)
      )
    : FIXTURE_CATEGORIES;

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name.trim() || !role) {
      setError("Nome e função são obrigatórios.");
      return;
    }
    if (pendingPhotoFile && !name?.trim()) {
      setError("Preencha o nome completo antes de salvar a foto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && name?.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "comissao");
        formData.append("displayName", getPhotoDisplayName(name, PHOTO_DEPARTMENT_BY_SIZE_KEY.comissao));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) {
          finalPhotoUrl = data.url;
          setPendingPhotoFile(null);
          setPhotoUrl(data.url);
        }
      }
      await api.patch(`/technical-staff/${id}`, {
        name: name.trim(),
        role: role.trim(),
        categories: categories.length ? categories : undefined,
        photoUrl: finalPhotoUrl || undefined,
        birthDate: birthDate.trim() || undefined,
        nationality: nationality.trim() || undefined,
        cpf: cpf.trim() || undefined,
        rg: rg.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        licenseType: licenseType.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        licenseValidUntil: licenseValidUntil.trim() || undefined,
        contractType: contractType.trim() || undefined,
        contractStart: contractStart.trim() || undefined,
        contractEnd: contractEnd.trim() || undefined,
        bio: bio.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.push("/dashboard/futebol/comissao?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return (
      <div className="flex items-center justify-center py-12">
        {error ? (
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Link href="/dashboard/futebol/comissao">
              <Button variant="outline">Voltar</Button>
            </Link>
          </div>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/futebol/comissao">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar comissão técnica</h1>
          <p className="text-muted-foreground">
            {staff.name} — {staff.tenant?.name ?? staff.tenantId}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
            <CardDescription>
              Clube não pode ser alterado. Nome e função são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="comissao"
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={saving}
                namePlaceholder="Ex: foto-joao-silva"
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={name}
                displayNameAuto={getPhotoDisplayName(name, PHOTO_DEPARTMENT_BY_SIZE_KEY.comissao) || undefined}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Clube</Label>
                <Input
                  value={selectedTenant?.name ?? staff.tenantId}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Função *</Label>
                <Select required value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label>Categorias que atende</Label>
              <div className="flex flex-wrap gap-2">
                {categoriesForDropdown.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    variant={categories.includes(c.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategory(c.value)}
                  >
                    {c.labelPT}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidade</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" value={rg} onChange={(e) => setRg(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licenças e certificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licenseType">Tipo de licença</Label>
                <Input
                  id="licenseType"
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Número</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="licenseValidUntil">Validade da licença</Label>
              <Input
                id="licenseValidUntil"
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={licenseValidUntil}
                onChange={(e) => setLicenseValidUntil(e.target.value)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vínculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de contrato</Label>
                <Select value={contractType || "none"} onValueChange={(v) => setContractType(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {CONTRACT_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractStart">Início</Label>
                <Input
                  id="contractStart"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractEnd">Fim</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / Resumo profissional</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Link href="/dashboard/futebol/comissao">
            <Button type="button" variant="outline" disabled={saving}>
              Voltar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
