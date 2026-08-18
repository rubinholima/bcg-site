"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
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
import { UserAdminActions } from "@/components/dashboard/usuarios/UserAdminActions";
import type { UserListItem, UserRole } from "@/types/user";
import { selectableRolesForActor, roleLabel } from "@/lib/user-roles";
import { usePlatformRoles } from "@/hooks/usePlatformRoles";
import { isValidUsername } from "@/lib/username";

export default function EditUsuarioPage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams();
  const { isSuperAdmin, isCompanyAdmin, user: currentUser } = useAuth();
  const canManageTenantScope = isSuperAdmin || isCompanyAdmin;
  const { roles: roleCatalog } = usePlatformRoles();
  const roleSelectOptions = selectableRolesForActor(isSuperAdmin, roleCatalog);
  const username = decodeURIComponent(params.username as string);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [cannotEdit, setCannotEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    role: "user" as UserRole,
    tenantIds: [] as string[],
    blocked: false,
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

  useEffect(() => {
    async function load() {
      setCannotEdit(false);
      setError(null);
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setError(res.status === 404 ? "Usuário não encontrado." : "Erro ao carregar usuário.");
          setLoadingData(false);
          return;
        }
        const data: UserListItem = await res.json();
        setFormData({
          username: data.username ?? "",
          email: data.email ?? "",
          name: data.name ?? "",
          role: data.role ?? "user",
          tenantIds: data.tenantIds ?? [],
          blocked: Boolean(data.blocked),
        });
        if (isCompanyAdmin && data.role === "super_admin") {
          setCannotEdit(true);
          setError("Company admin não pode editar usuário super admin.");
        } else {
          setCannotEdit(false);
        }
      } catch {
        setError("Erro ao carregar usuário.");
      } finally {
        setLoadingData(false);
      }
    }
    void load();
  }, [username, isCompanyAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cannotEdit) return;
    if (!isValidUsername(formData.username.trim())) {
      setError("Username inválido. Use 3–32 caracteres: letras minúsculas, números, ponto, hífen ou underscore.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim() || undefined,
        name: formData.name.trim() || undefined,
        role: formData.role,
      };
      if (canManageTenantScope) {
        body.tenantIds = formData.tenantIds;
      }
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao atualizar usuário");
      }
      notifySaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>
            Login: <span className="font-mono">{username}</span>
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
              <Label htmlFor="username">Usuário (login)</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))
                }
                placeholder="primeironome"
                disabled={loading || cannotEdit}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="usuario@exemplo.com"
                disabled={loading || cannotEdit}
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
                disabled={loading || cannotEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role (grupo)</Label>
              {cannotEdit ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {roleLabel(formData.role, roleCatalog)}
                </div>
              ) : (
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, role: value as UserRole }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="uppercase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleSelectOptions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r, roleCatalog)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {canManageTenantScope && tenants.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <Label>Empresas / clubes visíveis</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sem empresas marcadas = sem acesso a dados por clube (exceto super admin).
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
                          disabled={loading || cannotEdit}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || cannotEdit}>
                {loading ? "Salvando..." : "Salvar"}
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
      {isSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Administração</CardTitle>
            <CardDescription>
              Bloqueio de acesso e redefinição de senha para{" "}
              <span className="font-mono">{formData.username || username}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAdminActions
              username={formData.username || username}
              blocked={formData.blocked}
              isSelf={currentUser?.username === (formData.username || username)}
              onUpdated={(patch) =>
                setFormData((prev) => ({
                  ...prev,
                  ...(patch.blocked !== undefined ? { blocked: patch.blocked } : {}),
                }))
              }
            />
          </CardContent>
        </Card>
      ) : null}
      <SaveSuccessModal />
    </div>
  );
}
