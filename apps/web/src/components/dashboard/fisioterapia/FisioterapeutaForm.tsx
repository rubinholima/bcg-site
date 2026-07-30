"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { getRegistryLabel } from "@/lib/medical-staff-roles";
import type { MedicalStaff } from "@/types/medical-staff";
import type { Tenant } from "@/types/tenant";

const ROLE = "fisioterapeuta";

export function FisioterapeutaForm({
  mode,
  staffId,
  onSaved,
  cancelHref,
}: {
  mode: "create" | "edit";
  staffId?: string;
  onSaved: (id: string) => void;
  cancelHref: string;
}) {
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
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
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    }).catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !staffId) return;
    api
      .get<MedicalStaff>(`/medical-staff/${staffId}`)
      .then(({ data }) => {
        if (!data || data.role !== ROLE) {
          setError("Profissional não encontrado ou não é fisioterapeuta.");
          return;
        }
        setForm({
          name: data.name ?? "",
          crmCoren: data.crmCoren ?? "",
          specialty: data.specialty ?? "",
          birthDate: data.birthDate?.slice(0, 10) ?? "",
          cpf: data.cpf ?? "",
          rg: data.rg ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          bio: data.bio ?? "",
          notes: data.notes ?? "",
          tenantId: data.tenantId ?? "",
        });
        setPhotoUrl(data.photoUrl ?? "");
      })
      .catch(() => setError("Erro ao carregar fisioterapeuta."))
      .finally(() => setLoading(false));
  }, [mode, staffId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && form.name.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "medico");
        formData.append("displayName", getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.medico));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) finalPhotoUrl = data.url;
      }

      const payload = {
        name: form.name.trim(),
        role: ROLE,
        crmCoren: form.crmCoren.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        photoUrl: finalPhotoUrl,
        birthDate: form.birthDate.trim() || undefined,
        cpf: form.cpf.trim() || undefined,
        rg: form.rg.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        bio: form.bio.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tenantId: form.tenantId.trim() || undefined,
      };

      if (mode === "create") {
        const { data } = await api.post<{ id: string }>("/medical-staff", payload);
        onSaved(data.id);
      } else if (staffId) {
        await api.patch(`/medical-staff/${staffId}`, payload);
        onSaved(staffId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Carregando…</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Novo fisioterapeuta" : "Editar fisioterapeuta"}</CardTitle>
        <CardDescription>
          Profissional disponível nos atendimentos individuais e recovery em grupo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={saving}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crmCoren">{getRegistryLabel(ROLE)}</Label>
              <Input
                id="crmCoren"
                value={form.crmCoren}
                onChange={(e) => setForm((p) => ({ ...p, crmCoren: e.target.value }))}
                placeholder="CREFITO 123456-F"
                disabled={saving}
                className="text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto</Label>
            <PhotoUploadWithName
              sizeKey="medico"
              value={photoUrl}
              onChange={setPhotoUrl}
              disabled={saving}
              deferredUpload
              onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
              pendingFile={pendingPhotoFile}
              requireNameToUpload={form.name}
              displayNameAuto={getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.medico) || undefined}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input
                id="specialty"
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                placeholder="Ex.: esportiva, traumato-ortopédica"
                disabled={saving}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Clube / Empresa (opcional)</Label>
              <Select
                value={form.tenantId || "all"}
                onValueChange={(v) => setForm((p) => ({ ...p, tenantId: v === "all" ? "" : v }))}
                disabled={saving}
              >
                <SelectTrigger className="text-foreground">
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
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={saving} className="text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} disabled={saving} className="text-foreground" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input id="birthDate" type="date" className="text-foreground" value={form.birthDate} onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} disabled={saving} className="text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Observações</Label>
            <textarea
              id="bio"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={saving}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="min-h-[44px]" disabled={saving || !form.name.trim()}>
              {saving ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}
            </Button>
            <Link href={cancelHref}>
              <Button type="button" variant="outline" className="min-h-[44px]" disabled={saving}>Cancelar</Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
