"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { getEmployeeTypeLabel } from "@/lib/employee-types";
import { EmployeeFormDialog, type EmployeeRow } from "@/app/dashboard/adm/rh/components/EmployeeFormDialog";

export default function FuncionariosCadastroPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<EmployeeRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (typeFilter) params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      const { data } = await api.get<EmployeeRow[]>(`/rh/employees${qs ? `?${qs}` : ""}`);
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, typeFilter, search]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("adm_rh")) {
      router.replace("/403");
      return;
    }
    loadTenants();
  }, [authLoading, canAccessModule, router, loadTenants]);

  useEffect(() => {
    if (authLoading || !canAccessModule("adm_rh")) return;
    loadEmployees();
  }, [authLoading, canAccessModule, loadEmployees]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/rh/employees/${deleteId}`);
      setDeleteId(null);
      loadEmployees();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !canAccessModule("adm_rh")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Briefcase className="h-8 w-8" />
            Funcionários
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Cadastro mestre de colaboradores das empresas e clubes (funcionários e dirigentes). Usado pelo RH
            para vínculos, férias e documentos. Atletas e comissão técnica têm cadastros próprios em Futebol.
          </p>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo funcionário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="filtro-tenant">Clube / empresa</Label>
            <select
              id="filtro-tenant"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Todos</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filtro-type">Tipo</Label>
            <select
              id="filtro-type"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="staff">Funcionário</option>
              <option value="dirigente">Dirigente</option>
              <option value="athlete">Atleta</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filtro-search">Buscar</Label>
            <Input
              id="filtro-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, CPF ou e-mail"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de funcionários</CardTitle>
          <CardDescription>
            {employees.length === 0
              ? "Nenhum registro encontrado"
              : `${employees.length} registro${employees.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum funcionário cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Clube / empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.tenant?.name ?? "—"}</TableCell>
                      <TableCell>{getEmployeeTypeLabel(emp.type)}</TableCell>
                      <TableCell className="hidden md:table-cell">{emp.email ?? "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{emp.phone ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => {
                              setEdit(emp);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir"
                            onClick={() => setDeleteId(emp.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        edit={edit}
        onSuccess={loadEmployees}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Vínculos e documentos associados podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
