"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
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
import { VAULT_CATEGORIES } from "../../categories";

type Tenant = { id: string; name: string; slug?: string };

export default function EditarSenhaPage() {
  const router = useRouter();
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Email",
    tenantId: "" as string | null,
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

  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/vault/items/${id}`);
      if (!res.ok) {
        setLoadError("Item não encontrado ou sem permissão.");
        return;
      }
      const item = await res.json();
      setFormData({
        title: item.title ?? "",
        category: item.category ?? "App",
        tenantId: item.tenantId ?? null,
        username: item.username ?? "",
        url: item.url ?? "",
        secret: "",
        notes: "",
        status: item.status ?? "active",
      });
    } catch {
      setLoadError("Erro ao carregar item.");
    }
  }, [id]);

  useEffect(() => {
    if (canManage && id) {
      fetchItem();
    }
  }, [canManage, id, fetchItem]);

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
      const body: Record<string, unknown> = {
        title: formData.title.trim(),
        category: formData.category,
        tenantId: formData.tenantId || null,
        username: formData.username.trim() || null,
        url: formData.url.trim() || null,
        status: formData.status,
      };
      if (formData.secret) body.secret = formData.secret;
      if (formData.notes.trim()) body.notes = formData.notes.trim();
      const res = await authFetch(`/api/vault/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao atualizar item");
      }
      notifySaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar item");
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

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">{loadError}</div>
        <Link href="/dashboard/senhas">
          <Button variant="outline">Voltar ao Vault</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do item</CardTitle>
          <CardDescription>Altere o que precisar. Senha em branco mantém a atual.</CardDescription>
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
                placeholder="Ex: Email principal"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      formData.category && !VAULT_CATEGORIES.includes(formData.category as (typeof VAULT_CATEGORIES)[number])
                        ? [formData.category, ...VAULT_CATEGORIES]
                        : VAULT_CATEGORIES
                    ).map((cat) => (
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
              <Label htmlFor="secret">Nova senha (deixe em branco para não alterar)</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  type={showSecret ? "text" : "password"}
                  value={formData.secret}
                  onChange={(e) => setFormData((p) => ({ ...p, secret: e.target.value }))}
                  placeholder="••••••••"
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
                {loading ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/senhas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <SaveSuccessModal />
    </div>
  );
}
