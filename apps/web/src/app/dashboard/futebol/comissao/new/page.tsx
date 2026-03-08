"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { STAFF_ROLES, CONTRACT_TYPES } from "@/lib/staff-roles";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

export default function NewComissaoPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
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
    api.get<Tenant[]>("/tenants").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) =>
        selectedTenant.categories!.includes(c.value)
      )
    : FIXTURE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !name.trim() || !role) {
      setError("Clube, nome e função são obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<{ id: string }>("/technical-staff", {
        tenantId,
        name: name.trim(),
        role: role.trim(),
        categories: categories.length ? categories : undefined,
        photoUrl: photoUrl.trim() || undefined,
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
      router.push(`/dashboard/futebol/comissao/${data?.id ?? ""}/edit?success=new`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar membro");
      setLoading(false);
    }
  };

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/futebol/comissao">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo membro da comissão</h1>
          <p className="text-muted-foreground">
            Cadastre técnico, auxiliar, preparador físico, médico ou outro membro da comissão técnica.
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
              Clube, nome e função são obrigatórios. Demais campos podem ser preenchidos na edição.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Clube *</Label>
                <Select
                  required
                  value={tenantId}
                  onValueChange={(v) => {
                    setTenantId(v);
                    setCategories([]);
                  }}
                >
                  <SelectTrigger id="tenantId">
                    <SelectValue placeholder="Selecione o clube" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                placeholder="Ex: João da Silva"
                disabled={loading}
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
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidade</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Brasileira"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  disabled={loading}
                />
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
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              <MediaPicker
                sizeKey="comissao"
                value={photoUrl}
                onChange={setPhotoUrl}
                placeholder="Escolher imagem"
              />
              <Input
                className="mt-1"
                placeholder="Ou colar URL da foto"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Licenças e certificações</CardTitle>
            <CardDescription>
              CBF (Licença A/B/C), CREF, CRM, CRP ou equivalente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licenseType">Tipo de licença</Label>
                <Input
                  id="licenseType"
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  placeholder="Ex: CBF Licença A, CREF, CRM"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Número</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={loading}
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
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vínculo</CardTitle>
            <CardDescription>
              Tipo de contrato e período (início/fim).
            </CardDescription>
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
                  disabled={loading}
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
                  disabled={loading}
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
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar e editar"}
          </Button>
          <Link href="/dashboard/futebol/comissao">
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
