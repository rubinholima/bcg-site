"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { HEALTH_INTERN_AREAS } from "@/lib/health-intern-areas";
import type { HealthIntern } from "@/types/health-intern";
import type { Tenant } from "@/types/tenant";
import type { Psychologist } from "@/types/psychologist";

export function HealthInternForm({
  mode,
  internId,
  onSaved,
  cancelHref,
}: {
  mode: "create" | "edit";
  internId?: string;
  onSaved: (id: string) => void;
  cancelHref: string;
}) {
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [supervisors, setSupervisors] = useState<Psychologist[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    area: "medicina",
    email: "",
    phone: "",
    registry: "",
    bio: "",
    notes: "",
    tenantId: "",
    supervisorId: "",
    active: true,
  });

  useEffect(() => {
    api
      .get<Tenant[]>("/tenants?clubsOnly=1")
      .then(({ data }) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]));
    api
      .get<Psychologist[]>("/psychologists")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setSupervisors(
          list.filter((p) => (p.staffRole ?? "psicologo") === "psicologo"),
        );
      })
      .catch(() => setSupervisors([]));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !internId) return;
    api
      .get<HealthIntern>(`/health-interns/${internId}`)
      .then(({ data }) => {
        setForm({
          name: data.name ?? "",
          area: data.area ?? "medicina",
          email: data.email ?? "",
          phone: data.phone ?? "",
          registry: data.registry ?? "",
          bio: data.bio ?? "",
          notes: data.notes ?? "",
          tenantId: data.tenantId ?? "",
          supervisorId: data.supervisorId ?? "",
          active: data.active !== false,
        });
        setPhotoUrl(data.photoUrl ?? "");
      })
      .catch(() => setError("Erro ao carregar estagiário."))
      .finally(() => setLoading(false));
  }, [mode, internId]);

  const photoDept = form.area === "psicologia" ? "psicologia" : "medico";
  const photoSizeKey = form.area === "psicologia" ? "psicologia" : "medico";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    if (!form.area) {
      setError("Selecione a área de atuação.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && form.name.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", photoSizeKey);
        formData.append(
          "displayName",
          getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY[photoDept]),
        );
        const res = await fetch("/api/media", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const data = (await res.json()) as {
          url?: string;
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) finalPhotoUrl = data.url;
      }

      const payload = {
        name: form.name.trim(),
        area: form.area,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        registry: form.registry.trim() || undefined,
        bio: form.bio.trim() || undefined,
        notes: form.notes.trim() || undefined,
        photoUrl: finalPhotoUrl,
        tenantId: form.tenantId.trim() || undefined,
        supervisorId:
          form.area === "psicologia" ? form.supervisorId || null : null,
        active: form.active,
      };

      if (mode === "create") {
        const { data } = await api.post<HealthIntern>("/health-interns", payload);
        onSaved(data.id);
      } else if (internId) {
        await api.patch(`/health-interns/${internId}`, payload);
        onSaved(internId);
      }
    } catch {
      setError("Não foi possível salvar o estagiário.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Novo estagiário" : "Editar estagiário"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Área de atuação *</Label>
            <Select
              value={form.area}
              onValueChange={(v) => setForm((f) => ({ ...f, area: v }))}
              disabled={saving}
            >
              <SelectTrigger className="min-h-[44px] text-foreground">
                <SelectValue placeholder="Selecione a área…" />
              </SelectTrigger>
              <SelectContent>
                {HEALTH_INTERN_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.area === "psicologia" ? (
            <div className="space-y-2">
              <Label>Supervisora</Label>
              <Select
                value={form.supervisorId || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, supervisorId: v === "none" ? "" : v }))
                }
                disabled={saving}
              >
                <SelectTrigger className="min-h-[44px] text-foreground">
                  <SelectValue placeholder="Supervisora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="registry">Matrícula / registro</Label>
              <Input
                id="registry"
                className="min-h-[44px] text-foreground"
                value={form.registry}
                onChange={(e) => setForm((f) => ({ ...f, registry: e.target.value }))}
                disabled={saving}
              />
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>Foto</Label>
            <PhotoUploadWithName
              sizeKey={photoSizeKey}
              value={photoUrl}
              onChange={setPhotoUrl}
              disabled={saving}
              deferredUpload
              onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
              pendingFile={pendingPhotoFile}
              requireNameToUpload={form.name}
              displayNameAuto={
                getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY[photoDept]) ||
                undefined
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              className="min-h-[44px] uppercase text-foreground"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              disabled={saving}
            />
          </div>

          {form.area === "psicologia" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="registry-psi">CRP / registro</Label>
              <Input
                id="registry-psi"
                className="min-h-[44px] text-foreground"
                value={form.registry}
                onChange={(e) => setForm((f) => ({ ...f, registry: e.target.value }))}
                disabled={saving}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              className="min-h-[44px] text-foreground"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              className="min-h-[44px] text-foreground"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={saving}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Clube</Label>
            <Select
              value={form.tenantId || "all"}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tenantId: v === "all" ? "" : v }))
              }
              disabled={saving}
            >
              <SelectTrigger className="min-h-[44px] text-foreground">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex min-h-[44px] items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              disabled={saving}
            />
            Ativo
          </label>

          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" className="min-h-[44px]" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" asChild>
              <Link href={cancelHref}>Cancelar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
