"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { TenantKind } from "@/types/tenant-kind";
import type { Tenant } from "@/types/tenant";

interface FormData {
  name: string;
  slug: string;
  kindId: string;
  location?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

export default function NovaEmpresaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TenantKind[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    kindId: "",
    location: "",
    address: "",
    contactName: "",
    contactPhone: "",
  });

  useEffect(() => {
    async function loadTipos() {
      try {
        const { data } = await api.get<TenantKind[]>("/tenant-kinds");
        setTipos(data ?? []);
        if ((data?.length ?? 0) > 0 && !formData.kindId) {
          setFormData((prev) => ({ ...prev, kindId: data![0].id }));
        }
      } catch {
        setTipos([]);
      } finally {
        setLoadingTipos(false);
      }
    }
    loadTipos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: tenant } = await api.post<Tenant>("/tenants", formData);
      if (logoFile && tenant?.id) {
        const form = new FormData();
        form.append("file", logoFile);
        form.append("scope", tenant.id);
        const res = await fetch("/api/upload/logo", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? "Empresa criada, mas falha ao enviar logo.");
        }
      }
      router.push("/dashboard/empresas?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFile(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (PNG, JPG, WebP ou SVG).");
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFile(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/empresas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Empresa</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova empresa do grupo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo da empresa</CardTitle>
          <CardDescription>
            Imagem do logo (PNG, JPG, WebP ou SVG, máx. 2 MB). Opcional; pode ser alterado depois na edição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview ? (
            <div className="flex items-center gap-4">
              <img
                src={logoPreview}
                alt="Preview do logo"
                className="h-20 w-auto object-contain rounded border"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Trocar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={loading}
                >
                  Remover
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
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
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar logo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para cadastrar a empresa.
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
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens (gerado automaticamente pelo nome)
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="location">Localização (cidade, país)</Label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location ?? ""}
                onChange={handleChange}
                placeholder="Ex: Boston, EUA"
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
                {loading ? "Cadastrando..." : "Cadastrar Empresa"}
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
