"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  editor: "Editor",
  analista: "Analista",
  diretoria: "Diretoria",
  medico: "Médico",
  psicologo: "Psicólogo",
  user: "Usuário",
};

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { isSuperAdmin, isCompanyAdmin } = useAuth();
  const canManageTenantScope = isSuperAdmin || isCompanyAdmin;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    temporaryPassword: "",
    temporaryPasswordConfirm: "",
    role: "user" as UserRole,
    tenantIds: [] as string[],
  });

  const loadTenants = useCallback(async () => {
    if (!canManageTenantScope) return;
    try {
      const res = await fetch("/api/tenants", { credentials: "include" });
      if (!res.ok) return;
      const list = (await res.json()) as { id: string; name: string }[];
      setTenants(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    }
  }, [canManageTenantScope]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.temporaryPassword !== formData.temporaryPasswordConfirm) {
      setError("As senhas temporárias não coincidem. Digite a mesma senha nos dois campos.");
      return;
    }
    if (formData.temporaryPassword.length < 8) {
      setError("A senha temporária deve ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        temporaryPassword: formData.temporaryPassword,
        role: formData.role,
      };
      if (canManageTenantScope) {
        body.tenantIds = formData.tenantIds;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao criar usuário");
      }
      router.push("/dashboard/usuarios?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Usuário</h1>
          <p className="text-muted-foreground">
            Defina e-mail, senha temporária, perfil e, se aplicável, quais empresas pode ver
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>
            O usuário receberá um e-mail para definir a senha definitiva (ou use
            a senha temporária no primeiro login).
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
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="usuario@exemplo.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temporaryPassword">Senha temporária *</Label>
              <Input
                id="temporaryPassword"
                type="password"
                required
                minLength={8}
                value={formData.temporaryPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    temporaryPassword: e.target.value,
                  }))
                }
                placeholder="Mínimo 8 caracteres"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temporaryPasswordConfirm">Confirmar senha temporária *</Label>
              <Input
                id="temporaryPasswordConfirm"
                type="password"
                required
                minLength={8}
                value={formData.temporaryPasswordConfirm}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    temporaryPasswordConfirm: e.target.value,
                  }))
                }
                placeholder="Repita a senha temporária"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                O usuário usará esta senha no primeiro login. O Cognito pode exigir
                alteração para uma senha definitiva.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role (grupo) *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, role: value as UserRole }))
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["super_admin", "company_admin", "editor", "analista", "diretoria", "medico", "psicologo", "user"] as UserRole[]).map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {canManageTenantScope && tenants.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <Label>Empresas / clubes que este utilizador pode ver</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma selecionada = vê todas as empresas. Marque uma ou mais para restringir (ex. só Villa
                    Nova).
                  </p>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {tenants.map((t) => {
                    const checked = formData.tenantIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const on = v === true;
                            setFormData((prev) => ({
                              ...prev,
                              tenantIds: on
                                ? [...prev.tenantIds, t.id]
                                : prev.tenantIds.filter((id) => id !== t.id),
                            }));
                          }}
                          disabled={loading}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar Usuário"}
              </Button>
              <Link href="/dashboard/usuarios">
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
