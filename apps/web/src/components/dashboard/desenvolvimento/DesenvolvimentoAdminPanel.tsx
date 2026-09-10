"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelectField } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type { LearningCourseSummary } from "@/lib/desenvolvimento-types";
import { Tenant } from "@/types/tenant";

export function DesenvolvimentoAdminPanel() {
  const { canAccessModule } = useAuth();
  const [courses, setCourses] = useState<LearningCourseSummary[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newTenantId, setNewTenantId] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant?: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    const q = tenantFilter ? `?tenantId=${encodeURIComponent(tenantFilter)}` : "";
    const { data } = await api.get<LearningCourseSummary[]>(`/desenvolvimento/admin/courses${q}`);
    setCourses(Array.isArray(data) ? data : []);
  }, [tenantFilter]);

  useEffect(() => {
    const q = tenantFilter ? `?tenantId=${encodeURIComponent(tenantFilter)}` : "";
    void api
      .get<LearningCourseSummary[]>(`/desenvolvimento/admin/courses${q}`)
      .then(({ data }) => setCourses(Array.isArray(data) ? data : []));
  }, [tenantFilter]);

  useEffect(() => {
    void api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, []);

  if (!canAccessModule("desenvolvimento__desenvolvimento_admin")) {
    return <p className="text-sm text-muted-foreground">Sem permissão de administração.</p>;
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post("/desenvolvimento/admin/courses", {
        title: newTitle.trim(),
        tenantId: newTenantId || null,
      });
      setNewTitle("");
      await load();
      setFeedback({ title: "Curso criado", message: "Rascunho salvo.", variant: "success" });
    } catch (e: unknown) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao criar curso.",
        variant: "error",
      });
    }
  };

  return (
    <Cup360PageShell title="Administração — Desenvolvimento">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Novo curso</label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título do curso" />
          </div>
          <div className="w-full sm:w-48 space-y-1">
            <label className="text-xs text-muted-foreground">Empresa</label>
            <NativeSelectField
              value={newTenantId}
              onChange={(e) => setNewTenantId(e.target.value)}
              placeholder="Global (grupo)"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <Button type="button" className="gap-1" onClick={() => void handleCreate()}>
            <Plus className="h-4 w-4" />
            Criar rascunho
          </Button>
        </div>

        <NativeSelectField
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          placeholder="Todas as empresas"
          options={tenants.map((t) => ({ value: t.id, label: t.name }))}
          className="max-w-xs"
        />

        <div className="hidden md:block rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Matrículas</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.tenant?.name ?? "Grupo"}</TableCell>
                  <TableCell className="uppercase text-xs">{c.status}</TableCell>
                  <TableCell>{c._count?.modules ?? 0}</TableCell>
                  <TableCell>{c._count?.enrollments ?? 0}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/desenvolvimento/admin/curso/${c.id}`}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden space-y-2">
          {courses.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 p-3">
              <p className="font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.tenant?.name ?? "Grupo"} · {c.status}</p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/dashboard/desenvolvimento/admin/curso/${c.id}`}>Editar</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant ?? "info"}
      />
    </Cup360PageShell>
  );
}
