"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { selectableRolesForActor } from "@/lib/user-roles";
import { isValidUsername, suggestUsernameFromName } from "@/lib/username";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  editor: "Editor",
  gerente: "Gerente",
  administrativo: "Administrativo",
  analista: "Analista",
  diretoria: "Diretoria",
  medico: "Médico",
  psicologo: "Psicólogo",
  comissao: "Comissão técnica",
  user: "Usuário",
};

const DEFAULT_PASSWORD = "720425";

export default function NovoUsuarioPage() {
  const router = useRouter();
  const { isSuperAdmin, isCompanyAdmin } = useAuth();
  const roleSelectOptions = selectableRolesForActor(isSuperAdmin);
  const canManageTenantScope = isSuperAdmin || isCompanyAdmin;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    name: "",
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

  useEffect(() => {
    const refresh = () => {
      void loadTenants();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = formData.username.trim().toLowerCase();
    if (!isValidUsername(username)) {
      setError("Username inválido. Use 3–32 caracteres: letras minúsculas, números, ponto, hífen ou underscore.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        email: formData.email.trim(),
        username,
        name: formData.name.trim() || undefined,
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
      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>
            Senha padrão <span className="font-mono">{DEFAULT_PASSWORD}</span> — o usuário será
            obrigado a trocar no primeiro login.
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
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => {
                    const next = { ...prev, name };
                    if (!usernameTouched) {
                      next.username = suggestUsernameFromName(name, prev.email);
                    }
                    return next;
                  });
                }}
                placeholder="Nome completo"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Usuário (login) *</Label>
              <Input
                id="username"
                type="text"
                required
                value={formData.username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setFormData((prev) => ({
                    ...prev,
                    username: e.target.value.toLowerCase(),
                  }));
                }}
                placeholder="primeironome"
                disabled={loading}
                className="font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Minúsculas, sem espaços. Usado na tela de login.
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
                  {roleSelectOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManageTenantScope && tenants.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <Label>Empresas / clubes que este usuário pode ver</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma selecionada = vê todas as empresas. Marque uma ou mais para restringir.
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
