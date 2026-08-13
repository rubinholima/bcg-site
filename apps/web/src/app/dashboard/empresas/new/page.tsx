"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { isFootballKind } from "@/lib/home-data";
import { LogoUploadWithName } from "@/components/dashboard/LogoUploadWithName";
import { useAuth } from "@/context/AuthContext";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

interface FormData {
  name: string;
  tradeName: string;
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
  sofascoreTeamId?: string;
  categories?: string[];
}

export default function NovaEmpresaPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { categories: fixtureCategories } = useFixtureCategories();
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TenantKind[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    tradeName: "",
    slug: "",
    kindId: "",
    address: "",
    contactName: "",
    contactPhone: "",
    lat: "",
    lng: "",
    city: "",
    country: "",
    websiteUrl: "",
    sofascoreTeamId: "",
    categories: [],
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
      let websiteUrl = (formData.websiteUrl ?? "").trim();
      if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
        websiteUrl = "https://" + websiteUrl;
      }
      const isClub = isFootballKind(tipos.find((t) => t.id === formData.kindId)?.name ?? "");
      const payload = {
        ...formData,
        websiteUrl: websiteUrl || undefined,
        lat: formData.lat === "" || formData.lat === undefined ? undefined : Number(formData.lat),
        lng: formData.lng === "" || formData.lng === undefined ? undefined : Number(formData.lng),
        sofascoreTeamId: isClub ? ((formData.sofascoreTeamId ?? "").trim() || null) : null,
        categories: isClub && Array.isArray(formData.categories) && formData.categories.length > 0 ? formData.categories : null,
      };
      const { data: tenant } = await api.post<Tenant>("/tenants", payload);
      if (logoFile && logoFile.type.startsWith("image/") && tenant?.id) {
        const form = new FormData();
        form.append("file", logoFile);
        form.append("scope", tenant.id);
        const displayName = [formData.name, formData.country, formData.city].filter(Boolean).join(" - ") || formData.name;
        if (displayName) form.append("displayName", displayName);
        const res = await fetch("/api/upload/logo", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? "Empresa criada, mas falha ao enviar logo.");
        }
      } else if (logoUrl?.trim() && tenant?.id) {
        await api.patch(`/tenants/${tenant.id}`, { logoUrl: logoUrl.trim() });
      }
      if (tenant?.id) {
        markSaveSuccessForNavigation();
        router.replace(`/dashboard/empresas/${tenant.id}/edit`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
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

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Somente super admin pode criar empresas. Esta área é apenas de listagem para os demais usuários.</p>
          <Link href="/dashboard/empresas">
            <Button variant="outline" className="mt-4">
              Voltar para lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo da empresa</CardTitle>
          <CardDescription>
            Imagem do logo (PNG, JPG, WebP ou SVG, máx. 2 MB). Opcional; pode ser alterado depois na edição.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogoUploadWithName
            value={logoUrl}
            onChange={setLogoUrl}
            displayNameAuto={[formData.name, formData.country, formData.city].filter(Boolean).join(" - ") || formData.name || "Logo da empresa"}
            deferredUpload
            onFileSelect={(f) => setLogoFile(f ?? null)}
            pendingFile={logoFile}
            urlPlaceholder="Ou colar URL da foto"
          />
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
              <Label htmlFor="tradeName">Nome fantasia</Label>
              <Input
                id="tradeName"
                name="tradeName"
                type="text"
                value={formData.tradeName}
                onChange={handleChange}
                placeholder="Ex: Boston City"
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

            {isFootballKind(tipos.find((t) => t.id === formData.kindId)?.name ?? "") && (
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Categorias que o clube joga</Label>
                  <p className="text-xs text-muted-foreground">
                    Libere aqui as categorias deste clube (cadastro central em{" "}
                    <Link href="/dashboard/cadastros/categorias" className="text-primary underline-offset-2 hover:underline">
                      Cadastros → Categoria
                    </Link>
                    ).
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    {fixtureCategories.map((cat) => (
                      <label
                        key={cat.value}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(formData.categories ?? []).includes(cat.value)}
                          onChange={(e) => {
                            const current = formData.categories ?? [];
                            const next = e.target.checked
                              ? [...current, cat.value]
                              : current.filter((c) => c !== cat.value);
                            setFormData((prev) => ({ ...prev, categories: next }));
                          }}
                        />
                        {cat.labelPT}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sofascoreTeamId">SofaScore Team ID (para módulo Próximos Jogos AUTO)</Label>
                  <Input
                    id="sofascoreTeamId"
                    name="sofascoreTeamId"
                    type="text"
                    value={formData.sofascoreTeamId ?? ""}
                    onChange={handleChange}
                    placeholder="Ex: 1955 (Bahia — URL: sofascore.com/team/football/bahia/1955)"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Obrigatório para &quot;Próximos Jogos&quot; com fonte AUTO. O ID do time está na URL do SofaScore.
                  </p>
                </div>
              </div>
            )}

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
              Preencha lat/lng para que a empresa/clube apareça no mapa e na lista &quot;Presença por país&quot; da home.
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
