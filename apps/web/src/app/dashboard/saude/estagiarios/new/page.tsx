"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";
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
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";
import type { Psychologist } from "@/types/psychologist";

type Area = "medico" | "psicologia";

export default function NovoEstagiarioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [area, setArea] = useState<Area>("psicologia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [supervisors, setSupervisors] = useState<Psychologist[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    registry: "",
    bio: "",
    tenantId: "",
    supervisorId: "",
    specialty: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => setTenants(Array.isArray(data) ? data : [])).catch(() => setTenants([]));
    api.get<Psychologist[]>("/psychologists").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setSupervisors(list.filter((p) => (p.staffRole ?? "psicologo") === "psicologo"));
    }).catch(() => setSupervisors([]));
  }, []);

  const photoDept = area === "medico" ? "medico" : "psicologia";
  const photoSizeKey = area === "medico" ? "medico" : "psicologia";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Informe o nome.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && form.name.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", photoSizeKey);
        formData.append("displayName", getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY[photoDept]));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setLoading(false);
          return;
        }
        if (data?.url) finalPhotoUrl = data.url;
      }

      if (area === "psicologia") {
        await api.post("/psychologists", {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          crpOrEquivalent: form.registry.trim() || undefined,
          bio: form.bio.trim() || undefined,
          photoUrl: finalPhotoUrl,
          tenantId: form.tenantId.trim() || undefined,
          staffRole: "estagiario",
          supervisorId: form.supervisorId || undefined,
        });
      } else {
        await api.post("/medical-staff", {
          name: form.name.trim(),
          role: "estagiario",
          crmCoren: form.registry.trim() || undefined,
          specialty: form.specialty.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          bio: form.bio.trim() || undefined,
          photoUrl: finalPhotoUrl,
          tenantId: form.tenantId.trim() || undefined,
        });
      }

      router.push("/dashboard/saude/estagiarios?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setLoading(false);
    }
  };

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Saúde"
        sectionIcon={GraduationCap}
        title="Novo estagiário"
        backHref="/dashboard/saude/estagiarios"
        compact
      />

      <Card>
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error ? (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Área *</Label>
                <Select value={area} onValueChange={(v) => setArea(v as Area)}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="psicologia">Psicologia</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {area === "psicologia" ? (
                <div className="space-y-2">
                  <Label>Supervisora</Label>
                  <Select
                    value={form.supervisorId || "none"}
                    onValueChange={(v) => setForm((p) => ({ ...p, supervisorId: v === "none" ? "" : v }))}
                    disabled={loading}
                  >
                    <SelectTrigger className="text-foreground">
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
                  <Label>Especialidade / setor</Label>
                  <Input
                    className="text-foreground"
                    value={form.specialty}
                    onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  required
                  className="text-foreground"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry">{area === "psicologia" ? "CRP / registro" : "Matrícula / registro"}</Label>
                <Input
                  id="registry"
                  className="text-foreground"
                  value={form.registry}
                  onChange={(e) => setForm((p) => ({ ...p, registry: e.target.value }))}
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
                  className="text-foreground"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  className="text-foreground"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey={photoSizeKey}
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={loading}
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={form.name}
                displayNameAuto={getPhotoDisplayName(form.name, PHOTO_DEPARTMENT_BY_SIZE_KEY[photoDept]) || undefined}
              />
            </div>

            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={form.tenantId || "all"}
                onValueChange={(v) => setForm((p) => ({ ...p, tenantId: v === "all" ? "" : v }))}
                disabled={loading}
              >
                <SelectTrigger className="text-foreground">
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

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !form.name.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cadastrar
              </Button>
              <Link href="/dashboard/saude/estagiarios">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
