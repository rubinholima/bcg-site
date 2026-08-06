"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import {
  JobRoleFormDialog,
  type JobRoleRow,
} from "@/app/dashboard/adm/rh/components/JobRoleFormDialog";
import { type DepartmentRow } from "@/app/dashboard/adm/rh/components/DepartmentFormDialog";

export default function FuncoesFutebolPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [roles, setRoles] = useState<JobRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<JobRoleRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "error" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ forFootball: "1", type: "staff" });
      if (tenantId) qs.set("tenantId", tenantId);
      const [{ data: roleData }, { data: deptData }] = await Promise.all([
        api.get<JobRoleRow[]>(`/rh/job-roles?${qs.toString()}`),
        api.get<DepartmentRow[]>(
          tenantId
            ? `/rh/departments?tenantId=${encodeURIComponent(tenantId)}`
            : "/rh/departments",
        ).catch(() => ({ data: [] as DepartmentRow[] })),
      ]);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch {
      setRoles([]);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar as funções.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/rh/job-roles/${deleteId}`);
      setDeleteId(null);
      await load();
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir a função.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="min-h-[44px]">
          <Link href="/dashboard/futebol">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Funções</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Funções do futebol
          </CardTitle>
          <Button
            size="sm"
            className="min-h-[44px]"
            onClick={() => {
              setEdit(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova função
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="funcoes-tenant">Clube</Label>
            <NativeSelect
              id="funcoes-tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Todos</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma função de futebol cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clube</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <ClickableTableRow
                    key={r.id}
                    onClick={() => {
                      setEdit(r);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell>{r.tenant?.name ?? "—"}</TableCell>
                    <TableCell className="font-medium uppercase">{r.name}</TableCell>
                    <TableCell>{r.code ?? "—"}</TableCell>
                    <TableCell>{r.department?.name ?? "—"}</TableCell>
                    <TableRowActions align="left">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => {
                            setEdit(r);
                            setDialogOpen(true);
                          }}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive"
                          onClick={() => setDeleteId(r.id)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableRowActions>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <JobRoleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        departments={departments}
        edit={edit}
        onSuccess={() => void load()}
        forceFootball
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir função?</AlertDialogTitle>
            <AlertDialogDescription>
              A função será removida do RH e da lista do futebol. Quem já usa esse cargo na comissão
              perde o vínculo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}
