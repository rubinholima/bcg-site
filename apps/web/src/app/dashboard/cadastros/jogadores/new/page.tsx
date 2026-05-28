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
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  categories?: string[] | null;
}

export default function NewJogadorPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) =>
        selectedTenant.categories!.includes(c.value)
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !name.trim()) {
      setError("Clube e nome são obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let finalPhotoUrl = photoUrl.trim() || undefined;
      if (pendingPhotoFile && name.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "jogadores");
        formData.append("displayName", getPhotoDisplayName(name, category || PHOTO_DEPARTMENT_BY_SIZE_KEY.jogadores));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const dataRes = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(dataRes?.message ?? dataRes?.error ?? "Erro ao enviar foto.");
          setLoading(false);
          return;
        }
        if (dataRes?.url) finalPhotoUrl = dataRes.url;
      }
      const { data } = await api.post<{ id: string }>("/players", {
        tenantId,
        name: name.trim(),
        category: category.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
        photoUrl: finalPhotoUrl,
      });
      router.push(`/dashboard/cadastros/jogadores/${data?.id ?? ""}/edit?success=new`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar atleta");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-0 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados básicos</CardTitle>
          <CardDescription>
            Clube, categoria e nome são obrigatórios. Foto e demais dados podem ser editados depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="form-jogador-new" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Clube *</Label>
                <Select
                  required
                  value={tenantId}
                  onValueChange={(v) => {
                    setTenantId(v);
                    setCategory("");
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
                <Label htmlFor="category">Categoria</Label>
                <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={!tenantId ? "Selecione o clube primeiro" : categoriesForDropdown.length ? "Opcional" : "Clube sem categorias"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {categoriesForDropdown.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.labelPT}
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
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="jogadores"
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={loading}
                namePlaceholder="Ex: foto-nome-do-atleta"
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={name}
                displayNameAuto={getPhotoDisplayName(name, category || PHOTO_DEPARTMENT_BY_SIZE_KEY.jogadores) || undefined}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar e editar"}
              </Button>
              <Link href="/dashboard/cadastros/jogadores">
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
