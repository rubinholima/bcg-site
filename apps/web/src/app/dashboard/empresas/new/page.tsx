"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface FormData {
  name: string;
  slug: string;
  kindId: string;
}

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TenantKind[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    kindId: "",
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
      await api.post("/tenants", formData);
      router.push("/dashboard/empresas?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
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
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para cadastrar a empresa. O logo pode ser adicionado após criar, na tela de edição.
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
