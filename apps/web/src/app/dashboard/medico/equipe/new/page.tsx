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
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { MEDICAL_STAFF_ROLES, getRegistryLabel } from "@/lib/medical-staff-roles";
import type { Tenant } from "@/types/tenant";

export default function NovoMedicoEquipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({
    name: "",
    crmCoren: "",
    specialty: "",
    birthDate: "",
    cpf: "",
    rg: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    notes: "",
    tenantId: "",
  });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => setTenants(Array.isArray(data) ? data : [])).catch(() => setTenants([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !role) {
      setError("Nome e cargo são obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ id: string }>("/medical-staff", {
        name: form.name.trim(),
        role,
        crmCoren: form.crmCoren.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        birthDate: form.birthDate.trim() || undefined,
        cpf: form.cpf.trim() || undefined,
        rg: form.rg.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        bio: form.bio.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tenantId: form.tenantId.trim() || undefined,
      });
      router.push(`/dashboard/medico/equipe/${data?.id ?? ""}/edit?success=new`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/medico/equipe">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo profissional</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre médico, enfermeiro, fisioterapeuta ou outro profissional do Depto Médico.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do profissional</CardTitle>
          <CardDescription>
            Preencha os dados. Nome e cargo são obrigatórios. O profissional poderá ser selecionado ao registrar atendimento de atleta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="medico"
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={loading}
                namePlaceholder="Ex: foto-dr-joao-silva"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex.: Dr. João Silva"
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select required value={role} onValueChange={setRole} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICAL_STAFF_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="crmCoren">{role ? getRegistryLabel(role) : "Registro"}</Label>
                <Input
                  id="crmCoren"
                  value={form.crmCoren}
                  onChange={(e) => setForm((p) => ({ ...p, crmCoren: e.target.value }))}
                  placeholder={role === "medico" ? "CRM 123456" : role === "enfermeiro" ? "COREN 123456" : "Nº do registro"}
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  value={form.specialty}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                  placeholder="Ex: ortopedia, enfermagem esportiva"
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  className="text-foreground"
                  value={form.birthDate}
                  onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" value={form.rg} onChange={(e) => setForm((p) => ({ ...p, rg: e.target.value }))} disabled={loading} className="text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Clube / Empresa (opcional)</Label>
                <Select value={form.tenantId || "all"} onValueChange={(v) => setForm((p) => ({ ...p, tenantId: v === "all" ? "" : v }))} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                  disabled={loading}
                  className="text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} disabled={loading} className="text-foreground" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia / Observações</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Breve descrição ou observações"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <textarea
                id="notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas internas (não exibidas)"
                disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading || !form.name.trim() || !role}>
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
              <Link href="/dashboard/medico/equipe">
                <Button type="button" variant="outline" disabled={loading}>Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
