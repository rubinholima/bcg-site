"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
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
import { getPublicImageUrl } from "@/lib/media-url";
import { MEDICAL_STAFF_ROLES, getRegistryLabel } from "@/lib/medical-staff-roles";
import type { MedicalStaff } from "@/types/medical-staff";
import type { Tenant } from "@/types/tenant";

export default function EditarMedicoEquipePage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [staff, setStaff] = useState<MedicalStaff | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
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
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<MedicalStaff>(`/medical-staff/${id}`).then(({ data }) => data),
      api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => Array.isArray(data) ? data : []),
    ])
      .then(([s, t]) => {
        setStaff(s ?? null);
        setTenants(t ?? []);
      })
      .catch(() => setStaff(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    if (pendingPhotoFile && !staff.name?.trim()) {
      setError("Preencha o nome completo antes de salvar a foto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photoUrl = staff.photoUrl ?? undefined;
      if (pendingPhotoFile && staff.name?.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "medico");
        formData.append("displayName", getPhotoDisplayName(staff.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.medico));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) {
          photoUrl = data.url;
          setPendingPhotoFile(null);
          setStaff((p) => (p ? { ...p, photoUrl } : p));
        }
      }
      await api.patch(`/medical-staff/${staff.id}`, {
        name: staff.name,
        role: staff.role,
        crmCoren: staff.crmCoren ?? undefined,
        specialty: staff.specialty ?? undefined,
        photoUrl,
        birthDate: staff.birthDate ?? undefined,
        cpf: staff.cpf ?? undefined,
        rg: staff.rg ?? undefined,
        email: staff.email ?? undefined,
        phone: staff.phone ?? undefined,
        address: staff.address ?? undefined,
        bio: staff.bio ?? undefined,
        notes: staff.notes ?? undefined,
        tenantId: staff.tenantId ?? undefined,
      });
      notifySaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-0 mb-4 flex flex-col gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/medico/equipe">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {(pendingPreviewUrl || staff.photoUrl) ? (
            <div className="h-14 w-14 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
              <img
                src={pendingPreviewUrl ?? getPublicImageUrl(staff.photoUrl!)}
                alt=""
                className="h-full w-full object-cover object-[center_20%]"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-primary text-xl font-semibold">
              {staff.name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar profissional</h1>
            <p className="text-muted-foreground">
              {staff.name}
              {staff.tenant ? ` · ${staff.tenant.name}` : ""}
            </p>
          </div>
        </div>
        <Button type="submit" form="form-medical-staff" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
      </div>

      <form id="form-medical-staff" onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados do profissional</CardTitle>
            <CardDescription>Estes dados permitem identificar o profissional em atendimentos e na equipe médica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  required
                  value={staff.name}
                  onChange={(e) => setStaff((p) => (p ? { ...p, name: e.target.value } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select required value={staff.role} onValueChange={(v) => setStaff((p) => (p ? { ...p, role: v } : p))} disabled={saving}>
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
            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="medico"
                value={staff.photoUrl ?? ""}
                onChange={(v) => setStaff((p) => (p ? { ...p, photoUrl: v || null } : p))}
                disabled={saving}
                namePlaceholder="Ex: foto-dr-joao-silva"
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={staff.name}
                displayNameAuto={getPhotoDisplayName(staff.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.medico) || undefined}
                hidePreview
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="crmCoren">{staff.role ? getRegistryLabel(staff.role) : "Registro"}</Label>
                <Input
                  id="crmCoren"
                  value={staff.crmCoren ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, crmCoren: e.target.value || null } : p))}
                  placeholder={staff.role === "medico" ? "CRM 123456" : staff.role === "enfermeiro" ? "COREN 123456" : "Nº do registro"}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  value={staff.specialty ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, specialty: e.target.value || null } : p))}
                  placeholder="Ex: ortopedia, enfermagem esportiva"
                  disabled={saving}
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
                  value={staff.birthDate ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, birthDate: e.target.value || null } : p))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={staff.cpf ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, cpf: e.target.value || null } : p))}
                  placeholder="000.000.000-00"
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={staff.rg ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, rg: e.target.value || null } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label>Clube / Empresa (opcional)</Label>
                <Select value={staff.tenantId ?? "all"} onValueChange={(v) => setStaff((p) => (p ? { ...p, tenantId: v === "all" ? null : v } : p))} disabled={saving}>
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
                  value={staff.email ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, email: e.target.value || null } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={staff.phone ?? ""}
                  onChange={(e) => setStaff((p) => (p ? { ...p, phone: e.target.value || null } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={staff.address ?? ""}
                onChange={(e) => setStaff((p) => (p ? { ...p, address: e.target.value || null } : p))}
                disabled={saving}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia / Observações</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={staff.bio ?? ""}
                onChange={(e) => setStaff((p) => (p ? { ...p, bio: e.target.value || null } : p))}
                placeholder="Breve descrição ou observações"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <textarea
                id="notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={staff.notes ?? ""}
                onChange={(e) => setStaff((p) => (p ? { ...p, notes: e.target.value || null } : p))}
                placeholder="Notas internas (não exibidas)"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          <Link href="/dashboard/medico/equipe">
            <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
          </Link>
        </div>
      </form>
      <SaveSuccessModal />
    </div>
  );
}
