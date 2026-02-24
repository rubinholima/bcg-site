"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { getPublicImageUrl } from "@/lib/media-url";
import type { Group } from "@/types/group";

export default function GrupoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoLoadError, setLogoLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/api/group");
        if (!res.ok) {
          setError("Erro ao carregar dados do grupo.");
          return;
        }
        const data: Group = await res.json();
        setGroup(data);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setAddress(data.address ?? "");
        setContactName(data.contactName ?? "");
        setContactPhone(data.contactPhone ?? "");
        setLogoLoadError(false);
      } catch {
        setError("Erro ao carregar dados do grupo.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, address: address || undefined, contactName: contactName || undefined, contactPhone: contactPhone || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro ao atualizar");
      }
      const data: Group = await res.json();
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar grupo");
    } finally {
      setLoading(false);
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
      form.append("scope", "group");
      const res = await authFetch("/api/upload/logo", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Erro no upload");
      }
      const { url } = (await res.json()) as { url: string };
      setLogoLoadError(false);
      setGroup((prev) => (prev ? { ...prev, logoUrl: url } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao subir logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("grupo_master")) {
      router.replace("/403");
    }
  }, [canAccessModule, authLoading, router]);

  if (authLoading || !canAccessModule("grupo_master")) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
          <Link href="/dashboard">
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
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grupo Master</h1>
          <p className="text-muted-foreground">
            Dados do grupo ou holding e logo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo do grupo</CardTitle>
          <CardDescription>
            Logo exibido no portal do grupo. Formatos: PNG, JPG, WebP ou SVG (máx. 2 MB). Se aparecer quebrado, confira no S3 a bucket policy (leitura pública em logos/*).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {group?.logoUrl && !logoLoadError ? (
            <div className="flex items-center gap-4">
              <img
                src={getPublicImageUrl(group.logoUrl)}
                alt="Logo do grupo"
                className="h-24 w-auto object-contain rounded border"
                onError={() => setLogoLoadError(true)}
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col gap-2">
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
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded border bg-muted">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-2">
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
            </div>
          )}
          {logoLoadError && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Logo não carregou. Verifique no S3: bucket policy deve permitir leitura em logos/* (veja docs/DESENVOLVIMENTO_DIARIO.md (seção S3_BUCKET_POLICY)).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações do grupo</CardTitle>
          <CardDescription>
            Nome e descrição do grupo ou holding (ex.: Boston City Group).
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
              <Label htmlFor="name">Nome do grupo *</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Boston City Group"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição do grupo ou holding"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <textarea
                id="address"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço completo da empresa"
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nome do contato</Label>
                <Input
                  id="contactName"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: João Silva"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone do contato</Label>
                <Input
                  id="contactPhone"
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ex: +55 11 99999-9999"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" disabled={loading}>
                  Voltar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
