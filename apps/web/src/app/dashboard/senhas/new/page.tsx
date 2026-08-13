"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Shuffle } from "lucide-react";
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
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { VAULT_CATEGORIES, type VaultCategory } from "../categories";

type Tenant = { id: string; name: string; slug?: string };

export default function NovaSenhaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    category: VaultCategory;
    tenantId: string | null;
    username: string;
    url: string;
    secret: string;
    notes: string;
    status: string;
  }>({
    title: "",
    category: VAULT_CATEGORIES[0],
    tenantId: "",
    username: "",
    url: "",
    secret: "",
    notes: "",
    status: "active",
  });

  const canManage = canAccessModule("vault_manage");

  useEffect(() => {
    if (!authLoading && !canManage) {
      router.replace("/403");
      return;
    }
  }, [authLoading, canManage, router]);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/tenants")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Tenant[]) => {
        if (!cancelled) setTenants(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    try {
      const res = await authFetch("/api/vault/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          length: 24,
          upper: true,
          lower: true,
          number: true,
          symbol: true,
          avoidAmbiguous: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, secret: data.password ?? "" }));
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/vault/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          category: formData.category,
          tenantId: formData.tenantId || null,
          username: formData.username.trim() || null,
          url: formData.url.trim() || null,
          secret: formData.secret,
          notes: formData.notes.trim() || null,
          status: formData.status,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao criar item");
      }
      const item = (await res.json()) as { id?: string };
      if (item?.id) {
        markSaveSuccessForNavigation();
        router.replace(`/dashboard/senhas/${item.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar item");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !canManage) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
          <CardDescription>Preencha os campos. A senha nunca é armazenada em texto puro.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Email principal, Servidor FTP"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((p) => ({ ...p, category: v as VaultCategory }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAULT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tenant (Grupo/Empresa)</Label>
                <Select
                  value={formData.tenantId ?? "group"}
                  onValueChange={(v) => setFormData((p) => ({ ...p, tenantId: v === "group" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo</SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username / Login</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret">Senha / Segredo</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  type={showSecret ? "text" : "password"}
                  value={formData.secret}
                  onChange={(e) => setFormData((p) => ({ ...p, secret: e.target.value }))}
                  placeholder="Digite ou gere abaixo"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((s) => !s)}
                  title={showSecret ? "Ocultar" : "Mostrar"}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" onClick={handleGenerate} title="Gerar senha">
                  <Shuffle className="mr-2 h-4 w-4" />
                  Gerar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (criptografadas)</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Criar item"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/senhas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
