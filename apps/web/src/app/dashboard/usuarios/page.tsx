"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, UserCircle, Pencil, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserListItem, UserRole } from "@/types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  editor: "Editor",
  user: "Usuário",
};

function filterUsers(
  users: UserListItem[],
  role: string | null,
  q: string | null,
): UserListItem[] {
  let list = users;
  if (role && role !== "all") list = list.filter((u) => u.role === role);
  if (q && q.trim()) {
    const lower = q.trim().toLowerCase();
    list = list.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(lower) ||
        (u.name ?? "").toLowerCase().includes(lower) ||
        (u.username ?? "").toLowerCase().includes(lower),
    );
  }
  return list;
}

export default function UsuariosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(
    () => searchParams.get("role"),
  );
  const [filterQ, setFilterQ] = useState<string>(() => searchParams.get("q") ?? "");
  const showSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    setFilterRole(searchParams.get("role"));
    setFilterQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const filteredUsers = useMemo(
    () => filterUsers(users, filterRole, filterQ.trim() || null),
    [users, filterRole, filterQ],
  );

  const applyFiltersToUrl = useCallback(
    (role: string | null, q: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (role && role !== "all") next.set("role", role);
      else next.delete("role");
      if (q && q.trim()) next.set("q", q.trim());
      else next.delete("q");
      router.push(`/dashboard/usuarios?${next.toString()}`);
    },
    [router, searchParams],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Não autorizado.");
        else setError("Erro ao carregar usuários.");
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError("Erro ao carregar usuários.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (username: string, role: UserRole) => {
    setUpdating(username);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao atualizar role");
      }
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, role } : u)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar role");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Usuário cadastrado com sucesso!</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e permissões (roles) no Cognito
          </p>
        </div>
        <Link href="/dashboard/usuarios/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros
        </span>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="filtro-role" className="text-xs">
              Role
            </Label>
            <Select
              value={filterRole ?? "all"}
              onValueChange={(v) => {
                const r = v === "all" ? null : v;
                setFilterRole(r);
                applyFiltersToUrl(r, filterQ.trim() || null);
              }}
            >
              <SelectTrigger id="filtro-role" className="w-[160px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filtro-usuarios-busca" className="text-xs">
              Buscar (email ou nome)
            </Label>
            <Input
              id="filtro-usuarios-busca"
              type="search"
              placeholder="Email ou nome..."
              className="w-[200px]"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              onBlur={() => applyFiltersToUrl(filterRole, filterQ.trim() || null)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            {loading
              ? "Carregando..."
              : users.length === 0
                ? "Nenhum usuário no pool."
                : filteredUsers.length === users.length
                  ? `${users.length} usuário(s). Altere o role no select.`
                  : `${filteredUsers.length} de ${users.length} usuário(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>
                {users.length === 0
                  ? "Nenhum usuário encontrado."
                  : "Nenhum usuário corresponde aos filtros."}
              </p>
              {users.length > 0 && (filterRole || filterQ.trim()) ? (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setFilterRole(null);
                    setFilterQ("");
                    router.push("/dashboard/usuarios");
                  }}
                >
                  Limpar filtros
                </Button>
              ) : users.length === 0 ? (
                <Link href="/dashboard/usuarios/new">
                  <Button variant="outline" className="mt-4">
                    Cadastrar primeiro usuário
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(value) =>
                          handleRoleChange(u.username, value as UserRole)
                        }
                        disabled={updating === u.username}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">
                            {ROLE_LABELS.super_admin}
                          </SelectItem>
                          <SelectItem value="company_admin">
                            {ROLE_LABELS.company_admin}
                          </SelectItem>
                          <SelectItem value="editor">
                            {ROLE_LABELS.editor}
                          </SelectItem>
                          <SelectItem value="user">
                            {ROLE_LABELS.user}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {updating === u.username ? (
                          <span className="text-muted-foreground text-sm">
                            Salvando...
                          </span>
                        ) : null}
                        <Link
                          href={`/dashboard/usuarios/${encodeURIComponent(u.username)}/edit`}
                        >
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link
                          href={`/dashboard/usuarios/${encodeURIComponent(u.username)}/delete`}
                        >
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
