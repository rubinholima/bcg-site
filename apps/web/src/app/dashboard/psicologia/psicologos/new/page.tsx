"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
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
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";

export default function NovoPsicologoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    crpOrEquivalent: "",
    bio: "",
    tenantId: "",
    calendarBlocked: false,
  });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => setTenants(Array.isArray(data) ? data : [])).catch(() => setTenants([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingPhotoFile && !form.name?.trim()) {
      setError("Preencha o nome antes de salvar a foto.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && form.name?.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "psicologia");
        formData.append("displayName", getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.psicologia));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setLoading(false);
          return;
        }
        if (data?.url) {
          finalPhotoUrl = data.url;
          setPendingPhotoFile(null);
        }
      }
      const { data } = await api.post<{ id: string }>("/psychologists", {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        crpOrEquivalent: form.crpOrEquivalent.trim() || undefined,
        bio: form.bio.trim() || undefined,
        photoUrl: finalPhotoUrl || undefined,
        tenantId: form.tenantId.trim() || undefined,
        calendarBlocked: form.calendarBlocked,
        staffRole: "psicologo",
      });
      if (data?.id) {
        markSaveSuccessForNavigation();
        router.replace(`/dashboard/psicologia/psicologos/${data.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-0 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro — Psicologia</CardTitle>
          <CardDescription>Psicóloga(o) do departamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-psicologia-new" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
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
                <Label htmlFor="crpOrEquivalent">CRP / Registro profissional</Label>
                <Input
                  id="crpOrEquivalent"
                  value={form.crpOrEquivalent}
                  onChange={(e) => setForm((p) => ({ ...p, crpOrEquivalent: e.target.value }))}
                  placeholder="Ex.: CRP 06/12345"
                  disabled={loading}
                  className="text-foreground"
                />
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
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="psicologia"
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={loading}
                namePlaceholder="Ex: foto-nome-do-psicologo"
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={form.name}
                displayNameAuto={getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.psicologia) || undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia / Observações</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Breve descrição ou observações"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Clube / Empresa (opcional)</Label>
              <Select
                value={form.tenantId || "all"}
                onValueChange={(v) => setForm((p) => ({ ...p, tenantId: v === "all" ? "" : v }))}
                disabled={loading}
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Todos (atende qualquer clube/empresa)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (atende qualquer clube/empresa)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se deixar em &quot;Todos&quot;, o psicólogo poderá ser escolhido em consultas de qualquer clube/empresa.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-4 py-3">
              <input
                type="checkbox"
                id="calendarBlocked"
                checked={form.calendarBlocked}
                onChange={(e) => setForm((p) => ({ ...p, calendarBlocked: e.target.checked }))}
                disabled={loading}
                className="rounded border-input"
              />
              <Label htmlFor="calendarBlocked" className="cursor-pointer font-normal">
                Bloquear calendário (não disponível para agendamento)
              </Label>
            </div>

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading || !form.name.trim()}>
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
              <Link href="/dashboard/psicologia/psicologos">
                <Button type="button" variant="outline" disabled={loading}>Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
