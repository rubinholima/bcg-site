"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { healthInternAreaLabel } from "@/lib/health-intern-areas";
import type { HealthIntern } from "@/types/health-intern";
import { EstagiariosFilters } from "./EstagiariosFilters";

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function EstagiariosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<HealthIntern[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = searchParams.get("tenantId") ?? "";
  const areaFilter = searchParams.get("area") ?? "";
  const search = searchParams.get("search") ?? "";

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (areaFilter) params.set("area", areaFilter);
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    api
      .get<HealthIntern[]>(`/health-interns?${params.toString()}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tenantId, areaFilter, search]);

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
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
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
                {rows.map((row) => {
                  const editHref = `/dashboard/saude/estagiarios/${row.id}/edit`;
                  return (
                    <ClickableTableRow key={row.id} href={editHref}>
                      <TableCell>
                        {row.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
                      <TableCell className="font-medium">
                        {row.name}
                        {!row.active ? (
                          <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{healthInternAreaLabel(row.area)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {row.area === "psicologia"
                          ? row.supervisor?.name ?? "—"
                          : row.registry ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.email ?? "—"}</TableCell>
                      <TableCell>{row.tenant?.name ?? "Todos"}</TableCell>
                      <TableCell>
                        <TableRowActions>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={editHref}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-destructive"
                          >
                            <Link href={`/dashboard/saude/estagiarios/${row.id}/delete`}>
                              <Trash2 className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableRowActions>
                      </TableCell>
                    </ClickableTableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
