"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Tenant } from "@/types/tenant";
import { useAuth } from "@/context/AuthContext";
import { LogoUploadWithName } from "@/components/dashboard/LogoUploadWithName";
import { CompetitionFormatEditor } from "@/components/dashboard/CompetitionFormatEditor";
import type { CompetitionFormat } from "@/lib/competition-formats";
import { emptyFormat } from "@/lib/competition-formats";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function NovoEventoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [organizer, setOrganizer] = useState<"group" | "tenant">("group");
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState<"football" | "other">("football");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [competitionFormat, setCompetitionFormat] = useState<CompetitionFormat | null>(null);

  const canAccess = canAccessModule("eventos");

  useEffect(() => {
    if (!canAccess) return;
    api
      .get<Tenant[]>("/tenants")
      .then((r) => setTenants(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTenants([]))
      .finally(() => setLoadingTenants(false));
  }, [canAccess]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Informe o nome do evento.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name) || "evento",
        organizer,
        tenantId: organizer === "tenant" ? tenantId || undefined : undefined,
        category,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description.trim() || undefined,
        competitionFormat: category === "football" ? (competitionFormat ?? emptyFormat("campeonato")) : null,
      };
      const res = await api.post("/events", payload);
      const ev = res.data as { id: string };

      let finalLogoUrl: string | undefined;
      if (logoFile && logoFile.type.startsWith("image/")) {
        const form = new FormData();
        form.append("file", logoFile);
        form.append("scope", `event:${ev.id}`);
        if (name?.trim()) form.append("displayName", name.trim());
        const uploadRes = await fetch("/api/upload/logo", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (uploadRes.ok) {
          const { url } = (await uploadRes.json()) as { url: string };
          finalLogoUrl = url;
        }
      } else if (logoUrl?.trim()) {
        finalLogoUrl = logoUrl.trim();
      }
      if (finalLogoUrl) {
        await api.patch(`/events/${ev.id}`, { logoUrl: finalLogoUrl });
      }

      router.push(`/dashboard/eventos`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao criar evento";
      const hint =
        /fetch failed|ECONNREFUSED|Failed to fetch/i.test(msg)
          ? " Verifique se a API está rodando (pnpm --filter api start:dev) e o banco (docker compose up -d db)."
          : "";
      setError(msg + hint);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !canAccess) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Você não tem acesso ao módulo Eventos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/eventos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo evento</h1>
          <p className="text-muted-foreground">Preencha os dados do evento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do evento</CardTitle>
            <CardDescription>Nome, organizador, categoria e período.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex.: Coffee Tournament"
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="coffee-tournament"
                  className="text-foreground"
                />
                <p className="text-xs text-muted-foreground">Usado na URL: /eventos/{slug || "..."}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organizador</Label>
                <Select value={organizer} onValueChange={(v) => setOrganizer(v as "group" | "tenant")}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo (BCG)</SelectItem>
                    <SelectItem value="tenant">Empresa / Clube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {organizer === "tenant" && (
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select value={tenantId} onValueChange={setTenantId} required={organizer === "tenant"}>
                    <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Selecione..." />
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
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as "football" | "other")}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football">Futebol</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  />
                </div>
              </div>
            </div>
            {category === "football" && (
              <div>
                <CardDescription className="sr-only">
                  Copa, torneio ou campeonato — quantidade de clubes e regras específicas.
                </CardDescription>
                <CompetitionFormatEditor
                  value={competitionFormat}
                  onChange={setCompetitionFormat}
                  disabled={saving}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Logo</Label>
              <LogoUploadWithName
                value={logoUrl}
                onChange={setLogoUrl}
                displayNameAuto={name.trim() || "Logo do evento"}
                deferredUpload
                onFileSelect={(f) => setLogoFile(f ?? null)}
                pendingFile={logoFile}
                urlPlaceholder="Ou colar URL da foto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Breve descrição do evento..."
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar evento
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/eventos">Cancelar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
