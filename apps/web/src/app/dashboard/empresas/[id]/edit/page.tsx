"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { LogoUploadWithName } from "@/components/dashboard/LogoUploadWithName";
import { Tenant } from "@/types/tenant";
import { TenantKind } from "@/types/tenant-kind";
import { isFootballKind } from "@/lib/home-data";
import { useAuth } from "@/context/AuthContext";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

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
  sofascoreTeamId?: string;
  categories?: string[];
  omieAppKey: string;
  omieAppSecret: string;
  omieCredentialsClear: boolean;
}

export default function EditEmpresaPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { categories: fixtureCategories } = useFixtureCategories();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TenantKind[]>([]);
  const [empresa, setEmpresa] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    kindId: "",
    omieAppKey: "",
    omieAppSecret: "",
    omieCredentialsClear: false,
  });
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
            sofascoreTeamId: (empresa as { sofascoreTeamId?: string | null })?.sofascoreTeamId ?? "",
            categories: Array.isArray((empresa as { categories?: string[] | null })?.categories)
              ? (empresa as { categories?: string[] }).categories ?? []
              : [],
            omieAppKey: "",
            omieAppSecret: "",
            omieCredentialsClear: false,
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
      const isClub = isFootballKind(tipos.find((t) => t.id === formData.kindId)?.name ?? "");
      const {
        omieAppKey,
        omieAppSecret,
        omieCredentialsClear,
        ...formRest
      } = formData;
      const payload: Record<string, unknown> = {
        ...formRest,
        websiteUrl: websiteUrl || undefined,
        lat: formData.lat === "" || formData.lat === undefined ? undefined : Number(formData.lat),
        lng: formData.lng === "" || formData.lng === undefined ? undefined : Number(formData.lng),
        sofascoreTeamId: isClub ? ((formData.sofascoreTeamId ?? "").trim() || null) : null,
        categories: isClub && Array.isArray(formData.categories) && formData.categories.length > 0 ? formData.categories : null,
      };
      if (omieCredentialsClear) {
        payload.omieCredentialsClear = true;
      } else if (omieAppKey.trim() && omieAppSecret.trim()) {
        payload.omieAppKey = omieAppKey.trim();
        payload.omieAppSecret = omieAppSecret.trim();
      }
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

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <p>Somente super admin pode editar empresas. Esta área é apenas de listagem para os demais usuários.</p>
          <Link href="/dashboard/empresas">
            <Button variant="outline" className="mt-4">
              Voltar para lista
            </Button>
          </Link>
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="submit" form="form-empresa" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Logo da empresa</CardTitle>
          <CardDescription>
            Imagem do logo (PNG, JPG, WebP ou SVG, máx. 10 MB). Nome automático.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LogoUploadWithName
            value={empresa?.logoUrl ?? ""}
            onChange={(url) => setEmpresa((prev) => (prev ? { ...prev, logoUrl: url } : null))}
            scope={id}
            displayNameAuto={
              [formData.name, formData.country, formData.city].filter(Boolean).join(" - ") ||
              formData.name ||
              "Logo da empresa"
            }
            sectionLabel="Logo"
            urlPlaceholder="Ou colar URL da foto"
            disabled={loading}
          />
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
          <form id="form-empresa" onSubmit={handleSubmit} className="space-y-4">
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

            <div id="integracao-omie" className="scroll-mt-24 space-y-4 pt-2 border-t border-border/50">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Integração Omie (ERP)</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Financeiro, compras e estoque. Use o App Key e o Secret do painel Omie (Resumo do app).
                  Os valores são gravados <strong className="text-foreground">criptografados</strong> no
                  servidor (mesma chave <code className="rounded bg-muted px-1 text-xs">VAULT_MASTER_KEY</code>{" "}
                  do cofre de senhas). Em produção o procedimento é o mesmo: configure a variável na API.
                </p>
                {empresa?.omieIntegrationConfigured ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    Credenciais Omie já salvas para esta empresa. Para trocar, informe novo par abaixo; para
                    remover, marque a opção no final.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400/90 mt-2">
                    Nenhuma credencial Omie salva ainda para esta empresa.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="omieAppKey">App Key</Label>
                  <Input
                    id="omieAppKey"
                    name="omieAppKey"
                    type="password"
                    autoComplete="off"
                    value={formData.omieAppKey}
                    onChange={handleChange}
                    placeholder={
                      empresa?.omieIntegrationConfigured
                        ? "Deixe vazio para manter a atual"
                        : "Cole a App Key"
                    }
                    disabled={loading || formData.omieCredentialsClear}
                    className="text-foreground font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="omieAppSecret">App Secret</Label>
                  <Input
                    id="omieAppSecret"
                    name="omieAppSecret"
                    type="password"
                    autoComplete="new-password"
                    value={formData.omieAppSecret}
                    onChange={handleChange}
                    placeholder={
                      empresa?.omieIntegrationConfigured
                        ? "Deixe vazio para manter o atual"
                        : "Cole o App Secret"
                    }
                    disabled={loading || formData.omieCredentialsClear}
                    className="text-foreground font-mono text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.omieCredentialsClear}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      omieCredentialsClear: e.target.checked,
                      ...(e.target.checked ? { omieAppKey: "", omieAppSecret: "" } : {}),
                    }))
                  }
                  disabled={loading}
                />
                Remover credenciais Omie desta empresa
              </label>
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
