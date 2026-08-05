"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import type { MedicalStaff } from "@/types/medical-staff";
import type { Psychologist } from "@/types/psychologist";
import { EstagiariosFilters } from "./EstagiariosFilters";

type EstagiarioRow = {
  id: string;
  area: "medico" | "psicologia";
  name: string;
  email?: string | null;
  registry?: string | null;
  supervisorName?: string | null;
  tenantName?: string | null;
  photoUrl?: string | null;
  editHref: string;
  deleteHref: string;
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}

export default function EstagiariosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<EstagiarioRow[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = searchParams.get("tenantId") ?? "";
  const areaFilter = searchParams.get("area") ?? "";
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);

    setLoading(true);
    Promise.all([
      api.get<MedicalStaff[]>(`/medical-staff?${params.toString()}`),
      api.get<Psychologist[]>(`/psychologists?${params.toString()}`),
    ])
      .then(([medRes, psychRes]) => {
        const medical = (Array.isArray(medRes.data) ? medRes.data : []).filter((p) => p.role === "estagiario");
        const psychAll = Array.isArray(psychRes.data) ? psychRes.data : [];
        const psychSupervisors = new Map(
          psychAll
            .filter((p) => (p.staffRole ?? "psicologo") === "psicologo")
            .map((p) => [p.id, p.name]),
        );
        const psych = psychAll.filter((p) => p.staffRole === "estagiario");

        const merged: EstagiarioRow[] = [
          ...medical.map((p) => ({
            id: p.id,
            area: "medico" as const,
            name: p.name,
            email: p.email,
            registry: p.crmCoren,
            supervisorName: null,
            tenantName: p.tenant?.name ?? null,
            photoUrl: p.photoUrl,
            editHref: `/dashboard/medico/equipe/${p.id}/edit`,
            deleteHref: `/dashboard/medico/equipe/${p.id}/delete`,
          })),
          ...psych.map((p) => ({
            id: p.id,
            area: "psicologia" as const,
            name: p.name,
            email: p.email,
            registry: p.crpOrEquivalent,
            supervisorName: p.supervisorId ? psychSupervisors.get(p.supervisorId) ?? null : null,
            tenantName: p.tenant?.name ?? null,
            photoUrl: p.photoUrl,
            editHref: `/dashboard/psicologia/psicologos/${p.id}/edit`,
            deleteHref: `/dashboard/psicologia/psicologos/${p.id}/delete`,
          })),
        ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

        setRows(merged);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (areaFilter && r.area !== areaFilter) return false;
      if (search && !r.name.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [rows, areaFilter, search]);

  const showSuccess = searchParams.get("success") === "true";

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section="Depto de Saúde"
        sectionIcon={GraduationCap}
        title="Estagiários"
        description="Cadastro unificado — área médica ou psicologia."
        backHref="/dashboard/saude"
        toolbar={<EstagiariosFilters />}
        aside={
          <Link href="/dashboard/saude/estagiarios/new">
            <Button className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              Novo estagiário
            </Button>
          </Link>
        }
      />

      {showSuccess ? (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          Operação realizada com sucesso!
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista de estagiários</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nenhum estagiário encontrado."
              : `${filtered.length} cadastrado${filtered.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GraduationCap className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="font-medium">Nenhum estagiário encontrado.</p>
              <Link href="/dashboard/saude/estagiarios/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar estagiário
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="hidden md:table-cell">Supervisão / registro</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <ClickableTableRow key={`${row.area}-${row.id}`} href={row.editHref}>
                    <TableCell>
                      {row.photoUrl ? (
                        <img
                          src={getPublicImageUrl(row.photoUrl)}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover object-[center_20%]"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(row.name)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.area === "medico" ? "Médico" : "Psicologia"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.area === "psicologia"
                        ? row.supervisorName ?? "—"
                        : row.registry ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{row.email ?? "—"}</TableCell>
                    <TableCell>{row.tenantName ?? "Todos"}</TableCell>
                    <TableCell>
                      <TableRowActions>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={row.editHref}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild className="text-destructive">
                          <Link href={row.deleteHref}>
                            <Trash2 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableRowActions>
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
