"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { TenantKind } from "@/types/tenant-kind";

interface FormData {
  name: string;
  slug: string;
  kindId: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  lat?: number | "";
  lng?: number | "";
  city?: string;
  country?: string;
  websiteUrl?: string;
}

export default function EditEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TenantKind[]>([]);
  const [empresa, setEmpresa] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    kindId: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: empresa }, { data: tiposList }] = await Promise.all([
          api.get<Tenant>(`/tenants/${id}`),
          api.get<TenantKind[]>("/tenant-kinds"),
        ]);
        if (empresa) {
          setEmpresa(empresa);
          setFormData({
            name: empresa.name,
            slug: empresa.slug,
            kindId: empresa.kindId || empresa.kind?.id || "",
            address: empresa.address ?? "",
            contactName: empresa.contactName ?? "",
            contactPhone: empresa.contactPhone ?? "",
            lat: empresa.lat ?? "",
            lng: empresa.lng ?? "",
            city: empresa.city ?? "",
            country: empresa.country ?? "",
            websiteUrl: empresa.websiteUrl ?? "",
          });
        }
        setTipos(tiposList ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar empresa");
      } finally {
        setLoadingData(false);
        setLoadingTipos(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let websiteUrl = (formData.websiteUrl ?? "").trim();
      if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
        websiteUrl = "https://" + websiteUrl;
      }
      const payload = {
        ...formData,
        websiteUrl: websiteUrl || undefined,
        lat: formData.lat === "" || formData.lat === undefined ? undefined : Number(formData.lat),
        lng: formData.lng === "" || formData.lng === undefined ? undefined : Number(formData.lng),
      };
      await api.patch(`/tenants/${id}`, payload);
      router.push("/dashboard/empresas?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar empresa");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "name" && value) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({ ...prev, slug: slug || prev.slug }));
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setError("Selecione uma imagem (PNG, JPG, WebP ou SVG).");
      return;
    }
    setUploadingLogo(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scope", id);
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro no upload");
      }
      const { url } = (await res.json()) as { url: string };
      setEmpresa((prev) => (prev ? { ...prev, logoUrl: url } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao subir logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
          <Link href="/dashboard/empresas">
            <Button variant="outline" className="mt-4">
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Empresa</h1>
          <p className="text-muted-foreground">
            Atualize as informações da empresa
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo da empresa</CardTitle>
          <CardDescription>
            Imagem do logo (PNG, JPG, WebP ou SVG, máx. 2 MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {empresa?.logoUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={empresa.logoUrl}
                alt={`Logo ${empresa.name}`}
                className="h-20 w-auto object-contain rounded border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? "Enviando..." : "Alterar logo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleUploadLogo}
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded border bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? "Enviando..." : "Subir logo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleUploadLogo}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            Altere os dados abaixo e salve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Boston City Futebol"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                type="text"
                required
                value={formData.slug}
                onChange={handleChange}
                placeholder="Ex: boston-city-futebol"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kindId">Tipo de Empresa *</Label>
              <Select
                value={formData.kindId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, kindId: value }))
                }
                disabled={loading || loadingTipos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude (mapa Presença Global)</Label>
                <Input
                  id="lat"
                  name="lat"
                  type="number"
                  step="any"
                  value={formData.lat === "" ? "" : formData.lat}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lat: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  placeholder="Ex: -23.55"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude (mapa Presença Global)</Label>
                <Input
                  id="lng"
                  name="lng"
                  type="number"
                  step="any"
                  value={formData.lng === "" ? "" : formData.lng}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lng: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  placeholder="Ex: -46.63"
                  disabled={loading}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha lat/lng para aparecer no mapa e na lista &quot;Presença por país&quot; da home.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade, Estado</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city ?? ""}
                  onChange={handleChange}
                  placeholder="Ex: Boston, MA ou São Paulo, SP"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  name="country"
                  type="text"
                  value={formData.country ?? ""}
                  onChange={handleChange}
                  placeholder="Ex: EUA"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Site (URL)</Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                type="text"
                value={formData.websiteUrl ?? ""}
                onChange={handleChange}
                placeholder="Ex: site.com (não precisa de http://)"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <textarea
                id="address"
                name="address"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.address ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço completo"
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do contato</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  type="text"
                  value={formData.contactName ?? ""}
                  onChange={handleChange}
                  placeholder="Ex: Maria Silva"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone do contato</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="text"
                  value={formData.contactPhone ?? ""}
                  onChange={handleChange}
                  placeholder="Ex: +55 11 99999-9999"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || !formData.kindId}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Link href="/dashboard/empresas">
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
